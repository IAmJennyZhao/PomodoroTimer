import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import useLocalSave from "./useLocalSave";
import {
  BACKGROUNDS,
  DECORATIONS,
  formatTime,
  remainingTime,
  todayStats,
} from "./game";
import { createAmbientEngine } from "./audio";
import {
  ART,
  RARITY_NAMES,
  Icon,
  Sprite,
  AnimalArt,
  Drawer,
  HatchModal,
} from "./ui";
import {
  AnimalsPanel,
  ShopPanel,
  DecoratePanel,
  JournalPanel,
  SoundPanel,
  SettingsPanel,
} from "./panels";

const BREAK_IDEAS = [
  [
    "A little stretch",
    "Uncurl your shoulders, reach up, and gently stretch your hands.",
  ],
  [
    "Look a little farther",
    "Rest your eyes on something outside your window for a moment.",
  ],
  [
    "A sip and a reset",
    "Refill your water. Take a few slow sips away from your desk.",
  ],
  [
    "Find a little color",
    "Look around and find five things in your favorite color.",
  ],
  [
    "Make a tiny drawing",
    "Sketch the nearest object. It only needs to make sense to you.",
  ],
  [
    "A breath of space",
    "Breathe comfortably and slowly. Let your shoulders settle.",
  ],
  [
    "Take the scenic route",
    "Stand up and take a short wander around your space.",
  ],
];

export default function App() {
  const persistence = useLocalSave();
  const { state, dispatch, ready, status, error } = persistence;
  const [now, setNow] = useState(Date.now());
  const [panel, setPanel] = useState(null);
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
    (action) =>
      dispatch({
        ...action,
        now: Date.now(),
        ...(["BUY_EGG", "HATCH_EGG"].includes(action.type)
          ? { roll: Math.random() }
          : {}),
      }),
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
  useEffect(() => {
    document.title =
      state.timer.status === "running"
        ? `${formatTime(remaining)} · ${state.timer.mode === "focus" ? "Focus" : "Breathe"} — Little Room`
        : "Little Room · a gentler Pomodoro";
  }, [remaining, state.timer.status, state.timer.mode]);
  useEffect(() => {
    const event = state.event;
    if (!event || event.id === lastEvent.current) return;
    lastEvent.current = event.id;
    if (event.type === "animal-hatched") setHatch(event.animal);
    else if (event.type === "focus-complete") {
      const stats = todayStats(state);
      setToast(
        stats.sessions === stats.goal
          ? `Daily goal complete! ${event.message}`
          : event.message,
      );
      setTip(Math.floor(Math.random() * BREAK_IDEAS.length));
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
    if (state.settings.soundEnabled) engine.current?.tap();
    act({ type: state.timer.status === "running" ? "PAUSE" : "START" });
  };
  const stats = todayStats(state, now);
  const progress = Math.max(
    0,
    Math.min(1, 1 - remaining / state.timer.durationMs),
  );
  const modes = [
    ["focus", "Focus"],
    ["break", "Short break"],
    ["longBreak", "Long break"],
  ];
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
        48,
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
        className={`room-resident ${type} ${arranging ? "draggable" : ""} ${selection?.id === item.id && arranging ? "chosen" : ""}`}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          zIndex: 2 + Math.round(position.y),
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
      className={`app ${state.room.background} ${state.settings.reducedMotion ? "reduce-motion" : ""} ${panel ? "panel-open" : ""} ${arranging ? "is-arranging" : ""}`}
    >
      <div
        className="room-scene"
        ref={sceneRef}
        style={{
          backgroundImage: `url(${ART}/room-${state.room.background}.png)`,
        }}
        aria-label={
          BACKGROUNDS.find((item) => item.id === state.room.background)?.name
        }
      >
        {state.room.decorations.map((item) =>
          renderResident(item, "decoration"),
        )}
        {state.animals
          .filter((item) => item.placed)
          .map((item) => renderResident(item, "animal"))}
      </div>
      <div className="room-vignette" />
      <header className="app-header">
        <button
          className="brand"
          onClick={closePanel}
          aria-label="Little Room home"
        >
          <Icon name="leaf" size={35} />
          <span>
            Little Room<small>A GENTLER KIND OF FOCUS</small>
          </span>
        </button>
        <div className="header-actions">
          <button
            className="gem-pill paper"
            onClick={() => openPanel("shop")}
            aria-label={`${state.gems} ${state.gems === 1 ? "Shilligem" : "Shilligems"}, open egg shop`}
          >
            <Icon name="gem" size={23} />
            <strong>{state.gems.toLocaleString()}</strong>
            <span>{state.gems === 1 ? "Shilligem" : "Shilligems"}</span>
          </button>
          <button
            className="icon-button paper settings-button"
            aria-label="Settings"
            onClick={() => openPanel("settings")}
          >
            <Icon name="settings" size={22} />
          </button>
        </div>
      </header>
      <main className="focus-area">
        <section className="timer-card paper" aria-label="Pomodoro timer">
          <div className="timer-ornament">
            <span />
            <Icon name="leaf" size={18} />
            <span />
          </div>
          <div className="mode-tabs" aria-label="Timer mode">
            {modes.map(([id, label]) => (
              <button
                key={id}
                aria-pressed={state.timer.mode === id}
                className={state.timer.mode === id ? "active" : ""}
                onClick={() => act({ type: "SET_MODE", mode: id })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="timer-face">
            <svg
              className="timer-ring"
              viewBox="0 0 280 154"
              aria-hidden="true"
            >
              <path
                className="ring-track"
                d="M19 140a121 121 0 0 1 242 0"
                pathLength="100"
              />
              <path
                className="ring-progress"
                d="M19 140a121 121 0 0 1 242 0"
                pathLength="100"
                strokeDasharray={`${progress * 100} 100`}
              />
            </svg>
            <p className="timer-caption">
              {state.timer.mode === "focus"
                ? "A little time for what matters"
                : "A little room to breathe"}
            </p>
            <div
              className="timer-digits"
              role="timer"
              aria-label={`${formatTime(remaining)} remaining`}
            >
              {formatTime(remaining)}
            </div>
          </div>
          <label className="task-input">
            <Icon name="pencil" size={17} />
            <input
              aria-label="Session task"
              maxLength={200}
              placeholder="What are you working on?"
              value={state.timer.task}
              onChange={(e) => act({ type: "SET_TASK", task: e.target.value })}
            />
          </label>
          <div className="timer-actions">
            <button
              className="icon-button reset-button"
              onClick={() => act({ type: "RESET" })}
              aria-label="Reset timer"
              title="Reset timer"
            >
              <Icon name="reset" size={20} />
            </button>
            <button
              className="primary-button start-button"
              onClick={timerAction}
              disabled={!ready || status === "conflict"}
            >
              <Icon
                name={state.timer.status === "running" ? "pause" : "play"}
                size={18}
              />
              {state.timer.status === "running"
                ? "Pause"
                : state.timer.status === "paused"
                  ? "Keep going"
                  : state.timer.mode === "focus"
                    ? "Start focusing"
                    : "Take a breath"}
            </button>
            <button
              className="icon-button skip-button"
              aria-label="Skip current session"
              title="Skip current session (no reward)"
              onClick={() => act({ type: "SKIP" })}
            >
              <Icon name="skip" size={20} />
            </button>
          </div>
          <p className="timer-footnote">
            {state.timer.mode === "focus" ? (
              <>
                <span className="tiny-gem">◇</span> A finished session earns{" "}
                {Math.round(state.timer.durationMs / 60000)}{" "}
                {state.timer.durationMs === 60000 ? "Shilligem" : "Shilligems"}
              </>
            ) : (
              <>Let your little friends keep you company.</>
            )}
          </p>
          {state.timer.mode !== "focus" && (
            <div className="break-idea">
              <div>
                <strong>{BREAK_IDEAS[tip][0]}</strong>
                <p>{BREAK_IDEAS[tip][1]}</p>
              </div>
              <button
                className="icon-button"
                aria-label="Another break idea"
                onClick={() =>
                  setTip(
                    (previous) =>
                      (previous +
                        1 +
                        Math.floor(Math.random() * (BREAK_IDEAS.length - 1))) %
                      BREAK_IDEAS.length,
                  )
                }
              >
                <Icon name="shuffle" size={20} />
              </button>
            </div>
          )}
        </section>
        <p className="scene-caption">
          {arranging
            ? "A little rearranging makes a room your own."
            : "Small steps. Soft landings."}
        </p>
      </main>
      {arranging && (
        <button
          className="arrange-done paper"
          onClick={() => setArranging(false)}
        >
          <Icon name="check" size={18} />
          Done arranging
        </button>
      )}
      <footer className="room-footer">
        <button
          className={`daily-pill paper ${stats.progress === 1 ? "goal-reached" : ""}`}
          onClick={() => openPanel("journal")}
          aria-label={`Daily progress: ${stats.sessions} of ${stats.goal} sessions`}
        >
          <Icon name={stats.progress === 1 ? "sparkle" : "leaf"} size={23} />
          <span>
            <strong>
              {stats.sessions} / {stats.goal} sessions
            </strong>
            <small>
              {stats.progress === 1
                ? "A lovely day of focus"
                : "A little more room to grow"}
            </small>
            <span className="session-markers" aria-hidden="true">
              {Array.from({ length: Math.min(stats.goal, 8) }, (_, index) => (
                <Icon
                  key={index}
                  name="focus"
                  size={11}
                  className={index < stats.sessions ? "filled" : ""}
                />
              ))}
            </span>
          </span>
        </button>
        <nav className="bottom-dock paper" aria-label="Main navigation">
          {[
            ["focus", "focus", "Focus"],
            ["animals", "paw", "Animals"],
            ["shop", "egg", "Egg shop"],
            ["decorate", "plant", "Decorate"],
            ["journal", "book", "Journal"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={id === (panel || "focus") ? "active" : ""}
              aria-label={label}
              aria-current={id === (panel || "focus") ? "page" : undefined}
              onClick={() => (id === "focus" ? closePanel() : openPanel(id))}
            >
              <Icon name={icon} size={25} />
              <span>{label}</span>
              {id === "shop" && state.eggs.length > 0 && (
                <i>{state.eggs.length}</i>
              )}
            </button>
          ))}
        </nav>
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
          <span>{playing ? "Your quiet mix" : "Soundscape"}</span>
          <Icon name="sound" size={18} />
        </button>
      </footer>
      {panel && (
        <Drawer name={panel} onClose={closePanel}>
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
              {error ? "Your room is waiting." : "Opening your little room…"}
            </h1>
            <p>
              {error || "Finding your companions and your favorite corner."}
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
      {hatch && <HatchModal animal={hatch} onClose={() => setHatch(null)} />}
    </div>
  );
}
