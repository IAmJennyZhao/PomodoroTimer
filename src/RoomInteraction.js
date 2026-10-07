import { useContext, useLayoutEffect, useRef } from "react";
import { OutcomeFeedbackContext } from "./OutcomeFeedback";
import { MotionPreferenceContext } from "./useReducedMotion";

export function useRoomChanges(state, ready, showOutcome, feedback) {
  const previous = useRef(null);
  const serial = useRef(0);
  useLayoutEffect(() => {
    if (!ready) { previous.current = null; return; }
    const old = previous.current;
    previous.current = state;
    if (!old) return; // Loading/reloading a saved room is silent.
    const emit = (channel, target, kind, extra = {}) => showOutcome(channel, { id: `room:${++serial.current}`, target, kind, ...extra });
    let placed = false;
    for (const [type, items, before] of [
      ["animal", state.animals.filter(item => item.placed), old.animals.filter(item => item.placed)],
      ["decoration", state.room.decorations, old.room.decorations],
      ["widget", Object.entries(state.room.widgets || {}).map(([id, position]) => ({ id, ...position })), Object.entries(old.room.widgets || {}).map(([id, position]) => ({ id, ...position }))],
    ]) {
      for (const item of items) {
        const original = before.find(entry => entry.id === item.id);
        // A hatch already owns its reveal, rather than also making a drop sound.
        const hatched = type === "animal" && state.event?.type === "animal-hatched" && state.event.animal.id === item.id && state.event !== old.event;
        if (!hatched && (!original || item.x !== original.x || item.y !== original.y)) {
          emit("room", `${type}:${item.id}`, "placed");
          placed = true;
        }
      }
    }
    if (placed) feedback("placement");
  }, [state, ready, showOutcome, feedback]);
}

// Animate only an inner artwork layer. The parent/hitbox continues to use
// authoritative coordinates and the existing room camera at all times.
export function RoomVisual({ target, lifted = false, className = "", children, ...props }) {
  const ref = useRef(null);
  const feedback = useContext(OutcomeFeedbackContext);
  const reduced = useContext(MotionPreferenceContext);
  const outcome = feedback.room?.target === target ? feedback.room : null;
  const { claimOutcome } = feedback;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!outcome || reduced || lifted || !element?.animate || !claimOutcome?.(outcome.id, `visual:${target}`)) return undefined;
    const returning = outcome.kind === "cancelled";
    const animation = element.animate(returning ? [
      { translate: `${outcome.dx || 0}px ${outcome.dy || 0}px`, scale: "1.015" },
      { translate: "0 0", scale: "1" },
    ] : [
      { translate: "0 -3px", scale: "1.015" },
      { translate: "0 1px", scale: ".998", offset: .7 },
      { translate: "0 0", scale: "1" },
    ], { duration: 200, easing: "cubic-bezier(.2,.8,.25,1)" });
    return () => animation.cancel();
  }, [outcome, reduced, lifted, target, claimOutcome]);
  return <div ref={ref} {...props} className={`room-visual ${className}`} data-lifted={lifted ? "true" : undefined}>
    {children}
    {outcome?.kind === "cancelled" && <span className="room-cancel-mark" aria-hidden="true">Returned</span>}
  </div>;
}
