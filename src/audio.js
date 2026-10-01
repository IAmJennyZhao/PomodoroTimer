const CHANNELS = ['rain', 'fire', 'noise'];
const DEFAULT_VOLUMES = { rain: 0.35, fire: 0, noise: 0 };
const LEVELS = { rain: 0.13, fire: 0.28, noise: 0.23 };

function safelyDisconnect(node) {
  try { node.disconnect(); } catch (_) { /* Already disconnected. */ }
}

/**
 * A local, procedural sound mixer. Nothing is downloaded, and construction is
 * silent: call start(), chime(), or tap() from a user gesture to unlock audio.
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
    const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * seconds), context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      let brown = 0;
      for (let index = 0; index < data.length; index += 1) {
        const white = Math.random() * 2 - 1;
        brown = (brown + 0.02 * white) / 1.02;
        data[index] = kind === 'white' ? white : brown * 3.5;
      }
      // Join the loop gradually to avoid a low-frequency step at its seam.
      const seam = Math.min(Math.floor(context.sampleRate * 0.04), Math.floor(data.length / 2));
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
    highpass.type = 'highpass';
    highpass.frequency.value = highpassFrequency;
    lowpass.type = 'lowpass';
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
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
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
    const white = noiseBuffer('white');
    const brown = noiseBuffer('brown');
    makeLoop('rain', white, 6500, 480);
    makeLoop('fire', brown, 530, 65);
    makeLoop('noise', brown, 950, 25);
    crackleBuffer = noiseBuffer('white', 0.15);
    return true;
  }

  function clearIdleTimeout() {
    if (idleTimeout !== null) clearTimeout(idleTimeout);
    idleTimeout = null;
  }

  function suspendWhenIdle(delay = 350) {
    clearIdleTimeout();
    if (destroyed || wantedPlaying || effects.size || !context) return;
    idleTimeout = setTimeout(() => {
      idleTimeout = null;
      if (!destroyed && !wantedPlaying && effects.size === 0 && context.state === 'running') {
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
          loopSources.forEach(source => {
            try { source.stop(); } catch (_) { /* Partially initialized. */ }
          });
          loopSources.clear();
          graph.forEach(safelyDisconnect);
          graph.clear();
          if (context && context.state !== 'closed') {
            try { await context.close(); } catch (_) { /* Unsupported close. */ }
          }
          context = null;
          ambience = null;
          output = null;
          return false;
        }
      }
      if (context.state === 'closed') return false;
      if (context.state !== 'running') await context.resume();
      return !destroyed && context.state === 'running';
    } catch (_) {
      return false;
    }
  }

  function trackEffect(source, nodes) {
    const effect = { source, nodes };
    effects.add(effect);
    source.onended = () => {
      nodes.forEach(safelyDisconnect);
      effects.delete(effect);
      suspendWhenIdle();
    };
  }

  function crackle() {
    if (!wantedPlaying || !context || context.state !== 'running' || volumes.fire <= 0 || Math.random() > 0.6) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = 0.025 + Math.random() * 0.055;
    source.buffer = crackleBuffer;
    source.playbackRate.value = 0.65 + Math.random() * 0.8;
    filter.type = 'lowpass';
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
    if (context && context.state !== 'closed' && ambience) fade(ambience.gain, 0);
    suspendWhenIdle();
  }

  function setVolume(key, value) {
    if (!CHANNELS.includes(key) || !Number.isFinite(value) || destroyed) return;
    volumes[key] = Math.max(0, Math.min(1, value));
    if (context && context.state !== 'closed' && channelGains[key]) {
      fade(channelGains[key].gain, volumes[key] * LEVELS[key]);
    }
  }

  function tone(frequency, offset, length, loudness) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const begins = context.currentTime + offset;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, begins);
    gain.gain.linearRampToValueAtTime(loudness, begins + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, begins + length);
    oscillator.connect(gain);
    gain.connect(output);
    trackEffect(oscillator, [oscillator, gain]);
    oscillator.start(begins);
    oscillator.stop(begins + length + 0.02);
  }

  async function chime() {
    if (!(await ready()) || destroyed || !context) return false;
    tone(523.25, 0, 0.9, 0.1);
    tone(659.25, 0.16, 1, 0.075);
    tone(783.99, 0.32, 1.3, 0.065);
    return true;
  }

  async function tap() {
    if (!(await ready()) || destroyed || !context) return false;
    tone(740, 0, 0.075, 0.035);
    return true;
  }

  async function destroy() {
    if (destroyed) return;
    stop();
    destroyed = true;
    clearIdleTimeout();
    effects.forEach(({ source, nodes }) => {
      source.onended = null;
      try { source.stop(); } catch (_) { /* Already ended. */ }
      nodes.forEach(safelyDisconnect);
    });
    effects.clear();
    loopSources.forEach(source => {
      try { source.stop(); } catch (_) { /* Already stopped. */ }
    });
    loopSources.clear();
    graph.forEach(safelyDisconnect);
    graph.clear();
    if (context && context.state !== 'closed') {
      try { await context.close(); } catch (_) { /* Already closed. */ }
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
    chime,
    tap,
    destroy,
    get playing() { return wantedPlaying && context?.state === 'running'; },
  };
}
