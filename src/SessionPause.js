import { useId } from "react";
import { Button } from "./Controls";
import { MAX_PAUSES, pauseRemainingTime, formatTime } from "./game";

export function pauseLabel(timer) {
  if (timer.status === "paused") return "Resume";
  if (timer.mode !== "focus" || timer.workMode !== "pomodoro" || timer.rewardForfeited) return "Pause";
  const left = Math.max(0, MAX_PAUSES - timer.pauseCount);
  return left ? `Pause (${left}/${MAX_PAUSES})` : "Pause · lose gems";
}

export function PauseGuidance({ timer, now, id, compact = false }) {
  if (timer.mode !== "focus" || timer.workMode !== "pomodoro" || timer.status === "complete") return null;
  const left = Math.max(0, MAX_PAUSES - timer.pauseCount);
  const compactCopy = timer.rewardForfeited ? "0 session gems; focus minutes and egg progress are kept."
    : timer.status === "paused" ? `Resume within ${formatTime(pauseRemainingTime(timer, now))} to keep gems · ${left}/${MAX_PAUSES} pauses left.`
    : left ? `${left}/${MAX_PAUSES} pauses left · up to 1 minute each. Exceed either limit: 0 session gems.`
    : "Pausing again loses session gems; focus minutes and egg progress are kept.";
  return <p id={id} className={`pause-guidance ${timer.rewardForfeited ? "reward-lost" : ""}`}>
    {compact ? compactCopy : timer.rewardForfeited ? "This session earns 0 gems. Focus minutes and egg progress are kept; finish to record the remaining work."
      : timer.status === "paused" ? `Resume within ${formatTime(pauseRemainingTime(timer, now))} to keep this session’s gems. ${left} of ${MAX_PAUSES} pauses left afterward.`
      : timer.status === "idle" ? `${MAX_PAUSES} pauses, up to 1 minute each. A third pause or a pause over 1 minute loses this session’s gems.`
      : left ? `${left} of ${MAX_PAUSES} pauses left · 1 minute maximum each. Going over either limit loses this session’s gems.`
      : "No rewarded pauses left. Pausing again loses this session’s gems; your focus minutes and egg progress are kept."}
  </p>;
}

export default function SessionPause({ timer, now, onToggle, disabled, buttonRef, guidance = true, descriptionId, compact = false }) {
  const localId = useId();
  const guidanceId = descriptionId || localId;
  return <div className="session-pause">
    <Button ref={buttonRef} type="button" className={`pause-button ${timer.status === "paused" ? "resume-button" : ""}`}
      disabled={disabled} aria-describedby={timer.mode === "focus" && timer.workMode === "pomodoro" ? guidanceId : undefined}
      onClick={onToggle}>{pauseLabel(timer)}</Button>
    {guidance && <PauseGuidance timer={timer} now={now} id={guidanceId} compact={compact} />}
  </div>;
}
