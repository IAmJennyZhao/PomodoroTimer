import React, { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { createInitialState, gameReducer } from './game';
import useLocalSave from './useLocalSave';

const NOW = new Date('2026-10-01T15:00:00Z').getTime();
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const envelope = (state = createInitialState(NOW), extra = {}) => ({
  state, revision: 4, storagePath: 'C:\\private\\saves', recovered: false, ...extra,
});
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const settle = async () => { await act(async () => { await Promise.resolve(); }); };
const advance = async (ms = 350) => { await act(async () => { jest.advanceTimersByTime(ms); }); };
const writes = () => global.fetch.mock.calls.filter(([, options]) => options?.method === 'PUT');
const written = (index = 0) => JSON.parse(writes()[index][1].body);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  global.fetch = jest.fn().mockResolvedValue(response(envelope()));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete global.fetch;
});

test('loads the local service without browser storage and debounces the newest edits', async () => {
  const browserStorage = jest.spyOn(Storage.prototype, 'setItem');
  const { result } = renderHook(useLocalSave);
  await settle();
  expect(result.current).toMatchObject({ ready: true, status: 'saved', storagePath: 'C:\\private\\saves' });
  expect(writes()).toHaveLength(0);
  global.fetch.mockResolvedValue(response({ revision: 5 }));
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'first' }));
  await advance(200);
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'newest' }));
  await advance(349);
  expect(writes()).toHaveLength(0);
  await advance(1);
  expect(written()).toMatchObject({ revision: 4, state: { scratchpad: 'newest', event: null } });
  expect(result.current.status).toBe('saved');
  expect(browserStorage).not.toHaveBeenCalled();
});

test('saves a first-run state rather than leaving the free companion only in memory', async () => {
  global.fetch.mockResolvedValueOnce(response(envelope(null, { revision: 0 })))
    .mockResolvedValueOnce(response({ revision: 1 }));
  const { result } = renderHook(useLocalSave);
  await settle();
  expect(result.current.status).toBe('saving');
  await advance();
  expect(written()).toMatchObject({ revision: 0, state: { gems: 0, animals: [{ id: 'starter-cat' }] } });
  expect(result.current.status).toBe('saved');
});

test('serializes in-flight writes, drops intermediate snapshots, and advances the revision', async () => {
  const firstWrite = deferred();
  const secondWrite = deferred();
  const { result } = renderHook(useLocalSave);
  await settle();
  global.fetch.mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(secondWrite.promise);
  act(() => result.current.dispatch({ type: 'SET_TASK', task: 'one' }));
  await advance();
  act(() => {
    result.current.dispatch({ type: 'SET_TASK', task: 'two' });
    result.current.dispatch({ type: 'SET_TASK', task: 'three' });
  });
  await advance(1000);
  expect(writes()).toHaveLength(1);
  await act(async () => firstWrite.resolve(response({ revision: 5 })));
  expect(writes()).toHaveLength(2);
  expect(written(1)).toMatchObject({ revision: 5, state: { timer: { task: 'three' } } });
  expect(result.current.status).toBe('saving');
  await act(async () => secondWrite.resolve(response({ revision: 6 })));
  expect(result.current.status).toBe('saved');
});

test('failed saves retain newer edits and wait for an explicit retry', async () => {
  const failure = deferred();
  const { result } = renderHook(useLocalSave);
  await settle();
  global.fetch.mockReturnValueOnce(failure.promise);
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'first' }));
  await advance();
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'newer' }));
  await act(async () => failure.reject(new Error('offline')));
  expect(result.current.status).toBe('error');
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'latest' }));
  await advance(10000);
  expect(writes()).toHaveLength(1);
  expect(result.current.state.scratchpad).toBe('latest');
  global.fetch.mockResolvedValueOnce(response({ revision: 5 }));
  await act(async () => result.current.retrySave());
  expect(written(1)).toMatchObject({ revision: 4, state: { scratchpad: 'latest' } });
  expect(result.current.status).toBe('saved');
});

test('a conflict freezes dispatch and retry until a successful reload', async () => {
  const { result } = renderHook(useLocalSave);
  await settle();
  global.fetch.mockResolvedValueOnce(response({}, 409));
  act(() => result.current.dispatch({ type: 'SET_TASK', task: 'local draft' }));
  await advance();
  expect(result.current.status).toBe('conflict');
  act(() => result.current.dispatch({ type: 'SET_TASK', task: 'must not edit' }));
  await act(async () => result.current.retrySave());
  expect(result.current.state.timer.task).toBe('local draft');
  expect(writes()).toHaveLength(1);
  const remote = { ...createInitialState(NOW), scratchpad: 'other window' };
  global.fetch.mockResolvedValueOnce(response(envelope(remote, { revision: 8 })));
  await act(async () => result.current.reload());
  expect(result.current.state.scratchpad).toBe('other window');
  expect(result.current.status).toBe('saved');
  global.fetch.mockResolvedValueOnce(response({ revision: 9 }));
  act(() => result.current.dispatch({ type: 'SET_TASK', task: 'now allowed' }));
  await advance();
  expect(written(1).revision).toBe(8);
});

test('failed initial loads never save a blank state and retry can recover', async () => {
  global.fetch.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(useLocalSave);
  await settle();
  expect(result.current).toMatchObject({ ready: false, status: 'error' });
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'ignored while loading' }));
  await advance(10000);
  expect(writes()).toHaveLength(0);
  expect(result.current.state.scratchpad).toBe('');
  global.fetch.mockResolvedValueOnce(response(envelope({ ...createInitialState(NOW), gems: 80 })));
  await act(async () => result.current.retrySave());
  expect(result.current.state.gems).toBe(80);
  expect(result.current.ready).toBe(true);
});

test('failed reload keeps existing state and does not silently replace it with defaults', async () => {
  const { result } = renderHook(useLocalSave);
  await settle();
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'keep this draft' }));
  global.fetch.mockRejectedValueOnce(new Error('offline'));
  await act(async () => result.current.reload());
  expect(result.current.state.scratchpad).toBe('keep this draft');
  expect(result.current).toMatchObject({ ready: false, status: 'error' });
  await advance(10000);
  expect(writes()).toHaveLength(0);
});

test('expired restored Pomodoros award once and persist a completed session awaiting a break', async () => {
  const running = gameReducer(createInitialState(NOW - 30 * 60000), { type: 'START', now: NOW - 30 * 60000 });
  global.fetch.mockResolvedValueOnce(response(envelope(running, { recovered: true })))
    .mockResolvedValueOnce(response({ revision: 5 }));
  const { result } = renderHook(useLocalSave);
  await settle();
  expect(result.current).toMatchObject({ recovered: true, state: { gems: 25, timer: { mode: 'focus', status: 'complete', workMode: 'pomodoro', endBehavior: 'remind' }, event: { type: 'focus-complete' } } });
  expect(result.current.state.history).toHaveLength(1);
  await advance();
  const persisted = written().state;
  expect(persisted.event).toBeNull();
  global.fetch.mockResolvedValueOnce(response(envelope(persisted, { revision: 5 })));
  await act(async () => result.current.reload());
  expect(result.current.state.gems).toBe(25);
  expect(result.current.state.history).toHaveLength(1);
  expect(result.current.state.timer).toMatchObject({ mode: 'focus', status: 'complete', endBehavior: 'remind' });
  expect(result.current.state.event).toBeNull();
  await advance();
  expect(writes()).toHaveLength(1);
});

test.each([
  { name: 'count up', workMode: 'countup', endBehavior: 'remind', minutes: 5 },
  { name: 'overtime', workMode: 'pomodoro', endBehavior: 'overtime', minutes: 28 },
])('paused $name state survives queued saves and reload with its original timer settings', async ({ workMode, endBehavior, minutes }) => {
  const startedAt = NOW - 35 * 60000;
  let saved = gameReducer(createInitialState(startedAt), { type: 'SET_SETTINGS', settings: { workMode, endBehavior }, now: startedAt });
  saved = gameReducer(saved, { type: 'START', now: startedAt });
  saved = { ...gameReducer(saved, { type: 'PAUSE', now: startedAt + minutes * 60000 }), event: null };
  const originalTimer = saved.timer;
  global.fetch.mockResolvedValueOnce(response(envelope(saved)));
  const { result } = renderHook(useLocalSave);
  await settle();
  expect(result.current.state.timer).toEqual(originalTimer);
  await advance(5 * 60 * 60000);
  act(() => result.current.dispatch({ type: 'TICK', now: Date.now() }));
  expect(result.current.state.timer).toEqual(originalTimer);
  expect(writes()).toHaveLength(0);

  const firstWrite = deferred();
  global.fetch.mockReturnValueOnce(firstWrite.promise).mockResolvedValueOnce(response({ revision: 6 }));
  const nextSettings = { workMode: workMode === 'countup' ? 'pomodoro' : 'countup', endBehavior: endBehavior === 'remind' ? 'overtime' : 'remind' };
  act(() => result.current.dispatch({ type: 'SET_SETTINGS', settings: nextSettings }));
  await advance();
  expect(written()).toMatchObject({ revision: 4, state: { settings: nextSettings, timer: originalTimer } });
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'A thought saved while paused' }));
  await advance();
  expect(writes()).toHaveLength(1);
  await act(async () => firstWrite.resolve(response({ revision: 5 })));
  expect(writes()).toHaveLength(2);
  const persisted = written(1).state;
  expect(written(1).revision).toBe(5);
  expect(persisted).toMatchObject({ settings: nextSettings, timer: originalTimer, scratchpad: 'A thought saved while paused', event: null });
  global.fetch.mockResolvedValueOnce(response(envelope(persisted, { revision: 6 })));
  await act(async () => result.current.reload());
  expect(result.current.state.timer).toEqual(originalTimer);
  expect(result.current.state.settings).toMatchObject(nextSettings);
  expect(result.current.state.gems).toBe(saved.gems);
  expect(result.current.state.history).toEqual(saved.history);
  await advance();
  expect(writes()).toHaveLength(2);
});

test('stale loads cannot overwrite a newer reload, even if abort is ignored by transport', async () => {
  const stale = deferred();
  global.fetch.mockReturnValueOnce(stale.promise);
  const { result } = renderHook(useLocalSave);
  await settle();
  const signal = global.fetch.mock.calls[0][1].signal;
  global.fetch.mockResolvedValueOnce(response(envelope({ ...createInitialState(NOW), gems: 99 })));
  await act(async () => result.current.reload());
  expect(signal.aborted).toBe(true);
  await act(async () => stale.resolve(response(envelope({ ...createInitialState(NOW), gems: 1 }))));
  expect(result.current.state.gems).toBe(99);
});

test('StrictMode effect replay loads once successfully without resetting subsequent edits', async () => {
  const { result } = renderHook(useLocalSave, { wrapper: ({ children }) => <StrictMode>{children}</StrictMode> });
  await settle();
  expect(result.current.ready).toBe(true);
  global.fetch.mockResolvedValue(response({ revision: 5 }));
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'survives replay' }));
  await advance();
  expect(result.current.state.scratchpad).toBe('survives replay');
  expect(writes()).toHaveLength(1);
});

test('reload waits for a write already in flight before fetching its revision', async () => {
  const saveInFlight = deferred();
  const { result } = renderHook(useLocalSave);
  await settle();
  global.fetch.mockReturnValueOnce(saveInFlight.promise);
  act(() => result.current.dispatch({ type: 'SET_TASK', task: 'saved task' }));
  await advance();
  let reloading;
  act(() => { reloading = result.current.reload(); });
  await settle();
  expect(global.fetch).toHaveBeenCalledTimes(2);
  global.fetch.mockResolvedValueOnce(response(envelope(written().state, { revision: 5 })));
  await act(async () => { saveInFlight.resolve(response({ revision: 5 })); await reloading; });
  expect(result.current.status).toBe('saved');
  expect(result.current.state.timer.task).toBe('saved task');
});

test('failed reload during a failed write retains both the draft and unsaved-exit protection', async () => {
  const saveInFlight = deferred();
  const { result } = renderHook(useLocalSave);
  await settle();
  global.fetch.mockReturnValueOnce(saveInFlight.promise).mockRejectedValueOnce(new Error('offline'));
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'precious draft' }));
  await advance();
  let reloading;
  act(() => { reloading = result.current.reload(); });
  await act(async () => { saveInFlight.reject(new Error('offline')); await reloading; });
  expect(result.current.state.scratchpad).toBe('precious draft');
  expect(result.current.status).toBe('error');
  const dirtyUnload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(dirtyUnload);
  expect(dirtyUnload.defaultPrevented).toBe(true);
});

test('warns before leaving unsaved edits and immediately flushes when hidden', async () => {
  const saveInFlight = deferred();
  const { result } = renderHook(useLocalSave);
  await settle();
  const cleanUnload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(cleanUnload);
  expect(cleanUnload.defaultPrevented).toBe(false);
  global.fetch.mockReturnValueOnce(saveInFlight.promise);
  act(() => result.current.dispatch({ type: 'SET_SCRATCHPAD', text: 'save before hiding' }));
  jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(writes()).toHaveLength(1);
  expect(writes()[0][1].keepalive).toBe(true);
  const dirtyUnload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(dirtyUnload);
  expect(dirtyUnload.defaultPrevented).toBe(true);
  await act(async () => saveInFlight.resolve(response({ revision: 5 })));
  const savedUnload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(savedUnload);
  expect(savedUnload.defaultPrevented).toBe(false);
});

test('unmount aborts GET and ignores its late result without creating a save', async () => {
  const load = deferred();
  global.fetch.mockReturnValueOnce(load.promise);
  const { unmount } = renderHook(useLocalSave);
  await settle();
  const signal = global.fetch.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => load.resolve(response(envelope(null, { revision: 0 }))));
  await advance();
  expect(writes()).toHaveLength(0);
});
