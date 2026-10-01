import { useEffect, useRef } from "react";
import { canTakeBreak, elapsedTime, formatElapsedTime, formatTime, isCountingUp, remainingTime } from "./game";
import { Icon, InfoTip } from "./ui";

export default function TimerCard({ state, act, now, ready, blocked, onToggleTimer,
  openPanel, panel, focusView, setFocusView, alarmSilenced, silenceAlarm,
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
  const progress = Math.max(0, Math.min(1, 1 - remaining / timer.durationMs));
  const recommendedLong = timer.cycle > 0 && timer.cycle % settings.longBreakEvery === 0;
  const repeating = complete && timer.workMode === "pomodoro" && timer.endBehavior === "remind";
  const startBreak = (mode) => act({ type: "START_BREAK", mode });
  return (
    <section className={`timer-card paper ${counting ? "counting-up" : ""} ${complete ? "session-complete" : ""}`} aria-label="Focus timer">
      <div className="timer-heading">
        {editable ? <div className="mode-tabs work-mode-tabs" role="group" aria-label="Work mode">
          {[["pomodoro", "Pomodoro"], ["countup", "Count up"]].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={timer.workMode === id}
              className={timer.workMode === id ? "active" : ""}
              onClick={() => act({ type: "SET_SETTINGS", settings: { workMode: id } })}>{label}</button>
          ))}
        </div> : <span className="timer-phase">{complete ? "Session complete" : breakTime ? (timer.mode === "longBreak" ? "Long break" : "Short break") : timer.overtime ? "Overtime" : timer.workMode === "countup" ? "Count up" : "Pomodoro"}</span>}
        <div className="timer-tools">
          <button className="icon-button" aria-label="Open scratchpad" title="Scratchpad"
            aria-expanded={panel === "notes"} onClick={() => openPanel("notes")}><Icon name="note" size={18} /></button>
          {(focusView || (!breakTime && timer.status === "running")) && <button className="icon-button" aria-label={focusView ? "Leave focus view" : "Enter focus view"}
            title={focusView ? "Leave focus view" : "Enter focus view"} onClick={() => setFocusView(!focusView)}><Icon name={focusView ? "collapse" : "expand"} size={17} /></button>}
        </div>
      </div>
      <div className="timer-face">
        {!counting && <svg className="timer-ring" viewBox="0 0 280 154" aria-hidden="true">
          <path className="ring-track" d="M19 140a121 121 0 0 1 242 0" pathLength="100" />
          <path className="ring-progress" d="M19 140a121 121 0 0 1 242 0" pathLength="100" strokeDasharray={`${progress * 100} 100`} />
        </svg>}
        <div className={`timer-digits ${display.length > 6 ? "long-clock" : ""}`} role="timer" aria-label={`${display} ${counting ? timer.overtime ? "overtime" : "elapsed" : "remaining"}`}>{display}</div>
        {timer.overtime && <span className="elapsed-total">{formatElapsedTime(elapsed)} total</span>}
      </div>
      {!breakTime && (focusView || complete ? (timer.task && <p className="focused-task">{timer.task}</p>) : <label className="task-input">
        <Icon name="pencil" size={17} />
        <input aria-label="Session task" maxLength={200} placeholder="Add a task" value={timer.task}
          onChange={(event) => act({ type: "SET_TASK", task: event.target.value })} />
      </label>)}
      {!complete && <div className="timer-actions">
        <button className="icon-button reset-button" aria-label="Reset timer" title="Reset session"
          onClick={() => act({ type: "RESET" })}><Icon name="reset" size={19} /></button>
        <button className="primary-button start-button" disabled={!ready || blocked} onClick={onToggleTimer}>
          <Icon name={timer.status === "running" ? "pause" : "play"} size={18} />
          {timer.status === "running" ? "Pause" : timer.status === "paused" ? "Resume" : "Start"}
        </button>
        {counting && timer.status !== "idle" ? <button className="icon-button finish-button" aria-label="Finish session" title="Finish session" onClick={() => act({ type: "FINISH_FOCUS" })}><Icon name="check" size={20} /></button>
          : breakTime ? <button className="icon-button" aria-label="Skip break" title="Skip break" onClick={() => act({ type: "SET_MODE", mode: "focus" })}><Icon name="skip" size={19} /></button> : <span className="timer-action-spacer" />}
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
      {!focusView && <div className="timer-options">
        {!breakTime && !complete ? <span className="session-reward"><Icon name="gem" size={15} />{counting ? "1 / min" : `+${Math.round(timer.durationMs / 60000)}`}
          <InfoTip label="Session rewards">Earn 1 Shilligem per completed focus minute. Count-up sessions are saved when you finish; sessions under 1 minute earn no reward.</InfoTip></span> : <span />}
        <button className="session-settings-button" aria-expanded={panel === "session"} aria-controls={panel === "session" ? "panel-heading" : undefined} onClick={() => openPanel("session")}><Icon name="sliders" size={16} /> Session settings</button>
      </div>}
      {breakTime && <div className="break-idea"><div><strong>{tip[0]}</strong>{" "}<InfoTip label="Break idea details">{tip[1]}</InfoTip></div><button className="icon-button" aria-label="Another break idea" onClick={nextTip}><Icon name="shuffle" size={20} /></button></div>}
    </section>
  );
}

export function QuickScratchpad({ state, act, saveStatus }) {
  const notes = useRef(null);
  useEffect(() => { notes.current?.focus(); }, []);
  return <div className="quick-notes">
    <label htmlFor="quick-notes">Notes</label>
    <textarea ref={notes} id="quick-notes" aria-label="Notes" placeholder="Save a thought for later…" maxLength={10000} value={state.scratchpad} onChange={(event) => act({ type: "SET_SCRATCHPAD", text: event.target.value })} />
    <span className="notes-save-state" role="status">{saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : saveStatus === "error" || saveStatus === "conflict" ? "Not saved" : ""}</span>
  </div>;
}
