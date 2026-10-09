import { Button } from "../../shared/Controls";
import SessionPause from "./SessionPause";
import { elapsedTime, formatElapsedTime, formatTime, isCountingUp, remainingTime } from "../../domain/game";

export default function SessionStrip({ timer, now, onToggle, onFocus, disabled, compact = false }) {
  const complete = timer.status === "complete";
  const counting = isCountingUp(timer);
  const phase = timer.mode === "longBreak" ? "Long break" : timer.mode === "break" ? "Short break"
    : complete ? "Session complete" : timer.overtime ? "Overtime" : counting ? "Count up" : "Focus";
  const time = counting ? formatElapsedTime(Math.max(0, elapsedTime(timer, now) - (timer.overtime ? timer.durationMs : 0))) : formatTime(remainingTime(timer, now));
  return <section className="session-strip" aria-label="Current session" data-status={timer.status}>
    <Button type="button" className="session-strip-time session-strip-return" onClick={onFocus} aria-label={complete ? "View result and breaks" : "Back to Focus"}>
      <strong>{phase}{timer.status === "paused" ? " · paused" : ""}</strong>
      {!complete && <span role="timer" aria-label={`${phase} ${time} ${counting ? "elapsed" : "remaining"}`}>{timer.overtime ? "+" : ""}{time}</span>}
      <span className="session-strip-route">{complete ? "View result & breaks" : "Back to Focus"}</span>
    </Button>
    {!complete && <SessionPause timer={timer} now={now} onToggle={onToggle} disabled={disabled} compact={compact} />}
  </section>;
}
