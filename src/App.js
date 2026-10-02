import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import "./layout.css";
import "./timer-flow.css";
import "./RoomFeatures.css";
import { ArtFragment } from "./AtelierArt";
import useLocalSave from "./useLocalSave";
import {
  BACKGROUNDS,
  DECORATIONS,
  formatTime,
  formatElapsedTime,
  elapsedTime,
  isCountingUp,
  remainingTime,
  todayStats,
} from "./game";
import { createAmbientEngine } from "./audio";
import {
  RARITY_NAMES,
  Icon,
  Sprite,
  AnimalArt,
  Drawer,
  HatchModal,
} from "./ui";
import TimerCard, { QuickScratchpad } from "./TimerCard";
import RoomBackdrop from "./RoomBackdrop";
import DecoratePanel from "./DecoratePanel";
import {
  AnimalsPanel,
  ShopPanel,
  JournalPanel,
  SoundPanel,
  SettingsPanel,
  SessionControls,
} from "./panels";
import "./atelier.css";

const BREAK_IDEAS = [
  [
    "Stretch",
    "Relax your shoulders and stretch your hands.",
  ],
  [
    "Rest your eyes",
    "Look out the window for a moment.",
  ],
  [
    "Water break",
    "Refill your water and step away from your desk.",
  ],
  [
    "Find five colors",
    "Look around and find five things in your favorite color.",
  ],
  [
    "Doodle",
    "Sketch something nearby.",
  ],
  [
    "Breathe",
    "Breathe comfortably and slowly. Let your shoulders settle.",
  ],
  [
    "Take a walk",
    "Stand up and walk around for a minute.",
  ],
];

export default function App() {
  const persistence = useLocalSave();
  const { state, dispatch, ready, status, error } = persistence;
  const [now, setNow] = useState(Date.now());
  const [panel, setPanel] = useState(null);
  const [focusView, setFocusView] = useState(false);
  const focusedSession = useRef(null);
  const [silencedAlarm, setSilencedAlarm] = useState(null);
  const [alarmBlocked, setAlarmBlocked] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState("starter-cat");
  const [selection, setSelection] = useState(null);
  const [arranging, setArranging] = useState(false);
  const [drag, setDrag] = useState(null);
  const [tip, setTip] = useState(0);
  const [toast, setToast] = useState("");
  const [hatch, setHatch] = useState(null);
  const [playing, setPlaying] = useState(false);
  const engine = useRef(null);
  const sceneRef = useRef(null);
  const lastEvent = useRef(null);
  const act = useCallback(
    (action) => {
      if (action.type === "START_BREAK") engine.current?.unlock();
      dispatch({
        ...action,
        now: Date.now(),
        ...(["BUY_EGG", "HATCH_EGG"].includes(action.type)
          ? { roll: Math.random() }
          : {}),
      });
    },
    [dispatch],
  );
  useEffect(() => {
    engine.current = createAmbientEngine();
    return () => {
      engine.current?.destroy();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    for (const [key, value] of Object.entries(state.settings.ambient))
      engine.current?.setVolume(key, value);
  }, [state.settings.ambient]);
  useEffect(() => {
    if (!ready) return undefined;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      dispatch({ type: "TICK", now: time });
    };
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ready, dispatch]);
  const remaining = remainingTime(state.timer, now);
  const counting = isCountingUp(state.timer);
  const elapsed = elapsedTime(state.timer, now);
  const displayTime = counting ? Math.max(0, elapsed - (state.timer.overtime ? state.timer.durationMs : 0)) : remaining;
  const sidePanel = ["settings", "session", "sound", "notes"].includes(panel);
  const widePanel = Boolean(panel) && !sidePanel;
  useEffect(() => {
    if (!ready) return;
    if (state.timer.mode === "focus" && state.timer.status === "running") {
      if (focusedSession.current !== state.timer.id) {
        focusedSession.current = state.timer.id;
        setFocusView(true);
        setPanel(null);
      }
    } else if (state.timer.status === "idle" || state.timer.status === "complete" || state.timer.mode !== "focus") {
      setFocusView(false);
    }
  }, [ready, state.timer.id, state.timer.status, state.timer.mode]);
  const shouldAlarm = ready && status !== "conflict" && state.timer.mode === "focus" &&
    state.timer.status === "complete" && state.timer.workMode === "pomodoro" &&
    state.timer.endBehavior === "remind" && state.settings.soundEnabled && silencedAlarm !== state.timer.id;
  useEffect(() => {
    let cancelled = false;
    setAlarmBlocked(false);
    const tryAlarm = () => {
      Promise.resolve(engine.current?.startAlarm()).then((started) => {
        if (!cancelled) setAlarmBlocked(!started);
      }).catch(() => { if (!cancelled) setAlarmBlocked(true); });
    };
    const onVisible = () => { if (document.visibilityState === "visible") tryAlarm(); };
    if (shouldAlarm) {
      tryAlarm();
      document.addEventListener("visibilitychange", onVisible);
    } else engine.current?.stopAlarm();
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      engine.current?.stopAlarm();
    };
  }, [shouldAlarm, state.timer.id]);
  useEffect(() => {
    document.title =
      state.timer.status === "running"
        ? `${state.timer.overtime ? "+" : ""}${counting ? formatElapsedTime(displayTime) : formatTime(displayTime)} · ${state.timer.mode === "focus" ? state.timer.overtime ? "Overtime" : state.timer.workMode === "countup" ? "Count up" : "Focus" : "Break"} — Little Room`
        : state.timer.status === "complete" ? "Time for a break · Little Room" : "Little Room · Focus";
  }, [displayTime, counting, state.timer.status, state.timer.mode, state.timer.overtime, state.timer.workMode]);
  useEffect(() => {
    const event = state.event;
    if (!event || event.id === lastEvent.current) return;
    lastEvent.current = event.id;
    if (event.type === "animal-hatched") setHatch(event);
    else if (event.type === "focus-complete") {
      const stats = todayStats(state);
      setToast(
        stats.sessions === stats.goal
          ? `Daily goal complete! ${event.message}`
          : event.message,
      );
      setTip(Math.floor(Math.random() * BREAK_IDEAS.length));
      if (state.timer.overtime) setToast("Target reached · counting up");
      if (state.settings.soundEnabled && !(state.timer.status === "complete" && state.timer.workMode === "pomodoro" && state.timer.endBehavior === "remind")) engine.current?.chime();
    } else if (event.type === "reward-forfeited") {
      setToast("");
      setFocusView(false);
      setPanel(null);
      if (state.settings.soundEnabled) engine.current?.chime();
    } else {
      setToast(event.message);
      if (event.type === "break-complete" && state.settings.soundEnabled)
        engine.current?.chime();
    }
  }, [state]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        if (hatch) setHatch(null);
        else {
          setPanel(null);
          setArranging(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hatch]);
  const openPanel = (id) => {
    setPanel((previous) => (previous === id ? null : id));
    if (id !== "decorate") setArranging(false);
  };
  const closePanel = () => {
    setPanel(null);
    setArranging(false);
  };
  const timerAction = () => {
    if (state.timer.status !== "running") {
      engine.current?.unlock();
      setNow(Date.now());
      setPanel(null);
      if (state.timer.mode === "focus") setFocusView(true);
    }
    if (state.settings.soundEnabled) engine.current?.tap();
    act({ type: state.timer.status === "running" ? "PAUSE" : "START" });
  };
  const stats = todayStats(state, now);
  const startDrag = (event, type, item) => {
    if (!arranging) {
      if (type === "animal") {
        setSelectedAnimal(item.id);
        setPanel("animals");
      }
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection({ type, id: item.id });
    setDrag({ type, id: item.id, x: item.x, y: item.y });
  };
  const moveDrag = (event) => {
    if (!drag || !sceneRef.current) return;
    const bounds = sceneRef.current.getBoundingClientRect();
    setDrag((previous) => ({
      ...previous,
      x: Math.max(
        5,
        Math.min(95, ((event.clientX - bounds.left) / bounds.width) * 100),
      ),
      y: Math.max(
        20,
        Math.min(85, ((event.clientY - bounds.top) / bounds.height) * 100),
      ),
    }));
  };
  const endDrag = () => {
    if (drag) {
      act({
        type: drag.type === "animal" ? "MOVE_ANIMAL" : "MOVE_DECORATION",
        id: drag.id,
        x: drag.x,
        y: drag.y,
      });
      setDrag(null);
    }
  };
  const renderResident = (item, type) => {
    const position = drag?.id === item.id ? drag : item;
    const name =
      type === "animal"
        ? item.name
        : DECORATIONS.find((entry) => entry.id === item.item)?.name;
    return (
      <button
        key={item.id}
        className={`room-resident ${type} ${type === "decoration" ? `decoration-${item.item}` : ""} ${arranging ? "draggable" : ""} ${selection?.id === item.id && arranging ? "chosen" : ""}`}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          zIndex: item.item === "rug" ? 1 : (type === "animal" ? 160 : 2) + Math.round(position.y),
          "--delay": `${-(state.animals.findIndex((animal) => animal.id === item.id) * 1.37)}s`,
        }}
        aria-label={
          arranging
            ? `Position ${name}`
            : `${name}, ${type === "animal" ? `${RARITY_NAMES[item.rarity]} ${item.species}` : "room decoration"}`
        }
        onPointerDown={(event) => startDrag(event, type, item)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(event) => {
          if (!arranging || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 5 : 1;
          setSelection({ type, id: item.id });
          act({
            type: type === "animal" ? "MOVE_ANIMAL" : "MOVE_DECORATION",
            id: item.id,
            x: Math.max(5, Math.min(95, item.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))),
            y: Math.max(20, Math.min(85, item.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))),
          });
        }}
        onClick={(event) => {
          if (event.detail === 0) {
            if (arranging) setSelection({ type, id: item.id });
            else if (type === "animal") {
              setSelectedAnimal(item.id);
              setPanel("animals");
            }
          }
        }}
      >
        {type === "animal" ? (
          <AnimalArt animal={item} className="idle-animal" />
        ) : (
          <Sprite kind="object" id={item.item} />
        )}
        <span className="resident-label">{name}</span>
      </button>
    );
  };
  return (
    <div
      className={`app ${state.room.background} ${state.settings.reducedMotion ? "reduce-motion" : ""} ${panel ? "panel-open" : ""} ${widePanel ? "wide-panel-open" : ""} ${sidePanel ? "side-panel-open" : ""} ${focusView ? "focus-view" : ""} ${arranging ? "is-arranging" : ""}`}
    >
      <div
        className="room-scene"
        inert={(panel && !arranging) || focusView ? "" : undefined}
        ref={sceneRef}
        aria-label={
          BACKGROUNDS.find((item) => item.id === state.room.background)?.name
        }
      >
        <RoomBackdrop theme={state.room.background} />
        {state.room.decorations.map((item) =>
          renderResident(item, "decoration"),
        )}
        {state.animals
          .filter((item) => item.placed)
          .map((item) => renderResident(item, "animal"))}
      </div>
      <div className="room-vignette" />
      <header className="app-header" hidden={focusView}>
        <button className="room-brand" onClick={closePanel}>Little Room</button>
        <div className="header-actions">
          <button
            className="gem-pill paper"
            onClick={() => openPanel("shop")}
            aria-label={`${state.gems} ${state.gems === 1 ? "Shilligem" : "Shilligems"}, open egg shop`}
          >
            <Icon name="gem" size={23} />
            <strong>{state.gems.toLocaleString()}</strong>
          </button>
          <nav className="top-nav paper" aria-label="Main navigation">
            {[
              ["focus", "focus", "Focus"],
              ["animals", "paw", "Animals"],
              ["shop", "egg", "Egg shop"],
              ["decorate", "plant", "Decorate"],
              ["journal", "book", "Journal"],
            ].map(([id, , label]) => (
              <button key={id} className={id === (panel || "focus") ? "active" : ""}
                aria-label={label} aria-current={id === (panel || "focus") ? "page" : undefined}
                onClick={() => (id === "focus" ? closePanel() : openPanel(id))}>
                <span>{{ Animals: "Pets", "Egg shop": "Shop", Decorate: "Room" }[label] || label}</span>
                {id === "shop" && state.eggs.length > 0 && <i>{state.eggs.length}</i>}
              </button>
            ))}
          </nav>
          <button className="icon-button header-notes" aria-label="Open notepad" title="Notepad" onClick={() => openPanel("notes")}><Icon name="note" size={22} /></button>
          <button
            className="icon-button paper settings-button"
            aria-label="Settings"
            onClick={() => openPanel("settings")}
          >
            <Icon name="settings" size={22} />
          </button>
        </div>
      </header>
      <main className="focus-area" hidden={widePanel}>
        <TimerCard state={state} act={act} now={now} ready={ready} blocked={status === "conflict"}
          onToggleTimer={timerAction} panel={panel} openPanel={openPanel}
          focusView={focusView} setFocusView={setFocusView}
          alarmSilenced={silencedAlarm === state.timer.id}
          silenceAlarm={() => { engine.current?.stopAlarm(); setSilencedAlarm(state.timer.id); }}
          alarmBlocked={alarmBlocked} retryAlarm={async () => {
            await engine.current?.unlock();
            setAlarmBlocked(!(await engine.current?.startAlarm()));
          }}
          tip={BREAK_IDEAS[tip]} nextTip={() => setTip((previous) => (previous + 1 + Math.floor(Math.random() * (BREAK_IDEAS.length - 1))) % BREAK_IDEAS.length)} />
      </main>
      {arranging && (
        <button
          className="arrange-done paper"
          onClick={() => setArranging(false)}
        >
          <Icon name="check" size={18} />
          Done
        </button>
      )}
      <div className="daily-goal-note" hidden={focusView || widePanel}>
        <button
          className={`daily-pill paper ${stats.progress === 1 ? "goal-reached" : ""}`}
          onClick={() => openPanel("journal")}
          aria-label={`Daily progress: ${stats.sessions} of ${stats.goal} sessions`}
        >
          <ArtFragment rect={[600, 538, 335, 382]} className="daily-note-art" />
          <span>
            <strong>
              Daily goal
            </strong>
            <span className="session-markers" aria-hidden="true">
              {Array.from({ length: Math.min(stats.goal, 8) }, (_, index) => (
                <i
                  key={index}
                  className={index < stats.sessions ? "filled" : ""}
                />
              ))}
            </span>
          </span>
        </button>
      </div>
      <footer className="room-footer" hidden={focusView}>
        <button
          className={`sound-pill paper ${playing ? "playing" : ""}`}
          onClick={() => openPanel("sound")}
          aria-label="Soundscape mixer"
        >
          <span className="sound-bars">
            <i />
            <i />
            <i />
          </span>
          <span>Sound</span>
          <Icon name="sound" size={18} />
        </button>
      </footer>
      {widePanel && <div className="workspace-dismiss" onClick={closePanel} />}
      {panel && (
        <Drawer key={panel} name={panel} onClose={closePanel}
          position={state.room.notepadPosition}
          onMove={(position) => act({ type: "MOVE_NOTEPAD", ...position })}>
          {panel === "animals" && (
            <AnimalsPanel
              state={state}
              act={act}
              selected={selectedAnimal}
              setSelected={setSelectedAnimal}
            />
          )}
          {panel === "shop" && <ShopPanel state={state} act={act} />}
          {panel === "decorate" && (
            <DecoratePanel
              state={state}
              act={act}
              arranging={arranging}
              setArranging={setArranging}
              selection={selection}
              setSelection={setSelection}
            />
          )}
          {panel === "journal" && (
            <JournalPanel state={state} act={act} now={now} />
          )}
          {panel === "sound" && (
            <SoundPanel
              state={state}
              act={act}
              engine={engine}
              playing={playing}
              setPlaying={setPlaying}
              report={setToast}
            />
          )}
          {panel === "settings" && (
            <SettingsPanel state={state} act={act} persistence={persistence} />
          )}
          {panel === "session" && <SessionControls state={state} act={act} />}
          {panel === "notes" && <QuickScratchpad state={state} act={act} saveStatus={status} />}
        </Drawer>
      )}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast paper">
            <Icon name="sparkle" size={20} />
            <span>{toast}</span>
            <button
              className="icon-button"
              onClick={() => setToast("")}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
      {ready && (status === "error" || status === "conflict") && (
        <div className="save-warning paper" role="alert">
          <span>{error || "Your latest changes have not been saved."}</span>
          <button
            onClick={
              status === "conflict" ? persistence.reload : persistence.retrySave
            }
          >
            {status === "conflict" ? "Reload saved room" : "Retry save"}
          </button>
        </div>
      )}
      {!ready && (
        <div className="loading-screen">
          <div className="paper loading-card">
            <Icon name="leaf" size={40} />
            <h1>
              {error ? "Couldn’t load your room" : "Loading…"}
            </h1>
            <p>
              {error}
            </p>
            {error && (
              <>
                <p className="small">
                  Start the local app with <code>npm start</code>, then try
                  again.
                </p>
                <button className="primary-button" onClick={persistence.reload}>
                  Try again
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {hatch && <HatchModal animal={hatch.animal} duplicate={hatch.duplicate} capped={hatch.capped} onClose={() => setHatch(null)} />}
    </div>
  );
}
