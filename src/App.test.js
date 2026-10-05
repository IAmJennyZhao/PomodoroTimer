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
  expect(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ })).toBeEnabled();
  await advance(350);

  await wakeAt(NOW + 25 * MINUTE);
  leaveFocus();
  expect(screen.getByRole('button', { name: '25 Shilligems, open egg shop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Daily progress: 1 of 1 sessions' })).toBeInTheDocument();
  expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  expect(screen.getByRole('button', { name: 'Short break, 5 minutes' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Long break, 15 minutes' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('Daily goal complete!');
  expect(screen.getByLabelText('25 Shilligems earned')).toBeInTheDocument();
  expect(engine.startAlarm).toHaveBeenCalledTimes(1);
  expect(engine.chime).not.toHaveBeenCalled();
  await advance(7000);
  expect(screen.queryByRole('button', { name: 'Dismiss notification' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Session result')).toHaveTextContent('25 min');

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
  expect(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ })).toBeEnabled();
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
  const closeCelebration = within(hatch).getByRole('button', { name: 'Close celebration' });
  expect(closeCelebration).toHaveFocus();
  fireEvent.keyDown(closeCelebration, { key: 'Tab', shiftKey: true });
  expect(welcome).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Miso, Everyday cat' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cat, Basic cat' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hatch basic egg 1' })).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Cat joined!' })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Egg shop' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Pets', exact: true }));
  expect(screen.getByRole('button', { name: 'Select Cat, basic Cat, animal 2' })).toBeInTheDocument();
  await advance(350);
  expect(latestWrite().state).toMatchObject({ gems: 25, eggs: [], history: [{ minutes: 25 }, { minutes: 25 }] });
  expect(latestWrite().state.animals).toHaveLength(2);
  expect(new Set(latestWrite().state.animals.map(animal => animal.id)).size).toBe(2);
  expect(latestWrite().state.animals.every(animal => animal.placed)).toBe(true);
});

test('a notification stays available while being read, then expires after leaving it', async () => {
  await openRoom({ ...createInitialState(NOW), gems: 50 });
  fireEvent.click(screen.getByRole('button', { name: 'Egg shop', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /Buy basic egg/ }));
  const notice = screen.getByText('Egg added').closest('.toast');
  fireEvent.pointerEnter(notice);
  await advance(7000);
  expect(screen.getByText('Egg added')).toBeInTheDocument();
  fireEvent.pointerLeave(notice);
  await advance(6500);
  expect(screen.queryByText('Egg added')).not.toBeInTheDocument();
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

test('pause survives a tab wake, resume keeps the remaining duration, and held Stop abandons without reward', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 2 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('23:00');
  fireEvent.click(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ }));
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
  fireEvent.keyDown(screen.getByRole('button', { name: 'Stop session' }), { key: ' ' });
  await advance(5000);
  expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  await wakeAt(NOW + 500 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  expect(screen.getByRole('button', { name: 'Daily progress: 0 of 4 sessions' })).toBeInTheDocument();
  await advance(350);
  expect(latestWrite().state).toMatchObject({ gems: 0, history: [], timer: { status: 'idle', remainingMs: 25 * MINUTE } });
});

test('finishing focus during a Stop hold cancels that hold and preserves the completed session', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await wakeAt(NOW + 25 * MINUTE - 3000);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Stop session' }), { key: ' ' });
  await advance(3000);
  expect(screen.getByRole('button', { name: 'New session' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Stop session' })).not.toBeInTheDocument();
  await advance(3000);
  expect(latestWrite().state).toMatchObject({ gems: 25, history: [{ minutes: 25 }], timer: { status: 'complete' } });
});

test('header navigation opens named panels, restores the opener after Escape, and tears down timers and audio', async () => {
  const { unmount } = await openRoom();
  const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
  expect(screen.getByRole('banner')).toContainElement(navigation);
  expect(screen.queryByRole('button', { name: 'Little Room home' })).not.toBeInTheDocument();
  expect(within(navigation).getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-current', 'page');
  for (const [label, title] of [
    ['Pets', 'Pets'], ['Egg shop', 'Egg shop'],
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
  expect(screen.getByRole('alert')).toHaveTextContent('Save changed elsewhere');
  expect(screen.getByRole('alert')).toHaveTextContent('Reload replaces this window’s edits.');
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

test('a failed save keeps local edits and the compact warning offers a working retry', async () => {
  await openRoom();
  global.fetch.mockResolvedValueOnce(response({}, 500));
  fireEvent.change(screen.getByRole('textbox', { name: 'Session task' }), { target: { value: 'Keep this draft' } });
  await advance(350);
  expect(screen.getByRole('alert')).toHaveTextContent('Changes not saved');
  expect(screen.getByRole('alert')).toHaveTextContent('Your edits are still here.');
  expect(screen.getByRole('textbox', { name: 'Session task' })).toHaveValue('Keep this draft');
  fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
  expect(screen.getByRole('note')).toHaveTextContent('Saving failed');
  fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
  await settle();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(latestWrite().state.timer.task).toBe('Keep this draft');
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
  fireEvent.keyDown(screen.getByRole('button', { name: 'Stop session' }), { key: ' ' });
  await advance(5000);
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
  expect(screen.getByRole('button', { name: 'Countdown', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: /Short break/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Long break/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  expect(engine.unlock).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Settings', exact: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Daily progress/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ })).toBeEnabled();

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
  fireEvent.click(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ }));
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leave focus view' }));
  expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leave focus view' }));
  expect(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Enter focus view' }));
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
});

test('scratchpad remains mounted and positioned across panels and closes only through its controls', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Open notepad' }));
  const notes = screen.getByRole('dialog', { name: 'Scratchpad' });
  const textbox = within(notes).getByRole('textbox', { name: 'Notes' });
  fireEvent.change(textbox, { target: { value: 'Keep this thought while changing settings' } });
  fireEvent.keyDown(within(notes).getByRole('button', { name: 'Move notepad' }), { key: 'ArrowLeft', shiftKey: true });
  const location = notes.getAttribute('style');
  for (const name of ['Settings', 'Decorate', 'Journal']) {
    fireEvent.click(screen.getByRole('button', { name, exact: true }));
    expect(screen.getByRole('dialog', { name })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Scratchpad' })).toBe(notes);
    expect(textbox).toHaveValue('Keep this thought while changing settings');
    expect(notes).toHaveAttribute('style', location);
    expect(screen.getByRole('button', { name: 'Open notepad' })).toHaveAttribute('aria-pressed', 'true');
  }
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(notes).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  expect(notes).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open scratchpad' })).toHaveAttribute('aria-pressed', 'true');
  await advance(350);
  expect(latestWrite().state.scratchpad).toBe('Keep this thought while changing settings');
  fireEvent.click(within(notes).getByRole('button', { name: 'Close panel' }));
  expect(screen.queryByRole('dialog', { name: 'Scratchpad' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open scratchpad' }));
  leaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Settings', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Open notepad' }));
  expect(screen.queryByRole('dialog', { name: 'Scratchpad' })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open notepad' })).toHaveAttribute('aria-pressed', 'false');
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
  expect(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ })).toBeEnabled();
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
  fireEvent.click(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ }));
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

test('arranging exposes a room library, deselects furniture, and saves widget positions', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Decorate' }));
  fireEvent.click(screen.getByRole('button', { name: 'Arrange room' }));
  expect(screen.getByRole('region', { name: 'Room library' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Move timer' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Move daily goal' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Position Soft sofa' }));
  expect(screen.getByRole('button', { name: 'Position Soft sofa' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Deselect Soft sofa' }));
  expect(screen.getByRole('button', { name: 'Position Soft sofa' })).toHaveAttribute('aria-pressed', 'false');
  const rect = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return this.classList.contains('app') ? { left: 0, top: 0, width: 1200, height: 800 }
      : this.classList.contains('app-header') ? { left: 0, top: 0, width: 1200, height: 62, bottom: 62 }
      : this.classList.contains('workspace-decorate') ? { left: 0, top: 620, width: 1200, height: 180 }
      : { left: 200, top: 150, width: 300, height: 250 };
  });
  fireEvent.keyDown(screen.getByRole('button', { name: 'Move timer' }), { key: 'ArrowRight' });
  fireEvent.keyDown(screen.getByRole('button', { name: 'Move daily goal' }), { key: 'ArrowDown' });
  await advance(1000);
  expect(latestWrite().state.room.widgets.timer).toEqual({ x: 17.5, y: 18.75 });
  expect(latestWrite().state.room.widgets.goal).toEqual({ x: 200 / 1200 * 100, y: 20 });
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Deselect daily goal' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Room library' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  expect(screen.queryByRole('region', { name: 'Room library' })).not.toBeInTheDocument();
  rect.mockRestore();
});

test('furniture dragging preserves its grab offset through the temporary arrangement zoom', async () => {
  const saved = createInitialState(NOW);
  saved.room.decorations = [{ id: 'zoom-sofa', item: 'couch', x: 50, y: 50 }];
  saved.animals[0].placed = false;
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.classList.contains('workspace-decorate')) return { left: 0, top: 400, width: 1200, height: 400 };
    if (this.classList.contains('app-header')) return { left: 0, top: 0, width: 1200, height: 62, bottom: 62 };
    if (['app', 'room-scene', 'room-objects'].some(name => this.classList.contains(name))) return { left: 0, top: 0, width: 1200, height: 800 };
    return { left: 100, top: 150, width: 300, height: 250 };
  });
  jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () { return this.classList.contains('room-resident') ? 300 : 0; });
  jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () { return this.classList.contains('room-resident') ? 400 : 0; });
  const { container } = await openRoom(saved);
  fireEvent.click(screen.getByRole('button', { name: 'Decorate' }));
  fireEvent.click(screen.getByRole('button', { name: 'Arrange room' }));
  const scale = Number(container.querySelector('.room-objects').style.getPropertyValue('--room-edit-scale'));
  expect(scale).toBeGreaterThan(0);
  expect(scale).toBeLessThan(1);
  // The background receives the same camera variables as the furniture.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  expect(container.querySelector('.room-backdrop').parentElement).toBe(container.querySelector('.room-objects'));
  const originalPointerEvent = window.PointerEvent;
  window.PointerEvent = MouseEvent;
  const sofa = screen.getByRole('button', { name: 'Position Soft sofa' });
  fireEvent.pointerDown(sofa, { button: 0, clientX: 500, clientY: 400 });
  expect(sofa).toHaveFocus();
  fireEvent.pointerMove(sofa, { clientX: 560, clientY: 440 });
  fireEvent.pointerUp(sofa);
  await advance(1000);
  const position = latestWrite().state.room.decorations[0];
  expect(position.x).toBeCloseTo(50 + 60 / (1200 * scale) * 100);
  expect(position.y).toBeCloseTo(50 + 40 / (800 * scale) * 100);
  window.PointerEvent = originalPointerEvent;
});

test('an expired pause raises one concise alert, chimes, and resumes the remaining focus time', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await advance(20000);
  fireEvent.click(screen.getByRole('button', { name: /^Pause(?: \(\d\/2\))?$/ }));
  await advance(30000);
  expect(screen.getByRole('timer', { name: '00:30 pause remaining' })).toHaveTextContent('00:30');
  expect(screen.queryByText(/focus left/)).not.toBeInTheDocument();
  await advance(31000);
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(screen.getByRole('alert')).toHaveTextContent('Pause endedSession gems lost');
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Pomodoro pause allowance')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
  expect(document.title).toBe('Pause ended · Little Room');
  expect(engine.chime).toHaveBeenCalledTimes(1);
  await advance(2000);
  expect(engine.chime).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  expect(screen.getByRole('timer', { name: '24:40 remaining' })).toHaveTextContent('24:40');
});
