import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { createInitialState } from './game';
import { createAmbientEngine } from './audio';

jest.mock('./audio', () => ({ createAmbientEngine: jest.fn() }));

const MINUTE = 60_000;
const NOW = new Date('2026-10-01T15:00:00Z').getTime();
const originalFetch = global.fetch;
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const settle = async () => { await act(async () => { await Promise.resolve(); }); };
const advance = async ms => { await act(async () => { jest.advanceTimersByTime(ms); }); };
const writes = () => global.fetch.mock.calls.filter(([, options]) => options?.method === 'PUT');
const latestWrite = () => JSON.parse(writes()[writes().length - 1][1].body);
const leaveFocus = () => {
  const leave = screen.queryByRole('button', { name: 'Leave focus view' });
  if (leave) fireEvent.click(leave);
};

let engine;
let diskState;
let revision;

async function openRoom(saved = createInitialState(NOW)) {
  diskState = saved;
  const view = render(<App />);
  await settle();
  expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  return view;
}

async function wakeAt(timestamp) {
  // Simulate a background tab waking up; do not pretend all missed intervals ran.
  act(() => {
    jest.setSystemTime(timestamp);
    fireEvent(document, new Event('visibilitychange'));
  });
  await settle();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  jest.spyOn(Math, 'random').mockReturnValue(0.01);
  revision = 4;
  diskState = createInitialState(NOW);
  engine = {
    start: jest.fn().mockResolvedValue(true), stop: jest.fn(),
    tap: jest.fn().mockResolvedValue(true), chime: jest.fn().mockResolvedValue(true),
    unlock: jest.fn().mockResolvedValue(true), startAlarm: jest.fn().mockReturnValue(true), stopAlarm: jest.fn(),
    setVolume: jest.fn(), destroy: jest.fn().mockResolvedValue(),
  };
  createAmbientEngine.mockReset().mockReturnValue(engine);
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'PUT') {
      const payload = JSON.parse(options.body);
      if (payload.revision !== revision) return response({}, 409);
      diskState = payload.state;
      revision += 1;
      return response({ revision });
    }
    return response({ state: diskState, revision, storagePath: 'C:\\private\\PomodoroTimer\\saves', recovered: false });
  });
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});

test('a completed focus session updates the wallet, daily goal, journal, break idea, and private save', async () => {
  const initial = createInitialState(NOW);
  initial.settings.dailyGoal = 1;
  await openRoom(initial);
  fireEvent.change(screen.getByRole('textbox', { name: 'Session task' }), { target: { value: 'Finish my sketch' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  await advance(350);

  await wakeAt(NOW + 25 * MINUTE);
  leaveFocus();
  expect(screen.getByRole('button', { name: '25 Shilligems, open egg shop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Daily progress: 1 of 1 sessions' })).toBeInTheDocument();
  expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  expect(screen.getByRole('button', { name: 'Short break, 5 minutes' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Long break, 15 minutes' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('Daily goal complete!');
  expect(engine.startAlarm).toHaveBeenCalledTimes(1);
  expect(engine.chime).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Journal', exact: true }));
  const journal = screen.getByRole('dialog', { name: 'Journal' });
  expect(within(journal).getByText('Finish my sketch')).toBeInTheDocument();
  expect(within(journal).getByLabelText('Focus summary')).toHaveTextContent('25');
  expect(within(journal).getByRole('progressbar', { name: 'Daily focus goal' })).toHaveAttribute('value', '1');
  await advance(350);
  expect(latestWrite()).toMatchObject({ state: {
    gems: 25, event: null, settings: { dailyGoal: 1 },
    history: [{ task: 'Finish my sketch', minutes: 25, completedAt: NOW + 25 * MINUTE }],
    timer: { mode: 'focus', status: 'complete' },
  } });
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  const stoppedBeforeBreak = engine.stopAlarm.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Short break, 5 minutes' }));
  expect(screen.getByRole('timer')).toHaveTextContent('05:00');
  expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  expect(screen.getByText('Stretch')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Another break idea' }));
  expect(screen.getByText('Rest your eyes')).toBeInTheDocument();
  expect(engine.stopAlarm.mock.calls.length).toBeGreaterThan(stoppedBeforeBreak);
  await wakeAt(NOW + 12 * 60 * MINUTE);
  expect(screen.getByRole('button', { name: '25 Shilligems, open egg shop' })).toBeInTheDocument();
  expect(engine.chime).toHaveBeenCalledTimes(1);
});

test('focus earnings buy an egg and the next study session makes it hatchable', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 25 * MINUTE);
  leaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Egg shop', exact: true }));
  const shop = screen.getByRole('dialog', { name: 'Egg shop' });
  expect(within(shop).getByRole('button', { name: /Roll mystery egg/ })).toBeDisabled();
  fireEvent.click(within(shop).getByRole('button', { name: /Buy basic egg/ }));
  expect(screen.getByRole('button', { name: '0 Shilligems, open egg shop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hatch basic egg 1' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'New session' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 50 * MINUTE);
  leaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Egg shop', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Hatch basic egg 1' }));

  const hatch = screen.getByRole('dialog', { name: 'Cat joined!' });
  expect(hatch).toHaveAttribute('aria-modal', 'true');
  const welcome = within(hatch).getByRole('button', { name: 'Done' });
  expect(welcome).toHaveFocus();
  fireEvent.keyDown(welcome, { key: 'Tab', shiftKey: true });
  expect(welcome).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Miso, Everyday cat' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cat, Basic cat' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hatch basic egg 1' })).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Cat joined!' })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Egg shop' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Animals', exact: true }));
  expect(screen.getByRole('button', { name: 'Select Cat, basic Cat, animal 2' })).toBeInTheDocument();
  await advance(350);
  expect(latestWrite().state).toMatchObject({ gems: 25, eggs: [], history: [{ minutes: 25 }, { minutes: 25 }] });
  expect(latestWrite().state.animals).toHaveLength(2);
  expect(new Set(latestWrite().state.animals.map(animal => animal.id)).size).toBe(2);
  expect(latestWrite().state.animals.every(animal => animal.placed)).toBe(true);
});

test('failed local loads show a retry action and never replace a private save with defaults', async () => {
  global.fetch.mockRejectedValueOnce(new Error('Service unavailable'));
  render(<App />);
  await settle();
  expect(screen.getByRole('heading', { name: 'Couldn’t load your room' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  await advance(60 * MINUTE);
  expect(writes()).toHaveLength(0);

  diskState = { ...createInitialState(NOW), gems: 73 };
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await settle();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '73 Shilligems, open egg shop' })).toBeInTheDocument();
  await advance(1000);
  expect(writes()).toHaveLength(0);
});

test('pause survives a tab wake, resume keeps the remaining duration, and reset abandons without reward', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 2 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('23:00');
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  await wakeAt(NOW + 120 * MINUTE);
  expect(screen.getByRole('alert')).toHaveTextContent('Pause ended');
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
  leaveFocus();
  expect(screen.getByRole('button', { name: '0 Shilligems, open egg shop' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  await wakeAt(NOW + 121 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('22:00');
  fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
  expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  await wakeAt(NOW + 500 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  expect(screen.getByRole('button', { name: 'Daily progress: 0 of 4 sessions' })).toBeInTheDocument();
  await advance(350);
  expect(latestWrite().state).toMatchObject({ gems: 0, history: [], timer: { status: 'idle', remainingMs: 25 * MINUTE } });
});

test('header navigation opens named panels, restores the opener after Escape, and tears down timers and audio', async () => {
  const { unmount } = await openRoom();
  const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
  expect(screen.getByRole('banner')).toContainElement(navigation);
  expect(screen.queryByRole('button', { name: 'Little Room home' })).not.toBeInTheDocument();
  expect(within(navigation).getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-current', 'page');
  for (const [label, title] of [
    ['Animals', 'Animals'], ['Egg shop', 'Egg shop'],
    ['Decorate', 'Decorate'], ['Journal', 'Journal'],
  ]) {
    const opener = within(navigation).getByRole('button', { name: label, exact: true });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
    expect(opener).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  }
  fireEvent.click(screen.getByRole('button', { name: 'Settings', exact: true }));
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Local save details' }));
  expect(screen.getByText('C:\\private\\PomodoroTimer\\saves')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  expect(engine.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Soundscape mixer' }));
  expect(screen.getByRole('dialog', { name: 'Sound' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play sounds' }));
  await settle();
  expect(engine.start).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Pause sounds' })).toHaveAttribute('aria-pressed', 'true');
  expect(engine.destroy).not.toHaveBeenCalled();
  unmount();
  expect(engine.destroy).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
  expect(writes()).toHaveLength(0);
});

test('a conflicting save blocks timer changes until the saved room is explicitly reloaded', async () => {
  await openRoom();
  global.fetch.mockResolvedValueOnce(response({}, 409));
  fireEvent.change(screen.getByRole('textbox', { name: 'Session task' }), { target: { value: 'Local unsaved task' } });
  await advance(350);
  expect(screen.getByRole('alert')).toHaveTextContent('This save changed in another window');
  expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Count up', exact: true }));
  expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  expect(writes()).toHaveLength(1);

  diskState = { ...createInitialState(NOW), gems: 10 };
  revision = 5;
  fireEvent.click(screen.getByRole('button', { name: 'Reload saved room' }));
  await settle();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Session task' })).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '10 Shilligems, open egg shop' })).toBeInTheDocument();
});

test('session lengths are editable on the timer and a running session keeps its original duration', async () => {
  await openRoom();
  const timer = screen.getByRole('region', { name: 'Focus timer' });
  const lengths = within(timer).getByRole('button', { name: 'Session settings' });
  expect(lengths).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('spinbutton', { name: /Focus time/ })).not.toBeInTheDocument();
  fireEvent.click(lengths);
  expect(lengths).toHaveAttribute('aria-expanded', 'true');
  expect(timer).toBeVisible();
  const timing = screen.getByRole('dialog', { name: 'Session settings' });
  const focusTime = within(timing).getByRole('spinbutton', { name: /Focus time/ });
  fireEvent.change(focusTime, { target: { value: '30' } });
  fireEvent.blur(focusTime);
  expect(screen.getByRole('timer')).toHaveTextContent('30:00');
  fireEvent.click(within(timing).getByRole('button', { name: 'Close panel' }));

  fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
  await wakeAt(NOW + MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('29:00');
  leaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Session settings' }));
  const nextFocusTime = screen.getByRole('spinbutton', { name: /Focus time/ });
  nextFocusTime.focus();
  fireEvent.change(nextFocusTime, { target: { value: '10' } });
  fireEvent.keyDown(nextFocusTime, { key: 'Enter' });
  expect(screen.getByRole('timer')).toHaveTextContent('29:00');
  await advance(350);
  expect(latestWrite().state).toMatchObject({
    settings: { focusMinutes: 10 },
    timer: { status: 'running', durationMs: 30 * MINUTE },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
  expect(screen.getByRole('timer')).toHaveTextContent('10:00');

  fireEvent.click(screen.getByRole('button', { name: 'Settings', exact: true }));
  const settings = screen.getByRole('dialog', { name: 'Settings' });
  expect(timer).toBeVisible();
  expect(within(settings).queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(within(settings).getByRole('checkbox', { name: 'Reduce animation' })).toBeInTheDocument();
});

test('egg odds are available on request and Escape closes help before the shop', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Egg shop', exact: true }));
  const shop = screen.getByRole('dialog', { name: 'Egg shop' });
  const odds = within(shop).getByRole('button', { name: 'Egg odds' });
  expect(odds).toHaveAttribute('aria-expanded', 'false');
  odds.focus();
  fireEvent.click(odds);
  expect(odds).toHaveAttribute('aria-expanded', 'true');
  const details = screen.getByRole('note');
  expect(details).toBeVisible();
  expect(odds).toHaveAttribute('aria-controls', details.id);
  expect(details).toHaveTextContent('60%');
  expect(details).toHaveTextContent('30%');
  expect(details).toHaveTextContent('10%');
  fireEvent.keyDown(odds, { key: 'Escape' });
  expect(odds).toHaveAttribute('aria-expanded', 'false');
  expect(shop).toBeInTheDocument();
  expect(odds).toHaveFocus();
  fireEvent.keyDown(odds, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('focus view hides distractions while scratchpad remains reachable and saves without pausing', async () => {
  await openRoom();
  expect(screen.getByRole('button', { name: 'Pomodoro', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: /Short break/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Long break/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  expect(engine.unlock).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Settings', exact: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Daily progress/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Open scratchpad' }));
  const notes = screen.getByRole('dialog', { name: 'Scratchpad' });
  expect(within(notes).getByRole('textbox', { name: 'Notes' })).toHaveFocus();
  fireEvent.change(within(notes).getByRole('textbox', { name: 'Notes' }), { target: { value: 'Remember to water the plant' } });
  await advance(350);
  expect(latestWrite().state).toMatchObject({ scratchpad: 'Remember to water the plant', timer: { status: 'running' } });
  fireEvent.click(within(notes).getByRole('button', { name: 'Close panel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Focus timer' })).toBeVisible();
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leave focus view' }));
  expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leave focus view' }));
  expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Enter focus view' }));
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
});

test('a completed Pomodoro repeats its alarm until muted and waits for an explicit break choice', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 25 * MINUTE);
  expect(engine.startAlarm).toHaveBeenCalledTimes(1);
  expect(engine.chime).not.toHaveBeenCalled();
  expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  const stoppedBeforeMute = engine.stopAlarm.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Mute alarm' }));
  expect(engine.stopAlarm.mock.calls.length).toBeGreaterThan(stoppedBeforeMute);
  await wakeAt(NOW + 30 * MINUTE);
  expect(engine.startAlarm).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  fireEvent.click(screen.getByRole('button', { name: 'Long break, 15 minutes' }));
  expect(screen.getByRole('timer')).toHaveTextContent('15:00');
  expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  await advance(350);
  expect(latestWrite().state).toMatchObject({ gems: 25, history: [{ minutes: 25 }], timer: { mode: 'longBreak', status: 'running' } });
});

test('count up tracks active time, pauses cleanly, and credits whole minutes on finish', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Count up', exact: true }));
  expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  fireEvent.change(screen.getByRole('textbox', { name: 'Session task' }), { target: { value: 'Sketch freely' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 2.5 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('02:30');
  expect(document.title).toContain('02:30');
  expect(document.title).toMatch(/Count up/i);
  expect(screen.queryByRole('button', { name: /Short break/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  await wakeAt(NOW + 10 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('02:30');
  fireEvent.click(screen.getByRole('button', { name: 'Finish session' }));
  expect(screen.getByRole('button', { name: 'Short break, 5 minutes' })).toBeEnabled();
  leaveFocus();
  expect(screen.getByRole('button', { name: '2 Shilligems, open egg shop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Daily progress: 1 of 4 sessions' })).toBeInTheDocument();
  expect(engine.startAlarm).not.toHaveBeenCalled();
  await advance(350);
  expect(latestWrite().state).toMatchObject({
    gems: 2, history: [{ minutes: 2, task: 'Sketch freely' }],
    timer: { workMode: 'countup', status: 'complete', elapsedMs: 2.5 * MINUTE },
  });
  fireEvent.click(screen.getByRole('button', { name: 'New session' }));
  expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /Short break/ })).not.toBeInTheDocument();
});

test('blocked reminder audio can be enabled and returning to the tab refreshes alarm availability', async () => {
  await openRoom();
  engine.startAlarm.mockResolvedValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 25 * MINUTE);
  expect(screen.getByRole('button', { name: 'Enable alarm sound' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Enable alarm sound' }));
  await settle();
  expect(screen.getByRole('button', { name: 'Mute alarm' })).toBeInTheDocument();
  engine.startAlarm.mockResolvedValueOnce(false);
  await wakeAt(NOW + 26 * MINUTE);
  expect(screen.getByRole('button', { name: 'Enable alarm sound' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Short break, 5 minutes' })).toBeEnabled();
});

test('ding and count up continues into overtime once and credits it as one session', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Session settings' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Ding + count up' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 25 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('+00:00');
  expect(screen.getByText('Overtime')).toBeInTheDocument();
  expect(engine.chime).toHaveBeenCalledTimes(1);
  expect(engine.startAlarm).not.toHaveBeenCalled();
  await wakeAt(NOW + 27.5 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('+02:30');
  expect(document.title).toContain('+02:30');
  expect(document.title).toMatch(/Overtime/i);
  expect(engine.chime).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Finish session' }));
  leaveFocus();
  expect(screen.getByRole('button', { name: '27 Shilligems, open egg shop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Daily progress: 1 of 4 sessions' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Short break, 5 minutes' })).toBeEnabled();
  await advance(350);
  expect(latestWrite().state.history).toHaveLength(1);
  expect(latestWrite().state.history[0]).toMatchObject({ minutes: 27 });
  expect(engine.chime).toHaveBeenCalledTimes(1);
});
