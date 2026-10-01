import {
  ANIMALS, PRESETS, createInitialState, gameReducer, normalizeState,
  remainingTime, formatTime, todayStats,
} from './game';

const MINUTE = 60_000;
const NOW = new Date(2026, 9, 1, 12).getTime();
const act = (state, type, extra = {}) => gameReducer(state, { type, now: NOW, ...extra });
const richState = (gems = 1000) => ({ ...createInitialState(NOW), gems });

describe('focus sessions and rewards', () => {
  test('a fresh save has a free companion, a full classic timer, and no rewards', () => {
    const state = createInitialState(NOW);
    expect(state.gems).toBe(0);
    expect(state.animals).toEqual([expect.objectContaining({ species: 'cat', name: 'Miso', placed: true, x: 28, y: 76 })]);
    expect(state.timer).toEqual(expect.objectContaining({ status: 'idle', durationMs: 25 * MINUTE, remainingMs: 25 * MINUTE }));
    expect(state.history).toEqual([]);
  });

  test('uses elapsed wall time, so throttled tabs do not slow the countdown', () => {
    let state = act(createInitialState(NOW), 'START');
    expect(remainingTime(state.timer, NOW + 18 * MINUTE + 1234)).toBe(7 * MINUTE - 1234);
    state = act(state, 'TICK', { now: NOW + 26 * MINUTE });
    expect(state.gems).toBe(25);
    expect(state.history).toEqual([{ id: expect.any(String), task: '', minutes: 25, completedAt: NOW + 25 * MINUTE }]);
    expect(state.timer.mode).toBe('break');
    expect(state.timer.status).toBe('idle');
    expect(act(state, 'TICK', { now: NOW + 100 * MINUTE })).toBe(state);
    expect(state.event.type).toBe('focus-complete');
  });

  test('pause and reload retain exact time; paused wall time earns nothing', () => {
    let state = act(createInitialState(NOW), 'START');
    state = act(state, 'PAUSE', { now: NOW + 2 * MINUTE + 456 });
    const remaining = 23 * MINUTE - 456;
    expect(remainingTime(state.timer, NOW + 100 * MINUTE)).toBe(remaining);
    state = normalizeState(JSON.parse(JSON.stringify(state)), NOW + 100 * MINUTE);
    expect(state.timer.status).toBe('paused');
    expect(state.timer.remainingMs).toBe(remaining);
    expect(state.gems).toBe(0);
    state = act(state, 'START', { now: NOW + 100 * MINUTE });
    expect(state.timer.endsAt).toBe(NOW + 100 * MINUTE + remaining);
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.gems).toBe(25);
    expect(state.history).toHaveLength(1);
  });

  test('reloading a running session retains its original deadline', () => {
    const running = act(createInitialState(NOW), 'START');
    const loaded = normalizeState(JSON.parse(JSON.stringify(running)), NOW + 10 * MINUTE);
    expect(loaded.timer.endsAt).toBe(running.timer.endsAt);
    expect(remainingTime(loaded.timer, NOW + 10 * MINUTE)).toBe(15 * MINUTE);
    expect(loaded.gems).toBe(0);
  });

  test('an expired save credits one focus session and stops, even with both auto starts', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', { settings: { autoStartBreaks: true, autoStartFocus: true } });
    state = act(state, 'START');
    state = normalizeState(state, NOW + 24 * 60 * MINUTE);
    expect(state.gems).toBe(25);
    expect(state.history).toHaveLength(1);
    expect(state.timer.mode).toBe('break');
    expect(state.timer.status).toBe('idle');
    expect(normalizeState(state, NOW + 48 * 60 * MINUTE).gems).toBe(25);
  });

  test('a completed session ID already in history cannot earn a second reward', () => {
    let state = act(createInitialState(NOW), 'START');
    state = { ...state, gems: 25, history: [{ id: state.timer.id, minutes: 25, task: '', completedAt: NOW }] };
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.gems).toBe(25);
    expect(state.history).toHaveLength(1);
    expect(state.event.gems).toBe(0);
  });

  test.each(['RESET', 'SKIP', 'SET_MODE'])('%s abandons an incomplete focus session without gems', type => {
    let state = act(createInitialState(NOW), 'START');
    const sessionId = state.timer.id;
    state = act(state, type, { mode: 'longBreak', now: NOW + 24 * MINUTE });
    expect(state.timer.status).toBe('idle');
    expect(state.timer.id).not.toBe(sessionId);
    expect(state.gems).toBe(0);
    expect(state.history).toHaveLength(0);
  });

  test('pausing exactly at the deadline credits completion rather than leaving a zero timer', () => {
    let state = act(createInitialState(NOW), 'START');
    state = act(state, 'PAUSE', { now: state.timer.endsAt });
    expect(state.gems).toBe(25);
    expect(state.timer.mode).toBe('break');
    expect(state.timer.status).toBe('idle');
  });

  test('long breaks follow the configured number of completed focus sessions', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', { settings: { focusMinutes: 1, breakMinutes: 2, longBreakMinutes: 7, longBreakEvery: 3 } });
    for (let completed = 1; completed <= 3; completed += 1) {
      state = act(state, 'START');
      state = act(state, 'TICK', { now: state.timer.endsAt });
      expect(state.timer.mode).toBe(completed === 3 ? 'longBreak' : 'break');
      expect(state.timer.durationMs).toBe((completed === 3 ? 7 : 2) * MINUTE);
      state = act(state, 'START');
      state = act(state, 'TICK', { now: state.timer.endsAt });
      expect(state.timer.mode).toBe('focus');
      expect(state.gems).toBe(completed);
      expect(state.history).toHaveLength(completed);
    }
  });

  test('a late tick starts only the next mode at now, without replaying unattended cycles', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', { settings: { focusMinutes: 1, breakMinutes: 1, autoStartBreaks: true, autoStartFocus: true } });
    state = act(state, 'START');
    const late = NOW + 12 * 60 * MINUTE;
    state = act(state, 'TICK', { now: late });
    expect(state.gems).toBe(1);
    expect(state.timer).toEqual(expect.objectContaining({ mode: 'break', status: 'running', endsAt: late + MINUTE }));
    state = act(state, 'TICK', { now: late + MINUTE });
    expect(state.gems).toBe(1);
    expect(state.timer).toEqual(expect.objectContaining({ mode: 'focus', status: 'running', endsAt: late + 2 * MINUTE }));
    state = act(state, 'TICK', { now: late + 2 * MINUTE });
    expect(state.gems).toBe(2);
  });

  test.each(['running', 'paused'])('settings and presets preserve a %s session and its original reward', status => {
    let state = act(createInitialState(NOW), 'SET_TASK', { task: '  Write chapter  ' });
    state = act(state, 'START');
    if (status === 'paused') state = act(state, 'PAUSE', { now: NOW + MINUTE });
    const before = state.timer;
    state = act(state, 'SET_PRESET', { id: 'deep' });
    expect(state.settings.focusMinutes).toBe(50);
    expect(state.timer).toBe(before);
    if (status === 'paused') state = act(state, 'START', { now: NOW + 2 * MINUTE });
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.gems).toBe(25);
    expect(state.history[0].task).toBe('Write chapter');
    expect(state.timer.durationMs).toBe(10 * MINUTE);
    state = act(state, 'SKIP');
    expect(state.timer.durationMs).toBe(50 * MINUTE);
  });

  test.each(PRESETS)('$name applies all three mode lengths to idle timers', preset => {
    let state = act(createInitialState(NOW), 'SET_PRESET', { id: preset.id });
    expect(state.timer.durationMs).toBe(preset.settings.focusMinutes * MINUTE);
    state = act(state, 'SET_MODE', { mode: 'break' });
    expect(state.timer.durationMs).toBe(preset.settings.breakMinutes * MINUTE);
    state = act(state, 'SET_MODE', { mode: 'longBreak' });
    expect(state.timer.durationMs).toBe(preset.settings.longBreakMinutes * MINUTE);
  });

  test('task and scratchpad text are bounded and daily recap counts local-day focus records', () => {
    let state = act(createInitialState(NOW), 'SET_TASK', { task: 'a'.repeat(250) });
    state = act(state, 'SET_SCRATCHPAD', { text: 'b'.repeat(11_000) });
    expect(state.timer.task).toHaveLength(200);
    expect(state.scratchpad).toHaveLength(10_000);
    state.history = [
      { id: 'today-1', completedAt: NOW, minutes: 25 },
      { id: 'today-2', completedAt: new Date(2026, 9, 1, 0, 1).getTime(), minutes: 15 },
      { id: 'yesterday', completedAt: new Date(2026, 8, 30, 23, 59).getTime(), minutes: 50 },
    ];
    expect(todayStats(state, NOW)).toEqual({ sessions: 2, minutes: 40, gems: 40, goal: 4, progress: 0.5 });
  });

  test('formatting rounds up partial seconds and handles invalid or elapsed values', () => {
    expect(formatTime(25 * MINUTE)).toBe('25:00');
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(60_001)).toBe('01:01');
    expect(formatTime(-1)).toBe('00:00');
    expect(formatTime(NaN)).toBe('00:00');
  });
});

describe('eggs, inventory, and room ownership', () => {
  test('basic eggs cost 25 Shilligems and do not consume rare pity', () => {
    const state = act({ ...richState(25), pity: 3 }, 'BUY_EGG', { kind: 'basic', roll: 0.99 });
    expect(state.gems).toBe(0);
    expect(state.eggs).toEqual([{ id: expect.any(String), rarity: 'everyday' }]);
    expect(state.pity).toBe(3);
  });

  test.each([[0, 'everyday'], [0.59999, 'everyday'], [0.6, 'rare'], [0.89999, 'rare'], [0.9, 'dreamy'], [1, 'dreamy']])('mystery roll %s gives %s at the 60/30/10 boundaries', (roll, rarity) => {
    const state = act(richState(60), 'BUY_EGG', { kind: 'mystery', roll });
    expect(state.gems).toBe(0);
    expect(state.eggs[0].rarity).toBe(rarity);
  });

  test('the fifth consecutive mystery roll guarantees rare or better and resets pity', () => {
    let state = richState();
    for (let count = 1; count <= 5; count += 1) {
      state = act(state, 'BUY_EGG', { kind: 'mystery', roll: 0 });
      expect(state.eggs[count - 1].rarity).toBe(count === 5 ? 'rare' : 'everyday');
      expect(state.pity).toBe(count === 5 ? 0 : count);
    }
    expect(new Set(state.eggs.map(egg => egg.id)).size).toBe(5);
    state = act({ ...state, pity: 4 }, 'BUY_EGG', { kind: 'mystery', roll: 0.99 });
    expect(state.eggs[5].rarity).toBe('dreamy');
    expect(state.pity).toBe(0);
  });

  test.each([['basic', 24], ['mystery', 59]])('insufficient funds for %s leave wallet and inventory unchanged', (kind, gems) => {
    const before = richState(gems);
    const state = act(before, 'BUY_EGG', { kind, roll: 1 });
    expect(state.gems).toBe(gems);
    expect(state.eggs).toBe(before.eggs);
    expect(state.pity).toBe(before.pity);
    expect(state.event.type).toBe('error');
  });

  test('hatching consumes each egg once, keeps duplicate species, and uses unique animal IDs', () => {
    let state = richState();
    for (let count = 0; count < 3; count += 1) state = act(state, 'BUY_EGG', { kind: 'basic' });
    const ids = state.eggs.map(egg => egg.id);
    for (const id of ids) {
      state = act(state, 'HATCH_EGG', { id, roll: 0 });
      const hatched = state;
      state = act(state, 'HATCH_EGG', { id, roll: 0 });
      expect(state).toBe(hatched);
    }
    expect(state.eggs).toHaveLength(0);
    expect(state.animals).toHaveLength(4);
    expect(state.animals.every(animal => animal.species === 'cat')).toBe(true);
    expect(new Set(state.animals.map(animal => animal.id)).size).toBe(4);
    expect(state.gems).toBe(925);
  });

  test.each(ANIMALS)('can hatch $name while preserving the egg rarity', (species) => {
    let state = act(richState(), 'BUY_EGG', { kind: 'mystery', roll: 1 });
    state = act(state, 'HATCH_EGG', { id: state.eggs[0].id, roll: ANIMALS.indexOf(species) / ANIMALS.length });
    expect(state.animals[1]).toEqual(expect.objectContaining({ species: species.id, rarity: 'dreamy' }));
  });

  test('owned items charge once and locked backgrounds/accessories cannot be equipped', () => {
    let state = richState(75);
    expect(act(state, 'SET_BACKGROUND', { id: 'moonroom' })).toBe(state);
    expect(act(state, 'SET_ACCESSORY', { id: 'bow', animalId: 'starter-cat' })).toBe(state);
    state = act(state, 'BUY_ITEM', { category: 'backgrounds', id: 'moonroom' });
    expect(state.gems).toBe(0);
    expect(act(state, 'BUY_ITEM', { category: 'backgrounds', id: 'moonroom' })).toBe(state);
    state = act(state, 'SET_BACKGROUND', { id: 'moonroom' });
    expect(state.room.background).toBe('moonroom');
    const failed = act(state, 'BUY_ITEM', { category: 'accessories', id: 'bow' });
    expect(failed.gems).toBe(0);
    expect(failed.owned.accessories).toEqual(['none']);
  });

  test('accessories can be shared and animals can be stored and placed without being lost', () => {
    let state = act(richState(), 'BUY_ITEM', { category: 'accessories', id: 'bow' });
    state = act(state, 'SET_ACCESSORY', { id: 'bow', animalId: 'starter-cat' });
    state = act(state, 'PLACE_ANIMAL', { id: 'starter-cat', placed: false });
    expect(state.animals[0]).toEqual(expect.objectContaining({ accessory: 'bow', placed: false }));
    state = act(state, 'PLACE_ANIMAL', { id: 'starter-cat', placed: true });
    expect(state.animals).toHaveLength(1);
    expect(state.animals[0].placed).toBe(true);
  });

  test('animals and owned decorations stay on the room floor, and furniture can be removed', () => {
    let state = richState();
    expect(act(state, 'PLACE_DECORATION', { item: 'plant' })).toBe(state);
    state = act(state, 'BUY_ITEM', { category: 'decorations', id: 'plant' });
    state = act(state, 'PLACE_DECORATION', { item: 'plant', x: -20, y: 200 });
    expect(state.room.decorations[0]).toEqual(expect.objectContaining({ x: 5, y: 85 }));
    const id = state.room.decorations[0].id;
    state = act(state, 'MOVE_DECORATION', { id, x: 200, y: -1 });
    expect(state.room.decorations[0]).toEqual(expect.objectContaining({ x: 95, y: 48 }));
    state = act(state, 'MOVE_ANIMAL', { id: 'starter-cat', x: 500, y: -400 });
    expect(state.animals[0]).toEqual(expect.objectContaining({ x: 95, y: 48 }));
    state = act(state, 'MOVE_ANIMAL', { id: 'starter-cat', x: NaN, y: undefined });
    expect(state.animals[0]).toEqual(expect.objectContaining({ x: 95, y: 48 }));
    state = act(state, 'REMOVE_DECORATION', { id });
    expect(state.room.decorations).toEqual([]);
    expect(state.owned.decorations).toEqual(['plant']);
  });
});

describe('saved-state recovery', () => {
  test.each([null, [], 'invalid', {}, { schemaVersion: 999 }])('an invalid document %p opens a safe starter state', saved => {
    expect(normalizeState(saved, NOW)).toEqual(createInitialState(NOW));
  });

  test('normalizes malformed data, duplicate IDs, invalid catalog entries, and unowned equipment', () => {
    const saved = {
      ...createInitialState(NOW), gems: -40, pity: 90, event: { type: 'focus-complete' },
      owned: { backgrounds: ['moonroom', 'moonroom', 'invalid'], accessories: ['bow'], decorations: ['plant'] },
      animals: [null, { id: 'one', species: 'cat', rarity: 'unknown', accessory: 'crown', x: 500, y: -3, name: 'x'.repeat(50) }, { id: 'one', species: 'dog' }, { id: 'bad', species: 'dinosaur' }],
      room: { background: 'greenhouse', decorations: [{ id: 'plant', item: 'plant', x: -5, y: 100 }, { id: 'plant', item: 'plant' }, { id: 'bad', item: 'books' }] },
      eggs: [null, { id: 'egg', rarity: 'rare', injected: true }, { id: 'egg', rarity: 'dreamy' }, { id: 'bad', rarity: 'unknown' }],
      history: [null, { id: 'record', task: 'test', completedAt: NOW, minutes: 25 }, { id: 'record', completedAt: NOW, minutes: 25 }, { id: 'bad', completedAt: NOW, minutes: -1 }],
      settings: { focusMinutes: NaN, breakMinutes: 1000, longBreakMinutes: 0, dailyGoal: 0, longBreakEvery: -1, autoStartFocus: 'true', ambient: { rain: -1, fire: 2, noise: NaN } },
    };
    const state = normalizeState(saved, NOW);
    expect(state.gems).toBe(0);
    expect(state.pity).toBe(4);
    expect(state.event).toBe(null);
    expect(state.owned.backgrounds).toEqual(['sunroom', 'moonroom']);
    expect(state.animals).toHaveLength(1);
    expect(state.animals[0]).toEqual(expect.objectContaining({ rarity: 'everyday', accessory: 'none', x: 95, y: 48 }));
    expect(state.animals[0].name).toHaveLength(40);
    expect(state.room.background).toBe('sunroom');
    expect(state.room.decorations).toEqual([{ id: 'plant', item: 'plant', x: 5, y: 85 }]);
    expect(state.eggs).toEqual([{ id: 'egg', rarity: 'rare' }]);
    expect(state.history).toHaveLength(1);
    expect(state.settings).toEqual(expect.objectContaining({ focusMinutes: 25, breakMinutes: 60, longBreakMinutes: 1, dailyGoal: 1, longBreakEvery: 1, autoStartFocus: false, ambient: { rain: 0, fire: 1, noise: 0 } }));
  });

  test('missing collections recover without losing the free companion or unlocked defaults', () => {
    const state = normalizeState({ schemaVersion: 1 }, NOW);
    expect(state.animals[0].species).toBe('cat');
    expect(state.owned.backgrounds).toEqual(['sunroom']);
    expect(state.owned.accessories).toEqual(['none']);
    expect(state.timer.remainingMs).toBe(25 * MINUTE);
  });

  test('a running save with a missing deadline pauses instead of awarding an unearned session', () => {
    const saved = createInitialState(NOW);
    saved.timer = { ...saved.timer, status: 'running', remainingMs: 5 * MINUTE, endsAt: 'invalid' };
    const state = normalizeState(saved, NOW);
    expect(state.timer.status).toBe('paused');
    expect(state.timer.remainingMs).toBe(5 * MINUTE);
    expect(state.gems).toBe(0);
  });

  test.each([['focus', 180], ['break', 60], ['longBreak', 120]])('bounds corrupt %s duration and deadline to %s minutes', (mode, max) => {
    const saved = createInitialState(NOW);
    saved.timer = { ...saved.timer, mode, status: 'running', durationMs: 1000 * MINUTE, endsAt: NOW + 1000 * MINUTE };
    const state = normalizeState(saved, NOW);
    expect(state.timer.durationMs).toBe(max * MINUTE);
    expect(state.timer.endsAt).toBe(NOW + max * MINUTE);
  });

  test('an expired saved break never awards gems or auto-starts focus', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', { settings: { autoStartFocus: true } });
    state = act(state, 'SET_MODE', { mode: 'break' });
    state = act(state, 'START');
    state = normalizeState(state, NOW + 60 * MINUTE);
    expect(state.timer).toEqual(expect.objectContaining({ mode: 'focus', status: 'idle' }));
    expect(state.gems).toBe(0);
    expect(state.history).toEqual([]);
  });

  test('wallet balance stays a safe nonnegative integer at its storage bound', () => {
    let state = act({ ...createInitialState(NOW), gems: Number.MAX_SAFE_INTEGER }, 'START');
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.gems).toBe(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(state.gems)).toBe(true);
  });
});
