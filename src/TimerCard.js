import { Button } from "./Controls";
import { useContext, useEffect, useRef } from "react";
import { canTakeBreak, elapsedTime, formatElapsedTime, formatTime, gemBonus, isCountingUp, MAX_PAUSES, pauseRemainingTime, remainingTime } from "./game";
import { Icon, InfoTip } from "./ui";
import SessionTasks from "./SessionTasks";
import { ArtFragment, PastelButtonArt } from "./AtelierArt";
import HoldToStop from "./HoldToStop";
import { OutcomeFeedbackContext } from "./OutcomeFeedback";

export default function TimerCard({ state, act, now, ready, blocked, onToggleTimer,
  openPanel, panel, notesOpen, focusView, setFocusView, alarmSilenced, silenceAlarm,
  alarmBlocked, retryAlarm, tip, nextTip, cardRef }) {
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
  const repeating = complete && timer.workMode === "pomodoro" && timer.endBehavior === "remind";
  const limitedPauses = !breakTime && timer.workMode === "pomodoro";
  const pausesLeft = Math.max(0, MAX_PAUSES - (timer.pauseCount || 0));
  const paused = timer.status === "paused";
  const forfeited = timer.rewardForfeited;
  const bonus = timer.status === "idle" ? gemBonus(state) : timer.gemBonus || 0;
  const projectedGems = Math.floor(Math.round(timer.durationMs / 60000) * (100 + Math.round(bonus * 100)) / 100);
  const pauseExpired = limitedPauses && paused && forfeited;
  const pauseTitle = timer.pauseCount > MAX_PAUSES ? "Pause limit reached" : "Pause ended";
  const showPauseClock = limitedPauses && paused && !forfeited;
  const receipt = complete ? state.history.find(entry => entry.id === timer.id) : null;
  const completedMinutes = receipt?.minutes ?? Math.floor(elapsed / 60000);
  const completedGems = forfeited ? 0 : receipt?.gems ?? receipt?.minutes ?? 0;
  const hasTask = Boolean(timer.task?.trim() || timer.tasks?.some(task => task.text.trim()));
  const resumeRef = useRef(null);
  useEffect(() => { if (pauseExpired) resumeRef.current?.focus(); }, [pauseExpired]);
  const startBreak = (mode) => act({ type: "START_BREAK", mode });
  const active = !complete && timer.status !== "idle";
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
          {active && <Button ref={resumeRef} type="button" className={`pause-button ${paused ? "resume-button" : ""}`} disabled={!ready || blocked} onClick={onToggleTimer}>
            {paused ? "Resume" : limitedPauses ? `Pause (${pausesLeft}/${MAX_PAUSES})` : "Pause"}
          </Button>}
          {active && !breakTime && <HoldToStop key={`${timer.id}:${timer.status}`} disabled={!ready || blocked} onStop={() => act({ type: "RESET" })} />}
          {breakTime && <span className="timer-phase">{timer.mode === "longBreak" ? "Long break" : "Short break"}</span>}
        </div>}
        <div className="timer-tools">
          <Button className="icon-button" aria-label="Open scratchpad" title="Scratchpad"
            aria-expanded={Boolean(notesOpen)} aria-pressed={Boolean(notesOpen)} aria-controls="scratchpad" onClick={() => openPanel("notes")}><Icon name="note" size={18} /></Button>
          {(focusView || (!breakTime && timer.status === "running")) && <Button className="icon-button" aria-label={focusView ? "Leave focus view" : "Enter focus view"}
            title={focusView ? "Leave focus view" : "Enter focus view"} onClick={() => setFocusView(!focusView)}><Icon name={focusView ? "collapse" : "expand"} size={17} /></Button>}
        </div>
      </div>
      {!breakTime && !pauseExpired && (!complete || hasTask) && <SessionTasks timer={timer} history={state.history} act={act} minimal compact={focusView || complete} />}
      <div className="timer-face">
        {pauseExpired ? <div className="pause-expired" role="alert">
            <span className="feedback-emblem warning"><Icon name="bell" size={32} /></span>
            <strong>{pauseTitle}</strong><span className="pause-loss-copy">Session gems lost</span>
            <InfoTip label="Pause limit details">Only this session’s Shilligems are lost. Resume and finish to record your study time.</InfoTip>
          </div>
          : <>{complete && <div className="session-result-heading"><span className="feedback-emblem success"><Icon name="check" size={18} /></span><span>Session complete</span></div>}
          <div className={`timer-digits ${display.length > 6 ? "long-clock" : ""}`} role="timer" aria-label={showPauseClock ? `${formatTime(pauseRemainingTime(timer, now))} pause remaining` : `${display} ${counting ? timer.overtime ? "overtime" : "elapsed" : "remaining"}`}>
            {showPauseClock ? formatTime(pauseRemainingTime(timer, now)) : display}</div>
          {showPauseClock && <span className="clock-caption">Pause</span>}
          {timer.overtime && !showPauseClock && <span className="clock-caption">Overtime</span>}
          {timer.overtime && !showPauseClock && <span className="elapsed-total">{formatElapsedTime(elapsed)} total</span>}</>}
      </div>
      {!complete && (timer.status === "idle" || counting || breakTime) && <div className="timer-actions">
        {timer.status === "idle" && <Button className="primary-button start-button" disabled={!ready || blocked} onClick={onToggleTimer}>
          <PastelButtonArt />
          <span>Start</span>
        </Button>}
        {counting && timer.status !== "idle" ? <Button sound={null} className="icon-button finish-button" aria-label="Finish session" title="Finish session" onClick={() => act({ type: "FINISH_FOCUS" })}><Icon name="check" size={20} /></Button>
          : breakTime ? <Button className="icon-button" aria-label="Skip break" title="Skip break" onClick={() => act({ type: "SET_MODE", mode: "focus" })}><Icon name="skip" size={19} /></Button> : null}
      </div>}
      {breakReady && <div className="break-choices">
        <div className="break-choice-heading">
          <span>{timer.overtime && !complete ? "Ready for a break?" : "Take a break"}</span>
          {repeating && settings.soundEnabled && !alarmSilenced && <Button className="icon-button" aria-label={alarmBlocked ? "Enable alarm sound" : "Mute alarm"}
            title={alarmBlocked ? "Enable alarm sound" : "Mute alarm"} onClick={alarmBlocked ? retryAlarm : silenceAlarm}><Icon name={alarmBlocked ? "sound" : "mute"} size={17} /></Button>}
          {repeating && settings.soundEnabled && alarmSilenced && <span className="small muted">Muted</span>}
        </div>
        <div className="break-buttons">
          <Button className={recommendedLong ? "secondary-button" : "primary-button"} aria-label={`Short break, ${settings.breakMinutes} minutes`} onClick={() => startBreak("break")} disabled={blocked}><PastelButtonArt />Short break <span>{settings.breakMinutes}m</span></Button>
          <Button className={recommendedLong ? "primary-button" : "secondary-button"} aria-label={`Long break, ${settings.longBreakMinutes} minutes`} onClick={() => startBreak("longBreak")} disabled={blocked}><PastelButtonArt />Long break <span>{settings.longBreakMinutes}m</span></Button>
        </div>
        {complete && <Button className="text-button new-session" onClick={() => act({ type: "SET_MODE", mode: "focus" })}>New session</Button>}
      </div>}
      {!focusView && !pauseExpired && <div className="timer-options">
        {complete ? <div className={`session-receipt ${forfeited ? "forfeited" : ""} ${revealReceipt ? "receipt-reveal" : ""}`} aria-label="Session result">
          <span key={earnedNow ? sessionOutcome.id : timer.id} className={earnedNow ? "reward-earned" : undefined} aria-label={`${completedGems} Shilligems earned`}><Icon name="gem" size={18} />+{completedGems}</span>
          <span>{completedMinutes ? `${completedMinutes} min` : "Under 1 min"}</span>
          {forfeited && <InfoTip label="Session reward details">Session gems were lost after the pause limit. Your {completedMinutes} focus minutes were recorded.</InfoTip>}
        </div> : !breakTime ? <span className={`session-reward ${forfeited ? "forfeited" : ""}`} aria-label={forfeited ? "0 Shilligems this session" : undefined}><Icon name="gem" size={15} />{forfeited ? "0" : counting ? `1 / min${bonus ? ` +${Math.round(bonus * 100)}%` : ""}` : `+${projectedGems}`}
          <InfoTip label="Session rewards">Earn 1 Shilligem per completed focus minute{bonus ? ` with a ${Math.round(bonus * 100)}% pet bonus (rounded down)` : ""}. Max-level pets add 10% each, up to 50%, set when the session starts. Keep Pomodoro pauses within two pauses of one minute each to keep your reward. Count-up sessions are saved when you finish; sessions under one minute earn no reward.</InfoTip></span> : <span />}
        <Button className="session-settings-button" aria-label="Session settings" title="Session settings" aria-expanded={panel === "session"} aria-controls={panel === "session" ? "panel-heading" : undefined} onClick={() => openPanel("session")}><Icon name="sliders" size={16} /></Button>
      </div>}
      {breakTime && <div className="break-idea"><div><strong>{tip[0]}</strong>{" "}<InfoTip label="Break idea details">{tip[1]}</InfoTip></div><Button className="icon-button" aria-label="Another break idea" onClick={nextTip}><Icon name="shuffle" size={20} /></Button></div>}
    </section>
  );
}

export function QuickScratchpad({ state, act, saveStatus }) {
  const notes = useRef(null);
  useEffect(() => { notes.current?.focus(); }, []);
  return <div className="quick-notes">
    <textarea ref={notes} id="quick-notes" aria-label="Notes" placeholder="Save a thought for later…" maxLength={10000} value={state.scratchpad} onChange={(event) => act({ type: "SET_SCRATCHPAD", text: event.target.value })} />
    <span className="notes-save-state" data-save-status={saveStatus} role="status">{saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : saveStatus === "error" || saveStatus === "conflict" ? "Not saved" : ""}</span>
  </div>;
}
