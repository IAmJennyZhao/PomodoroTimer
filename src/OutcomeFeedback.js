import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export const OutcomeFeedbackContext = createContext({});
export const OUTCOME_MS = 600;

// Visit-only feedback, deliberately absent from the game/save state.
export function useOutcomeFeedback() {
  const [outcomes, setOutcomes] = useState({});
  const deadlines = useRef({});
  const claims = useRef(new Map());
  const latest = useRef({});
  const claimOutcome = useCallback((id, target) => {
    if (!claims.current.has(id)) claims.current.set(id, new Set());
    const targets = claims.current.get(id);
    if (targets.has(target)) return false;
    targets.add(target);
    return true;
  }, []);
  const showOutcome = useCallback((channel, outcome) => {
    clearTimeout(deadlines.current[channel]);
    claims.current.delete(latest.current[channel]);
    latest.current[channel] = outcome.id;
    setOutcomes(previous => ({ ...previous, [channel]: outcome }));
    deadlines.current[channel] = setTimeout(() => {
      claims.current.delete(outcome.id);
      setOutcomes(previous => previous[channel]?.id === outcome.id
        ? { ...previous, [channel]: null } : previous);
    }, OUTCOME_MS);
  }, []);
  useEffect(() => {
    const timers = deadlines.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);
  const value = useMemo(() => ({ ...outcomes, claimOutcome }), [outcomes, claimOutcome]);
  return [value, showOutcome];
}

export function OutcomeAccent({ channel, target, className = "" }) {
  const feedback = useContext(OutcomeFeedbackContext);
  const { claimOutcome } = feedback;
  const outcome = feedback[channel];
  const id = outcome && (outcome.target === target || outcome.targets?.includes(target)) ? outcome.id : null;
  const [claimed, setClaimed] = useState(null);
  useLayoutEffect(() => {
    if (id && claimOutcome?.(id, target)) setClaimed(id);
  }, [id, target, claimOutcome]);
  if (!id || claimed !== id) return null;
  // Only decoration remounts; controls keep focus and their native identity.
  return <span key={outcome.id} className={`outcome-accent ${className}`} aria-hidden="true" />;
}
