/* eslint-disable jsx-a11y/no-redundant-roles -- Keep explicit table-group semantics when the narrow ledger uses grid layout. */
import { Button } from "../../shared/Controls";
import { useState } from "react";
import { completedSessions, focusAnalytics, formatFocusTime, PERIODS, sessionTags } from "../../domain/analytics";
import { todayStats } from "../../domain/game";
import { Icon, InfoTip } from "../../shared/ui";
import ScratchpadStatus from "./ScratchpadStatus";

function Choices({ label, items, value, onChange, className = "" }) {
  return (
    <div className={`journal-choices ${className}`} role="group" aria-label={label}>
      {items.map((item) => (
        <Button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          className={value === item.id ? "selected" : ""}
          onClick={() => onChange(item.id)}
        >
          {item.name}
        </Button>
      ))}
    </div>
  );
}

function SessionList({ sessions, showDate = true, compact = false }) {
  if (!sessions.length) return <p className="journal-empty">No completed sessions yet.</p>;
  return (
    <table role="table" className={`journal-ledger ${showDate ? "with-date" : ""}`} aria-label={compact ? "Recent sessions" : "Session history"}>
      <thead role="rowgroup"><tr role="row">{showDate && <th role="columnheader" scope="col">Date</th>}<th role="columnheader" scope="col">Task</th><th role="columnheader" scope="col">Time</th></tr></thead>
      <tbody role="rowgroup">
      {sessions.map((session) => {
        const tasks = Array.isArray(session.tasks) ? session.tasks.filter((task) => task?.text) : [];
        const taskText = tasks.length ? tasks.map((task) => task.text).join(" · ") : session.task || "Focus session";
        const tags = sessionTags(session).filter((tag) => !compact || tag.toLowerCase() !== taskText.toLowerCase());
        const completedAt = new Date(session.completedAt);
        return (
        <tr role="row" key={session.id}>
          {showDate && <td role="cell" className="journal-session-date"><time dateTime={completedAt.toISOString()}>{completedAt.toLocaleDateString([], { month: "short", day: "numeric", ...(!compact ? { year: "numeric" } : {}) })}<span>{completedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></time></td>}
          <td role="cell" className="journal-session-task">
            <strong>{taskText}</strong>
            {tasks.length > 0 && <span className="journal-task-count">{tasks.filter((task) => task.done).length} of {tasks.length} {tasks.length === 1 ? "task" : "tasks"} done</span>}
            {tags.length > 0 && <div className="journal-session-tags" aria-label="Session tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
            {!showDate && <time dateTime={completedAt.toISOString()}>{completedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>}
            {session.rewardForfeited && <span className="journal-session-forfeited">Session gems lost</span>}
          </td>
          <td role="cell" className="journal-session-duration" aria-label={`${session.minutes} focus minutes`} title={`${session.minutes} minutes`}>{formatFocusTime(session.minutes)}</td>
        </tr>
      ); })}
      </tbody>
    </table>
  );
}

function TagStats({ analytics }) {
  return <section className="journal-card journal-tag-stats" aria-label="Focus by tag">
    <div className="journal-section-title"><h3>Focus by tag</h3>
      <InfoTip label="About tag statistics">Each tag receives the full duration of its session. Sessions with several tags appear in each tag's total, so tag totals can overlap. Untagged sessions include earlier sessions without tags.</InfoTip>
    </div>
    <p className="journal-explanation">A session with several tags counts toward each tag. Their totals can overlap.</p>
    {!analytics.tags.length ? <p className="journal-empty">No focus time yet.</p>
      : <ul className="journal-tag-breakdown">{analytics.tags.map((item) => <li key={item.tag ?? "__untagged"}
        aria-label={`${item.tag || "Untagged"}: ${item.minutes} focus minutes, ${item.sessions} ${item.sessions === 1 ? "session" : "sessions"}`}>
        <div className="journal-tag-heading"><span>{item.tag || "Untagged"}</span><strong>{formatFocusTime(item.minutes)}</strong></div>
        <div className="journal-tag-meter" aria-hidden="true"><span style={{ width: `${item.minutes / analytics.minutes * 100}%` }} /></div>
        <span className="journal-tag-detail">{item.sessions} {item.sessions === 1 ? "session" : "sessions"} · {formatFocusTime(item.averageMinutes)} average</span>
      </li>)}</ul>}
  </section>;
}

function ActivityChart({ analytics }) {
  const hourly = analytics.period === "today";
  const buckets = hourly ? analytics.hours : analytics.days;
  const peak = Math.max(1, ...buckets.map((bucket) => bucket.minutes));
  const chartTitle = hourly ? "Today's rhythm" : "Daily focus";
  return (
    <section className="journal-card journal-activity" aria-label="Focus activity">
      <div className="journal-section-title">
        <h3>{chartTitle}</h3>
        <InfoTip label="About focus activity">
          Completed focus minutes, grouped by {hourly ? "the hour" : "the day"} each session ended. Dates use your local time.
        </InfoTip>
      </div>
      <div className="journal-chart-scale" aria-hidden="true"><span>{peak === 1 && !analytics.minutes ? "Minutes" : `${peak} min`}</span><span>0</span></div>
      <ol className={`journal-chart ${hourly || buckets.length > 7 ? "dense" : ""}`} aria-label={`${chartTitle}, focus minutes`}>
        {buckets.map((bucket, index) => {
          const date = hourly ? null : new Date(bucket.timestamp);
          const fullLabel = hourly
            ? `${String(bucket.hour).padStart(2, "0")}:00`
            : date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
          const shortLabel = hourly
            ? `${bucket.hour}`
            : date.toLocaleDateString([], analytics.period === "week" ? { weekday: "short" } : { month: "numeric", day: "numeric" });
          const showLabel = hourly
            ? index % 6 === 0 || index === 23
            : buckets.length <= 7 || index === 0 || index === buckets.length - 1 || (index % 7 === 0 && index <= buckets.length - 5);
          return (
            <li key={bucket.key} aria-label={`${fullLabel}: ${bucket.minutes} focus minutes, ${bucket.sessions} ${bucket.sessions === 1 ? "session" : "sessions"}`}>
              <span className="journal-bar-track" title={`${fullLabel}: ${bucket.minutes} min`}>
                <span className={`journal-bar ${bucket.minutes ? "" : "empty"}`} style={{ height: bucket.minutes ? `${Math.max(3, (bucket.minutes / peak) * 100)}%` : "3px" }} />
              </span>
              <span className="journal-bar-label" aria-hidden="true">{showLabel ? shortLabel : ""}</span>
            </li>
          );
        })}
      </ol>
      <span className="journal-chart-unit">{hourly ? "Hour" : "Day"}</span>
    </section>
  );
}

function GoalCard({ state, act, now }) {
  const stats = todayStats(state, now);
  return (
    <section className={`journal-card journal-goal ${stats.progress >= 1 ? "complete" : ""}`}>
      <div className="journal-section-title">
        <h3>Today's goal</h3>
        <InfoTip label="About daily goal">Your target for completed focus sessions each day. Change it anytime.</InfoTip>
      </div>
      <strong className="journal-goal-count">{stats.sessions} <span>/ {stats.goal}</span></strong>
      <span className="journal-goal-caption">{stats.progress >= 1 ? "Goal reached today" : "sessions today"}</span>
      <div className="journal-goal-dots" aria-hidden="true">{Array.from({ length: stats.goal }, (_, index) => <span key={index} className={index < stats.sessions ? "filled" : ""} />)}</div>
      <progress aria-label="Daily focus goal" value={stats.progress} max={1} />
      <div className="journal-goal-controls">
        <Button type="button" className="small-button" aria-label="Decrease daily goal" disabled={stats.goal <= 1} onClick={() => act({ type: "SET_SETTINGS", settings: { dailyGoal: stats.goal - 1 } })}><Icon name="minus" size={18} /></Button>
        <span>{stats.goal} / day</span>
        <Button type="button" className="small-button" aria-label="Increase daily goal" disabled={stats.goal >= 24} onClick={() => act({ type: "SET_SETTINGS", settings: { dailyGoal: stats.goal + 1 } })}><Icon name="plus" size={18} /></Button>
      </div>
    </section>
  );
}

export default function JournalPanel({ state, act, saveStatus, now = Date.now() }) {
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("today");
  const [visibleSessions, setVisibleSessions] = useState(20);
  const analytics = focusAnalytics(state.history, period, now);
  const history = completedSessions(state.history, now);
  return (
    <div className="journal-panel">
      <div className="journal-header">
        <Choices label="Journal views" items={[{ id: "overview", name: "Overview" }, { id: "history", name: "History" }, { id: "scratchpad", name: "Scratchpad" }]} value={tab} onChange={setTab} className="journal-tabs" />
        {tab === "overview" && <div className="journal-overview-toolbar">
          <Choices label="Analytics period" items={PERIODS} value={period} onChange={setPeriod} />
          <InfoTip label="About focus analytics">Only completed focus sessions count. Breaks and skipped sessions are excluded. Average is the mean session length, rounded to the nearest minute.</InfoTip>
        </div>}
      </div>
      {tab === "scratchpad" ? (
        <section className="journal-notes">
          <div className="journal-section-title">
            <label htmlFor="distraction-notes">Scratchpad text</label>
            <InfoTip label="About scratchpad">A place for distractions, reminders, and ideas. Saved on this computer.</InfoTip>
          </div>
          <p className="scratchpad-shared-hint" id="journal-notes-help">This is the same saved note as the floating Scratchpad.</p>
          <textarea id="distraction-notes" aria-describedby="journal-notes-help" rows={12} maxLength={10000} placeholder="Save a thought for later…" value={state.scratchpad} onChange={(event) => act({ type: "SET_SCRATCHPAD", text: event.target.value })} />
          <div className="journal-note-footer"><ScratchpadStatus status={saveStatus} /><span className="journal-note-count">{state.scratchpad.length.toLocaleString()} / 10,000</span></div>
        </section>
      ) : tab === "history" ? (
        <section className="journal-history">
          <div className="journal-section-title"><h3>All sessions</h3><span>{history.length}</span></div>
          <SessionList sessions={history.slice(0, visibleSessions)} />
          {history.length > visibleSessions && <Button type="button" className="secondary-button journal-load-more" onClick={() => setVisibleSessions((count) => count + 20)}>Load more</Button>}
        </section>
      ) : (
        <>
          <dl className="journal-metrics" aria-label="Focus summary">
            {[
              ["Focus time", formatFocusTime(analytics.minutes)],
              ["Sessions", analytics.sessionCount],
              ["Avg. session", formatFocusTime(analytics.averageMinutes)],
              ["Active days", `${analytics.activeDays} / ${analytics.rangeDays}`],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <div className="journal-visuals"><ActivityChart analytics={analytics} /><GoalCard state={state} act={act} now={now} /></div>
          <div className="journal-bottom">
          <TagStats analytics={analytics} />
          <section className="journal-card journal-recent">
            <div className="journal-section-title"><h3>Recent sessions</h3><Button className="journal-text-button" type="button" onClick={() => setTab("history")}>View all <Icon name="arrow" size={16} /></Button></div>
            <SessionList sessions={analytics.sessions.slice(0, 3)} showDate={period !== "today"} compact />
          </section>
          </div>
        </>
      )}
    </div>
  );
}
