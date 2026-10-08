import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialState, gameReducer, normalizeState } from "./game";
import { requestSave, saveProblem } from "./saveProblems";

const SAVE_DELAY = 350;

function snapshot(state) {
  // Notifications belong to this visit, not to the next restored session.
  const value = { ...state, event: null };
  return { value, json: JSON.stringify(value) };
}

function validRevision(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export default function useLocalSave() {
  const [state, setState] = useState(createInitialState);
  const [save, setSave] = useState({
    ready: false,
    status: "loading",
    error: "",
    storagePath: "",
    recovered: false,
    failure: null,
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
    if (
      !mounted.current ||
      !ready.current ||
      blocked.current ||
      writing.current ||
      !pending.current
    ) {
      return writing.current?.promise || Promise.resolve();
    }

    const job = { snapshot: pending.current, generation: generation.current };
    pending.current = null;
    writing.current = job;
    setSave((previous) => ({ ...previous, status: "saving", error: "", failure: null }));
    const body = JSON.stringify({
      state: job.snapshot.value,
      revision: revision.current,
    });
    job.promise = (async () => {
      try {
        const result = await requestSave({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
          // Browsers cap keepalive bodies. Large histories still use a normal request.
          ...(keepalive && body.length < 16000 ? { keepalive: true } : {}),
        }, "save");
        if (!validRevision(result?.revision) || result.revision !== revision.current + 1)
          throw saveProblem("response", "save");
        if (!mounted.current || generation.current !== job.generation) return;
        revision.current = result.revision;
        savedJson.current = job.snapshot.json;
        if (pending.current?.json === savedJson.current) pending.current = null;
        setSave((previous) => ({
          ...previous,
          status: pending.current ? "saving" : "saved",
          error: "",
          failure: null,
        }));
      } catch (error) {
        if (!mounted.current || generation.current !== job.generation) return;
        // Never replace edits made while the failed request was in flight.
        if (!pending.current) pending.current = job.snapshot;
        blocked.current = error.conflict ? "conflict" : "error";
        setSave((previous) => ({
          ...previous,
          status: blocked.current,
          error: error.message,
          failure: error.failure || saveProblem("service", "save").failure,
        }));
      } finally {
        if (writing.current === job) writing.current = null;
        if (
          mounted.current &&
          generation.current === job.generation &&
          !blocked.current &&
          pending.current
        ) {
          // The newest snapshot follows the previous acknowledged revision.
          flushPending();
        }
      }
    })();
    return job.promise;
  }, []);

  const schedule = useCallback(() => {
    clearTimeout(debounce.current);
    if (
      !ready.current ||
      blocked.current ||
      writing.current ||
      !pending.current
    )
      return;
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
    if (writing.current && !pending.current)
      pending.current = snapshot(current.current);
    if (mounted.current)
      setSave((previous) => ({
        ...previous,
        ready: false,
        status: "loading",
        error: "",
        failure: null,
      }));
    try {
      // A reload must observe any write already sent by this window.
      await writing.current?.promise;
      if (!mounted.current || generation.current !== ownGeneration) return;
      const result = await requestSave({
        signal: controller.signal,
        cache: "no-store",
      }, "load");
      if (
        !result ||
        !validRevision(result.revision) ||
        typeof result !== "object" ||
        !("state" in result) ||
        (result.state !== null &&
          (typeof result.state !== "object" || Array.isArray(result.state) || result.state.schemaVersion !== 1)) ||
        (result.state === null ? result.revision !== 0 : result.revision === 0)
      ) {
        throw saveProblem("response", "load");
      }
      if (
        !mounted.current ||
        generation.current !== ownGeneration ||
        controller.signal.aborted
      )
        return;
      const restored = normalizeState(result.state);
      const restoredSnapshot = snapshot(restored);
      current.current = restored;
      revision.current = result.revision;
      savedJson.current =
        result.state === null ? null : snapshot(result.state).json;
      pending.current =
        restoredSnapshot.json !== savedJson.current || result.recovered
          ? restoredSnapshot
          : null;
      ready.current = true;
      blocked.current = false;
      setState(restored);
      setSave({
        ready: true,
        status: pending.current ? "saving" : "saved",
        error: "",
        storagePath:
          typeof result.storagePath === "string" ? result.storagePath : "",
        recovered: Boolean(result.recovered),
        failure: null,
      });
      schedule();
    } catch (error) {
      if (
        !mounted.current ||
        generation.current !== ownGeneration ||
        controller.signal.aborted
      )
        return;
      blocked.current = "error";
      setSave((previous) => ({
        ...previous,
        ready: false,
        status: "error",
        error: error.message,
        failure: error.failure || saveProblem("service", "load").failure,
        storagePath: error.failure?.storagePath || previous.storagePath,
      }));
    }
  }, [schedule]);

  const dispatch = useCallback(
    (action) => {
      if (!mounted.current || !ready.current || blocked.current === "conflict")
        return;
      const previous = current.current;
      const next = gameReducer(previous, action);
      if (next === previous) return;
      current.current = next;
      setState(next);
      const nextSnapshot = snapshot(next);
      if (nextSnapshot.json === snapshot(previous).json) return;
      pending.current = nextSnapshot;
      if (!blocked.current) {
        if (!writing.current && nextSnapshot.json === savedJson.current)
          pending.current = null;
        setSave((previousSave) => ({
          ...previousSave,
          status: pending.current || writing.current ? "saving" : "saved",
        }));
        schedule();
      }
    },
    [schedule],
  );

  const retrySave = useCallback(() => {
    if (!ready.current) return reload();
    if (blocked.current === "conflict") return Promise.resolve();
    blocked.current = false;
    return flush();
  }, [flush, reload]);

  useEffect(() => {
    mounted.current = true;
    reload();
    const beforeUnload = (event) => {
      if (!pending.current && !writing.current) return;
      event.preventDefault();
      event.returnValue = "";
      flush({ keepalive: true });
    };
    const visibilityChange = () => {
      if (document.visibilityState === "hidden") flush({ keepalive: true });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      mounted.current = false;
      generation.current += 1;
      loading.current?.abort();
      clearTimeout(debounce.current);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [flush, reload]);

  return { state, dispatch, ...save, reload, retrySave };
}
