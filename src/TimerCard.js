import { useEffect, useRef } from "react";
import { canTakeBreak, elapsedTime, formatElapsedTime, formatTime, gemBonus, isCountingUp, MAX_PAUSES, pauseRemainingTime, remainingTime } from "./game";
import { Icon, InfoTip } from "./ui";
import SessionTasks from "./SessionTasks";
import { ArtFragment, PastelButtonArt } from "./AtelierArt";
import HoldToStop from "./HoldToStop";

export default function TimerCard({ state, act, now, ready, blocked, onToggleTimer,
  openPanel, panel, notesOpen, focusView, setFocusView, alarmSilenced, silenceAlarm,
  alarmBlocked, retryAlarm, tip, nextTip }) {
  const { timer, settings } = state;
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
  const showPauseClock = limitedPauses && paused && !forfeited;
  const resumeRef = useRef(null);
  useEffect(() => { if (pauseExpired) resumeRef.current?.focus(); }, [pauseExpired]);
  const startBreak = (mode) => act({ type: "START_BREAK", mode });
  const active = !complete && timer.status !== "idle";
  return (
    <section className={`timer-card paper ${counting ? "counting-up" : ""} ${complete ? "session-complete" : ""} ${pauseExpired ? "pause-alert" : ""}`} aria-label="Focus timer">
      <ArtFragment rect={[52, 101, 456, 364]} className="timer-paper-art" />
      <div className="timer-heading">
        {editable ? <div className="mode-tabs work-mode-tabs" role="group" aria-label="Work mode">
          {[["pomodoro", "Countdown"], ["countup", "Count up"]].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={timer.workMode === id}
              className={timer.workMode === id ? "active" : ""}
              onClick={() => act({ type: "SET_SETTINGS", settings: { workMode: id } })}>{label}</button>
          ))}
        </div> : <div className="timer-session-controls">
          {active && <button ref={resumeRef} type="button" className="pause-button" disabled={!ready || blocked} onClick={onToggleTimer}>
            {paused ? "Resume" : limitedPauses ? `Pause (${pausesLeft}/${MAX_PAUSES})` : "Pause"}
          </button>}
          {active && !breakTime && <HoldToStop key={`${timer.id}:${timer.status}`} disabled={!ready || blocked} onStop={() => act({ type: "RESET" })} />}
          {(complete || breakTime) && <span className="timer-phase">{complete ? "Session complete" : timer.mode === "longBreak" ? "Long break" : "Short break"}</span>}
        </div>}
        <div className="timer-tools">
          <button className="icon-button" aria-label="Open scratchpad" title="Scratchpad"
            aria-expanded={Boolean(notesOpen)} aria-pressed={Boolean(notesOpen)} aria-controls="scratchpad" onClick={() => openPanel("notes")}><Icon name="note" size={18} /></button>
          {(focusView || (!breakTime && timer.status === "running")) && <button className="icon-button" aria-label={focusView ? "Leave focus view" : "Enter focus view"}
            title={focusView ? "Leave focus view" : "Enter focus view"} onClick={() => setFocusView(!focusView)}><Icon name={focusView ? "collapse" : "expand"} size={17} /></button>}
        </div>
      </div>
      {!breakTime && !pauseExpired && <SessionTasks timer={timer} history={state.history} act={act} minimal compact={focusView || complete} />}
      <div className="timer-face">
        {pauseExpired ? <div className="pause-expired" role="alert"><strong>Pause ended</strong><span>Session gems lost</span></div>
          : <><div className={`timer-digits ${display.length > 6 ? "long-clock" : ""}`} role="timer" aria-label={showPauseClock ? `${formatTime(pauseRemainingTime(timer, now))} pause remaining` : `${display} ${counting ? timer.overtime ? "overtime" : "elapsed" : "remaining"}`}>
            {showPauseClock ? formatTime(pauseRemainingTime(timer, now)) : display}</div>
          {showPauseClock && <span className="clock-caption">Pause</span>}
          {timer.overtime && !showPauseClock && <span className="clock-caption">Overtime</span>}
          {timer.overtime && !showPauseClock && <span className="elapsed-total">{formatElapsedTime(elapsed)} total</span>}</>}
      </div>
      {!complete && (timer.status === "idle" || counting || breakTime) && <div className="timer-actions">
        {timer.status === "idle" && <button className="primary-button start-button" disabled={!ready || blocked} onClick={onToggleTimer}>
          <PastelButtonArt />
          <span>Start</span>
        </button>}
        {counting && timer.status !== "idle" ? <button className="icon-button finish-button" aria-label="Finish session" title="Finish session" onClick={() => act({ type: "FINISH_FOCUS" })}><Icon name="check" size={20} /></button>
          : breakTime ? <button className="icon-button" aria-label="Skip break" title="Skip break" onClick={() => act({ type: "SET_MODE", mode: "focus" })}><Icon name="skip" size={19} /></button> : null}
      </div>}
      {breakReady && <div className="break-choices">
        <div className="break-choice-heading">
          <span>{timer.overtime && !complete ? "Ready for a break?" : "Take a break"}</span>
          {repeating && settings.soundEnabled && !alarmSilenced && <button className="icon-button" aria-label={alarmBlocked ? "Enable alarm sound" : "Mute alarm"}
            title={alarmBlocked ? "Enable alarm sound" : "Mute alarm"} onClick={alarmBlocked ? retryAlarm : silenceAlarm}><Icon name={alarmBlocked ? "sound" : "mute"} size={17} /></button>}
          {repeating && settings.soundEnabled && alarmSilenced && <span className="small muted">Muted</span>}
        </div>
        <div className="break-buttons">
          <button className={recommendedLong ? "secondary-button" : "primary-button"} aria-label={`Short break, ${settings.breakMinutes} minutes`} onClick={() => startBreak("break")} disabled={blocked}>Short break <span>{settings.breakMinutes}m</span></button>
          <button className={recommendedLong ? "primary-button" : "secondary-button"} aria-label={`Long break, ${settings.longBreakMinutes} minutes`} onClick={() => startBreak("longBreak")} disabled={blocked}>Long break <span>{settings.longBreakMinutes}m</span></button>
        </div>
        {complete && <button className="text-button new-session" onClick={() => act({ type: "SET_MODE", mode: "focus" })}>New session</button>}
      </div>}
      {!focusView && !pauseExpired && <div className="timer-options">
        {!breakTime && !complete ? <span className={`session-reward ${forfeited ? "forfeited" : ""}`} aria-label={forfeited ? "0 Shilligems this session" : undefined}><Icon name="gem" size={15} />{forfeited ? "0" : counting ? `1 / min${bonus ? ` +${Math.round(bonus * 100)}%` : ""}` : `+${projectedGems}`}
          <InfoTip label="Session rewards">Earn 1 Shilligem per completed focus minute{bonus ? ` with a ${Math.round(bonus * 100)}% pet bonus (rounded down)` : ""}. Max-level pets add 10% each, up to 50%, set when the session starts. Keep Pomodoro pauses within two pauses of one minute each to keep your reward. Count-up sessions are saved when you finish; sessions under one minute earn no reward.</InfoTip></span> : <span />}
        <button className="session-settings-button" aria-label="Session settings" title="Session settings" aria-expanded={panel === "session"} aria-controls={panel === "session" ? "panel-heading" : undefined} onClick={() => openPanel("session")}><Icon name="sliders" size={16} /></button>
      </div>}
      {breakTime && <div className="break-idea"><div><strong>{tip[0]}</strong>{" "}<InfoTip label="Break idea details">{tip[1]}</InfoTip></div><button className="icon-button" aria-label="Another break idea" onClick={nextTip}><Icon name="shuffle" size={20} /></button></div>}
    </section>
  );
}

export function QuickScratchpad({ state, act, saveStatus }) {
  const notes = useRef(null);
  useEffect(() => { notes.current?.focus(); }, []);
  return <div className="quick-notes">
    <textarea ref={notes} id="quick-notes" aria-label="Notes" placeholder="Save a thought for later…" maxLength={10000} value={state.scratchpad} onChange={(event) => act({ type: "SET_SCRATCHPAD", text: event.target.value })} />
    <span className="notes-save-state" role="status">{saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : saveStatus === "error" || saveStatus === "conflict" ? "Not saved" : ""}</span>
  </div>;
}
