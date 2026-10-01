/* global globalThis */
const CHANNELS = ["rain", "fire", "noise"];
const DEFAULT_VOLUMES = { rain: 0.35, fire: 0, noise: 0 };
const LEVELS = { rain: 0.13, fire: 0.28, noise: 0.23 };
const ALARM_INTERVAL_MS = 8000;

function safelyDisconnect(node) {
  try {
    node.disconnect();
  } catch (_) {
    /* Already disconnected. */
  }
}

/**
 * A local, procedural sound mixer. Nothing is downloaded, and construction is
 * silent: call unlock() from a user gesture before a timer begins. start(),
 * chime(), and tap() also unlock audio when used directly.
 * Volume changes are remembered before playback. Unavailable/blocked audio
 * returns false instead of breaking the timer. destroy() releases all resources.
 */
export function createAmbientEngine() {
  const volumes = { ...DEFAULT_VOLUMES };
  const channelGains = {};
  const graph = new Set();
  const loopSources = new Set();
  const effects = new Set();
  let context = null;
  let output = null;
  let ambience = null;
  let crackleBuffer = null;
  let crackleInterval = null;
  let idleTimeout = null;
  let alarmInterval = null;
  let alarmStartPromise = null;
  let alarmGeneration = 0;
  let wantedAlarm = false;
  let wantedPlaying = false;
  let destroyed = false;

  function keep(node) {
    graph.add(node);
    return node;
  }

  // setTargetAtTime softens slider movements and avoids clicks on start/stop.
  function fade(parameter, value, seconds = 0.07) {
    const now = context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(value, now, seconds);
  }

  function noiseBuffer(kind, seconds = 8) {
    const buffer = context.createBuffer(
      2,
      Math.ceil(context.sampleRate * seconds),
      context.sampleRate,
    );
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      let brown = 0;
      for (let index = 0; index < data.length; index += 1) {
        const white = Math.random() * 2 - 1;
        brown = (brown + 0.02 * white) / 1.02;
        data[index] = kind === "white" ? white : brown * 3.5;
      }
      // Join the loop gradually to avoid a low-frequency step at its seam.
      const seam = Math.min(
        Math.floor(context.sampleRate * 0.04),
        Math.floor(data.length / 2),
      );
      const first = data[0];
      for (let index = 0; index < seam; index += 1) {
        const amount = index / (seam - 1);
        const position = data.length - seam + index;
        data[position] = data[position] * (1 - amount) + first * amount;
      }
    }
    return buffer;
  }

  function makeLoop(key, buffer, lowpassFrequency, highpassFrequency) {
    const source = keep(context.createBufferSource());
    const highpass = keep(context.createBiquadFilter());
    const lowpass = keep(context.createBiquadFilter());
    const gain = keep(context.createGain());
    source.buffer = buffer;
    source.loop = true;
    highpass.type = "highpass";
    highpass.frequency.value = highpassFrequency;
    lowpass.type = "lowpass";
    lowpass.frequency.value = lowpassFrequency;
    lowpass.Q.value = 0.5;
    gain.gain.value = volumes[key] * LEVELS[key];
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ambience);
    channelGains[key] = gain;
    loopSources.add(source);
    source.start();
  }

  function initialize() {
    const AudioContextClass =
      globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    context = new AudioContextClass();
    output = keep(context.createDynamicsCompressor());
    output.threshold.value = -12;
    output.knee.value = 18;
    output.ratio.value = 3;
    output.attack.value = 0.01;
    output.release.value = 0.3;
    output.connect(context.destination);
    ambience = keep(context.createGain());
    ambience.gain.value = 0;
    ambience.connect(output);
    // Buffers and the continuous loop nodes are allocated once per engine.
    const white = noiseBuffer("white");
    const brown = noiseBuffer("brown");
    makeLoop("rain", white, 6500, 480);
    makeLoop("fire", brown, 530, 65);
    makeLoop("noise", brown, 950, 25);
    crackleBuffer = noiseBuffer("white", 0.15);
    return true;
  }

  function clearIdleTimeout() {
    if (idleTimeout !== null) clearTimeout(idleTimeout);
    idleTimeout = null;
  }

  function suspendWhenIdle(delay = 350) {
    clearIdleTimeout();
    if (destroyed || wantedPlaying || wantedAlarm || effects.size || !context)
      return;
    idleTimeout = setTimeout(() => {
      idleTimeout = null;
      if (
        !destroyed &&
        !wantedPlaying &&
        !wantedAlarm &&
        effects.size === 0 &&
        context.state === "running"
      ) {
        // Safari and background tabs can reject suspension; it is harmless.
        context.suspend().catch(() => {});
      }
    }, delay);
  }

  async function ready() {
    if (destroyed) return false;
    clearIdleTimeout();
    try {
      if (!context) {
        try {
          if (!initialize()) return false;
        } catch (_) {
          // A partially implemented AudioContext should fail as safely as a
          // missing one, including on the user's next attempt to enable audio.
          loopSources.forEach((source) => {
            try {
              source.stop();
            } catch (_) {
              /* Partially initialized. */
            }
          });
          loopSources.clear();
          graph.forEach(safelyDisconnect);
          graph.clear();
          if (context && context.state !== "closed") {
            try {
              await context.close();
            } catch (_) {
              /* Unsupported close. */
            }
          }
          context = null;
          ambience = null;
          output = null;
          return false;
        }
      }
      if (context.state === "closed") return false;
      if (context.state !== "running") await context.resume();
      return !destroyed && context.state === "running";
    } catch (_) {
      return false;
    }
  }

  function trackEffect(source, nodes, kind = "effect") {
    const effect = { source, nodes, kind };
    effects.add(effect);
    source.onended = () => {
      nodes.forEach(safelyDisconnect);
      effects.delete(effect);
      suspendWhenIdle();
    };
    return effect;
  }

  function cancelEffect(effect) {
    const { source, nodes } = effect;
    source.onended = null;
    try {
      source.stop();
    } catch (_) {
      /* Already ended, or never started. */
    }
    nodes.forEach(safelyDisconnect);
    effects.delete(effect);
  }

  function crackle() {
    if (
      !wantedPlaying ||
      !context ||
      context.state !== "running" ||
      volumes.fire <= 0 ||
      Math.random() > 0.6
    )
      return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = 0.025 + Math.random() * 0.055;
    source.buffer = crackleBuffer;
    source.playbackRate.value = 0.65 + Math.random() * 0.8;
    filter.type = "lowpass";
    filter.frequency.value = 1200 + Math.random() * 2000;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.16, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(channelGains.fire);
    trackEffect(source, [source, filter, gain]);
    source.start(now);
    source.stop(now + duration + 0.01);
  }

  async function start() {
    if (destroyed) return false;
    wantedPlaying = true;
    const available = await ready();
    if (!available || !wantedPlaying || destroyed) {
      if (!available) wantedPlaying = false;
      suspendWhenIdle();
      return false;
    }
    fade(ambience.gain, 1);
    if (crackleInterval === null) crackleInterval = setInterval(crackle, 420);
    return true;
  }

  function stop() {
    wantedPlaying = false;
    if (crackleInterval !== null) clearInterval(crackleInterval);
    crackleInterval = null;
    if (context && context.state !== "closed" && ambience)
      fade(ambience.gain, 0);
    suspendWhenIdle();
  }

  function setVolume(key, value) {
    if (!CHANNELS.includes(key) || !Number.isFinite(value) || destroyed) return;
    volumes[key] = Math.max(0, Math.min(1, value));
    if (context && context.state !== "closed" && channelGains[key]) {
      fade(channelGains[key].gain, volumes[key] * LEVELS[key]);
    }
  }

  function tone(frequency, offset, length, loudness, kind = "effect") {
    const nodes = [];
    let effect;
    try {
      const oscillator = context.createOscillator();
      nodes.push(oscillator);
      const gain = context.createGain();
      nodes.push(gain);
      const begins = context.currentTime + offset;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, begins);
      gain.gain.linearRampToValueAtTime(loudness, begins + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, begins + length);
      oscillator.connect(gain);
      gain.connect(output);
      effect = trackEffect(oscillator, nodes, kind);
      oscillator.start(begins);
      oscillator.stop(begins + length + 0.02);
      return true;
    } catch (_) {
      if (effect) cancelEffect(effect);
      else nodes.forEach(safelyDisconnect);
      return false;
    }
  }

  function playChime(kind = "effect") {
    return (
      tone(523.25, 0, 0.9, 0.1, kind) &&
      tone(659.25, 0.16, 1, 0.075, kind) &&
      tone(783.99, 0.32, 1.3, 0.065, kind)
    );
  }

  async function unlock() {
    const available = await ready();
    suspendWhenIdle();
    return available;
  }

  async function chime() {
    if (!(await ready()) || destroyed || !context) return false;
    const played = playChime();
    suspendWhenIdle();
    return played;
  }

  async function tap() {
    if (!(await ready()) || destroyed || !context) return false;
    const played = tone(740, 0, 0.075, 0.035);
    suspendWhenIdle();
    return played;
  }

  function stopAlarm() {
    wantedAlarm = false;
    alarmGeneration += 1;
    alarmStartPromise = null;
    if (alarmInterval !== null) clearInterval(alarmInterval);
    alarmInterval = null;
    effects.forEach((effect) => {
      if (effect.kind === "alarm") cancelEffect(effect);
    });
    suspendWhenIdle();
  }

  async function ringAlarm(generation) {
    const available = await ready();
    if (!wantedAlarm || destroyed || generation !== alarmGeneration) {
      suspendWhenIdle();
      return false;
    }
    if (!available || !playChime("alarm")) {
      stopAlarm();
      return false;
    }
    return true;
  }

  function startAlarm() {
    if (destroyed) return Promise.resolve(false);
    if (wantedAlarm) return alarmStartPromise || Promise.resolve(true);
    wantedAlarm = true;
    const generation = ++alarmGeneration;
    alarmStartPromise = ringAlarm(generation).then((played) => {
      if (!played || !wantedAlarm || generation !== alarmGeneration) return false;
      alarmStartPromise = null;
      let reminderPending = false;
      alarmInterval = setInterval(() => {
        // ringAlarm handles blocked audio internally, including a context that
        // becomes unavailable after the first reminder. A slow browser resume
        // must not queue several reminders to ring together later.
        if (reminderPending) return;
        reminderPending = true;
        void ringAlarm(generation).then(() => {
          reminderPending = false;
        });
      }, ALARM_INTERVAL_MS);
      return true;
    });
    return alarmStartPromise;
  }

  async function destroy() {
    if (destroyed) return;
    stopAlarm();
    stop();
    destroyed = true;
    clearIdleTimeout();
    effects.forEach(cancelEffect);
    loopSources.forEach((source) => {
      try {
        source.stop();
      } catch (_) {
        /* Already stopped. */
      }
    });
    loopSources.clear();
    graph.forEach(safelyDisconnect);
    graph.clear();
    if (context && context.state !== "closed") {
      try {
        await context.close();
      } catch (_) {
        /* Already closed. */
      }
    }
    context = null;
    output = null;
    ambience = null;
    crackleBuffer = null;
  }

  return {
    start,
    stop,
    setVolume,
    unlock,
    chime,
    tap,
    startAlarm,
    stopAlarm,
    destroy,
    get playing() {
      return wantedPlaying && context?.state === "running";
    },
  };
}
