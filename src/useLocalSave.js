import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialState, gameReducer, normalizeState } from './game';

const SAVE_DELAY = 350;

function snapshot(state) {
  // Notifications belong to this visit, not to the next restored session.
  const value = { ...state, event: null };
  return { value, json: JSON.stringify(value) };
}

function validRevision(value) {
  return typeof value === 'string' || (Number.isInteger(value) && value >= 0);
}

export default function useLocalSave() {
  const [state, setState] = useState(createInitialState);
  const [save, setSave] = useState({
    ready: false, status: 'loading', error: '', storagePath: '', recovered: false,
  });
  const current = useRef(state);
  const mounted = useRef(false);
  const ready = useRef(false);
  const blocked = useRef(false);
  const generation = useRef(0);
  const revision = useRef(null);
  const savedJson = useRef(null);
  const pending = useRef(null);
  const writing = useRef(null);
  const debounce = useRef(null);
  const loading = useRef(null);

  const flush = useCallback(function flushPending({ keepalive = false } = {}) {
    clearTimeout(debounce.current);
    debounce.current = null;
    if (!mounted.current || !ready.current || blocked.current || writing.current || !pending.current) {
      return writing.current?.promise || Promise.resolve();
    }

    const job = { snapshot: pending.current, generation: generation.current };
    pending.current = null;
    writing.current = job;
    setSave(previous => ({ ...previous, status: 'saving', error: '' }));
    const body = JSON.stringify({ state: job.snapshot.value, revision: revision.current });
    job.promise = (async () => {
      try {
        const response = await fetch('/api/save', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body,
          // Browsers cap keepalive bodies. Large histories still use a normal request.
          ...(keepalive && body.length < 16000 ? { keepalive: true } : {}),
        });
        if (response.status === 409) {
          const conflict = new Error('This save changed in another window. Reload the saved version before continuing.');
          conflict.conflict = true;
          throw conflict;
        }
        if (!response.ok) throw new Error('The local save service could not save your changes.');
        const result = await response.json();
        if (!validRevision(result.revision)) throw new Error('The local save service returned an invalid response.');
        if (!mounted.current || generation.current !== job.generation) return;
        revision.current = result.revision;
        savedJson.current = job.snapshot.json;
        if (pending.current?.json === savedJson.current) pending.current = null;
        setSave(previous => ({ ...previous, status: pending.current ? 'saving' : 'saved', error: '' }));
      } catch (error) {
        if (!mounted.current || generation.current !== job.generation) return;
        // Never replace edits made while the failed request was in flight.
        if (!pending.current) pending.current = job.snapshot;
        blocked.current = error.conflict ? 'conflict' : 'error';
        setSave(previous => ({
          ...previous, status: blocked.current,
          error: error.conflict ? error.message : 'Your changes are still here. Saving failed; check that the local service is running, then retry.',
        }));
      } finally {
        if (writing.current === job) writing.current = null;
        if (mounted.current && generation.current === job.generation && !blocked.current && pending.current) {
          // The newest snapshot follows the previous acknowledged revision.
          flushPending();
        }
      }
    })();
    return job.promise;
  }, []);

  const schedule = useCallback(() => {
    clearTimeout(debounce.current);
    if (!ready.current || blocked.current || writing.current || !pending.current) return;
    debounce.current = setTimeout(() => flush(), SAVE_DELAY);
  }, [flush]);

  const reload = useCallback(async () => {
    const ownGeneration = ++generation.current;
    ready.current = false;
    blocked.current = true;
    clearTimeout(debounce.current);
    loading.current?.abort();
    const controller = new AbortController();
    loading.current = controller;
    // If the following reload fails, a superseded write must still count as dirty.
    if (writing.current && !pending.current) pending.current = snapshot(current.current);
    if (mounted.current) setSave(previous => ({ ...previous, ready: false, status: 'loading', error: '' }));
    try {
      // A reload must observe any write already sent by this window.
      await writing.current?.promise;
      if (!mounted.current || generation.current !== ownGeneration) return;
      const response = await fetch('/api/save', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Load failed.');
      const result = await response.json();
      if (!result || !validRevision(result.revision) || !('state' in result)
        || (result.state !== null && (typeof result.state !== 'object' || Array.isArray(result.state)))) {
        throw new Error('Invalid save response.');
      }
      if (!mounted.current || generation.current !== ownGeneration || controller.signal.aborted) return;
      const restored = normalizeState(result.state);
      const restoredSnapshot = snapshot(restored);
      current.current = restored;
      revision.current = result.revision;
      savedJson.current = result.state === null ? null : snapshot(result.state).json;
      pending.current = restoredSnapshot.json !== savedJson.current || result.recovered ? restoredSnapshot : null;
      ready.current = true;
      blocked.current = false;
      setState(restored);
      setSave({
        ready: true, status: pending.current ? 'saving' : 'saved', error: '',
        storagePath: typeof result.storagePath === 'string' ? result.storagePath : '',
        recovered: Boolean(result.recovered),
      });
      schedule();
    } catch (error) {
      if (!mounted.current || generation.current !== ownGeneration || controller.signal.aborted) return;
      blocked.current = 'error';
      setSave(previous => ({
        ...previous, ready: false, status: 'error',
        error: 'Your local save could not be loaded. Check that the local service is running, then retry.',
      }));
    }
  }, [schedule]);

  const dispatch = useCallback(action => {
    if (!mounted.current || !ready.current || blocked.current === 'conflict') return;
    const previous = current.current;
    const next = gameReducer(previous, action);
    if (next === previous) return;
    current.current = next;
    setState(next);
    const nextSnapshot = snapshot(next);
    if (nextSnapshot.json === snapshot(previous).json) return;
    pending.current = nextSnapshot;
    if (!blocked.current) {
      if (!writing.current && nextSnapshot.json === savedJson.current) pending.current = null;
      setSave(previousSave => ({ ...previousSave, status: pending.current || writing.current ? 'saving' : 'saved' }));
      schedule();
    }
  }, [schedule]);

  const retrySave = useCallback(() => {
    if (!ready.current) return reload();
    if (blocked.current === 'conflict') return Promise.resolve();
    blocked.current = false;
    return flush();
  }, [flush, reload]);

  useEffect(() => {
    mounted.current = true;
    reload();
    const beforeUnload = event => {
      if (!pending.current && !writing.current) return;
      event.preventDefault();
      event.returnValue = '';
      flush({ keepalive: true });
    };
    const visibilityChange = () => {
      if (document.visibilityState === 'hidden') flush({ keepalive: true });
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', visibilityChange);
    return () => {
      mounted.current = false;
      generation.current += 1;
      loading.current?.abort();
      clearTimeout(debounce.current);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', visibilityChange);
    };
  }, [flush, reload]);

  return { state, dispatch, ...save, reload, retrySave };
}
