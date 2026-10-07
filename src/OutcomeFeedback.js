import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export const OutcomeFeedbackContext = createContext({});
export const OUTCOME_MS = 600;

// Visit-only feedback, deliberately absent from the game/save state.
export function useOutcomeFeedback() {
  const [outcomes, setOutcomes] = useState({});
  const deadlines = useRef({});
  const showOutcome = useCallback((channel, outcome) => {
    clearTimeout(deadlines.current[channel]);
    setOutcomes(previous => ({ ...previous, [channel]: outcome }));
    deadlines.current[channel] = setTimeout(() => {
      setOutcomes(previous => previous[channel]?.id === outcome.id
        ? { ...previous, [channel]: null } : previous);
    }, OUTCOME_MS);
  }, []);
  useEffect(() => {
    const timers = deadlines.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);
  return [outcomes, showOutcome];
}

export function OutcomeAccent({ channel, target, className = "" }) {
  const outcome = useContext(OutcomeFeedbackContext)[channel];
  if (!outcome || (outcome.target !== target && !outcome.targets?.includes(target))) return null;
  // Only decoration remounts; controls keep focus and their native identity.
  return <span key={outcome.id} className={`outcome-accent ${className}`} aria-hidden="true" />;
}
