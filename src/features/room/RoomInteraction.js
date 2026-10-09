import { createContext, useCallback, useContext, useLayoutEffect, useRef } from "react";
import { OutcomeFeedbackContext } from "../../shared/OutcomeFeedback";
import { MotionPreferenceContext } from "../../shared/useReducedMotion";

export const PetResponseContext = createContext(() => {});
export function usePetResponses(showOutcome, enabled) {
  const nextResponse = useRef(new Map());
  const serial = useRef(0);
  return useCallback(id => {
    if (!enabled || Date.now() < (nextResponse.current.get(id) || 0)) return;
    nextResponse.current.set(id, Date.now() + 2500);
    showOutcome("pet", { id: `pet:${++serial.current}`, target: `animal:${id}`, kind: "pet" });
  }, [enabled, showOutcome]);
}

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
    if (state.room.background !== old.room.background) {
      emit("apply", `backgrounds:${state.room.background}`, "style");
      feedback("selection");
    }
    for (const animal of state.animals) {
      const original = old.animals.find(item => item.id === animal.id);
      if (original && original.accessory !== animal.accessory) {
        emit("apply", `accessories:${animal.accessory}`, "accessory", { targets: [`animal:${animal.id}`] });
        feedback("selection");
      }
    }
  }, [state, ready, showOutcome, feedback]);
}

export function useRoomAnimation(ref, outcome, reduced, lifted, target, surface) {
  const { claimOutcome } = useContext(OutcomeFeedbackContext);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!outcome) return undefined;
    if (reduced) {
      claimOutcome?.(outcome.id, `${surface}:${target}`);
      return undefined; // Turning motion back on must not replay an old result.
    }
    if (lifted || !element?.animate) return undefined;
    let animation;
    let disposed = false;
    const start = () => {
      if (disposed || !claimOutcome?.(outcome.id, `${surface}:${target}`)) return;
      const frames = outcome.kind === "cancelled" ? [
        { translate: `${outcome.dx || 0}px ${outcome.dy || 0}px`, scale: "1.015" },
        { translate: "0 0", scale: "1" },
      ] : outcome.kind === "style" ? [{ opacity: .65 }, { opacity: 1 }]
        : outcome.kind === "accessory" ? [{ opacity: .55, scale: ".985" }, { opacity: 1, scale: "1" }]
        : outcome.kind === "pet" ? [
          { rotate: "0deg", translate: "0 0" },
          { rotate: "-2deg", translate: "0 -2px", offset: .35 },
          { rotate: "1deg", translate: "0 -1px", offset: .65 },
          { rotate: "0deg", translate: "0 0" },
        ] : [
          { translate: "0 -3px", scale: "1.015" },
          { translate: "0 1px", scale: ".998", offset: .7 },
          { translate: "0 0", scale: "1" },
        ];
      animation = element.animate(frames, { duration: outcome.kind === "pet" ? 480 : 200, easing: "cubic-bezier(.2,.8,.25,1)" });
    };
    // Fade the actual loaded painting; a slow image cannot start stale feedback.
    if (element.tagName === "IMG" && !element.complete) element.addEventListener("load", start, { once: true });
    else start();
    return () => { disposed = true; element.removeEventListener("load", start); animation?.cancel(); };
  }, [ref, outcome, reduced, lifted, target, surface, claimOutcome]);
}

// Animate only an inner artwork layer. The parent/hitbox continues to use
// authoritative coordinates and the existing room camera at all times.
export function RoomVisual({ target, surface = "room", lifted = false, className = "", children, ...props }) {
  const ref = useRef(null);
  const feedback = useContext(OutcomeFeedbackContext);
  const reduced = useContext(MotionPreferenceContext);
  const matches = outcome => outcome && (outcome.target === target || outcome.targets?.includes(target));
  const outcome = [feedback.room, feedback.apply, feedback.pet].filter(matches).sort((a, b) => b.order - a.order)[0];
  useRoomAnimation(ref, outcome, reduced, lifted, target, surface);
  return <div ref={ref} {...props} className={`room-visual ${className}`} data-lifted={lifted ? "true" : undefined}>
    {children}
    {outcome?.kind === "cancelled" && !lifted && <span className="room-cancel-mark" aria-hidden="true">Returned</span>}
  </div>;
}
