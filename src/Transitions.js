import { createContext, Fragment, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MotionPreferenceContext } from "./useReducedMotion";

export const TRANSITION_MS = 200;
export const SurfaceActivityContext = createContext(true);
const EASE = "cubic-bezier(.2, .7, .2, 1)";
const identity = value => value?.id ?? value;

// Logical state changes immediately. Only the last visual surface may linger;
// a generation guard prevents an older exit from removing a reopened surface.
export function Presence({ value, children }) {
  const reduced = useContext(MotionPreferenceContext);
  const key = value == null ? null : identity(value);
  const [saved, setSaved] = useState(() => ({ key, value, leaving: null, generation: 0 }));
  let current = saved;
  if (key !== saved.key || (reduced && saved.leaving)) {
    const leaving = saved.key != null ? { key: saved.key, value: saved.value } : saved.leaving;
    current = { key, value, leaving: !reduced && leaving?.key !== key ? leaving : null,
      generation: saved.generation + 1 };
    setSaved(current);
  }
  useEffect(() => {
    if (!current.leaving) return undefined;
    const generation = current.generation;
    const timeout = setTimeout(() => setSaved(previous => previous.generation === generation
      ? { ...previous, leaving: null } : previous), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [current.generation, current.leaving]);
  return <>
    {current.leaving && <Fragment key={current.leaving.key}>{children(current.leaving.value, false)}</Fragment>}
    {key != null && <Fragment key={key}>{children(value, true)}</Fragment>}
  </>;
}

// Read the interrupted frame before cancelling, so reversal starts where the
// user actually sees it. Individual translate preserves panel positioning.
export function useSurfaceTransition(ref, active = true) {
  const reduced = useContext(MotionPreferenceContext);
  const animation = useRef(null);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const style = getComputedStyle(node);
    const from = mounted.current ? { opacity: style.opacity, translate: style.translate }
      : { opacity: 0, translate: "0 8px" };
    mounted.current = true;
    animation.current?.cancel();
    animation.current = null;
    if (reduced || !node.animate) return;
    const motion = node.animate([from, { opacity: active ? 1 : 0, translate: active ? "0 0" : "0 4px" }],
      { duration: TRANSITION_MS, easing: EASE, fill: "both" });
    animation.current = motion;
    motion.finished.then(() => {
      if (animation.current === motion && active) { motion.cancel(); animation.current = null; }
    }).catch(() => {});
  }, [ref, active, reduced]);
  useEffect(() => () => animation.current?.cancel(), []);
}

export function blockExitingInteraction(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function exitProps(active) {
  return {
    "data-presence": active ? "present" : "exiting",
    inert: active ? undefined : "",
    "aria-hidden": active ? undefined : true,
    onClickCapture: active ? undefined : blockExitingInteraction,
    onChangeCapture: active ? undefined : blockExitingInteraction,
    onPointerDownCapture: active ? undefined : blockExitingInteraction,
    onKeyDownCapture: active ? undefined : blockExitingInteraction,
  };
}

export function ExitSnapshot({ active, children }) {
  const last = useRef(children);
  useLayoutEffect(() => { if (active) last.current = children; }, [active, children]);
  return active ? children : last.current;
}
