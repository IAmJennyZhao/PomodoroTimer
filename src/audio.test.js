import { createAmbientEngine } from './audio';

function parameter() {
  return {
    value: 0,
    cancelScheduledValues: jest.fn(),
    setTargetAtTime: jest.fn(),
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  };
}

function mockContext() {
  const nodes = [];
  const sources = [];
  const gains = [];
  function node(extra = {}) {
    const result = { connect: jest.fn(), disconnect: jest.fn(), ...extra };
    nodes.push(result);
    return result;
  }
  const context = {
    state: 'suspended',
    sampleRate: 1000,
    currentTime: 0,
    destination: {},
    nodes,
    sources,
    gains,
    resume: jest.fn(async () => { context.state = 'running'; }),
    suspend: jest.fn(async () => { context.state = 'suspended'; }),
    close: jest.fn(async () => { context.state = 'closed'; }),
    createBuffer: jest.fn((channels, length) => ({
      getChannelData: () => new Float32Array(length),
    })),
    createGain: jest.fn(() => {
      const gain = node({ gain: parameter() });
      gains.push(gain);
      return gain;
    }),
    createBiquadFilter: jest.fn(() => node({ frequency: parameter(), Q: parameter() })),
    createDynamicsCompressor: jest.fn(() => node({
      threshold: parameter(), knee: parameter(), ratio: parameter(),
      attack: parameter(), release: parameter(),
    })),
    createBufferSource: jest.fn(() => {
      const source = node({ playbackRate: parameter(), start: jest.fn(), stop: jest.fn() });
      sources.push(source);
      return source;
    }),
    createOscillator: jest.fn(() => {
      const source = node({ frequency: parameter(), start: jest.fn(), stop: jest.fn() });
      sources.push(source);
      return source;
    }),
  };
  return context;
}

describe('ambient audio lifecycle', () => {
  let engine;
  let context;
  const originalAudioContext = globalThis.AudioContext;
  const originalWebkitAudioContext = globalThis.webkitAudioContext;

  beforeEach(() => {
    jest.useFakeTimers();
    context = mockContext();
    globalThis.AudioContext = jest.fn(() => context);
    globalThis.webkitAudioContext = undefined;
    engine = createAmbientEngine();
  });

  afterEach(async () => {
    await engine.destroy();
    globalThis.AudioContext = originalAudioContext;
    globalThis.webkitAudioContext = originalWebkitAudioContext;
    jest.useRealTimers();
  });

  test('creating or configuring the mixer does not request browser audio', () => {
    engine.setVolume('rain', 0.7);
    engine.stop();
    expect(globalThis.AudioContext).not.toHaveBeenCalled();
    expect(engine.playing).toBe(false);
  });

  test('unsupported or blocked audio leaves a usable silent engine', async () => {
    globalThis.AudioContext = undefined;
    await expect(engine.start()).resolves.toBe(false);
    await expect(engine.chime()).resolves.toBe(false);
    expect(engine.playing).toBe(false);

    globalThis.AudioContext = jest.fn(() => context);
    context.resume.mockRejectedValueOnce(new Error('User gesture required'));
    await expect(engine.start()).resolves.toBe(false);
    expect(engine.playing).toBe(false);
    await expect(engine.start()).resolves.toBe(true);
  });

  test('stopping during a pending browser unlock cancels playback', async () => {
    let finishResume;
    context.resume.mockImplementationOnce(() => new Promise(resolve => {
      finishResume = () => { context.state = 'running'; resolve(); };
    }));
    const starting = engine.start();
    engine.stop();
    finishResume();
    await expect(starting).resolves.toBe(false);
    expect(engine.playing).toBe(false);
    jest.advanceTimersByTime(500);
    expect(context.suspend).toHaveBeenCalledTimes(1);
  });

  test('a stopped mixer suspends, then reuses its context, loops, and buffers', async () => {
    await engine.start();
    const bufferCount = context.createBuffer.mock.calls.length;
    const sourceCount = context.createBufferSource.mock.calls.length;
    engine.stop();
    jest.advanceTimersByTime(500);
    expect(context.state).toBe('suspended');

    await engine.start();
    expect(engine.playing).toBe(true);
    expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
    expect(context.createBuffer).toHaveBeenCalledTimes(bufferCount);
    expect(context.createBufferSource).toHaveBeenCalledTimes(sourceCount);
  });

  test('volume changes stay independent and clamp unsafe inputs', async () => {
    engine.setVolume('rain', 0);
    engine.setVolume('fire', 0.5);
    await engine.start();
    const [, rain, fire, noise] = context.gains;
    expect(rain.gain.value).toBe(0);
    expect(fire.gain.value).toBeGreaterThan(0);
    expect(noise.gain.value).toBe(0);

    engine.setVolume('rain', 10);
    engine.setVolume('noise', -1);
    expect(rain.gain.setTargetAtTime.mock.calls[0][0]).toBeLessThanOrEqual(1);
    expect(noise.gain.setTargetAtTime.mock.calls[0][0]).toBe(0);
    expect(fire.gain.setTargetAtTime).not.toHaveBeenCalled();
    expect(() => engine.setVolume('invalid', NaN)).not.toThrow();
  });

  test('effects share the context and release their nodes after playing', async () => {
    await engine.tap();
    const tap = context.sources[context.sources.length - 1];
    tap.onended();
    expect(tap.disconnect).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(context.state).toBe('suspended');

    await engine.chime();
    expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalledTimes(4);
  });

  test('destroy closes audio, disconnects nodes, and clears scheduled work', async () => {
    await engine.start();
    await engine.chime();
    await engine.destroy();
    expect(engine.playing).toBe(false);
    expect(context.close).toHaveBeenCalledTimes(1);
    context.nodes.forEach(node => expect(node.disconnect).toHaveBeenCalled());
    context.sources.forEach(source => expect(source.stop).toHaveBeenCalled());
    expect(jest.getTimerCount()).toBe(0);
    await expect(engine.start()).resolves.toBe(false);
    await expect(engine.tap()).resolves.toBe(false);
    await engine.destroy();
    expect(context.close).toHaveBeenCalledTimes(1);
  });
});
