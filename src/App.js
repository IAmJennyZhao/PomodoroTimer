import { Button, ControlFeedbackContext } from "./Controls";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./App.css";
import "./layout.css";
import "./timer-flow.css";
import "./RoomFeatures.css";
import { ArtFragment } from "./AtelierArt";
import useLocalSave from "./useLocalSave";
import useReducedMotion, { MotionPreferenceContext } from "./useReducedMotion";
import {
  BACKGROUNDS,
  DECORATIONS,
  decorationAvailable,
  formatTime,
  formatElapsedTime,
  elapsedTime,
  isCountingUp,
  remainingTime,
  todayStats,
  MAX_PAUSES,
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
import SessionStrip from "./SessionStrip";
import { EggShopTools } from "./EggShop";
import { RoomLoading, SaveNotice, ToastNotice, useNoticeTimeout } from "./Feedback";
import RoomBackdrop from "./RoomBackdrop";
import RoomWidget from "./RoomWidget";
import RoomObjects from "./RoomObjects";
import { ArrangementCameraContext, ROOM_SIZE } from "./roomGeometry";
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
import "./visual-system.css";
import "./main-panels.css";
import "./timer-refinements.css";
import "./utility-panels.css";
import "./feedback.css";
import "./polish.css";
import "./motion.css";
import "./tactile-controls.css";
import { Presence, TimerTransition } from "./Transitions";
import "./transitions.css";
import { OutcomeAccent, OutcomeFeedbackContext, useOutcomeFeedback } from "./OutcomeFeedback";
import "./outcomes.css";
import usePlacementGesture from "./usePlacementGesture";
import { PetResponseContext, RoomVisual, usePetResponses, useRoomChanges } from "./RoomInteraction";
import "./room-interactions.css";
import "./spacing.css";
import "./header.css";
import "./arrangement.css";
import "./session-flow.css";
import "./notes-journal.css";
import useScratchpadLayout from "./useScratchpadLayout";

const compactCount = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

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
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  useLayoutEffect(() => {
    const header = headerRef.current;
    const measure = () => {
      const height = header?.getBoundingClientRect().height;
      if (height) {
        header.closest(".app")?.style.setProperty("--header-height", `${height}px`);
        setHeaderHeight(previous => previous === height ? previous : height);
      }
    };
    measure();
    let frame;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (header) observer?.observe(header);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const persistence = useLocalSave();
  const { state, dispatch, ready, status } = persistence;
  const reducedMotion = useReducedMotion(state.settings.reducedMotion);
  const [now, setNow] = useState(Date.now());
  const [panel, setPanel] = useState(null);
  const [shopStartAtNest, setShopStartAtNest] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusView, setFocusView] = useState(false);
  const quietFocus = focusView && state.timer.mode === "focus" && state.timer.status === "running";
  const focusedSession = useRef(null);
  const [silencedAlarm, setSilencedAlarm] = useState(null);
  const [alarmBlocked, setAlarmBlocked] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState("starter-cat");
  const [accessoryShopPetId, setAccessoryShopPetId] = useState(null);
  const [selection, setSelection] = useState(null);
  const [arranging, setArranging] = useState(false);
  const notesLayout = useScratchpadLayout({ open: notesOpen, focusView, panel, arranging, headerHeight });
  const [roomCamera, setRoomCamera] = useState(null);
  const [pendingFurniture, setPendingFurniture] = useState(null);
  useEffect(() => {
    if (!arranging || (pendingFurniture && selection?.id !== pendingFurniture.id)) setPendingFurniture(null);
  }, [arranging, selection, pendingFurniture]);
  const cancellationId = useRef(0);
  const [tip, setTip] = useState(0);
  const [toast, setToast] = useState(null);
  const [toastPaused, setToastPaused] = useState(null);
  const noticeId = useRef(0);
  const notify = useCallback((message, tone = "info", visible = true) => {
    setToast(message ? { id: ++noticeId.current, message, tone, visible: visible && (!quietFocus || tone === "warning") } : null);
    setToastPaused(null);
  }, [quietFocus]);
  const [hatch, setHatch] = useState(null);
  const visibleHatch = useRef(null);
  const [outcomes, showOutcome] = useOutcomeFeedback();
  const [playing, setPlaying] = useState(false);
  const engine = useRef(null);
  const closeHatch = useCallback(() => {
    visibleHatch.current = null;
    engine.current?.cancelSfx();
    setHatch(null);
  }, []);
  const playControlFeedback = useCallback(name => {
    if (!ready || !state.settings.interactionSfxEnabled || state.settings.interactionSfxVolume === 0) return;
    // Feedback never delays the action or turns unavailable audio into a UI error.
    try {
      const result = name === "tap" ? engine.current?.tap() : engine.current?.playSfx(name);
      result?.catch(() => {});
    } catch (_) { /* A silent interaction remains usable. */ }
  }, [ready, state.settings.interactionSfxEnabled, state.settings.interactionSfxVolume]);
  const respondToPet = usePetResponses(showOutcome, ready && !focusView && !arranging);
  const sceneRef = useRef(null);
  const lastEvent = useRef(null);
  const lastHatch = useRef(null);
  const previousFurniture = useRef(state.room.decorations.length);
  useEffect(() => {
    if (arranging && state.room.decorations.length > previousFurniture.current) {
      setSelection({ type: "decoration", id: state.room.decorations[state.room.decorations.length - 1].id });
    }
    previousFurniture.current = state.room.decorations.length;
  }, [state.room.decorations, arranging]);
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
    engine.current?.setInteractionSfx({
      enabled: state.settings.interactionSfxEnabled,
      volume: state.settings.interactionSfxVolume,
    });
  }, [state.settings.interactionSfxEnabled, state.settings.interactionSfxVolume]);
  useEffect(() => {
    if (!state.settings.soundEnabled) engine.current?.stopAlerts();
  }, [state.settings.soundEnabled]);
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
  const sidePanel = ["settings", "session", "sound"].includes(panel);
  const widePanel = Boolean(panel) && !sidePanel && !arranging;
  const showSessionStrip = ready && !focusView && Boolean(panel) && state.timer.status !== "idle" && !(notesOpen && notesLayout.layout === "sheet");
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
        : state.timer.status === "paused" && state.timer.rewardForfeited ? `${state.timer.pauseCount > MAX_PAUSES ? "Pause limit reached" : "Pause ended"} · Little Room`
        : state.timer.status === "complete" ? "Time for a break · Little Room" : "Little Room · Focus";
  }, [displayTime, counting, state.timer.status, state.timer.mode, state.timer.overtime, state.timer.workMode, state.timer.rewardForfeited, state.timer.pauseCount]);
  useLayoutEffect(() => {
    const event = state.event;
    if (event?.type !== "animal-hatched" || event.id === lastHatch.current) return;
    lastHatch.current = event.id;
    visibleHatch.current = event.id;
    // Open and focus before another native input can arrive. A passive effect
    // could otherwise reopen the celebration after an immediate Escape.
    setHatch(event);
  }, [state.event]);
  useEffect(() => {
    const event = state.event;
    if (!event || event.id === lastEvent.current) return;
    lastEvent.current = event.id;
    if (event.type === "animal-hatched") {
      if (visibleHatch.current === event.id) playControlFeedback(event.capped ? "purchase" : event.duplicate ? "check" : "hatch");
    }
    else if (event.type === "focus-complete" || event.type === "focus-finished") {
      const stats = todayStats(state);
      const goalComplete = stats.sessions === stats.goal && event.minutes > 0 && event.firstCredit;
      showOutcome("session", { id: event.id, target: event.sessionId, gems: event.gems });
      if (goalComplete) showOutcome("goal", { id: event.id, target: "daily" });
      // Timed completion keeps its existing alert; manual finishing and muted
      // timer alerts may use the softer outcome check, never both.
      const manualFinish = event.type === "focus-finished" || state.timer.workMode === "countup";
      if (event.gems > 0 && (manualFinish || !state.settings.soundEnabled)) playControlFeedback("check");
      notify(goalComplete ? `Daily goal complete! ${event.message}` : event.message, "success");
      setTip(Math.floor(Math.random() * BREAK_IDEAS.length));
      if (state.timer.overtime && state.timer.status !== "complete") notify("Target reached · counting up");
      if (event.type === "focus-complete" && !manualFinish && state.settings.soundEnabled && !(state.timer.status === "complete" && state.timer.workMode === "pomodoro" && state.timer.endBehavior === "remind")) engine.current?.chime();
    } else if (event.type === "reward-forfeited") {
      notify(null);
      setFocusView(false);
      setPanel(null);
      setArranging(false);
      setSelection(null);
      if (state.settings.soundEnabled) engine.current?.chime();
    } else if (event.type === "egg-bought") {
      notify("Egg added");
      showOutcome("purchase", { id: event.id, target: event.egg.id, targets: [`egg:${event.egg.rarity === "basic" ? "basic" : "mystery"}`] });
      playControlFeedback("purchase");
    } else if (event.type === "item-bought") {
      notify(event.message);
      showOutcome("purchase", { id: event.id, target: `${event.category}:${event.item.id}` });
      playControlFeedback("purchase");
    } else {
      notify(event.message, event.type === "notice" ? "warning" : "info");
      if (event.type === "break-complete" && state.settings.soundEnabled)
        engine.current?.chime();
    }
  }, [state, notify, showOutcome, playControlFeedback]);
  useEffect(() => {
    if (quietFocus) setToast(previous => previous?.tone === "warning" ? previous : null);
  }, [quietFocus]);
  useNoticeTimeout(toast, toastPaused === toast?.id, setToast);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        if (hatch) closeHatch();
        else if (arranging && selection) { setPendingFurniture(null); setSelection(null); }
        else {
          setPanel(null);
          setArranging(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hatch, closeHatch, arranging, selection]);
  const openPanel = (id) => {
    if (id === "notes") { setNotesOpen(previous => !previous); return; }
    if (id === "shop") setShopStartAtNest(false);
    if (id === "decorate") setAccessoryShopPetId(null);
    setPanel((previous) => (previous === id ? null : id));
    if (id !== "decorate") setArranging(false);
  };
  const closePanel = () => {
    setSelection(null);
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
    act({ type: state.timer.status === "running" ? "PAUSE" : "START" });
  };
  const toggleSessionInWorkspace = () => {
    if (state.timer.status !== "running") { engine.current?.unlock(); setNow(Date.now()); }
    act({ type: state.timer.status === "running" ? "PAUSE" : "START" });
  };
  const stats = todayStats(state, now);
  const beginFurniturePlacement = item => {
    if (decorationAvailable(state, item.id) < 1) return;
    const preview = { id: "placement-preview", item: item.id, x: 50, y: 72 };
    setPendingFurniture(preview);
    setSelection({ type: "decoration", id: preview.id });
    setArranging(true);
  };
  const cancelFurniturePlacement = () => { setPendingFurniture(null); setSelection(null); };
  const confirmFurniturePlacement = (position = pendingFurniture) => {
    if (!pendingFurniture) return;
    if (decorationAvailable(state, pendingFurniture.item) > 0) {
      act({ type: "PLACE_DECORATION", item: pendingFurniture.item, x: position.x, y: position.y });
      notify(`${DECORATIONS.find(item => item.id === pendingFurniture.item)?.name} placed in room.`);
    }
    cancelFurniturePlacement();
  };
  useRoomChanges(state, ready, showOutcome, playControlFeedback);
  const gesture = usePlacementGesture({
    enabled: arranging && ready && status !== "conflict",
    project: (origin, event) => {
      const bounds = sceneRef.current.getBoundingClientRect();
      return { type: origin.type, id: origin.id,
        x: Math.max(5, Math.min(95, origin.x + (event.clientX - origin.pointerX) / bounds.width * 100)),
        y: Math.max(20, Math.min(85, origin.y + (event.clientY - origin.pointerY) / bounds.height * 100)),
      };
    },
    commit: (next, origin) => {
      if (origin.id === pendingFurniture?.id) { confirmFurniturePlacement(next); return; }
      if (next.x !== origin.x || next.y !== origin.y) act({ type: origin.type === "animal" ? "MOVE_ANIMAL" : "MOVE_DECORATION", id: origin.id, x: next.x, y: next.y });
    },
    onCancel: (origin, reason) => {
      const bounds = sceneRef.current?.getBoundingClientRect();
      const scale = Number(sceneRef.current?.style.getPropertyValue("--room-edit-scale")) || 1;
      showOutcome("room", { id: `return:${++cancellationId.current}`, target: `${origin.type}:${origin.id}`, kind: "cancelled",
        dx: reason === "cancel" ? (origin.next.x - origin.x) * (bounds?.width || 0) / scale / 100 : 0,
        dy: reason === "cancel" ? (origin.next.y - origin.y) * (bounds?.height || 0) / scale / 100 : 0 });
    },
  });
  const drag = gesture.draft;
  const startDrag = (event, type, item) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    if (!arranging) return;
    if (gesture.start(event, { type, id: item.id, x: item.x, y: item.y })) {
      outcomes.clearOutcome("room");
      setSelection({ type, id: item.id });
    }
  };
  const renderResident = (item, type) => {
    const position = drag?.type === type && drag.id === item.id ? drag : item;
    const chosen = arranging && selection?.type === type && selection.id === item.id;
    const name =
      type === "animal"
        ? item.name
        : DECORATIONS.find((entry) => entry.id === item.item)?.name;
    const moveKey = (event) => {
      if (arranging && item.id === pendingFurniture?.id && event.key === "Enter") { event.preventDefault(); confirmFurniturePlacement(); return; }
      if (!arranging || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      gesture.cancel();
      const step = event.shiftKey ? 5 : 1;
      setSelection({ type, id: item.id });
      const movement = {
        type: type === "animal" ? "MOVE_ANIMAL" : "MOVE_DECORATION",
        id: item.id,
        x: Math.max(5, Math.min(95, item.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))),
        y: Math.max(20, Math.min(85, item.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))),
      };
      if (item.id === pendingFurniture?.id) setPendingFurniture(current => ({ ...current, x: movement.x, y: movement.y }));
      else act(movement);
    };
    return (
      <div
        key={item.id}
        className={`room-resident ${type} ${type === "decoration" ? `decoration-${item.item}` : ""} ${arranging ? "draggable" : ""} ${chosen ? "chosen" : ""} ${item.id === pendingFurniture?.id ? "placement-preview" : ""}`}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          "--room-x": position.x,
          "--room-y": position.y,
          "--selection-close-offset": roomCamera && roomCamera.left + position.x / 100 * ROOM_SIZE.width * roomCamera.scale > window.innerWidth - 74 ? "-70px" : "26px",
          zIndex: item.item === "rug" ? 1 : chosen ? 250 : (type === "animal" ? 160 : 2) + Math.round(position.y),
          "--delay": `${-(state.animals.findIndex((animal) => animal.id === item.id) * 1.37)}s`,
        }}
      >
      <button className="resident-hitbox" aria-pressed={arranging ? chosen : undefined}
        aria-label={
          arranging
            ? `Position ${name}`
            : `${name}, ${type === "animal" ? `${RARITY_NAMES[item.rarity]} ${item.species}` : "room decoration"}`
        }
        onPointerDown={(event) => startDrag(event, type, item)}
        {...gesture.handlers}
        onKeyDown={moveKey}
        onClick={(event) => {
          if (!ready || event.currentTarget.closest("[inert]")) return;
          if (arranging) {
            if (event.detail === 0) setSelection({ type, id: item.id });
          } else if (type === "animal") {
            respondToPet(item.id);
            playControlFeedback("selection");
            setSelectedAnimal(item.id);
            setPanel("animals");
          }
        }}
      >
        <RoomVisual target={`${type}:${item.id}`} lifted={drag?.type === type && drag.id === item.id}>
        {type === "animal" ? (
          <AnimalArt animal={item} className="idle-animal" />
        ) : (
          <Sprite kind="object" id={item.item} />
        )}
        </RoomVisual>
        <span className="resident-label">{name}</span>
      </button>
      {item.id === pendingFurniture?.id && <span className="placement-preview-label">Placing {name}</span>}
      {chosen && <button className="resident-move-handle" aria-label={`Move ${name}`} aria-pressed={chosen}
        onPointerDown={event => startDrag(event,type,item)} {...gesture.handlers} onKeyDown={moveKey}><Icon name="move" size={20} /></button>}
      {chosen && <Button className="selection-close" aria-label={`Deselect ${name}`} onClick={event => { event.currentTarget.parentElement.querySelector(".resident-hitbox").focus(); setSelection(null); }}><Icon name="close" size={16} /></Button>}
      </div>
    );
  };
  return (
    <ControlFeedbackContext.Provider value={playControlFeedback}>
    <MotionPreferenceContext.Provider value={reducedMotion}>
    <ArrangementCameraContext.Provider value={arranging ? roomCamera : null}>
    <OutcomeFeedbackContext.Provider value={outcomes}>
    <PetResponseContext.Provider value={respondToPet}>
    <div
      className={`app ${state.room.background} ${reducedMotion ? "reduce-motion" : ""} ${panel ? "panel-open" : ""} ${widePanel ? "wide-panel-open" : ""} ${sidePanel ? "side-panel-open" : ""} ${focusView ? "focus-view" : ""} ${arranging ? "is-arranging" : ""} ${ready && ["error", "conflict"].includes(status) ? "has-save-notice" : ""} ${notesOpen ? `notes-open notes-${notesLayout.layout}` : ""} ${notesLayout.compact ? "notes-compact" : ""}`}
      style={notesLayout.style}
    >
      <div
        className="room-scene"
        inert={(panel && !arranging) || focusView ? "" : undefined}
        aria-label={
          BACKGROUNDS.find((item) => item.id === state.room.background)?.name
        }
      >
        <RoomObjects ref={sceneRef} arranging={arranging} onCameraChange={setRoomCamera}
          layoutKey={JSON.stringify([state.room.decorations, state.animals.filter(animal => animal.placed).map(({ id, x, y }) => [id, x, y]), pendingFurniture?.item, notesOpen ? notesLayout.style : null])}>
        <RoomBackdrop theme={state.room.background} />
        {state.room.decorations.map((item) =>
          renderResident(item, "decoration"),
        )}
        {arranging && pendingFurniture && renderResident(pendingFurniture, "decoration")}
        {state.animals
          .filter((item) => item.placed)
          .map((item) => renderResident(item, "animal"))}
        </RoomObjects>
      </div>
      <div className="room-vignette" />
      <header aria-label="Room controls" ref={headerRef} className={`app-header ${showSessionStrip ? "has-session-strip" : ""}`} data-concealed={focusView || notesLayout.hideHeader ? "true" : undefined} aria-hidden={focusView || notesLayout.hideHeader ? true : undefined} inert={focusView || notesLayout.hideHeader ? "" : undefined}>
        <Button className="room-brand" onClick={closePanel}>Little Room</Button>
        <div className="header-actions">
          <Button
            className="gem-pill paper"
            onClick={() => openPanel("shop")}
            aria-label={`${state.gems} ${state.gems === 1 ? "Shilligem" : "Shilligems"}, open egg shop`}
            title={`${state.gems.toLocaleString()} Shilligems`}
          >
            <Icon name="gem" size={23} />
            <strong>{state.gems >= 10000 ? compactCount.format(state.gems) : state.gems.toLocaleString()}</strong>
          </Button>
          <nav className="top-nav paper" aria-label="Main navigation">
            {[
              ["focus", "focus", "Focus"],
              ["animals", "paw", "Pets"],
              ["shop", "egg", "Egg shop"],
              ["decorate", "plant", "Decorate"],
              ["journal", "book", "Journal"],
            ].map(([id, , label]) => (
              <Button key={id} className={id === (panel || "focus") ? "active" : ""}
                aria-label={label} aria-current={id === (panel || "focus") ? "page" : undefined}
                onClick={() => (id === "focus" ? closePanel() : openPanel(id))}>
                <span>{{ "Egg shop": "Shop", Decorate: "Room" }[label] || label}</span>
                {id === "shop" && state.eggs.length > 0 && <i>{state.eggs.length}</i>}
              </Button>
            ))}
          </nav>
          <Button className="icon-button header-notes" aria-label="Open Scratchpad" title="Scratchpad" aria-pressed={notesOpen} aria-expanded={notesOpen} aria-controls="scratchpad" onClick={() => openPanel("notes")}><Icon name="note" size={22} /></Button>
          <Button
            className="icon-button paper settings-button"
            aria-label="Settings"
            onClick={() => openPanel("settings")}
          >
            <Icon name="settings" size={22} />
          </Button>
        </div>
        {showSessionStrip && <SessionStrip timer={state.timer} now={now} disabled={!ready || status === "conflict"} compact={arranging}
          onToggle={toggleSessionInWorkspace} onFocus={() => { closePanel(); setFocusView(state.timer.mode === "focus" && state.timer.status !== "complete"); }} />}
      </header>
      <TimerTransition reduced={reducedMotion} layoutKey={`${focusView}/${widePanel}/${panel}/${arranging}`}
        contentKey={`${state.timer.id}/${state.timer.mode}/${state.timer.status}/${state.timer.overtime}/${state.timer.rewardForfeited}/${focusView}`}>
        {cardRef => <RoomWidget as="main" id="timer" name="timer" className="focus-area" position={focusView ? null : state.room.widgets?.timer}
        arranging={arranging} selected={arranging && selection?.type === "widget" && selection.id === "timer"}
        onSelect={setSelection} onDeselect={() => setSelection(null)} onMove={position => act({ type: "MOVE_WIDGET", id: "timer", ...position })} concealed={widePanel}>
        <TimerCard cardRef={cardRef} state={state} act={act} now={now} ready={ready} blocked={status === "conflict"} arranging={arranging}
          onToggleTimer={timerAction} panel={panel} openPanel={openPanel} notesOpen={notesOpen}
          openNest={() => { setShopStartAtNest(true); setPanel("shop"); setArranging(false); setFocusView(false); }}
          focusView={focusView} setFocusView={setFocusView}
          alarmSilenced={silencedAlarm === state.timer.id}
          silenceAlarm={() => { engine.current?.stopAlarm(); setSilencedAlarm(state.timer.id); }}
          alarmBlocked={alarmBlocked} retryAlarm={async () => {
            await engine.current?.unlock();
            setAlarmBlocked(!(await engine.current?.startAlarm()));
          }}
          tip={BREAK_IDEAS[tip]} nextTip={() => setTip((previous) => (previous + 1 + Math.floor(Math.random() * (BREAK_IDEAS.length - 1))) % BREAK_IDEAS.length)} />
      </RoomWidget>}</TimerTransition>
      <RoomWidget id="goal" name="daily goal" className="daily-goal-note" position={state.room.widgets?.goal}
        arranging={arranging} selected={arranging && selection?.type === "widget" && selection.id === "goal"}
        onSelect={setSelection} onDeselect={() => setSelection(null)} onMove={position => act({ type: "MOVE_WIDGET", id: "goal", ...position })} concealed={focusView || widePanel}>
        <Button
          className={`daily-pill paper ${stats.progress === 1 ? "goal-reached" : ""}`}
          onClick={() => openPanel("journal")}
          aria-label={`Daily progress: ${stats.sessions} of ${stats.goal} sessions`}
        >
          <ArtFragment rect={[600, 538, 335, 382]} className="daily-note-art" />
          <OutcomeAccent channel="goal" target="daily" className="goal-accent" />
          <span>
            <strong>
              Daily goal
            </strong>
            {stats.goal > 5 ? <>
              <span className="daily-goal-total" aria-hidden="true">{stats.sessions} / {stats.goal}</span>
              <span className="daily-goal-meter" aria-hidden="true"><i style={{ width: `${stats.progress * 100}%` }} /></span>
            </> : <span className="session-markers" aria-hidden="true">
              {Array.from({ length: stats.goal }, (_, index) => (
                <i
                  key={index}
                  className={index < stats.sessions ? "filled" : ""}
                  data-goal-mark={outcomes.goal && index === stats.sessions - 1 ? "true" : undefined}
                />
              ))}
            </span>}
          </span>
        </Button>
      </RoomWidget>
      <footer className="room-footer" data-concealed={focusView || widePanel ? "true" : undefined} aria-hidden={focusView || widePanel ? true : undefined} inert={focusView || widePanel ? "" : undefined}>
        <Button
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
        </Button>
      </footer>
      {widePanel && <div className="workspace-dismiss" onClick={closePanel} />}
      <Presence value={panel}>{(shownPanel, active) => (
        <Drawer name={shownPanel} active={active} title={arranging ? "Arrange room" : undefined} onClose={closePanel} toolbar={shownPanel === "shop" ? <EggShopTools state={state} /> : undefined}>
          {shownPanel === "animals" && (
            <AnimalsPanel
              state={state}
              act={act}
              selected={selectedAnimal}
              setSelected={setSelectedAnimal}
              onShopAccessories={id => { setAccessoryShopPetId(id); setSelectedAnimal(id); setArranging(false); setPanel("decorate"); }}
            />
          )}
          {shownPanel === "shop" && <ShopPanel state={state} act={act} onFocus={closePanel} startAtNest={shopStartAtNest} toolsInHeading />}
          {shownPanel === "decorate" && (
            <DecoratePanel
              accessoryPetId={accessoryShopPetId}
              onBackToPet={accessoryShopPetId ? id => { setSelectedAnimal(id); setAccessoryShopPetId(null); setPanel("animals"); } : undefined}
              state={state}
              act={act}
              arranging={arranging}
              setArranging={setArranging}
              selection={selection}
              setSelection={setSelection}
              pendingFurniture={pendingFurniture}
              onPlaceFurniture={beginFurniturePlacement}
              onConfirmPlacement={() => confirmFurniturePlacement()}
              onCancelPlacement={cancelFurniturePlacement}
              onFinishArrange={closePanel}
            />
          )}
          {shownPanel === "journal" && (
            <JournalPanel state={state} act={act} now={now} saveStatus={status} />
          )}
          {shownPanel === "sound" && (
            <SoundPanel
              state={state}
              act={act}
              engine={engine}
              playing={playing}
              setPlaying={setPlaying}
              report={message => notify(message, "warning")}
            />
          )}
          {shownPanel === "settings" && (
            <SettingsPanel state={state} act={act} persistence={persistence} engine={engine} onSessionSettings={() => setPanel("session")} />
          )}
          {shownPanel === "session" && <SessionControls state={state} act={act} />}
        </Drawer>
      )}</Presence>
      <Presence value={notesOpen ? "notes" : null}>{(name, active) => <Drawer name={name} active={active} notesLayout={notesLayout.layout} onClose={() => setNotesOpen(false)} position={state.room.notepadPosition}
        sessionControls={ready && state.timer.status !== "idle" && notesLayout.layout !== "docked" ? <SessionStrip timer={state.timer} now={now} compact disabled={status === "conflict"}
          onToggle={toggleSessionInWorkspace} onFocus={() => { setNotesOpen(false); closePanel(); setFocusView(state.timer.mode === "focus" && state.timer.status !== "complete"); }} /> : null}
        onMove={position => act({ type: "MOVE_NOTEPAD", ...position })}>
        <QuickScratchpad state={state} act={act} saveStatus={status} />
      </Drawer>}</Presence>
      <div className="toast-region" role="status" aria-live="polite">
        <Presence value={toast}>{(notice, active) => <ToastNotice notice={notice} active={active} onDismiss={() => setToast(null)}
          onPauseChange={paused => setToastPaused(previous => paused ? notice.id : previous === notice.id ? null : previous)} />}</Presence>
      </div>
      {ready && (status === "error" || status === "conflict") && <SaveNotice persistence={persistence} />}
      {!ready && <RoomLoading persistence={persistence} />}
      {hatch && <HatchModal key={hatch.id} animal={hatch.animal} duplicate={hatch.duplicate} capped={hatch.capped} onClose={closeHatch} />}
      <span className="visually-hidden" aria-live="polite">{outcomes.room?.kind === "cancelled" ? "Move cancelled. Returned to the original position." : ""}</span>
    </div>
    </PetResponseContext.Provider>
    </OutcomeFeedbackContext.Provider>
    </ArrangementCameraContext.Provider>
    </MotionPreferenceContext.Provider>
    </ControlFeedbackContext.Provider>
  );
}
