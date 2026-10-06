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

  test.each(['tap', 'selection', 'paper', 'check', 'purchase', 'placement', 'hatch'])(
    '%s SFX is quiet, short, independently routed, and releases its nodes', async name => {
      await expect(engine.playSfx(name)).resolves.toBe(true);
      const sfxOutput = context.gains[4];
      expect(sfxOutput.gain.value).toBe(0.35);
      const notes = context.sources.slice(3);
      expect(notes.length).toBeGreaterThan(0);
      notes.forEach(note => expect(note.stop.mock.calls[0][0]).toBeLessThanOrEqual(0.6));
      const envelopes = context.gains.slice(5);
      envelopes.forEach(gain => {
        expect(gain.connect).toHaveBeenCalledWith(sfxOutput);
        gain.gain.linearRampToValueAtTime.mock.calls.forEach(([peak]) => {
          expect(peak).toBeLessThanOrEqual(0.04);
        });
      });
      notes.forEach(note => { note.onended(); expect(note.disconnect).toHaveBeenCalledTimes(1); });
      jest.advanceTimersByTime(500);
      expect(context.state).toBe('suspended');
    });

  test('muted or zero-volume SFX never unlocks audio, while alerts still play', async () => {
    engine.setInteractionSfx({ enabled: false, volume: 0.6 });
    await expect(engine.tap()).resolves.toBe(false);
    expect(globalThis.AudioContext).not.toHaveBeenCalled();
    await expect(engine.chime()).resolves.toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    engine.setInteractionSfx({ enabled: true, volume: 0 });
    await expect(engine.playSfx('hatch')).resolves.toBe(false);
    await expect(engine.startAlarm()).resolves.toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(6);
  });

  test('SFX configuration is silent, clamps volume, and leaves ambience alone', async () => {
    engine.setInteractionSfx({ volume: 10 });
    expect(globalThis.AudioContext).not.toHaveBeenCalled();
    await engine.tap();
    const sfxOutput = context.gains[4];
    expect(sfxOutput.gain.value).toBe(1);
    engine.setInteractionSfx({ volume: 0.2 });
    expect(sfxOutput.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.2, 0, 0.008);
    engine.setInteractionSfx({ volume: NaN, enabled: 'false' });
    expect(sfxOutput.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.2, 0, 0.008);
    engine.setInteractionSfx({ volume: -1 });
    expect(sfxOutput.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.008);
    context.gains.slice(0, 4).forEach(gain => expect(gain.gain.setTargetAtTime).not.toHaveBeenCalled());
  });

  test('muting cancels only SFX, including a pending unlock across mute/unmute', async () => {
    let finishResume;
    context.resume.mockImplementationOnce(() => new Promise(resolve => {
      finishResume = () => { context.state = 'running'; resolve(); };
    }));
    const pending = engine.playSfx('hatch');
    engine.setInteractionSfx({ enabled: false });
    engine.setInteractionSfx({ enabled: true });
    finishResume();
    await expect(pending).resolves.toBe(false);
    expect(context.createOscillator).not.toHaveBeenCalled();

    await engine.start();
    await engine.startAlarm();
    const alarmNotes = context.sources.slice(3);
    await engine.playSfx('hatch');
    const hatchNotes = context.sources.slice(6);
    engine.setInteractionSfx({ enabled: false });
    hatchNotes.forEach(note => expect(note.disconnect).toHaveBeenCalledTimes(1));
    alarmNotes.forEach(note => expect(note.disconnect).not.toHaveBeenCalled());
    expect(engine.playing).toBe(true);
    expect(context.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.07);
  });

  test('rapid SFX requests are dropped during unlock and within the cooldown', async () => {
    const first = engine.playSfx('tap');
    await expect(engine.playSfx('check')).resolves.toBe(false);
    await expect(first).resolves.toBe(true);
    await expect(engine.playSfx('tap')).resolves.toBe(false);
    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    context.currentTime = 0.11;
    await expect(engine.playSfx('selection')).resolves.toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
  });

  test('unknown, blocked, and partially failed SFX fail quietly without orphaned notes', async () => {
    await expect(engine.playSfx('toString')).resolves.toBe(false);
    expect(globalThis.AudioContext).not.toHaveBeenCalled();
    context.resume.mockRejectedValueOnce(new Error('User gesture required'));
    await expect(engine.playSfx('paper')).resolves.toBe(false);
    await engine.unlock();
    const makeGain = context.createGain.getMockImplementation();
    context.createGain.mockImplementationOnce(makeGain).mockImplementationOnce(() => {
      throw new Error('Unavailable audio node');
    });
    await expect(engine.playSfx('check')).resolves.toBe(false);
    context.sources.slice(3).forEach(note => expect(note.disconnect).toHaveBeenCalled());
    await expect(engine.playSfx('check')).resolves.toBe(true);
    await engine.destroy();
    await expect(engine.playSfx('paper')).resolves.toBe(false);
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
