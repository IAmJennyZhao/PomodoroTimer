import {
  ANIMALS, PRESETS, createInitialState as createFreshState, gameReducer, normalizeState,
  remainingTime, elapsedTime, isCountingUp, canTakeBreak, MAX_TRACKED_MS, formatTime, formatElapsedTime, todayStats,
  EGG_MINUTES, RARITY_STARS, MAX_UPGRADES, animationCount, gemBonus, pauseRemainingTime, spendableGems,
} from './game';

const MINUTE = 60_000;
const NOW = new Date(2026, 9, 1, 12).getTime();
// Reward/accounting tests start with an existing empty wallet so totals stay explicit.
const createInitialState = (now) => ({ ...createFreshState(now), gems: 0 });
const act = (state, type, extra = {}) => gameReducer(state, { type, now: NOW, ...extra });
const richState = (gems = 1000) => ({ ...createInitialState(NOW), gems });
const readyEggs = (state) => ({ ...state, eggs: state.eggs.map(egg => ({ ...egg, progressMinutes: egg.requiredMinutes })) });

test.each([20_000,150_000])('overtime completion reports total and extra gems without recrediting across reload: %i',extra=>{
  let state=act(createInitialState(NOW),'SET_SETTINGS',{settings:{focusMinutes:1,endBehavior:'overtime'}});
  state=act(state,'START');
  state=act(state,'TICK',{now:NOW+MINUTE});
  expect(state.gems).toBe(1);
  state=normalizeState(JSON.parse(JSON.stringify(state)),NOW+MINUTE+extra);
  state=act(state,'START_BREAK',{mode:'break',now:NOW+MINUTE+extra});
  const total=1+Math.floor(extra/MINUTE);
  expect(state.event).toMatchObject({gems:total-1,totalGems:total,baseGems:1,overtimeGems:total-1});
  expect(state.event.message).toContain(`+${total} Shilligem${total===1?'':'s'} total (1 target + ${total-1} overtime)`);
  expect(state.gems).toBe(total);
  expect(state.history).toHaveLength(1);
  expect(state.history[0].gems).toBe(total);
  state=normalizeState(JSON.parse(JSON.stringify(state)),NOW+MINUTE+extra+1000);
  expect(act(state,'FINISH_FOCUS',{now:NOW+MINUTE+extra+1000}).gems).toBe(total);
});

test('forfeited overtime retains focus and egg credit while reporting zero total reward',()=>{
  let state=act(createInitialState(NOW),'SET_SETTINGS',{settings:{focusMinutes:1,endBehavior:'overtime'}});
  state.eggs=[{id:'egg',rarity:'basic',requiredMinutes:25,progressMinutes:0,createdAt:NOW}];
  state.selectedEggId='egg';
  state=act(state,'START');
  state=act(state,'PAUSE',{now:NOW+MINUTE+1000});
  state=act(state,'TICK',{now:NOW+2*MINUTE+1001});
  state=act(state,'START',{now:NOW+2*MINUTE+1001});
  state=act(state,'FINISH_FOCUS',{now:NOW+3*MINUTE+1001});
  expect(state.gems).toBe(0);
  expect(state.event).toMatchObject({gems:0,totalGems:0,baseGems:0,overtimeGems:0});
  expect(state.history[0]).toMatchObject({minutes:2,gems:0,rewardForfeited:true});
  expect(state.eggs[0].progressMinutes).toBe(2);
});

describe('interaction sound preferences', () => {
  test('older saves get quiet defaults and preserve previously muted taps', () => {
    const saved = createInitialState(NOW);
    delete saved.settings.interactionSfxEnabled;
    delete saved.settings.interactionSfxVolume;
    expect(normalizeState(saved, NOW).settings).toMatchObject({ interactionSfxEnabled: true, interactionSfxVolume: 0.35 });
    saved.settings.soundEnabled = false;
    expect(normalizeState(saved, NOW).settings).toMatchObject({ interactionSfxEnabled: false, interactionSfxVolume: 0.35 });
  });

  test('SFX enable and volume survive serialization independently of timer alerts', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', {
      settings: { interactionSfxEnabled: false, interactionSfxVolume: 0.62 },
    });
    state = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
    expect(state.settings).toMatchObject({ soundEnabled: true, interactionSfxEnabled: false, interactionSfxVolume: 0.62 });
    state = act(state, 'SET_SETTINGS', { settings: { soundEnabled: false, interactionSfxEnabled: true } });
    expect(normalizeState(state, NOW).settings).toMatchObject({ soundEnabled: false, interactionSfxEnabled: true, interactionSfxVolume: 0.62 });
  });

  test('invalid preferences fall back safely and volumes clamp at both ends', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', { settings: { interactionSfxEnabled: 'false', interactionSfxVolume: NaN } });
    expect(state.settings).toMatchObject({ interactionSfxEnabled: true, interactionSfxVolume: 0.35 });
    state = act(state, 'SET_SETTINGS', { settings: { interactionSfxVolume: 10 } });
    expect(state.settings.interactionSfxVolume).toBe(1);
    state = act(state, 'SET_SETTINGS', { settings: { interactionSfxVolume: -1 } });
    expect(state.settings.interactionSfxVolume).toBe(0);
  });
});

describe('focus sessions and rewards', () => {
  test('a fresh save has 200 gift gems, a free companion, and no earned rewards', () => {
    const state = createFreshState(NOW);
    expect(state.gems).toBe(200);
    expect(todayStats(state, NOW)).toMatchObject({ gems: 0, minutes: 0 });
    expect(state.animals).toEqual([expect.objectContaining({ species: 'cat', name: 'Miso', placed: true, x: 80, y: 68 })]);
    expect(state.timer).toEqual(expect.objectContaining({ status: 'idle', durationMs: 25 * MINUTE, remainingMs: 25 * MINUTE }));
    expect(state.history).toEqual([]);
  });

  test('the first-room gift is spent once and never granted again on reload', () => {
    let state = act(createFreshState(NOW), 'BUY_EGG', { kind: 'basic' });
    expect(state.gems).toBe(175);
    state = act(state, 'BUY_EGG', { kind: 'mystery', roll: 0.5 });
    expect(state.gems).toBe(115);
    for (let reload = 0; reload < 3; reload += 1) {
      state = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
      expect(state.gems).toBe(115);
      expect(todayStats(state, NOW)).toMatchObject({ gems: 0, minutes: 0 });
    }
  });

  test.each([0, 15, 200])('loading an existing %i-gem wallet preserves its balance', (gems) => {
    const saved = { ...createFreshState(NOW), gems };
    expect(normalizeState(saved, NOW).gems).toBe(gems);
    delete saved.progressionVersion;
    expect(normalizeState(saved, NOW).gems).toBe(gems);
  });

  test('uses elapsed wall time, so throttled tabs do not slow the countdown', () => {
    let state = act(createInitialState(NOW), 'START');
    expect(remainingTime(state.timer, NOW + 18 * MINUTE + 1234)).toBe(7 * MINUTE - 1234);
    state = act(state, 'TICK', { now: NOW + 26 * MINUTE });
    expect(state.gems).toBe(25);
    expect(state.history).toEqual([expect.objectContaining({ id: expect.any(String), task: '', minutes: 25, completedAt: NOW + 25 * MINUTE })]);
    expect(state.timer.mode).toBe('focus');
    expect(state.timer.status).toBe('complete');
    expect(act(state, 'TICK', { now: NOW + 100 * MINUTE })).toBe(state);
    expect(state.event.type).toBe('focus-complete');
  });

  test('an overlong pause retains exact work time but forfeits rewards across reload', () => {
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
    expect(state.gems).toBe(0);
    expect(state.timer.rewardForfeited).toBe(true);
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
    expect(state.timer.mode).toBe('focus');
    expect(state.timer.status).toBe('complete');
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

  test.each(['RESET', 'SKIP', 'SET_MODE'])('%s can restart an incomplete focus session without gems', type => {
    let state = act(createInitialState(NOW), 'START');
    const sessionId = state.timer.id;
    state = act(state, type, { mode: 'focus', now: NOW + 24 * MINUTE });
    expect(state.timer.status).toBe('idle');
    expect(state.timer.id).not.toBe(sessionId);
    expect(state.gems).toBe(0);
    expect(state.history).toHaveLength(0);
  });

  test('pausing exactly at the deadline credits completion rather than leaving a zero timer', () => {
    let state = act(createInitialState(NOW), 'START');
    state = act(state, 'PAUSE', { now: state.timer.endsAt });
    expect(state.gems).toBe(25);
    expect(state.timer.mode).toBe('focus');
    expect(state.timer.status).toBe('complete');
  });

  test('default break choice follows the configured number of completed focus sessions', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', { settings: { focusMinutes: 1, breakMinutes: 2, longBreakMinutes: 7, longBreakEvery: 3 } });
    for (let completed = 1; completed <= 3; completed += 1) {
      state = act(state, 'START');
      state = act(state, 'TICK', { now: state.timer.endsAt });
      expect(state.timer.status).toBe('complete');
      state = act(state, 'START_BREAK');
      expect(state.timer.mode).toBe(completed === 3 ? 'longBreak' : 'break');
      expect(state.timer.durationMs).toBe((completed === 3 ? 7 : 2) * MINUTE);
      state = act(state, 'START');
      state = act(state, 'TICK', { now: state.timer.endsAt });
      expect(state.timer.mode).toBe('focus');
      expect(state.gems).toBe(completed);
      expect(state.history).toHaveLength(completed);
    }
  });

  test('a late tick waits for a break choice and opted-in auto-focus starts only after that break', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', { settings: { focusMinutes: 1, breakMinutes: 1, autoStartBreaks: true, autoStartFocus: true } });
    state = act(state, 'START');
    const late = NOW + 12 * 60 * MINUTE;
    state = act(state, 'TICK', { now: late });
    expect(state.gems).toBe(1);
    expect(state.timer).toEqual(expect.objectContaining({ mode: 'focus', status: 'complete', endsAt: null }));
    state = act(state, 'START_BREAK', { now: late });
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
    expect(state.timer.durationMs).toBe(25 * MINUTE);
    state = act(state, 'START_BREAK');
    expect(state.timer.durationMs).toBe(10 * MINUTE);
    state = act(state, 'SKIP');
    expect(state.timer.durationMs).toBe(50 * MINUTE);
  });

  test.each(PRESETS)('$name applies all three mode lengths to idle timers', preset => {
    let state = act(createInitialState(NOW), 'SET_PRESET', { id: preset.id });
    expect(state.timer.durationMs).toBe(preset.settings.focusMinutes * MINUTE);
    state = act(state, 'START');
    state = act(state, 'TICK', { now: state.timer.endsAt });
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

  test('daily goal ignores future saved completions until their timestamp is reached', () => {
    const state = createInitialState(NOW);
    state.history = [
      { id: 'completed', completedAt: NOW, minutes: 25 },
      { id: 'future-today', completedAt: NOW + MINUTE, minutes: 15 },
    ];
    expect(todayStats(state, NOW)).toEqual({ sessions: 1, minutes: 25, gems: 25, goal: 4, progress: 0.25 });
    expect(todayStats(state, NOW + MINUTE)).toEqual({ sessions: 2, minutes: 40, gems: 40, goal: 4, progress: 0.5 });
    expect(state.history).toHaveLength(2);
  });

  test('formatting rounds up partial seconds and handles invalid or elapsed values', () => {
    expect(formatTime(25 * MINUTE)).toBe('25:00');
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(60_001)).toBe('01:01');
    expect(formatTime(-1)).toBe('00:00');
    expect(formatTime(NaN)).toBe('00:00');
  });

  test('elapsed formatting counts only completed seconds and never suggests an unearned minute', () => {
    expect(formatElapsedTime(999)).toBe('00:00');
    expect(formatElapsedTime(59_999)).toBe('00:59');
    expect(formatElapsedTime(60_000)).toBe('01:00');
    expect(formatElapsedTime(60_999)).toBe('01:00');
    expect(formatElapsedTime(-1)).toBe('00:00');
    expect(formatElapsedTime(NaN)).toBe('00:00');
    expect(formatElapsedTime(Infinity)).toBe('00:00');
    expect(formatElapsedTime(undefined)).toBe('00:00');
  });
});

describe('work modes and intentional break choices', () => {
  const countup = () => act(createInitialState(NOW), 'SET_SETTINGS', { settings: { workMode: 'countup' } });
  const overtime = () => act(createInitialState(NOW), 'SET_SETTINGS', { settings: { focusMinutes: 1, endBehavior: 'overtime' } });

  test('starts with Pomodoro and repeat reminders, and rejects invalid settings', () => {
    let state = createInitialState(NOW);
    expect(state.settings).toEqual(expect.objectContaining({ workMode: 'pomodoro', endBehavior: 'remind' }));
    state = act(state, 'SET_SETTINGS', { settings: { workMode: 'invalid', endBehavior: null } });
    expect(state.timer.workMode).toBe('pomodoro');
    expect(state.timer.endBehavior).toBe('remind');
  });

  test.each(['idle', 'running', 'paused'])('breaks stay locked during an incomplete %s focus session', status => {
    let state = createInitialState(NOW);
    if (status !== 'idle') state = act(state, 'START');
    if (status === 'paused') state = act(state, 'PAUSE', { now: NOW + MINUTE });
    expect(canTakeBreak(state.timer)).toBe(false);
    expect(act(state, 'START_BREAK', { mode: 'break', now: NOW + MINUTE })).toBe(state);
    expect(act(state, 'SET_MODE', { mode: 'longBreak', now: NOW + MINUTE })).toBe(state);
    expect(act(state, 'FINISH_FOCUS', { now: NOW + MINUTE })).toBe(state);
  });

  test.each(['break', 'longBreak'])('completion waits at zero and explicitly starts the selected %s', mode => {
    let state = act(createInitialState(NOW), 'START');
    const end = state.timer.endsAt;
    state = act(state, 'TICK', { now: end });
    expect(state.timer.status).toBe('complete');
    expect(canTakeBreak(state.timer)).toBe(true);
    expect(remainingTime(state.timer, end + 100 * MINUTE)).toBe(0);
    expect(act(state, 'START')).toBe(state);
    state = act(state, 'START_BREAK', { mode, now: end + MINUTE });
    expect(state.timer.mode).toBe(mode);
    expect(state.timer.status).toBe('running');
    expect(state.timer.endsAt).toBe(end + MINUTE + (mode === 'break' ? 5 : 15) * MINUTE);
    expect(state.gems).toBe(25);
  });

  test('countup starts at zero and only a finished whole minute earns one reward and goal credit', () => {
    let state = countup();
    expect(isCountingUp(state.timer)).toBe(true);
    expect(elapsedTime(state.timer, NOW)).toBe(0);
    state = act(state, 'START');
    expect(state.timer.endsAt).toBe(null);
    expect(elapsedTime(state.timer, NOW + 4 * MINUTE + 59_999)).toBe(4 * MINUTE + 59_999);
    expect(act(state, 'TICK', { now: NOW + 4 * MINUTE })).toBe(state);
    state = act(state, 'FINISH_FOCUS', { now: NOW + 4 * MINUTE + 59_999 });
    expect(state.timer.status).toBe('complete');
    expect(state.gems).toBe(4);
    expect(state.history).toEqual([expect.objectContaining({ minutes: 4 })]);
    expect(state.timer.cycle).toBe(1);
    expect(todayStats(state, NOW + 5 * MINUTE).sessions).toBe(1);
    expect(act(state, 'FINISH_FOCUS', { now: NOW + 10 * MINUTE })).toBe(state);
  });

  test('an accidental subminute countup can end and take a break without reward or goal credit', () => {
    let state = act(countup(), 'START');
    state = act(state, 'FINISH_FOCUS', { now: NOW + 59_999 });
    expect(state.timer.status).toBe('complete');
    expect(state.gems).toBe(0);
    expect(state.history).toHaveLength(0);
    expect(state.timer.cycle).toBe(0);
    expect(canTakeBreak(state.timer)).toBe(true);
    state = normalizeState(state, NOW + MINUTE);
    expect(canTakeBreak(state.timer)).toBe(true);
    expect(act(state, 'START_BREAK').timer.mode).toBe('break');
  });

  test('countup pauses, reloads, resumes, and excludes paused wall time', () => {
    let state = act(countup(), 'START');
    state = act(state, 'PAUSE', { now: NOW + 2 * MINUTE + 123 });
    expect(state.timer.elapsedMs).toBe(2 * MINUTE + 123);
    expect(state.timer.startedAt).toBe(null);
    state = normalizeState(state, NOW + 100 * MINUTE);
    expect(elapsedTime(state.timer, NOW + 200 * MINUTE)).toBe(2 * MINUTE + 123);
    state = act(state, 'START', { now: NOW + 200 * MINUTE });
    state = normalizeState(state, NOW + 202 * MINUTE);
    expect(elapsedTime(state.timer, NOW + 202 * MINUTE)).toBe(4 * MINUTE + 123);
    state = act(state, 'FINISH_FOCUS', { now: NOW + 202 * MINUTE });
    expect(state.gems).toBe(4);
    expect(state.history).toHaveLength(1);
  });

  test('resetting countup clears unfinished time without rewards', () => {
    let state = act(countup(), 'START');
    state = act(state, 'RESET', { now: NOW + 10 * MINUTE });
    expect(state.timer.status).toBe('idle');
    expect(elapsedTime(state.timer, NOW + 20 * MINUTE)).toBe(0);
    expect(state.history).toHaveLength(0);
  });

  test('overtime dings at the deadline once, runs through throttled ticks, and updates one session', () => {
    let state = act(overtime(), 'START');
    const id = state.timer.id;
    state = act(state, 'TICK', { now: NOW + 2 * MINUTE + 500 });
    expect(state.timer).toEqual(expect.objectContaining({ mode: 'focus', status: 'running', overtime: true, startedAt: NOW + MINUTE }));
    expect(state.gems).toBe(1);
    expect(state.history).toEqual([expect.objectContaining({ id, minutes: 1, completedAt: NOW + MINUTE })]);
    expect(state.event.type).toBe('focus-complete');
    expect(elapsedTime(state.timer, NOW + 2 * MINUTE + 500)).toBe(2 * MINUTE + 500);
    expect(act(state, 'TICK', { now: NOW + 3 * MINUTE })).toBe(state);
    state = act(state, 'FINISH_FOCUS', { now: NOW + 3 * MINUTE + 500 });
    expect(state.gems).toBe(3);
    expect(state.history).toEqual([expect.objectContaining({ id, minutes: 3 })]);
    expect(state.timer.cycle).toBe(1);
    expect(state.event.type).toBe('focus-finished');
    expect(state.event.gems).toBe(2);
  });

  test('overtime pauses and reloads within the limit with no second base reward', () => {
    let state = act(overtime(), 'START');
    state = act(state, 'PAUSE', { now: NOW + 2 * MINUTE + 300 });
    expect(state.timer.status).toBe('paused');
    expect(state.gems).toBe(1);
    state = normalizeState(state, NOW + 3 * MINUTE);
    expect(elapsedTime(state.timer, NOW + 3 * MINUTE)).toBe(2 * MINUTE + 300);
    state = act(state, 'START', { now: NOW + 3 * MINUTE });
    state = act(state, 'START_BREAK', { mode: 'longBreak', now: NOW + 4 * MINUTE });
    expect(state.timer).toEqual(expect.objectContaining({ mode: 'longBreak', status: 'running' }));
    expect(state.gems).toBe(3);
    expect(state.history).toHaveLength(1);
    expect(state.history[0].minutes).toBe(3);
  });

  test('reloading a Pomodoro past its deadline enters overtime with the original work duration', () => {
    const running = act(overtime(), 'START');
    let state = normalizeState(running, NOW + 3 * MINUTE);
    expect(state.gems).toBe(1);
    expect(elapsedTime(state.timer, NOW + 3 * MINUTE)).toBe(3 * MINUTE);
    state = normalizeState(state, NOW + 4 * MINUTE);
    expect(state.gems).toBe(1);
    expect(state.event).toBe(null);
    expect(elapsedTime(state.timer, NOW + 4 * MINUTE)).toBe(4 * MINUTE);
  });

  test.each(['RESET', 'SET_MODE'])('%s after overtime preserves earned time and starts a fresh session', type => {
    let state = act(overtime(), 'START');
    state = act(state, type, { mode: 'focus', now: NOW + 3 * MINUTE });
    expect(state.timer.status).toBe('idle');
    expect(state.timer.overtime).toBe(false);
    expect(state.gems).toBe(3);
    expect(state.history[0].minutes).toBe(3);
  });

  test.each(['countup', 'overtime'])('%s stops at 24 hours after a long sleep without creating more sessions', mode => {
    let state = act(mode === 'countup' ? countup() : overtime(), 'START');
    state = normalizeState(state, NOW + 72 * 60 * MINUTE);
    expect(state.timer.status).toBe('complete');
    expect(elapsedTime(state.timer, NOW + 80 * 60 * MINUTE)).toBe(MAX_TRACKED_MS);
    expect(state.history).toEqual([expect.objectContaining({ minutes: 1440, completedAt: NOW + MAX_TRACKED_MS })]);
    expect(state.gems).toBe(1440);
    expect(state.timer.cycle).toBe(1);
    state = normalizeState(state, NOW + 100 * 60 * MINUTE);
    expect(state.history[0].minutes).toBe(1440);
    expect(state.gems).toBe(1440);
  });

  test('work-mode and finish-behavior changes apply to the next session, even across reload', () => {
    let state = act(overtime(), 'START');
    state = act(state, 'SET_SETTINGS', { settings: { workMode: 'countup', endBehavior: 'remind' } });
    state = normalizeState(state, NOW + 10_000);
    expect(state.timer.workMode).toBe('pomodoro');
    expect(state.timer.endBehavior).toBe('overtime');
    state = act(state, 'RESET', { now: NOW + 10_000 });
    expect(state.timer.workMode).toBe('countup');
    expect(state.timer.endBehavior).toBe('remind');
    expect(elapsedTime(state.timer, NOW)).toBe(0);
  });

  test('legacy running Pomodoro saves retain deadline, duration and safe defaults', () => {
    const legacy = act(createInitialState(NOW), 'START');
    delete legacy.settings.workMode;
    delete legacy.settings.endBehavior;
    for (const key of ['workMode', 'endBehavior', 'overtime', 'startedAt', 'elapsedMs']) delete legacy.timer[key];
    const state = normalizeState(legacy, NOW + 10 * MINUTE);
    expect(state.timer.endsAt).toBe(NOW + 25 * MINUTE);
    expect(state.timer.workMode).toBe('pomodoro');
    expect(state.timer.endBehavior).toBe('remind');
    expect(remainingTime(state.timer, NOW + 10 * MINUTE)).toBe(15 * MINUTE);
  });

  test('countup with a missing start timestamp pauses safely without fabricated elapsed time', () => {
    const state = normalizeState({ ...countup(), timer: { ...countup().timer, status: 'running', elapsedMs: 2 * MINUTE, startedAt: 'bad' } }, NOW + 10 * MINUTE);
    expect(state.timer.status).toBe('paused');
    expect(elapsedTime(state.timer, NOW + 20 * MINUTE)).toBe(2 * MINUTE);
    expect(state.gems).toBe(0);
  });

  test('opted-in auto focus supports countup after a live break but never during reload', () => {
    let state = act(countup(), 'SET_SETTINGS', { settings: { autoStartFocus: true } });
    state = act(state, 'START');
    state = act(state, 'FINISH_FOCUS', { now: NOW + MINUTE });
    state = act(state, 'START_BREAK', { now: NOW + MINUTE });
    const deadline = state.timer.endsAt;
    const loaded = normalizeState(state, deadline + MINUTE);
    expect(loaded.timer.status).toBe('idle');
    const live = act(state, 'TICK', { now: deadline });
    expect(live.timer).toEqual(expect.objectContaining({ mode: 'focus', workMode: 'countup', status: 'running', startedAt: deadline, endsAt: null }));
    expect(elapsedTime(live.timer, deadline + MINUTE)).toBe(MINUTE);
  });

  test('pausing as a break expires leaves the next focus idle even when auto-focus is enabled', () => {
    let state = act(createInitialState(NOW), 'SET_SETTINGS', { settings: { focusMinutes: 1, breakMinutes: 1, autoStartFocus: true } });
    state = act(state, 'START');
    state = act(state, 'TICK', { now: NOW + MINUTE });
    state = act(state, 'START_BREAK', { now: NOW + MINUTE });
    state = act(state, 'PAUSE', { now: NOW + 2 * MINUTE + 1 });
    expect(state.timer).toEqual(expect.objectContaining({ mode: 'focus', status: 'idle', endsAt: null }));
    expect(state.gems).toBe(1);
    expect(state.history).toHaveLength(1);
  });
});

describe('eggs, inventory, and room ownership', () => {
  test('basic eggs cost 25 Shilligems and do not consume rare pity', () => {
    const state = act({ ...richState(25), pity: 3 }, 'BUY_EGG', { kind: 'basic', roll: 0.99 });
    expect(state.gems).toBe(0);
    expect(state.eggs).toEqual([expect.objectContaining({ id: expect.any(String), rarity: 'basic', progressMinutes: 0, requiredMinutes: 25 })]);
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

  test('hatching consumes each egg once and upgrades matching species and rarity', () => {
    let state = richState();
    for (let count = 0; count < 3; count += 1) state = act(state, 'BUY_EGG', { kind: 'basic' });
    state = readyEggs(state);
    const ids = state.eggs.map(egg => egg.id);
    for (const id of ids) {
      state = act(state, 'HATCH_EGG', { id, roll: 0 });
      const hatched = state;
      state = act(state, 'HATCH_EGG', { id, roll: 0 });
      expect(state).toBe(hatched);
    }
    expect(state.eggs).toHaveLength(0);
    expect(state.animals).toHaveLength(2);
    expect(state.animals.every(animal => animal.species === 'cat')).toBe(true);
    expect(new Set(state.animals.map(animal => animal.id)).size).toBe(2);
    expect(state.animals[1].upgrades).toBe(2);
    expect(state.gems).toBe(925);
  });

  test.each(ANIMALS)('can hatch $name while preserving the egg rarity', (species) => {
    let state = act(richState(), 'BUY_EGG', { kind: 'mystery', roll: 1 });
    state = readyEggs(state);
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
    state.room.decorations = [];
    expect(act(state, 'PLACE_DECORATION', { item: 'plant' })).toBe(state);
    state = act(state, 'BUY_ITEM', { category: 'decorations', id: 'plant' });
    state = act(state, 'PLACE_DECORATION', { item: 'plant', x: -20, y: 200 });
    expect(state.room.decorations[0]).toEqual(expect.objectContaining({ x: 5, y: 85 }));
    const id = state.room.decorations[0].id;
    state = act(state, 'MOVE_DECORATION', { id, x: 200, y: -1 });
    expect(state.room.decorations[0]).toEqual(expect.objectContaining({ x: 95, y: 20 }));
    state = act(state, 'MOVE_ANIMAL', { id: 'starter-cat', x: 500, y: -400 });
    expect(state.animals[0]).toEqual(expect.objectContaining({ x: 95, y: 20 }));
    state = act(state, 'MOVE_ANIMAL', { id: 'starter-cat', x: NaN, y: undefined });
    expect(state.animals[0]).toEqual(expect.objectContaining({ x: 95, y: 20 }));
    state = act(state, 'REMOVE_DECORATION', { id });
    expect(state.room.decorations).toEqual([]);
    expect(state.owned.decorations).toContain('plant');
  });
});

describe('saved-state recovery', () => {
  test.each([null, [], 'invalid', {}, { schemaVersion: 999 }])('an invalid document %p opens a safe starter state', saved => {
    expect(normalizeState(saved, NOW)).toEqual(createFreshState(NOW));
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
    expect(state.animals[0]).toEqual(expect.objectContaining({ rarity: 'everyday', accessory: 'none', x: 95, y: 20 }));
    expect(state.animals[0].name).toHaveLength(40);
    expect(state.room.background).toBe('sunroom');
    expect(state.room.decorations).toEqual([{ id: 'plant', item: 'plant', x: 5, y: 85 }]);
    expect(state.eggs).toEqual([expect.objectContaining({ id: 'egg', rarity: 'rare', progressMinutes: 0, requiredMinutes: 75 })]);
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
    // Legacy saves could enter a break before completing work; retain those deadlines.
    state = { ...state, timer: { ...state.timer, mode: 'break', durationMs: 5 * MINUTE, remainingMs: 5 * MINUTE } };
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

describe('Pomodoro pause allowance', () => {
  const pendingOvertime = (balance = 0) => {
    let state = act(richState(balance), 'SET_SETTINGS', { settings: { endBehavior: 'overtime' } });
    state = act(state, 'START');
    return act(state, 'TICK', { now: NOW + 25 * MINUTE });
  };

  test('overtime rewards cannot be spent before the pause allowance is settled', () => {
    let state = pendingOvertime();
    expect(state.gems).toBe(25);
    expect(spendableGems(state)).toBe(0);
    state = act(state, 'BUY_EGG', { kind: 'basic', now: NOW + 25 * MINUTE });
    expect(state.eggs).toHaveLength(0);
    expect(state.event.type).toBe('error');
    state = act(state, 'BUY_ITEM', { category: 'decorations', id: 'plant', now: NOW + 25 * MINUTE });
    expect(state.owned.decorations).not.toContain('plant');
    state = act(state, 'PAUSE', { now: NOW + 26 * MINUTE });
    expect(spendableGems(normalizeState(state, NOW + 26 * MINUTE + 100))).toBe(0);
    state = act(state, 'TICK', { now: NOW + 27 * MINUTE + 1 });
    expect(state.gems).toBe(0);
    expect(spendableGems(state)).toBe(0);
    expect(state.eggs).toHaveLength(0);
  });

  test('previous rewards stay purchasable while current overtime gems are reserved', () => {
    let state = pendingOvertime(50);
    expect(spendableGems(state)).toBe(50);
    state = act(state, 'BUY_EGG', { kind: 'basic', now: NOW + 25 * MINUTE });
    state = act(state, 'BUY_ITEM', { category: 'decorations', id: 'plant', now: NOW + 25 * MINUTE });
    expect(state.eggs).toHaveLength(1);
    expect(state.owned.decorations).toContain('plant');
    expect(state.gems).toBe(30);
    expect(spendableGems(state)).toBe(5);
    state = act(state, 'PAUSE', { now: NOW + 26 * MINUTE });
    state = normalizeState(state, NOW + 27 * MINUTE + 1);
    expect(state.gems).toBe(5);
    expect(spendableGems(state)).toBe(5);
  });

  test.each(['FINISH_FOCUS', 'START_BREAK'])('%s releases the current overtime reward for purchases', (type) => {
    let state = pendingOvertime();
    state = act(state, type, { now: NOW + 26 * MINUTE });
    expect(state.gems).toBe(26);
    expect(spendableGems(state)).toBe(26);
    state = act(state, 'BUY_EGG', { kind: 'basic', now: NOW + 26 * MINUTE });
    expect(state.eggs).toHaveLength(1);
    expect(state.gems).toBe(1);
  });

  test('two pauses of exactly one minute keep the complete reward', () => {
    let state = act(createInitialState(NOW), 'START');
    for (const minute of [1, 4]) {
      state = act(state, 'PAUSE', { now: NOW + minute * MINUTE });
      expect(pauseRemainingTime(state.timer, NOW + minute * MINUTE + 30_000)).toBe(30_000);
      state = act(state, 'START', { now: NOW + (minute + 1) * MINUTE });
    }
    expect(state.timer.pauseCount).toBe(2);
    expect(state.timer.rewardForfeited).toBe(false);
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.gems).toBe(25);
    expect(state.history[0].gems).toBe(25);
  });

  test('one millisecond over a pause limit is enforced by tick and cannot be recovered by resume', () => {
    let state = act(createInitialState(NOW), 'START');
    state = act(state, 'PAUSE', { now: NOW + MINUTE });
    state = act(state, 'TICK', { now: NOW + 2 * MINUTE + 1 });
    expect(state.timer.rewardForfeited).toBe(true);
    expect(state.event.type).toBe('reward-forfeited');
    state = act(state, 'START', { now: NOW + 2 * MINUTE + 1 });
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.history[0]).toEqual(expect.objectContaining({ minutes: 25, gems: 0, rewardForfeited: true }));
    expect(todayStats(state, state.history[0].completedAt).gems).toBe(0);
    state = act(state, 'RESET');
    expect(state.timer.rewardForfeited).toBe(false);
    expect(state.timer.pauseCount).toBe(0);
  });

  test('the third pause forfeits only this session reward, including base overtime reward, once', () => {
    let state = act(richState(40), 'SET_SETTINGS', { settings: { focusMinutes: 1, endBehavior: 'overtime' } });
    state = act(state, 'START');
    state = act(state, 'TICK', { now: NOW + MINUTE });
    expect(state.gems).toBe(41);
    for (const minute of [2, 3, 4]) {
      state = act(state, 'PAUSE', { now: NOW + minute * MINUTE });
      if (minute < 4) state = act(state, 'START', { now: NOW + minute * MINUTE + 1 });
    }
    expect(state.timer.rewardForfeited).toBe(true);
    expect(state.gems).toBe(40);
    expect(state.history[0].gems).toBe(0);
    state = normalizeState(state, NOW + 10 * MINUTE);
    state = act(state, 'START', { now: NOW + 10 * MINUTE });
    state = act(state, 'FINISH_FOCUS', { now: NOW + 12 * MINUTE });
    expect(state.gems).toBe(40);
    expect(state.history).toHaveLength(1);
    expect(state.history[0].minutes).toBeGreaterThan(1);
    expect(normalizeState(state, NOW + 20 * MINUTE).gems).toBe(40);
  });

  test('breaks have no pause limit', () => {
    let state = act(createInitialState(NOW), 'START');
    state = act(state, 'TICK', { now: state.timer.endsAt });
    state = act(state, 'START_BREAK');
    for (let i = 0; i < 4; i += 1) {
      state = act(state, 'PAUSE', { now: NOW + i * 10 * MINUTE });
      state = act(state, 'START', { now: NOW + (i + 1) * 10 * MINUTE });
    }
    expect(state.timer.pauseCount).toBe(0);
    expect(state.timer.rewardForfeited).toBe(false);
    expect(state.gems).toBe(25);
  });
});

describe('single egg incubation and companion progression', () => {
  test('one to four star rarities have increasing incubation requirements', () => {
    expect(RARITY_STARS).toEqual({ basic: 1, everyday: 2, rare: 3, dreamy: 4 });
    expect(EGG_MINUTES).toEqual({ basic: 25, everyday: 50, rare: 75, dreamy: 100 });
  });

  test('only the egg selected when focus starts receives credited minutes, without overflow', () => {
    let state = act(richState(), 'BUY_EGG', { kind: 'basic' });
    state = act(state, 'BUY_EGG', { kind: 'basic', now: NOW + 1 });
    const [first, second] = state.eggs;
    expect(state.selectedEggId).toBe(first.id);
    state = act(state, 'SET_SETTINGS', { settings: { workMode: 'countup' } });
    state = act(state, 'START');
    state = act(state, 'SELECT_EGG', { id: second.id, now: NOW + 5 * MINUTE });
    state = normalizeState(state, NOW + 10 * MINUTE);
    expect(state.timer.eggId).toBe(first.id);
    state = act(state, 'FINISH_FOCUS', { now: NOW + 60 * MINUTE });
    expect(state.eggs.map(egg => egg.progressMinutes)).toEqual([25, 0]);
    expect(normalizeState(state, NOW + 65 * MINUTE).eggs.map(egg => egg.progressMinutes)).toEqual([25, 0]);
    state = act(state, 'RESET');
    state = act(state, 'START');
    expect(state.timer.eggId).toBe(second.id);
    state = act(state, 'FINISH_FOCUS', { now: NOW + 10 * MINUTE });
    expect(state.eggs.map(egg => egg.progressMinutes)).toEqual([25, 10]);
  });

  test('deselect survives reload and progress is required to hatch', () => {
    let state = act(richState(), 'BUY_EGG', { kind: 'basic' });
    const id = state.eggs[0].id;
    const tooEarly = act(state, 'HATCH_EGG', { id });
    expect(tooEarly.eggs).toBe(state.eggs);
    expect(tooEarly.event.type).toBe('error');
    state = act(state, 'SELECT_EGG', { id: null });
    state = normalizeState(state, NOW);
    expect(state.selectedEggId).toBe(null);
    state = act(state, 'START');
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.eggs[0].progressMinutes).toBe(0);
  });

  test('hatching the selected egg selects the next oldest egg', () => {
    let state = act(richState(), 'BUY_EGG', { kind: 'basic' });
    state = act(state, 'BUY_EGG', { kind: 'mystery', now: NOW + 1 });
    state = readyEggs(state);
    const secondId = state.eggs[1].id;
    state = act(state, 'HATCH_EGG', { id: state.selectedEggId, roll: 0 });
    expect(state.selectedEggId).toBe(secondId);
  });

  test('six duplicate upgrades unlock seven animations and a bounded gem bonus', () => {
    let state = richState();
    for (let i = 0; i < 7; i += 1) {
      state = act(state, 'BUY_EGG', { kind: 'mystery', roll: 0 });
      // Keep this upgrade scenario independent of mystery pity.
      state = { ...state, pity: 0 };
      state = readyEggs(state);
      state = act(state, 'HATCH_EGG', { id: state.eggs[0].id, roll: 0 });
    }
    expect(state.animals).toHaveLength(1);
    expect(state.animals[0].upgrades).toBe(MAX_UPGRADES);
    expect(animationCount(state.animals[0])).toBe(7);
    expect(gemBonus(state)).toBe(0.1);
    expect(state.event).toEqual(expect.objectContaining({ duplicate: true, capped: true, gems: 5 }));
    const gems = state.gems;
    state = act(state, 'START');
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.gems - gems).toBe(27);
    expect(gemBonus({ animals: Array(8).fill({ upgrades: 6 }) })).toBe(0.5);
  });

  test('legacy eggs stay hatchable and duplicate residents merge without losing the first pet identity', () => {
    const saved = createInitialState(NOW);
    delete saved.progressionVersion;
    saved.eggs = [{ id: 'old-egg', rarity: 'rare' }];
    delete saved.selectedEggId;
    saved.animals.push({ ...saved.animals[0], id: 'second-cat' }, { ...saved.animals[0], id: 'third-cat' });
    const state = normalizeState(saved, NOW);
    expect(state.eggs[0]).toEqual(expect.objectContaining({ progressMinutes: 75, requiredMinutes: 75 }));
    expect(state.selectedEggId).toBe('old-egg');
    expect(state.animals).toHaveLength(1);
    expect(state.animals[0]).toEqual(expect.objectContaining({ id: 'starter-cat', name: 'Miso', upgrades: 2 }));
    expect(normalizeState(state, NOW).animals[0].upgrades).toBe(2);
  });

  test('pet bonuses do not lose whole gems to floating point rounding', () => {
    let state = createInitialState(NOW);
    state.animals = ANIMALS.slice(0, 4).map((animal, index) => ({
      ...state.animals[0], id: `maxed:${index}`, species: animal.id, upgrades: 6,
    }));
    state = act(state, 'SET_SETTINGS', { settings: { focusMinutes: 45 } });
    state = act(state, 'START');
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.gems).toBe(63);
    expect(state.history[0].gems).toBe(63);
  });
});

describe('session metadata and movable room features', () => {
  test('multiple tasks and normalized tags persist in history and stay editable after completion', () => {
    let state = act(createInitialState(NOW), 'SET_TASKS', { tasks: [
      { id: 'chem', text: 'Chemistry', done: false }, { id: 'work', text: 'Email draft', done: true },
    ] });
    state = act(state, 'SET_TAGS', { tags: [' Chemistry ', 'chemistry', 'Deep   work', '', null] });
    expect(state.timer.tags).toEqual(['Chemistry', 'Deep work']);
    state = act(state, 'START');
    state = act(state, 'TICK', { now: state.timer.endsAt });
    expect(state.history[0].tasks).toHaveLength(2);
    state = act(state, 'SET_TASK', { task: 'Organic chemistry' });
    state = act(state, 'SET_TAGS', { tags: ['Studying'] });
    state = normalizeState(state, NOW + 30 * MINUTE);
    expect(state.history[0].tasks[0].text).toBe('Organic chemistry');
    expect(state.history[0].tasks[1].done).toBe(true);
    expect(state.history[0].tags).toEqual(['Studying']);
    state = act(state, 'RESET');
    expect(state.timer.tags).toEqual(['Studying']);
    expect(state.timer.tasks).toHaveLength(2);
  });

  test('furniture starts in inventory and notepad and couch-height pet placement survive reload', () => {
    let state = createInitialState(NOW);
    expect(state.room.decorations.map(item => item.item)).toEqual(['couch', 'rug']);
    expect(state.owned.decorations).toEqual(['couch', 'rug']);
    state = act(state, 'PLACE_DECORATION', { item: 'couch', x: 50, y: 45 });
    state = act(state, 'MOVE_ANIMAL', { id: 'starter-cat', x: 50, y: 37 });
    state = act(state, 'MOVE_NOTEPAD', { x: 0.2, y: 0.6 });
    state = normalizeState(state, NOW);
    expect(state.room.notepadPosition).toEqual({ x: 0.2, y: 0.6 });
    expect(state.animals[0].y).toBe(37);
    expect(state.room.decorations[0].item).toBe('couch');
  });

  test('Atelier arrangement migrates the untouched starter room once and preserves custom rooms', () => {
    const oldRoom = createInitialState(NOW);
    delete oldRoom.room.artVersion;
    oldRoom.room.decorations = [];
    oldRoom.animals[0] = { ...oldRoom.animals[0], x: 28, y: 76 };
    const migrated = normalizeState(oldRoom, NOW);
    expect(migrated.room.decorations.map(item => item.item)).toEqual(['couch', 'rug']);
    expect(migrated.animals[0]).toMatchObject({ x: 80, y: 68 });
    const emptied = { ...migrated, room: { ...migrated.room, decorations: [] } };
    expect(normalizeState(emptied, NOW).room.decorations).toEqual([]);
    oldRoom.animals[0].x = 50;
    expect(normalizeState(oldRoom, NOW).room.decorations).toEqual([]);
  });
});

 test('furniture stock limits placement and purchases add one reusable copy', () => {
   let state = richState(100);
   expect(act(state, 'PLACE_DECORATION', { item: 'couch' })).toBe(state);
   state = act(state, 'BUY_ITEM', { category: 'decorations', id: 'couch' });
   expect(state.gems).toBe(50);
   expect(state.owned.decorationCounts.couch).toBe(2);
   state = act(state, 'PLACE_DECORATION', { item: 'couch' });
   expect(state.room.decorations.filter(item => item.item === 'couch')).toHaveLength(2);
   expect(act(state, 'PLACE_DECORATION', { item: 'couch' })).toBe(state);
   state = act(state, 'REMOVE_DECORATION', { id: state.room.decorations[0].id });
   state = normalizeState(state, NOW);
   state = act(state, 'PLACE_DECORATION', { item: 'couch' });
   expect(state.room.decorations.filter(item => item.item === 'couch')).toHaveLength(2);
 });
 test('legacy furniture copies become owned stock without changing a custom room', () => {
   const saved = richState();
   delete saved.owned.decorationCounts;
   saved.room.decorations.push({ id: 'legacy-sofa', item: 'couch', x: 20, y: 40 });
   const migrated = normalizeState(saved, NOW);
   expect(migrated.owned.decorationCounts.couch).toBe(2);
   expect(migrated.room.decorations).toEqual(saved.room.decorations);
   expect(normalizeState(migrated, NOW)).toEqual(migrated);
 });

test('movable timer and daily goal positions survive reload and reject invalid widgets', () => {
  let state = createInitialState(NOW);
  state = act(state, 'MOVE_WIDGET', { id: 'timer', x: 50, y: 35 });
  state = act(state, 'MOVE_WIDGET', { id: 'goal', x: 80, y: 15 });
  expect(normalizeState(state, NOW).room.widgets).toEqual({ timer: { x: 50, y: 35 }, goal: { x: 80, y: 15 } });
  expect(act(state, 'MOVE_WIDGET', { id: 'invalid', x: 20, y: 20 })).toBe(state);
  expect(act(state, 'MOVE_WIDGET', { id: 'goal', x: 200, y: -30 }).room.widgets.goal).toEqual({ x: 100, y: 0 });
});
