import React, { useEffect, useState } from "react";
import { PRESETS } from "./game";
import { Icon, RangeField, InfoTip } from "./ui";
export { AnimalsPanel, ShopPanel } from "./CollectionPanels";
export { default as DecoratePanel } from "./DecoratePanel";
export { default as JournalPanel } from "./JournalPanel";

export function SoundPanel({
  state,
  act,
  engine,
  playing,
  setPlaying,
  report,
}) {
  const [starting, setStarting] = useState(false);
  async function togglePlayback() {
    if (playing) {
      engine.current?.stop();
      setPlaying(false);
      return;
    }
    setStarting(true);
    try {
      const started = await engine.current?.start();
      setPlaying(Boolean(started));
      if (!started)
        report(
          "Audio unavailable. Try again.",
        );
    } catch (_) {
      setPlaying(false);
      report("Audio unavailable. Try again.");
    } finally {
      setStarting(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="secondary-button full-width"
        onClick={togglePlayback}
        disabled={starting}
        aria-pressed={playing}
      >
        <Icon name={playing ? "pause" : "play"} />{" "}
        {starting
          ? "Starting…"
          : playing
            ? "Pause sounds"
            : "Play sounds"}
      </button>
      <div className="mixer">
        {[
          {
            id: "rain",
            name: "Rain",
          },
          {
            id: "fire",
            name: "Fireplace",
          },
          {
            id: "noise",
            name: "Brown noise",
          },
        ].map((channel) => (
          <section key={channel.id}>
            <RangeField
              label={channel.name}
              value={Math.round(state.settings.ambient[channel.id] * 100)}
              min={0}
              max={100}
              step={1}
              suffix="%"
              onChange={(value) => {
                const volume = value / 100;
                engine.current?.setVolume(channel.id, volume);
                act({
                  type: "SET_SETTINGS",
                  settings: { ambient: { [channel.id]: volume } },
                });
              }}
            />
          </section>
        ))}
      </div>
      <label className="toggle-line">
        <span>Timer sound</span>
        <input
          type="checkbox"
          checked={state.settings.soundEnabled}
          onChange={(event) =>
            act({
              type: "SET_SETTINGS",
              settings: { soundEnabled: event.target.checked },
            })
          }
        />
      </label>
      <InfoTip label="Sound playback">
        Levels are saved automatically. Press Play sounds to start the mix.
      </InfoTip>
    </>
  );
}

function NumberSetting({ label, value, min = 1, max, onChange, suffix }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const number = draft.trim() === "" ? value : Number(draft);
    const next = Number.isFinite(number)
      ? Math.max(min, Math.min(max, Math.round(number)))
      : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  }
  return (
    <label className="number-field">
      <span>{label}</span>
      <span>
        <input
          type="number"
          min={min}
          max={max}
          step={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />{" "}
        {suffix}
      </span>
    </label>
  );
}

export function SessionControls({ state, act }) {
  const countUp = state.settings.workMode === "countup";
  return (
    <div className={`session-controls ${countUp ? "countup-settings" : ""}`} role="group" aria-label="Session timing">
      {countUp ? <div className="catalog-heading session-break-heading">
        <h3>Breaks</h3>
        <InfoTip label="Count-up timing">
          Count-up sessions have no alarm target. Choose Finish session when
          you are done, then start a break.
        </InfoTip>
      </div> : <div className="preset-list session-presets">
        {PRESETS.map((preset) => {
          const selected = Object.entries(preset.settings).every(
            ([key, value]) => state.settings[key] === value,
          );
          return (
            <button type="button" key={preset.id}
              className={`preset-button ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              aria-label={`${preset.name}, ${preset.settings.focusMinutes} minute focus, ${preset.settings.breakMinutes} minute break`}
              onClick={() => act({ type: "SET_PRESET", id: preset.id })}>
              <strong>{preset.name}</strong>
              <span>{preset.settings.focusMinutes} / {preset.settings.breakMinutes}</span>
            </button>
          );
        })}
      </div>}
      <div className="session-duration-grid">
        {[
          { key: "focusMinutes", name: "Focus time", max: 180, suffix: "min" },
          { key: "breakMinutes", name: "Short break", max: 60, suffix: "min" },
          { key: "longBreakMinutes", name: "Long break", max: 120, suffix: "min" },
          { key: "longBreakEvery", name: "Long break every", max: 12, suffix: "sessions" },
        ].filter((field) => !countUp || field.key !== "focusMinutes").map((field) => (
          <NumberSetting key={field.key} label={field.name}
            value={state.settings[field.key]} max={field.max} suffix={field.suffix}
            onChange={(value) => act({ type: "SET_SETTINGS", settings: { [field.key]: value } })} />
        ))}
      </div>
      {!countUp && <fieldset className="session-completion-settings">
        <legend>When focus ends</legend>
        <div className="session-end-options">
          {[
            { id: "remind", name: "Repeat alarm" },
            { id: "overtime", name: "Ding + count up" },
          ].map((option) => (
            <label className={`session-end-choice ${state.settings.endBehavior === option.id ? "selected" : ""}`} key={option.id}>
              <input type="radio" name="focus-end-behavior" value={option.id}
                checked={state.settings.endBehavior === option.id}
                onChange={() => act({ type: "SET_SETTINGS", settings: { endBehavior: option.id } })} />
              <span>{option.name}</span>
            </label>
          ))}
        </div>
        <InfoTip label="Focus end options">
          <p>Repeat alarm reminds you to take a break until you choose a break, start a new session, or mute it.</p>
          <p>Ding + count up chimes once, then keeps tracking your work until you finish.</p>
          <p>Applies to Pomodoro sessions. Turn on Timer sound in Settings to hear alerts.</p>
        </InfoTip>
      </fieldset>}
      {state.timer.status !== "idle" && (
        <div className="session-timing-note">
          <span className="small muted">Applies next session</span>
          <InfoTip label="Changing an active timer">
            Your current session keeps its original times and end behavior.
            Hold Stop to end this timer and apply changes to a new session.
          </InfoTip>
        </div>
      )}
    </div>
  );
}

export function SettingsPanel({ state, act, persistence }) {
  return (
    <>
      <div className="settings-toggles">
        {[
          { key: "autoStartFocus", name: "Auto-start focus" },
          { key: "soundEnabled", name: "Timer sound" },
          { key: "reducedMotion", name: "Reduce animation" },
        ].map((setting) => (
          <label className="toggle-line" key={setting.key}>
            <span>{setting.name}</span>
            <input type="checkbox" checked={state.settings[setting.key]}
              onChange={(event) => act({ type: "SET_SETTINGS", settings: { [setting.key]: event.target.checked } })} />
          </label>
        ))}
      </div>
      <section className="save-info">
        <div className="catalog-heading">
          <h3>Local save</h3>
          <InfoTip label="Local save details">
            <p>Progress saves on this computer, outside the project and Git history.</p>
            {persistence.storagePath && <p><code>{persistence.storagePath}</code></p>}
            <p>Keep the local server running while using the app.</p>
          </InfoTip>
        </div>
        <p className="small muted" role="status">
          {{
            loading: "Loading…",
            saving: "Saving…",
            saved: "Saved",
            error: "Save failed",
            conflict: "Changed in another window",
          }[persistence.status]}
        </p>
        {persistence.recovered && <p className="small">Recovered from backup.</p>}
        {persistence.error && <p role="alert" className="small">{persistence.error}</p>}
        {persistence.status === "error" && (
          <button type="button" className="small-button" onClick={persistence.retrySave}>Retry saving</button>
        )}
        {persistence.status === "conflict" && (
          <>
            <p className="small">Reloading replaces this window’s changes with the saved version.</p>
            <button type="button" className="small-button" onClick={persistence.reload}>Reload saved version</button>
          </>
        )}
      </section>
    </>
  );
}
