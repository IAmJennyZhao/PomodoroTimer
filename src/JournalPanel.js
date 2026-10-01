import { useState } from "react";
import { completedSessions, focusAnalytics, formatFocusTime, PERIODS } from "./analytics";
import { todayStats } from "./game";
import { Icon, InfoTip } from "./ui";
import "./JournalPanel.css";

function Choices({ label, items, value, onChange, className = "" }) {
  return (
    <div className={`journal-choices ${className}`} role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          className={value === item.id ? "selected" : ""}
          onClick={() => onChange(item.id)}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}

function SessionList({ sessions, showDate = true }) {
  if (!sessions.length) return <p className="journal-empty">No completed sessions yet.</p>;
  return (
    <ol className="journal-sessions">
      {sessions.map((session) => (
        <li key={session.id}>
          <span className="journal-session-icon"><Icon name="check" size={16} /></span>
          <div>
            <strong>{session.task || "Focus session"}</strong>
            <time dateTime={new Date(session.completedAt).toISOString()}>
              {new Date(session.completedAt).toLocaleString([], {
                ...(showDate ? { month: "short", day: "numeric" } : {}),
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </div>
          <span className="journal-session-duration">{session.minutes} min</span>
        </li>
      ))}
    </ol>
  );
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
            : date.toLocaleDateString([], analytics.period === "week" ? { weekday: "short" } : { month: "short", day: "numeric" });
          const showLabel = hourly ? index % 6 === 0 || index === 23 : buckets.length <= 7 || index === 0 || index === buckets.length - 1 || index % 7 === 0;
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
        <h3>Daily goal</h3>
        <InfoTip label="About daily goal">Your target for completed focus sessions each day. Change it anytime.</InfoTip>
      </div>
      <strong className="journal-goal-count">{stats.sessions} <span>/ {stats.goal}</span></strong>
      <span className="journal-goal-caption">{stats.progress >= 1 ? "Goal reached" : "sessions today"}</span>
      <progress aria-label="Daily focus goal" value={stats.progress} max={1} />
      <div className="journal-goal-controls">
        <button type="button" className="small-button" aria-label="Decrease daily goal" disabled={stats.goal <= 1} onClick={() => act({ type: "SET_SETTINGS", settings: { dailyGoal: stats.goal - 1 } })}><Icon name="minus" size={18} /></button>
        <span>{stats.goal} / day</span>
        <button type="button" className="small-button" aria-label="Increase daily goal" disabled={stats.goal >= 24} onClick={() => act({ type: "SET_SETTINGS", settings: { dailyGoal: stats.goal + 1 } })}><Icon name="plus" size={18} /></button>
      </div>
    </section>
  );
}

export default function JournalPanel({ state, act, now = Date.now() }) {
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("today");
  const [visibleSessions, setVisibleSessions] = useState(20);
  const analytics = focusAnalytics(state.history, period, now);
  const history = completedSessions(state.history, now);
  return (
    <div className="journal-panel">
      <Choices label="Journal views" items={[{ id: "overview", name: "Overview" }, { id: "history", name: "History" }, { id: "scratchpad", name: "Scratchpad" }]} value={tab} onChange={setTab} className="journal-tabs" />
      {tab === "scratchpad" ? (
        <section className="journal-notes">
          <div className="journal-section-title">
            <label htmlFor="distraction-notes">Notes</label>
            <InfoTip label="About scratchpad">A place for distractions, reminders, and ideas. Saved on this computer.</InfoTip>
          </div>
          <textarea id="distraction-notes" rows={12} maxLength={10000} placeholder="Save a thought for later…" value={state.scratchpad} onChange={(event) => act({ type: "SET_SCRATCHPAD", text: event.target.value })} />
          <span className="journal-note-count">{state.scratchpad.length.toLocaleString()} / 10,000</span>
        </section>
      ) : tab === "history" ? (
        <section className="journal-history">
          <div className="journal-section-title"><h3>All sessions</h3><span>{history.length}</span></div>
          <SessionList sessions={history.slice(0, visibleSessions)} />
          {history.length > visibleSessions && <button type="button" className="secondary-button journal-load-more" onClick={() => setVisibleSessions((count) => count + 20)}>Load more</button>}
        </section>
      ) : (
        <>
          <div className="journal-overview-toolbar">
            <Choices label="Analytics period" items={PERIODS} value={period} onChange={setPeriod} />
            <InfoTip label="About focus analytics">Only completed focus sessions count. Breaks and skipped sessions are excluded. Average is the mean session length, rounded to the nearest minute.</InfoTip>
          </div>
          <dl className="journal-metrics" aria-label="Focus summary">
            {[
              ["Focus time", formatFocusTime(analytics.minutes)],
              ["Sessions", analytics.sessionCount],
              ["Avg. session", `${analytics.averageMinutes}m`],
              ["Active days", `${analytics.activeDays} / ${analytics.rangeDays}`],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <div className="journal-visuals"><ActivityChart analytics={analytics} /><GoalCard state={state} act={act} now={now} /></div>
          <section className="journal-recent">
            <div className="journal-section-title"><h3>Recent sessions</h3><button className="journal-text-button" type="button" onClick={() => setTab("history")}>View all <Icon name="arrow" size={16} /></button></div>
            <SessionList sessions={analytics.sessions.slice(0, 3)} showDate={period !== "today"} />
          </section>
        </>
      )}
    </div>
  );
}
