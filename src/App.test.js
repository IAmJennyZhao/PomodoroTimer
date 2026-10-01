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

let engine;
let diskState;
let revision;

async function openRoom(saved = createInitialState(NOW)) {
  diskState = saved;
  const view = render(<App />);
  await settle();
  expect(screen.getByRole('button', { name: 'Start focusing' })).toBeEnabled();
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
  fireEvent.click(screen.getByRole('button', { name: 'Start focusing' }));
  expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  await advance(350);

  await wakeAt(NOW + 25 * MINUTE);
  expect(screen.getByRole('button', { name: '25 Shilligems, open egg shop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Daily progress: 1 of 1 sessions' })).toBeInTheDocument();
  expect(screen.getByRole('timer')).toHaveTextContent('05:00');
  expect(screen.getByRole('button', { name: 'Short break', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Take a breath' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('Daily goal complete!');
  expect(screen.getByText('A little stretch')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Another break idea' }));
  expect(screen.getByText('Look a little farther')).toBeInTheDocument();
  expect(engine.chime).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Journal', exact: true }));
  const journal = screen.getByRole('dialog', { name: 'Your focus journal' });
  expect(within(journal).getByText('Finish my sketch')).toBeInTheDocument();
  expect(within(journal).getByRole('heading', { name: 'Your daily goal, beautifully done.' })).toBeInTheDocument();
  expect(within(journal).getByRole('progressbar', { name: 'Daily focus goal' })).toHaveAttribute('value', '1');
  await advance(350);
  expect(latestWrite()).toMatchObject({ state: {
    gems: 25, event: null, settings: { dailyGoal: 1 },
    history: [{ task: 'Finish my sketch', minutes: 25, completedAt: NOW + 25 * MINUTE }],
    timer: { mode: 'break', status: 'idle' },
  } });
  await wakeAt(NOW + 12 * 60 * MINUTE);
  expect(screen.getByRole('button', { name: '25 Shilligems, open egg shop' })).toBeInTheDocument();
  expect(engine.chime).toHaveBeenCalledTimes(1);
});

test('focus earnings can buy and hatch an egg into another visible room resident', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Start focusing' }));
  await wakeAt(NOW + 25 * MINUTE);
  fireEvent.click(screen.getByRole('button', { name: 'Egg shop', exact: true }));
  const shop = screen.getByRole('dialog', { name: 'The egg shop' });
  expect(within(shop).getByRole('button', { name: /Roll mystery egg/ })).toBeDisabled();
  fireEvent.click(within(shop).getByRole('button', { name: /Buy basic egg/ }));
  expect(screen.getByRole('button', { name: '0 Shilligems, open egg shop' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Hatch everyday egg 1' }));

  const hatch = screen.getByRole('dialog', { name: 'Look who found you.' });
  expect(hatch).toHaveAttribute('aria-modal', 'true');
  const welcome = within(hatch).getByRole('button', { name: 'Welcome home' });
  expect(welcome).toHaveFocus();
  fireEvent.keyDown(welcome, { key: 'Tab', shiftKey: true });
  expect(welcome).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Miso, Everyday cat' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cat, Everyday cat' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hatch everyday egg 1' })).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Look who found you.' })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'The egg shop' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Animals', exact: true }));
  expect(screen.getByRole('button', { name: 'Select Cat, everyday Cat, friend 2' })).toBeInTheDocument();
  await advance(350);
  expect(latestWrite().state).toMatchObject({ gems: 0, eggs: [], history: [{ minutes: 25 }] });
  expect(latestWrite().state.animals).toHaveLength(2);
  expect(new Set(latestWrite().state.animals.map(animal => animal.id)).size).toBe(2);
  expect(latestWrite().state.animals.every(animal => animal.placed)).toBe(true);
});

test('failed local loads show a retry action and never replace a private save with defaults', async () => {
  global.fetch.mockRejectedValueOnce(new Error('Service unavailable'));
  render(<App />);
  await settle();
  expect(screen.getByRole('heading', { name: 'Your room is waiting.' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start focusing' })).toBeDisabled();
  await advance(60 * MINUTE);
  expect(writes()).toHaveLength(0);

  diskState = { ...createInitialState(NOW), gems: 73 };
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await settle();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start focusing' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '73 Shilligems, open egg shop' })).toBeInTheDocument();
  await advance(1000);
  expect(writes()).toHaveLength(0);
});

test('pause survives a tab wake, resume keeps the remaining duration, and reset abandons without reward', async () => {
  await openRoom();
  fireEvent.click(screen.getByRole('button', { name: 'Start focusing' }));
  await wakeAt(NOW + 2 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('23:00');
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  await wakeAt(NOW + 120 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('23:00');
  expect(screen.getByRole('button', { name: 'Keep going' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '0 Shilligems, open egg shop' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
  await wakeAt(NOW + 121 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('22:00');
  fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
  expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  expect(screen.getByRole('button', { name: 'Start focusing' })).toBeEnabled();
  await wakeAt(NOW + 500 * MINUTE);
  expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  expect(screen.getByRole('button', { name: 'Daily progress: 0 of 4 sessions' })).toBeInTheDocument();
  await advance(350);
  expect(latestWrite().state).toMatchObject({ gems: 0, history: [], timer: { status: 'idle', remainingMs: 25 * MINUTE } });
});

test('navigation opens named drawers, restores the opener after Escape, and tears down timers and audio', async () => {
  const { unmount } = await openRoom();
  const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
  expect(within(navigation).getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-current', 'page');
  for (const [label, title] of [
    ['Animals', 'Your little companions'], ['Egg shop', 'The egg shop'],
    ['Decorate', 'Make yourself at home'], ['Journal', 'Your focus journal'],
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
  expect(screen.getByRole('dialog', { name: 'Settle in your way' })).toBeInTheDocument();
  expect(screen.getByText('C:\\private\\PomodoroTimer\\saves')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  expect(engine.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Soundscape mixer' }));
  expect(screen.getByRole('dialog', { name: 'A softer soundtrack' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play soundscape' }));
  await settle();
  expect(engine.start).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Pause soundscape' })).toHaveAttribute('aria-pressed', 'true');
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
  expect(screen.getByRole('button', { name: 'Start focusing' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Short break', exact: true }));
  expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  expect(writes()).toHaveLength(1);

  diskState = { ...createInitialState(NOW), gems: 10 };
  revision = 5;
  fireEvent.click(screen.getByRole('button', { name: 'Reload saved room' }));
  await settle();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Session task' })).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Start focusing' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '10 Shilligems, open egg shop' })).toBeInTheDocument();
});
