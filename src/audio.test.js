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

  test('unlock primes browser audio silently and reuses it for a later chime', async () => {
    await expect(engine.unlock()).resolves.toBe(true);
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).not.toHaveBeenCalled();
    expect(engine.playing).toBe(false);
    expect(context.gains[0].gain.value).toBe(0);
    jest.advanceTimersByTime(500);
    expect(context.state).toBe('suspended');

    await expect(engine.chime()).resolves.toBe(true);
    expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
  });

  test('alarm rings immediately and repeats every eight seconds without duplicate starts', async () => {
    const firstStart = engine.startAlarm();
    const repeatedStart = engine.startAlarm();
    expect(repeatedStart).toBe(firstStart);
    await expect(firstStart).resolves.toBe(true);
    await expect(engine.startAlarm()).resolves.toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);

    // Completed notes release their nodes; the active alarm keeps its context
    // available for the next reminder without rebuilding ambient resources.
    const firstNotes = context.sources.slice(3);
    firstNotes.forEach(note => note.onended());
    firstNotes.forEach(note => expect(note.disconnect).toHaveBeenCalledTimes(1));
    jest.advanceTimersByTime(7999);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    expect(context.suspend).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(context.createOscillator).toHaveBeenCalledTimes(6);
    expect(context.createBufferSource).toHaveBeenCalledTimes(3);
    expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
  });

  test('stopping an alarm silences current and scheduled notes while preserving ambience and one-shot effects', async () => {
    await engine.start();
    await engine.tap();
    const tap = context.sources[3];
    await engine.startAlarm();
    const notes = context.sources.slice(4);
    engine.stopAlarm();
    engine.stopAlarm();

    notes.forEach(note => {
      expect(note.stop).toHaveBeenLastCalledWith();
      expect(note.disconnect).toHaveBeenCalledTimes(1);
      expect(note.onended).toBeNull();
    });
    expect(tap.disconnect).not.toHaveBeenCalled();
    expect(tap.stop).toHaveBeenCalledTimes(1);
    expect(engine.playing).toBe(true);
    jest.advanceTimersByTime(24000);
    await Promise.resolve();
    expect(context.createOscillator).toHaveBeenCalledTimes(4);
    expect(context.suspend).not.toHaveBeenCalled();
  });

  test('stopping during a pending alarm unlock prevents delayed ringing', async () => {
    let finishResume;
    context.resume.mockImplementationOnce(() => new Promise(resolve => {
      finishResume = () => { context.state = 'running'; resolve(); };
    }));
    const starting = engine.startAlarm();
    engine.stopAlarm();
    finishResume();
    await expect(starting).resolves.toBe(false);
    jest.advanceTimersByTime(24000);
    expect(context.createOscillator).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    await expect(engine.startAlarm()).resolves.toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
  });

  test('unavailable or blocked alarm audio fails quietly and can be retried', async () => {
    globalThis.AudioContext = undefined;
    await expect(engine.unlock()).resolves.toBe(false);
    await expect(engine.startAlarm()).resolves.toBe(false);
    expect(jest.getTimerCount()).toBe(0);

    globalThis.AudioContext = jest.fn(() => context);
    context.resume.mockRejectedValueOnce(new Error('User gesture required'));
    await expect(engine.startAlarm()).resolves.toBe(false);
    jest.advanceTimersByTime(24000);
    expect(context.createOscillator).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    await expect(engine.startAlarm()).resolves.toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
  });

  test('a failed alarm note cancels preceding notes and releases partial nodes', async () => {
    await engine.unlock();
    const makeGain = context.createGain.getMockImplementation();
    context.createGain.mockImplementationOnce(makeGain).mockImplementationOnce(() => {
      throw new Error('Unavailable audio node');
    });
    await expect(engine.startAlarm()).resolves.toBe(false);
    const notes = context.sources.slice(3);
    expect(notes).toHaveLength(2);
    notes.forEach(note => expect(note.disconnect).toHaveBeenCalled());
    expect(notes[0].stop).toHaveBeenLastCalledWith();
    jest.advanceTimersByTime(24000);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
    await expect(engine.startAlarm()).resolves.toBe(true);
  });

  test('a slow browser resume does not queue a burst of missed reminders', async () => {
    await engine.startAlarm();
    context.state = 'suspended';
    let finishResume;
    context.resume.mockImplementationOnce(() => new Promise(resolve => {
      finishResume = () => { context.state = 'running'; resolve(); };
    }));
    jest.advanceTimersByTime(24000);
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    finishResume();
    await Promise.resolve();
    await Promise.resolve();
    expect(context.createOscillator).toHaveBeenCalledTimes(6);
  });

  test('destroy cancels the alarm cadence and prevents later alarms or unlocks', async () => {
    await engine.startAlarm();
    await engine.destroy();
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(24000);
    await Promise.resolve();
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    context.nodes.forEach(node => expect(node.disconnect).toHaveBeenCalled());
    await expect(engine.startAlarm()).resolves.toBe(false);
    await expect(engine.unlock()).resolves.toBe(false);
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
