import { Button } from "../../shared/Controls";
import { useContext, useEffect, useId, useRef } from "react";
import { canTakeBreak, elapsedTime, formatElapsedTime, formatTime, gemBonus, isCountingUp, MAX_PAUSES, pauseRemainingTime, remainingTime } from "../../domain/game";
import { Icon, InfoTip } from "../../shared/ui";
import SessionTasks from "./SessionTasks";
import ScratchpadStatus from "../journal/ScratchpadStatus";
import { ArtFragment, PastelButtonArt } from "../../shared/AtelierArt";
import HoldToStop from "./HoldToStop";
import { OutcomeFeedbackContext } from "../../shared/OutcomeFeedback";
import SessionPause, { PauseGuidance } from "./SessionPause";

export default function TimerCard({ state, act, now, ready, blocked, onToggleTimer,
  openPanel, panel, notesOpen, focusView, setFocusView, cardRef, arranging = false }) {
  const { timer, settings } = state;
  const sessionOutcome = useContext(OutcomeFeedbackContext).session;
  const revealReceipt = sessionOutcome?.target === timer.id;
  const earnedNow = revealReceipt && sessionOutcome.gems > 0;
  const counting = isCountingUp(timer);
  const elapsed = elapsedTime(timer, now);
  const remaining = remainingTime(timer, now);
  const complete = timer.status === "complete";
  const breakTime = timer.mode !== "focus";
  const breakReady = !breakTime && canTakeBreak(timer);
  const editable = timer.status === "idle" && !breakTime;
  const time = counting ? Math.max(0, elapsed - (timer.overtime ? timer.durationMs : 0)) : remaining;
  const display = `${timer.overtime ? "+" : ""}${counting ? formatElapsedTime(time) : formatTime(time)}`;
  const recommendedLong = timer.cycle > 0 && timer.cycle % settings.longBreakEvery === 0;
  const limitedPauses = !breakTime && timer.workMode === "pomodoro";
  const paused = timer.status === "paused";
  const forfeited = timer.rewardForfeited;
  const bonus = timer.status === "idle" ? gemBonus(state) : timer.gemBonus || 0;
  const projectedGems = Math.floor(Math.round(timer.durationMs / 60000) * (100 + Math.round(bonus * 100)) / 100);
  const pauseExpired = limitedPauses && paused && forfeited;
  const pauseTitle = timer.pauseCount > MAX_PAUSES ? "Pause limit reached" : "Pause ended";
  const showPauseClock = limitedPauses && paused && !forfeited && !arranging;
  const clockDisplay = showPauseClock ? formatTime(pauseRemainingTime(timer, now)) : display;
  const receipt = complete ? state.history.find(entry => entry.id === timer.id) : null;
  const completedMinutes = receipt?.minutes ?? Math.floor(elapsed / 60000);
  const completedGems = forfeited ? 0 : receipt?.gems ?? receipt?.minutes ?? 0;
  const resumeRef = useRef(null);
  const pauseHelpId = useId();
  useEffect(() => { if (pauseExpired) resumeRef.current?.focus(); }, [pauseExpired]);
  const startBreak = (mode) => act({ type: "START_BREAK", mode });
  const active = !complete && timer.status !== "idle";
  const startNextFocus = () => {
    act({ type: "SET_MODE", mode: "focus" });
    act({ type: "START" });
  };
  const timingControl = <Button className="session-settings-button icon-button" aria-label="Session settings" title="Session settings" aria-expanded={panel === "session"} aria-controls={panel === "session" ? "panel-heading" : undefined} onClick={() => openPanel("session")}><Icon name="sliders" size={18} /></Button>;
  return (
    <section ref={cardRef} data-timer-state={`${timer.mode}-${timer.status}${timer.overtime ? '-overtime' : ''}`} className={`timer-card paper ${counting ? "counting-up" : ""} ${complete ? "session-complete" : ""} ${pauseExpired ? "pause-alert" : ""}`} aria-label="Focus timer">
      <ArtFragment rect={[52, 101, 456, 364]} className="timer-paper-art" />
      <div className="timer-heading">
        {editable ? <div className="mode-tabs work-mode-tabs" role="group" aria-label="Work mode">
          {[["pomodoro", "Countdown"], ["countup", "Count up"]].map(([id, label]) => (
            <Button key={id} type="button" aria-pressed={timer.workMode === id}
              className={timer.workMode === id ? "active" : ""}
              onClick={() => act({ type: "SET_SETTINGS", settings: { workMode: id } })}>{label}</Button>
          ))}
        </div> : <div className="timer-session-controls">
          {active && <SessionPause buttonRef={resumeRef} timer={timer} now={now} disabled={!ready || blocked} onToggle={onToggleTimer} guidance={false} descriptionId={paused || forfeited ? pauseHelpId : undefined} />}
          {active && !breakTime && !timer.overtime && <HoldToStop key={`${timer.id}:${timer.status}`} disabled={!ready || blocked} onStop={() => act({ type: "RESET" })} />}
          {breakTime && <span className="timer-phase">{timer.mode === "longBreak" ? "Long break" : "Short break"}</span>}
        </div>}
        <div className="timer-tools">
          {!breakTime && <InfoTip label="Session info">
            <p><strong>Rewards:</strong> 1 gem per focus minute. Sessions under 1 minute aren’t saved.{counting && " Finish to save count-up sessions."}</p>
            <p><strong>Pet bonus:</strong> +10% per max-level pet, up to 50%. Set at the start; rounded down.</p>
            {limitedPauses && <p><strong>Pauses:</strong> {MAX_PAUSES} pauses, up to 1 minute each. Exceed either limit to lose session gems; time and egg progress stay.</p>}
          </InfoTip>}
          {!breakTime && !complete && timingControl}
          {(breakTime || complete) && <Button className="icon-button" aria-label={breakTime ? "Cancel break" : "Reset timer"} title={breakTime ? "Cancel break" : "Reset timer"} disabled={!ready || blocked} onClick={() => act({ type: "SET_MODE", mode: "focus" })}><Icon name="close" size={19} /></Button>}
          <Button className="icon-button" aria-label="Open Scratchpad" title="Scratchpad"
            aria-expanded={Boolean(notesOpen)} aria-pressed={Boolean(notesOpen)} aria-controls="scratchpad" onClick={() => openPanel("notes")}><Icon name="note" size={18} /></Button>
          {(focusView || (!breakTime && timer.status === "running")) && <Button className="icon-button" aria-label={focusView ? "Leave focus view" : "Enter focus view"}
            title={focusView ? "Leave focus view" : "Enter focus view"} onClick={() => setFocusView(!focusView)}><Icon name={focusView ? "collapse" : "expand"} size={17} /></Button>}
        </div>
      </div>
      {(paused || forfeited) && <PauseGuidance timer={timer} now={now} id={pauseHelpId} compact />}
      {!breakTime && !pauseExpired && !complete && <SessionTasks timer={timer} history={state.history} act={act} minimal compact={focusView} />}
      <div className="timer-face">
        {pauseExpired && !arranging ? <div className="pause-expired" role="alert">
            <span className="feedback-emblem warning"><Icon name="bell" size={32} /></span>
            <strong>{pauseTitle}</strong><span className="pause-loss-copy">Session gems lost</span>
          </div>
          : <>
          <div style={{ "--clock-characters": clockDisplay.length }} className={`timer-digits ${clockDisplay.length > 6 ? "long-clock" : ""}`} role="timer" aria-label={showPauseClock ? `${clockDisplay} pause remaining` : `${display} ${counting ? timer.overtime ? "overtime" : "elapsed" : "remaining"}`}>
            {clockDisplay}</div>
          {showPauseClock && <span className="clock-caption">Pause</span>}
          {timer.overtime && !showPauseClock && <span className="clock-caption">Overtime</span>}
          {timer.overtime && !showPauseClock && <span className="elapsed-total">{formatElapsedTime(elapsed)} total</span>}</>}
      </div>
      {paused && limitedPauses && <p className="paused-focus-context">{timer.overtime ? `Focus elapsed: ${formatElapsedTime(elapsed)} total` : `Focus remaining: ${formatTime(remaining)}`}</p>}
      {(breakTime || complete) && <div className="timer-actions"><Button className="primary-button start-button" disabled={!ready || blocked} onClick={startNextFocus}><PastelButtonArt /><span>Start new session</span></Button></div>}
      {!complete && (timer.status === "idle" || counting || breakTime) && <div className="timer-actions">
        {timer.status === "idle" && !breakTime && <Button className="primary-button start-button" disabled={!ready || blocked} onClick={onToggleTimer}>
          <PastelButtonArt />
          <span>Start</span>
        </Button>}
        {counting && timer.status !== "idle" ? <Button sound={null} className="primary-button finish-button" disabled={!ready || blocked} onClick={() => act({ type: "FINISH_FOCUS" })}><Icon name="check" size={20} />Finish session</Button>
          : null}
      </div>}
      {breakReady && !complete && <div className="break-choices">
        <div className="break-buttons">
          <Button sound={timer.overtime && !complete ? null : undefined} className={recommendedLong ? "secondary-button" : "primary-button"} aria-label={`Short break, ${settings.breakMinutes} minutes`} onClick={() => startBreak("break")} disabled={blocked}><PastelButtonArt />Short break <span>{settings.breakMinutes}m</span></Button>
          <Button sound={timer.overtime && !complete ? null : undefined} className={recommendedLong ? "primary-button" : "secondary-button"} aria-label={`Long break, ${settings.longBreakMinutes} minutes`} onClick={() => startBreak("longBreak")} disabled={blocked}><PastelButtonArt />Long break <span>{settings.longBreakMinutes}m</span></Button>
        </div>
      </div>}
      {!focusView && !pauseExpired && !breakTime && <div className="timer-options">
        {complete ? <div className={`session-receipt ${forfeited ? "forfeited" : ""} ${revealReceipt ? "receipt-reveal" : ""}`} aria-label="Session result">
          <span key={earnedNow ? sessionOutcome.id : timer.id} className={earnedNow ? "reward-earned" : undefined} aria-label={`${completedGems} Shilligems earned`}><Icon name="gem" size={18} />+{completedGems}</span>
          <span>{completedMinutes ? `${completedMinutes} min` : "Under 1 min"}</span>
        </div> : !breakTime ? <span className={`session-reward ${forfeited ? "forfeited" : ""}`} aria-label={forfeited ? "0 Shilligems this session" : undefined}><Icon name="gem" size={15} />{forfeited ? "0" : counting ? `1 / min${bonus ? ` +${Math.round(bonus * 100)}%` : ""}` : `+${projectedGems}`}
          </span> : <span />}
      </div>}
      {timer.overtime && !complete && !forfeited && <p className="pending-session-reward">{state.history.find(entry => entry.id === timer.id)?.gems || 0} gems pending</p>}
    </section>
  );
}

export function QuickScratchpad({ state, act, saveStatus }) {
  const notes = useRef(null);
  useEffect(() => { notes.current?.focus(); }, []);
  return <div className="quick-notes">
    <textarea ref={notes} id="quick-notes" aria-label="Scratchpad text" placeholder="Save a thought for later…" maxLength={10000} value={state.scratchpad} onChange={(event) => act({ type: "SET_SCRATCHPAD", text: event.target.value })} />
    <ScratchpadStatus status={saveStatus} />
  </div>;
}
