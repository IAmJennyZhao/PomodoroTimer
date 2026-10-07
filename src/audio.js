/* global globalThis */
const CHANNELS = ["rain", "fire", "noise"];
const DEFAULT_VOLUMES = { rain: 0.35, fire: 0, noise: 0 };
const LEVELS = { rain: 0.13, fire: 0.28, noise: 0.23 };
const ALARM_INTERVAL_MS = 8000;
const SFX_COOLDOWN_SECONDS = 0.1;
// One soft, C-major family. Note offsets + lengths stay below 600ms;
// peaks are capped at 0.04 even with interaction volume at 100%.
const SFX_PALETTE = {
  tap: [[783.99, 0, 0.075, 0.03]],
  selection: [[659.25, 0, 0.055, 0.025]],
  paper: "paper",
  check: [[659.25, 0, 0.1, 0.03], [783.99, 0.065, 0.14, 0.025]],
  purchase: [[783.99, 0, 0.12, 0.03], [1046.5, 0.075, 0.2, 0.025]],
  placement: [[261.63, 0, 0.12, 0.04]],
  hatch: [[523.25, 0, 0.18, 0.025], [659.25, 0.09, 0.2, 0.025],
    [783.99, 0.18, 0.22, 0.025], [1046.5, 0.27, 0.25, 0.02]],
};

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
  let interactionOutput = null;
  let interactionEnabled = true;
  let interactionVolume = 0.35;
  let interactionGeneration = 0;
  let interactionPending = false;
  let lastInteractionAt = -Infinity;
  let interactionEndsAt = -Infinity;
  let alertEndsAt = -Infinity;
  let chimePending = false;
  let alertGeneration = 0;
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
    interactionOutput = keep(context.createGain());
    interactionOutput.gain.value = interactionEnabled ? interactionVolume : 0;
    interactionOutput.connect(output);
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
          interactionOutput = null;
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

  function tone(frequency, offset, length, loudness, kind = "effect", destination = output) {
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
      gain.connect(destination);
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
    const previousEffects = new Set(effects);
    const played = tone(523.25, 0, 0.9, 0.1, kind) &&
      tone(659.25, 0.16, 1, 0.075, kind) &&
      tone(783.99, 0.32, 1.3, 0.065, kind);
    if (played) alertEndsAt = context.currentTime + 1.64;
    else effects.forEach(effect => {
      if (!previousEffects.has(effect) && effect.kind === kind) cancelEffect(effect);
    });
    return played;
  }

  function cancelSfx() {
    // Invalidate pending unlocks as well as active notes. Nothing is queued
    // to replay after an alert, a dismissed hatch or a mute/unmute cycle.
    interactionGeneration += 1;
    interactionEndsAt = -Infinity;
    effects.forEach(effect => { if (effect.kind === "interaction") cancelEffect(effect); });
    suspendWhenIdle();
  }

  const alertBusy = () => wantedAlarm || chimePending || (context && context.currentTime < alertEndsAt);

  async function unlock() {
    const available = await ready();
    suspendWhenIdle();
    return available;
  }

  async function chime() {
    if (destroyed || alertBusy()) return false;
    const generation = alertGeneration;
    chimePending = true;
    cancelSfx();
    try {
      if (!(await ready()) || destroyed || !context || generation !== alertGeneration || wantedAlarm) return false;
      return playChime("alert");
    } finally {
      chimePending = false;
      suspendWhenIdle();
    }
  }

  function setInteractionSfx({ enabled, volume } = {}) {
    if (destroyed) return;
    if (typeof enabled === "boolean") interactionEnabled = enabled;
    if (Number.isFinite(volume)) interactionVolume = Math.max(0, Math.min(1, volume));
    if (!interactionEnabled || interactionVolume === 0) {
      // Also invalidate an effect awaiting browser unlock: unmuting later must
      // never replay a click made before/during mute.
      cancelSfx();
    }
    if (context && context.state !== "closed" && interactionOutput)
      fade(interactionOutput.gain, interactionEnabled ? interactionVolume : 0, 0.008);
    suspendWhenIdle();
  }

  function paperShuffle() {
    const nodes = [];
    let effect;
    try {
      const source = context.createBufferSource();
      nodes.push(source);
      const filter = context.createBiquadFilter();
      nodes.push(filter);
      const gain = context.createGain();
      nodes.push(gain);
      const now = context.currentTime;
      source.buffer = crackleBuffer;
      filter.type = "bandpass";
      filter.frequency.value = 1300;
      filter.Q.value = 0.6;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(interactionOutput);
      effect = trackEffect(source, nodes, "interaction");
      source.start(now);
      source.stop(now + 0.15);
      return true;
    } catch (_) {
      if (effect) cancelEffect(effect);
      else nodes.forEach(safelyDisconnect);
      return false;
    }
  }

  async function playSfx(name = "tap", { onUnavailable } = {}) {
    if (destroyed || !interactionEnabled || interactionVolume === 0 || interactionPending || alertBusy() ||
      !Object.prototype.hasOwnProperty.call(SFX_PALETTE, name)) return false;
    const generation = interactionGeneration;
    // Drop rapid requests instead of queueing a burst after a slow resume.
    interactionPending = true;
    try {
      const available = await ready();
      if (destroyed || generation !== interactionGeneration ||
        !interactionEnabled || interactionVolume === 0 || alertBusy()) return false;
      // A throttled/muted request is expected, not an unavailable audio device.
      if (!available || !context) { onUnavailable?.(); return false; }
      if (context.currentTime - lastInteractionAt < SFX_COOLDOWN_SECONDS ||
        context.currentTime < interactionEndsAt) return false;
      const previousEffects = new Set(effects);
      const sound = SFX_PALETTE[name];
      const played = sound === "paper" ? paperShuffle()
        : sound.every(note => tone(...note, "interaction", interactionOutput));
      if (played) {
        lastInteractionAt = context.currentTime;
        // One interaction sound group at a time, including multi-note effects.
        // Timer alerts take priority; ambience keeps its independent routing.
        interactionEndsAt = context.currentTime + (sound === "paper" ? 0.15
          : Math.max(...sound.map(([, offset, length]) => offset + length + 0.02)));
      }
      else {
        effects.forEach(effect => {
          if (!previousEffects.has(effect) && effect.kind === "interaction") cancelEffect(effect);
        });
        onUnavailable?.();
      }
      return played;
    } finally {
      interactionPending = false;
      suspendWhenIdle();
    }
  }

  function tap() {
    return playSfx("tap");
  }

  function stopAlarm() {
    const wasRinging = wantedAlarm;
    wantedAlarm = false;
    alarmGeneration += 1;
    alarmStartPromise = null;
    if (alarmInterval !== null) clearInterval(alarmInterval);
    alarmInterval = null;
    effects.forEach((effect) => {
      if (effect.kind === "alarm") cancelEffect(effect);
    });
    if (wasRinging) alertEndsAt = -Infinity;
    suspendWhenIdle();
  }

  function stopAlerts() {
    stopAlarm();
    alertGeneration += 1;
    alertEndsAt = -Infinity;
    effects.forEach(effect => { if (effect.kind === "alert") cancelEffect(effect); });
    suspendWhenIdle();
  }

  async function ringAlarm(generation) {
    cancelSfx();
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
    stopAlerts();
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
    interactionOutput = null;
    crackleBuffer = null;
  }

  return {
    start,
    stop,
    setVolume,
    unlock,
    chime,
    tap,
    playSfx,
    cancelSfx,
    setInteractionSfx,
    startAlarm,
    stopAlarm,
    stopAlerts,
    destroy,
    get playing() {
      return wantedPlaying && context?.state === "running";
    },
  };
}
