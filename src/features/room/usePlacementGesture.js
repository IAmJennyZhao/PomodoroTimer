import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Pointer drafts are visit-only. The ref is authoritative between native
// events, so a release never commits an older React render of the position.
export default function usePlacementGesture({ enabled, project, commit, onCancel }) {
  const [draft, setDraft] = useState(null);
  const active = useRef(null);
  const callbacks = useRef({ project, commit, onCancel });
  callbacks.current = { project, commit, onCancel };
  const cancel = useCallback((reason = "cancel") => {
    const gesture = active.current;
    if (!gesture) return;
    active.current = null;
    setDraft(null);
    callbacks.current.onCancel?.(gesture, reason);
  }, []);
  useLayoutEffect(() => {
    if (!enabled) cancel("disabled");
  }, [enabled, cancel]);
  useEffect(() => {
    const escape = event => {
      if (event.key !== "Escape" || !active.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cancel();
    };
    const blur = () => cancel();
    const resize = () => cancel("resize");
    const hidden = () => { if (document.visibilityState !== "visible") cancel(); };
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      active.current = null;
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [cancel]);
  const matches = event => active.current && active.current.pointerId === event.pointerId;
  return {
    draft: enabled ? draft : null,
    cancel,
    start(event, origin) {
      if (!enabled || active.current || event.button !== 0 || event.isPrimary === false || event.currentTarget.closest("[inert]")) return false;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      active.current = { ...origin, pointerId: event.pointerId, pointerX: event.clientX, pointerY: event.clientY, next: origin };
      setDraft(active.current);
      return true;
    },
    handlers: {
      onPointerMove(event) {
        if (!matches(event)) return;
        const gesture = active.current;
        gesture.next = callbacks.current.project(gesture, event);
        setDraft({ ...gesture, ...gesture.next });
      },
      onPointerUp(event) {
        if (!matches(event)) return;
        const gesture = active.current;
        active.current = null;
        setDraft(null);
        if (enabled) callbacks.current.commit(gesture.next, gesture);
      },
      onPointerCancel(event) { if (matches(event)) cancel(); },
      onLostPointerCapture(event) { if (matches(event)) cancel(); },
      onBlur() { cancel(); },
    },
  };
}
