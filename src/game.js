const MINUTE = 60_000;
export const MAX_TRACKED_MS = 24 * 60 * MINUTE;
export const RARITIES = ["basic", "everyday", "rare", "dreamy"];
export const RARITY_STARS = { basic: 1, everyday: 2, rare: 3, dreamy: 4 };
export const EGG_MINUTES = { basic: 25, everyday: 50, rare: 75, dreamy: 100 };
export const MAX_PAUSES = 2;
export const PAUSE_LIMIT_MS = MINUTE;
export const MAX_UPGRADES = 6;
const MODES = ["focus", "break", "longBreak"];
const MAX_MINUTES = { focus: 180, break: 60, longBreak: 120 };
const ROOM_BOUNDS = { minX: 5, maxX: 95, minY: 20, maxY: 85 };

export const ANIMALS = [
  { id: "cat", name: "Cat", emoji: "🐈", color: "#e8a06b" },
  { id: "dog", name: "Dog", emoji: "🐕", color: "#bc8660" },
  { id: "squirrel", name: "Squirrel", emoji: "🐿️", color: "#ba7550" },
  { id: "rabbit", name: "Rabbit", emoji: "🐇", color: "#decddc" },
  { id: "fox", name: "Fox", emoji: "🦊", color: "#db8659" },
  { id: "deer", name: "Deer", emoji: "🦌", color: "#bc9975" },
];

export const BACKGROUNDS = [
  {
    id: "sunroom",
    name: "Sunlit nook",
    price: 0,
    description: "A warm little room for a fresh start.",
  },
  {
    id: "moonroom",
    name: "Moonlit den",
    price: 75,
    description: "Soft moonlight for your evening focus.",
  },
  {
    id: "greenhouse",
    name: "Garden room",
    price: 100,
    description: "A leafy hideaway full of gentle light.",
  },
];

export const ACCESSORIES = [
  { id: "none", name: "No accessory", price: 0, emoji: "" },
  { id: "bow", name: "Little bow", price: 20, emoji: "🎀" },
  { id: "crown", name: "Tiny crown", price: 50, emoji: "👑" },
  { id: "flower", name: "Daisy", price: 30, emoji: "🌼" },
];

export const DECORATIONS = [
  { id: "couch", name: "Soft sofa", price: 50, emoji: "🛋️" },
  { id: "rug", name: "Woven rug", price: 35, emoji: "🧶" },
  { id: "bookshelf", name: "Little bookshelf", price: 45, emoji: "📚" },
  { id: "window-plants", name: "Window garden", price: 30, emoji: "🌱" },
  { id: "table", name: "Coffee table", price: 35, emoji: "☕" },
  { id: "side-table", name: "Side table", price: 25, emoji: "🪑" },
  { id: "plant", name: "Leafy friend", price: 20, emoji: "🪴" },
  { id: "cushion", name: "Cozy cushion", price: 25, emoji: "🛋️" },
  { id: "books", name: "Book stack", price: 30, emoji: "📚" },
];

export const PRESETS = [
  {
    id: "quick",
    name: "Quick sprint",
    settings: { focusMinutes: 15, breakMinutes: 3, longBreakMinutes: 10 },
  },
  {
    id: "classic",
    name: "Classic",
    settings: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 },
  },
  {
    id: "deep",
    name: "Deep work",
    settings: { focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 20 },
  },
];

const DEFAULT_SETTINGS = {
  workMode: "pomodoro",
  endBehavior: "remind",
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  dailyGoal: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  interactionSfxEnabled: true,
  interactionSfxVolume: 0.35,
  reducedMotion: false,
  ambient: { rain: 0.3, fire: 0, noise: 0 },
};

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const clamp = (value, min, max, fallback) =>
  finite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const integer = (value, min, max, fallback) =>
  Math.round(clamp(value, min, max, fallback));
const cleanText = (value, max, fallback = "") =>
  typeof value === "string" ? value.slice(0, max) : fallback;
const validId = (value) =>
  typeof value === "string" && value.length > 0 && value.length <= 160;
const has = (catalog, id) => catalog.some((item) => item.id === id);
const timeNow = (value) => (finite(value) && value >= 0 ? value : Date.now());
const durationFor = (mode, settings) =>
  settings[
    mode === "focus"
      ? "focusMinutes"
      : mode === "longBreak"
        ? "longBreakMinutes"
        : "breakMinutes"
  ] * MINUTE;
const roomX = (value, fallback = 50) =>
  clamp(value, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX, fallback);
const roomY = (value, fallback = 76) =>
  clamp(value, ROOM_BOUNDS.minY, ROOM_BOUNDS.maxY, fallback);

const starterDecorations = () => ["couch", "rug"];
export const decorationQuantity = (state, id) => state.owned.decorationCounts?.[id] ?? (state.owned.decorations.includes(id) ? 1 : 0);
export const decorationAvailable = (state, id) => Math.max(0, decorationQuantity(state, id) - state.room.decorations.filter(item => item.item === id).length);
export const ATELIER_PLACEMENTS = {
  couch: { x: 80, y: 76 }, rug: { x: 48, y: 85 }, bookshelf: { x: 94, y: 55 },
  "window-plants": { x: 92, y: 49 }, table: { x: 92, y: 83 }, "side-table": { x: 9, y: 71 },
};
const atelierDecorations = () => starterDecorations().map((item) => ({
  id: `atelier:${item}`, item, ...ATELIER_PLACEMENTS[item],
}));
const sanitizeTasks = (value) => {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  return value.filter(isRecord).slice(0, 12).map((task, index) => {
    let id = validId(task.id) ? task.id : `task:${index}`;
    while (ids.has(id)) id = `${id}:${index}`;
    ids.add(id);
    return { id, text: cleanText(task.text, 200), done: task.done === true };
  }).filter((task) => task.text.trim());
};
const sanitizeTags = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map((tag) => cleanText(tag, 32).trim().replace(/\s+/g, " ")).filter((tag) => {
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
};
const tasksFrom = (value, legacy = "") => Array.isArray(value) ? sanitizeTasks(value)
  : legacy.trim() ? [{ id: "primary", text: legacy, done: false }] : [];
export const animationCount = (animal) => 1 + integer(animal?.upgrades, 0, MAX_UPGRADES, 0);
export const gemBonus = (state) => Math.min(0.5,
  state.animals.filter((animal) => animal.upgrades >= MAX_UPGRADES).length * 0.1);
export function spendableGems(state) {
  const { timer } = state;
  const provisional = timer.mode === "focus" && timer.workMode === "pomodoro" && timer.overtime
    && ["running", "paused"].includes(timer.status)
    ? state.history.find((entry) => entry.id === timer.id) : null;
  return Math.max(0, state.gems - (provisional?.gems ?? provisional?.minutes ?? 0));
}
export const pauseRemainingTime = (timer, now = Date.now()) =>
  timer?.status === "paused" && timer.mode === "focus" && timer.workMode === "pomodoro" && finite(timer.pauseStartedAt)
    ? Math.max(0, PAUSE_LIMIT_MS - Math.max(0, timeNow(now) - timer.pauseStartedAt)) : PAUSE_LIMIT_MS;
const oldestEggId = (eggs) => [...eggs].sort((a, b) => a.createdAt - b.createdAt)[0]?.id ?? null;

function settingsFrom(value, base = DEFAULT_SETTINGS) {
  const input = isRecord(value) ? value : {};
  const next = { ...base, ambient: { ...base.ambient } };
  if (["pomodoro", "countup"].includes(input.workMode)) next.workMode = input.workMode;
  if (["remind", "overtime"].includes(input.endBehavior)) next.endBehavior = input.endBehavior;
  for (const [key, max] of [
    ["focusMinutes", 180],
    ["breakMinutes", 60],
    ["longBreakMinutes", 120],
    ["longBreakEvery", 12],
    ["dailyGoal", 24],
  ]) {
    next[key] = integer(input[key], 1, max, base[key]);
  }
  for (const key of [
    "autoStartBreaks",
    "autoStartFocus",
    "soundEnabled",
    "interactionSfxEnabled",
    "reducedMotion",
  ]) {
    if (typeof input[key] === "boolean") next[key] = input[key];
  }
  // Old saves used Timer sound to mute taps too. Preserve that silence once
  // on load; subsequent settings edits keep the two preferences independent.
  if (base === DEFAULT_SETTINGS && input.interactionSfxEnabled === undefined && input.soundEnabled === false)
    next.interactionSfxEnabled = false;
  next.interactionSfxVolume = clamp(input.interactionSfxVolume, 0, 1, base.interactionSfxVolume);
  for (const key of ["rain", "fire", "noise"]) {
    next.ambient[key] = clamp(input.ambient?.[key], 0, 1, base.ambient[key]);
  }
  return next;
}

function freshTimer(mode, settings, now, previous) {
  const durationMs = durationFor(mode, settings);
  const serial = Number(previous?.id?.split(":").pop()) || 0;
  return {
    mode,
    status: "idle",
    durationMs,
    remainingMs: durationMs,
    endsAt: null,
    workMode: settings.workMode,
    endBehavior: settings.endBehavior,
    overtime: false,
    elapsedMs: 0,
    startedAt: null,
    task: previous?.task || "",
    tasks: previous?.tasks || [],
    tags: previous?.tags || [],
    pauseCount: 0,
    pauseStartedAt: null,
    rewardForfeited: false,
    eggId: null,
    gemBonus: 0,
    cycle: previous?.cycle || 0,
    id: `session:${now}:${serial + 1}`,
  };
}

function withEvent(state, type, message, now, extra = {}) {
  const serial = Number(state.event?.id?.split(":").pop()) || 0;
  return {
    ...state,
    event: { id: `event:${now}:${serial + 1}`, type, message, ...extra },
  };
}

const fail = (state, message, now) => withEvent(state, "error", message, now);

export function createInitialState(now = Date.now()) {
  const timestamp = timeNow(now);
  const settings = settingsFrom(DEFAULT_SETTINGS);
  return {
    schemaVersion: 1,
    progressionVersion: 2,
    gems: 0,
    animals: [
      {
        id: "starter-cat",
        species: "cat",
        rarity: "everyday",
        name: "Miso",
        accessory: "none",
        x: 80,
        y: 68,
        placed: true,
        upgrades: 0,
      },
    ],
    room: { background: "sunroom", artVersion: 1, decorations: atelierDecorations(), widgets: {}, notepadPosition: null },
    owned: { backgrounds: ["sunroom"], accessories: ["none"], decorations: starterDecorations(), decorationCounts: { couch: 1, rug: 1 } },
    eggs: [],
    selectedEggId: null,
    settings,
    timer: freshTimer("focus", settings, timestamp),
    history: [],
    scratchpad: "",
    pity: 0,
    event: null,
  };
}

export function remainingTime(timer, now = Date.now()) {
  if (!timer) return 0;
  if (isCountingUp(timer) || timer.status === "complete") return 0;
  const remaining =
    timer.status === "running" && finite(timer.endsAt)
      ? timer.endsAt - timeNow(now)
      : timer.remainingMs;
  return clamp(remaining, 0, timer.durationMs || 0, 0);
}

export function isCountingUp(timer) {
  return timer?.mode === "focus" && (timer.workMode === "countup" || timer.overtime === true);
}

export function elapsedTime(timer, now = Date.now()) {
  if (!timer) return 0;
  if (!isCountingUp(timer)) return Math.max(0, timer.durationMs - remainingTime(timer, now));
  const elapsed = timer.elapsedMs + (timer.status === "running" && finite(timer.startedAt)
    ? Math.max(0, timeNow(now) - timer.startedAt) : 0);
  return clamp(elapsed, 0, MAX_TRACKED_MS, 0);
}

export function canTakeBreak(timer) {
  return timer?.mode === "focus" && (timer.status === "complete" || timer.overtime === true);
}

export function formatTime(ms) {
  const seconds = Math.ceil(clamp(ms, 0, Number.MAX_SAFE_INTEGER, 0) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatElapsedTime(ms) {
  const seconds = Math.floor(clamp(ms, 0, Number.MAX_SAFE_INTEGER, 0) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function localDay(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function todayStats(state, now = Date.now()) {
  const timestamp = timeNow(now);
  const today = localDay(timestamp);
  const sessions = state.history.filter(
    (entry) => entry.completedAt <= timestamp && localDay(entry.completedAt) === today,
  );
  const minutes = sessions.reduce((sum, entry) => sum + entry.minutes, 0);
  return {
    sessions: sessions.length,
    minutes,
    gems: sessions.reduce((sum, entry) => sum + (entry.gems ?? entry.minutes), 0),
    goal: state.settings.dailyGoal,
    progress: Math.min(1, sessions.length / state.settings.dailyGoal),
  };
}

// One focus session keeps one history ID, including its optional overtime.
function creditFocus(state, elapsed, completedAt) {
  const minutes = Math.floor(clamp(elapsed, 0, MAX_TRACKED_MS, 0) / MINUTE);
  const existing = state.history.find((entry) => entry.id === state.timer.id);
  const previousMinutes = existing?.minutes || 0;
  const addedMinutes = Math.max(0, minutes - previousMinutes);
  if (!minutes || (!addedMinutes && existing)) return { state, addedMinutes: 0, addedGems: 0, minutes };
  const previousGems = existing?.gems ?? previousMinutes;
  const earnedGems = state.timer.rewardForfeited ? 0
    : Math.floor(minutes * (100 + Math.round((state.timer.gemBonus || 0) * 100)) / 100);
  const addedGems = Math.max(0, earnedGems - previousGems);
  const entry = {
    id: state.timer.id,
    task: state.timer.task.trim(),
    tasks: sanitizeTasks(state.timer.tasks),
    tags: sanitizeTags(state.timer.tags),
    minutes: Math.max(previousMinutes, minutes),
    gems: state.timer.rewardForfeited ? 0 : Math.max(previousGems, earnedGems),
    rewardForfeited: state.timer.rewardForfeited,
    completedAt,
  };
  return {
    state: {
      ...state,
      gems: Math.min(Number.MAX_SAFE_INTEGER, state.gems + addedGems),
      eggs: state.eggs.map((egg) => egg.id === state.timer.eggId
        ? { ...egg, progressMinutes: Math.min(egg.requiredMinutes, egg.progressMinutes + addedMinutes) } : egg),
      history: existing
        ? state.history.map((item) => item.id === entry.id ? entry : item)
        : [...state.history, entry],
      timer: { ...state.timer, cycle: state.timer.cycle + (existing ? 0 : 1) },
    },
    addedMinutes,
    addedGems,
    minutes,
  };
}

function forfeitReward(state, now) {
  if (state.timer.rewardForfeited) return state;
  const credited = state.history.find((entry) => entry.id === state.timer.id);
  const revoked = credited?.gems ?? credited?.minutes ?? 0;
  return withEvent({
    ...state,
    gems: Math.max(0, state.gems - revoked),
    history: state.history.map((entry) => entry.id === state.timer.id
      ? { ...entry, gems: 0, rewardForfeited: true } : entry),
    timer: { ...state.timer, rewardForfeited: true },
  }, "reward-forfeited", "Pause limit exceeded · this Pomodoro's Shilligems are lost", now, { gems: -revoked });
}

function settlePause(state, now) {
  const { timer } = state;
  if (timer.mode !== "focus" || timer.workMode !== "pomodoro" || timer.rewardForfeited) return state;
  return timer.pauseCount > MAX_PAUSES || (timer.status === "paused" && finite(timer.pauseStartedAt)
    && now - timer.pauseStartedAt > PAUSE_LIMIT_MS) ? forfeitReward(state, now) : state;
}

function completeFocus(state, now) {
  const elapsed = elapsedTime(state.timer, now);
  const credited = creditFocus(state, elapsed, now);
  return withEvent(
    {
      ...credited.state,
      timer: {
        ...credited.state.timer,
        status: "complete",
        elapsedMs: elapsed,
        remainingMs: 0,
        startedAt: null,
        endsAt: null,
      },
    },
    state.timer.overtime ? "focus-finished" : "focus-complete",
    credited.minutes
      ? state.timer.rewardForfeited ? "Focus complete · Shilligems forfeited after pause limit"
        : `Focus complete · +${credited.addedGems} Shilligem${credited.addedGems === 1 ? "" : "s"}`
      : "Session ended · under 1 min",
    now,
    { gems: credited.addedGems, minutes: credited.minutes },
  );
}

function settleTimer(state, now, allowAutoStart = true) {
  state = settlePause(state, now);
  const { timer, settings } = state;
  if (timer.status !== "running") return state;
  if (isCountingUp(timer)) {
    if (elapsedTime(timer, now) < MAX_TRACKED_MS) return state;
    const deadline = timer.startedAt + Math.max(0, MAX_TRACKED_MS - timer.elapsedMs);
    return completeFocus(state, Math.min(now, deadline));
  }
  if (remainingTime(timer, now) > 0) return state;
  if (timer.mode !== "focus") {
    const next = freshTimer("focus", settings, now, timer);
    if (allowAutoStart && settings.autoStartFocus) {
      next.status = "running";
      next.eggId = state.selectedEggId;
      next.gemBonus = gemBonus(state);
      if (isCountingUp(next)) next.startedAt = now;
      else next.endsAt = now + next.durationMs;
    }
    return withEvent({ ...state, timer: next }, "break-complete", "Break complete", now);
  }
  const completedAt = timer.endsAt || now;
  const credited = creditFocus(state, timer.durationMs, completedAt);
  const overtime = timer.endBehavior === "overtime";
  const next = {
    ...credited.state.timer,
    status: overtime ? "running" : "complete",
    remainingMs: 0,
    endsAt: null,
    elapsedMs: timer.durationMs,
    startedAt: overtime ? completedAt : null,
    overtime,
  };
  const result = withEvent(
    { ...credited.state, timer: next },
    "focus-complete",
    timer.rewardForfeited ? "Focus complete · Shilligems forfeited after pause limit"
      : `Focus complete · +${credited.addedGems} Shilligem${credited.addedGems === 1 ? "" : "s"}`,
    now,
    { gems: credited.addedGems, minutes: credited.minutes },
  );
  // A delayed tick/reload may cross the cap, but never creates another work session.
  return overtime && elapsedTime(next, now) >= MAX_TRACKED_MS
    ? settleTimer(result, now, false) : result;
}

export function normalizeState(saved, now = Date.now()) {
  const timestamp = timeNow(now);
  const initial = createInitialState(timestamp);
  if (!isRecord(saved) || saved.schemaVersion !== 1) return initial;
  const settings = settingsFrom(saved.settings);
  const ownedInput = isRecord(saved.owned) ? saved.owned : {};
  const owned = {};
  for (const [category, catalog, required] of [
    ["backgrounds", BACKGROUNDS, ["sunroom"]],
    ["accessories", ACCESSORIES, ["none"]],
    ["decorations", DECORATIONS, starterDecorations()],
  ]) {
    owned[category] = [
      ...new Set([
        ...required,
        ...(Array.isArray(ownedInput[category])
          ? ownedInput[category].filter((id) => has(catalog, id))
          : []),
      ]),
    ];
  }
  const animalIds = new Set();
  const animals = (Array.isArray(saved.animals) ? saved.animals : [])
    .filter((animal) => {
      if (
        !isRecord(animal) ||
        !validId(animal.id) ||
        animalIds.has(animal.id) ||
        !has(ANIMALS, animal.species)
      )
        return false;
      animalIds.add(animal.id);
      return true;
    })
    .map((animal) => ({
      id: animal.id,
      species: animal.species,
      rarity: RARITIES.includes(animal.rarity) ? animal.rarity : "everyday",
      name: cleanText(
        animal.name,
        40,
        ANIMALS.find((item) => item.id === animal.species).name,
      ),
      accessory: owned.accessories.includes(animal.accessory)
        ? animal.accessory
        : "none",
      x: roomX(animal.x),
      y: roomY(animal.y),
      placed: animal.placed !== false,
      upgrades: integer(animal.upgrades, 0, MAX_UPGRADES, 0),
    }));
  const residents = [];
  for (const animal of animals) {
    const previous = residents.find((item) => item.species === animal.species && item.rarity === animal.rarity);
    if (previous) previous.upgrades = Math.min(MAX_UPGRADES, previous.upgrades + animal.upgrades + 1);
    else residents.push(animal);
  }
  const roomInput = isRecord(saved.room) ? saved.room : {};
  const decorationIds = new Set();
  const decorations = (
    Array.isArray(roomInput.decorations) ? roomInput.decorations : []
  )
    .filter((item) => {
      if (
        !isRecord(item) ||
        !validId(item.id) ||
        decorationIds.has(item.id) ||
        !owned.decorations.includes(item.item)
      )
        return false;
      decorationIds.add(item.id);
      return true;
    })
    .map((item) => ({
      id: item.id,
      item: item.item,
      x: roomX(item.x),
      y: roomY(item.y),
    }));
  // Older rooms allowed unlimited copies. Keep those copies and their positions
  // as owned stock when upgrading to quantities.
  owned.decorationCounts = Object.fromEntries(owned.decorations.map(id => [id,
    Math.max(1, integer(ownedInput.decorationCounts?.[id], 1, 999, 1), decorations.filter(item => item.item === id).length),
  ]));
  const eggIds = new Set();
  const eggs = (Array.isArray(saved.eggs) ? saved.eggs : [])
    .filter((egg) => {
      if (
        !isRecord(egg) ||
        !validId(egg.id) ||
        eggIds.has(egg.id) ||
        !RARITIES.includes(egg.rarity)
      )
        return false;
      eggIds.add(egg.id);
      return true;
    })
    .map((egg, index) => ({
      id: egg.id,
      rarity: egg.rarity,
      requiredMinutes: EGG_MINUTES[egg.rarity],
      progressMinutes: integer(egg.progressMinutes, 0, EGG_MINUTES[egg.rarity],
        saved.progressionVersion !== 2 ? EGG_MINUTES[egg.rarity] : 0),
      createdAt: finite(egg.createdAt) && egg.createdAt >= 0 ? egg.createdAt : index,
    }));
  const historyIds = new Set();
  const history = (Array.isArray(saved.history) ? saved.history : [])
    .filter((entry) => {
      if (
        !isRecord(entry) ||
        !validId(entry.id) ||
        historyIds.has(entry.id) ||
        !finite(entry.completedAt) ||
        entry.completedAt < 0 ||
        !finite(entry.minutes) ||
        entry.minutes <= 0
      )
        return false;
      historyIds.add(entry.id);
      return true;
    })
    .map((entry) => ({
      id: entry.id,
      task: cleanText(entry.task, 200),
      tasks: tasksFrom(entry.tasks, cleanText(entry.task, 200)),
      tags: sanitizeTags(entry.tags),
      minutes: integer(entry.minutes, 1, MAX_TRACKED_MS / MINUTE, 25),
      gems: entry.rewardForfeited === true ? 0 : integer(entry.gems, 0, Number.MAX_SAFE_INTEGER,
        integer(entry.minutes, 1, MAX_TRACKED_MS / MINUTE, 25)),
      rewardForfeited: entry.rewardForfeited === true,
      completedAt: entry.completedAt,
    }));
  const timerInput = isRecord(saved.timer) ? saved.timer : {};
  const mode = MODES.includes(timerInput.mode) ? timerInput.mode : "focus";
  const timer = freshTimer(mode, settings, timestamp);
  timer.workMode = ["pomodoro", "countup"].includes(timerInput.workMode)
    ? timerInput.workMode : settings.workMode;
  timer.endBehavior = ["remind", "overtime"].includes(timerInput.endBehavior)
    ? timerInput.endBehavior : settings.endBehavior;
  timer.overtime = mode === "focus" && timer.workMode === "pomodoro" &&
    timerInput.overtime === true && history.some((entry) => entry.id === timerInput.id);
  timer.durationMs =
    integer(
      timerInput.durationMs / MINUTE,
      1,
      MAX_MINUTES[mode],
      timer.durationMs / MINUTE,
    ) * MINUTE;
  timer.remainingMs = clamp(
    timerInput.remainingMs,
    0,
    timer.durationMs,
    timer.durationMs,
  );
  timer.task = cleanText(timerInput.task, 200);
  timer.tasks = tasksFrom(timerInput.tasks, timer.task);
  timer.tags = sanitizeTags(timerInput.tags);
  timer.pauseCount = integer(timerInput.pauseCount, 0, Number.MAX_SAFE_INTEGER, 0);
  timer.pauseStartedAt = finite(timerInput.pauseStartedAt) && timerInput.pauseStartedAt >= 0
    ? Math.min(timestamp, timerInput.pauseStartedAt) : null;
  timer.rewardForfeited = timerInput.rewardForfeited === true
    || history.some((entry) => entry.id === timerInput.id && entry.rewardForfeited);
  timer.eggId = eggs.some((egg) => egg.id === timerInput.eggId) ? timerInput.eggId
    : saved.progressionVersion !== 2 ? oldestEggId(eggs) : null;
  timer.gemBonus = clamp(timerInput.gemBonus, 0, 0.5, 0);
  timer.cycle = integer(timerInput.cycle, 0, Number.MAX_SAFE_INTEGER, 0);
  timer.id = validId(timerInput.id) ? timerInput.id : timer.id;
  timer.status = ["idle", "paused", "running", "complete"].includes(timerInput.status)
    ? timerInput.status
    : "idle";
  timer.elapsedMs = clamp(timerInput.elapsedMs, timer.overtime ? timer.durationMs : 0, MAX_TRACKED_MS, timer.overtime ? timer.durationMs : 0);
  if (isCountingUp(timer) && timer.status === "running") {
    if (finite(timerInput.startedAt) && timerInput.startedAt >= 0) {
      timer.startedAt = Math.min(timerInput.startedAt, timestamp);
    } else {
      timer.status = "paused";
    }
  } else if (
    timer.status === "running" &&
    finite(timerInput.endsAt) &&
    timerInput.endsAt >= 0
  ) {
    // A corrupted deadline must not extend a session beyond its configured length.
    timer.endsAt = Math.min(timerInput.endsAt, timestamp + timer.durationMs);
  } else if (timer.status === "running") {
    timer.status = "paused";
  }
  if (timer.status === "complete") timer.remainingMs = 0;
  if (timer.status === "idle") {
    timer.remainingMs = timer.durationMs;
    timer.elapsedMs = 0;
    timer.overtime = false;
    timer.pauseCount = 0;
    timer.pauseStartedAt = null;
    timer.rewardForfeited = false;
    timer.eggId = null;
  }
  if (timer.status === "paused" && timer.mode === "focus" && timer.workMode === "pomodoro"
    && timer.pauseStartedAt === null) timer.pauseStartedAt = timestamp;
  // Give only the untouched starter room the new arrangement once. Keep custom
  // layouts, including a deliberately emptied room, after this visual migration.
  const furnishStarter = roomInput.artVersion !== 1 && decorations.length === 0
    && residents.length === 1 && residents[0].id === "starter-cat"
    && residents[0].x === 28 && residents[0].y === 76;
  let result = {
    schemaVersion: 1,
    progressionVersion: 2,
    gems: integer(saved.gems, 0, Number.MAX_SAFE_INTEGER, 0),
    animals: furnishStarter ? residents.map((animal) => ({ ...animal, x: 80, y: 68 })) : residents.length ? residents : initial.animals,
    room: {
      background: owned.backgrounds.includes(roomInput.background)
        ? roomInput.background
        : "sunroom",
      artVersion: 1,
      decorations: furnishStarter ? atelierDecorations() : decorations,
      widgets: Object.fromEntries(["timer", "goal"].filter(id => isRecord(roomInput.widgets?.[id])).map(id => [id, {
        x: clamp(roomInput.widgets[id].x, 0, 100, 30), y: clamp(roomInput.widgets[id].y, 0, 100, 20),
      }])),
      notepadPosition: isRecord(roomInput.notepadPosition)
        ? { x: clamp(roomInput.notepadPosition.x, 0, 1, 0.8), y: clamp(roomInput.notepadPosition.y, 0, 1, 0.5) }
        : null,
    },
    owned,
    eggs,
    selectedEggId: saved.selectedEggId === null ? null
      : eggs.some((egg) => egg.id === saved.selectedEggId) ? saved.selectedEggId : oldestEggId(eggs),
    settings,
    timer,
    history,
    scratchpad: cleanText(saved.scratchpad, 10_000),
    pity: integer(saved.pity, 0, 4, 0),
    event: null,
  };
  return settleTimer(result, timestamp, false);
}

function randomRoll(value) {
  return finite(value) ? clamp(value, 0, 1, 0) : Math.random();
}

function uniqueId(prefix, now, collection) {
  let serial = collection.length + 1;
  const ids = new Set(collection.map((item) => item.id));
  while (ids.has(`${prefix}:${now}:${serial}`)) serial += 1;
  return `${prefix}:${now}:${serial}`;
}

export function gameReducer(state, action) {
  if (!isRecord(action)) return state;
  const now = timeNow(action.now);
  state = settlePause(state, now);
  switch (action.type) {
    case "START": {
      if (["running", "complete"].includes(state.timer.status)) return state;
      state = { ...state, timer: { ...state.timer,
        eggId: state.timer.status === "idle" ? state.selectedEggId : state.timer.eggId,
        gemBonus: state.timer.status === "idle" ? gemBonus(state) : state.timer.gemBonus,
        pauseStartedAt: null,
      } };
      if (isCountingUp(state.timer)) {
        return {
          ...state,
          timer: { ...state.timer, status: "running", startedAt: now, endsAt: null },
        };
      }
      const remainingMs = state.timer.remainingMs || state.timer.durationMs;
      return {
        ...state,
        timer: {
          ...state.timer,
          status: "running",
          remainingMs,
          endsAt: now + remainingMs,
        },
      };
    }
    case "PAUSE": {
      if (state.timer.status !== "running") return state;
      // An explicit pause at the break deadline must never start the next work session.
      let settled = settleTimer(state, now, false);
      if (settled.timer.status !== "running" || settled.timer.mode !== state.timer.mode) return settled;
      const limited = settled.timer.mode === "focus" && settled.timer.workMode === "pomodoro";
      settled = { ...settled, timer: { ...settled.timer,
        pauseCount: settled.timer.pauseCount + (limited ? 1 : 0),
        pauseStartedAt: limited ? now : null,
      } };
      settled = settlePause(settled, now);
      if (isCountingUp(settled.timer)) {
        return {
          ...settled,
          timer: { ...settled.timer, status: "paused", elapsedMs: elapsedTime(settled.timer, now), startedAt: null },
        };
      }
      const remainingMs = remainingTime(settled.timer, now);
      return {
        ...settled,
        timer: { ...settled.timer, status: "paused", remainingMs, endsAt: null },
      };
    }
    case "RESET": {
      const settled = settleTimer(state, now);
      const updated = settled.timer.overtime && settled.timer.status !== "complete"
        ? completeFocus(settled, now) : settled;
      return {
        ...updated,
        timer: freshTimer(updated.timer.mode, updated.settings, now, updated.timer),
      };
    }
    case "SKIP":
      return gameReducer(state, { type: "SET_MODE", mode: "focus", now });
    case "TICK":
      return settleTimer(state, now);
    case "FINISH_FOCUS": {
      const settled = settleTimer(state, now);
      if (settled.timer.mode !== "focus" || settled.timer.status === "complete") return settled;
      if (!isCountingUp(settled.timer) || settled.timer.status === "idle") return settled;
      return completeFocus(settled, now);
    }
    case "START_BREAK": {
      const settled = settleTimer(state, now);
      if (!canTakeBreak(settled.timer)) return settled;
      const updated = settled.timer.status === "complete" ? settled : completeFocus(settled, now);
      const mode = ["break", "longBreak"].includes(action.mode) ? action.mode
        : updated.timer.cycle > 0 && updated.timer.cycle % updated.settings.longBreakEvery === 0 ? "longBreak" : "break";
      const next = freshTimer(mode, updated.settings, now, updated.timer);
      next.status = "running";
      next.endsAt = now + next.durationMs;
      return { ...updated, timer: next };
    }
    case "SET_MODE": {
      if (!MODES.includes(action.mode)) return state;
      const settled = settleTimer(state, now);
      if (action.mode !== "focus" && settled.timer.mode === "focus" && !canTakeBreak(settled.timer)) return settled;
      const updated = settled.timer.overtime && settled.timer.status !== "complete"
        ? completeFocus(settled, now) : settled;
      return { ...updated, timer: freshTimer(action.mode, updated.settings, now, updated.timer) };
    }
    case "SET_TASK": {
      const text = cleanText(action.task, 200);
      const tasks = [...(state.timer.tasks || [])];
      if (tasks.length) tasks[0] = { ...tasks[0], text };
      else if (text.trim()) tasks.push({ id: "primary", text, done: false });
      return gameReducer(state, { type: "SET_TASKS", tasks, now });
    }
    case "SET_TASKS": {
      const tasks = sanitizeTasks(action.tasks);
      const task = tasks[0]?.text || "";
      return { ...state, timer: { ...state.timer, tasks, task },
        history: state.history.map((entry) => entry.id === state.timer.id
          ? { ...entry, tasks, task: task.trim() } : entry) };
    }
    case "SET_TAGS": {
      const tags = sanitizeTags(action.tags);
      return { ...state, timer: { ...state.timer, tags },
        history: state.history.map((entry) => entry.id === state.timer.id ? { ...entry, tags } : entry) };
    }
    case "SET_SETTINGS": {
      const settings = settingsFrom(action.settings, state.settings);
      return {
        ...state,
        settings,
        timer:
          state.timer.status === "idle"
            ? freshTimer(state.timer.mode, settings, now, state.timer)
            : state.timer,
      };
    }
    case "SET_PRESET": {
      const preset = PRESETS.find((item) => item.id === action.id);
      return preset
        ? gameReducer(state, {
            type: "SET_SETTINGS",
            settings: preset.settings,
            now,
          })
        : state;
    }
    case "SET_SCRATCHPAD":
      return { ...state, scratchpad: cleanText(action.text, 10_000) };
    case "MOVE_WIDGET":
      if (!["timer", "goal"].includes(action.id)) return state;
      return { ...state, room: { ...state.room, widgets: { ...state.room.widgets, [action.id]: {
        x: clamp(action.x, 0, 100, state.room.widgets?.[action.id]?.x ?? 30),
        y: clamp(action.y, 0, 100, state.room.widgets?.[action.id]?.y ?? 20),
      } } } };
    case "MOVE_NOTEPAD":
      return { ...state, room: { ...state.room, notepadPosition: {
        x: clamp(action.x, 0, 1, state.room.notepadPosition?.x ?? 0.8),
        y: clamp(action.y, 0, 1, state.room.notepadPosition?.y ?? 0.5),
      } } };
    case "SELECT_EGG":
      return action.id === null || state.eggs.some((egg) => egg.id === action.id)
        ? { ...state, selectedEggId: action.id } : state;
    case "BUY_EGG": {
      if (!["basic", "mystery"].includes(action.kind)) return state;
      const price = action.kind === "basic" ? 25 : 60;
      const available = spendableGems(state);
      if (available < price)
        return fail(
          state,
          `You need ${price - available} more available Shilligems for this egg.`,
          now,
        );
      let rarity = "basic";
      let pity = state.pity;
      if (action.kind === "mystery") {
        const roll = randomRoll(action.roll);
        rarity = roll < 0.6 ? "everyday" : roll < 0.9 ? "rare" : "dreamy";
        if (pity >= 4 && rarity === "everyday") rarity = "rare";
        pity = rarity === "everyday" ? pity + 1 : 0;
      }
      const egg = { id: uniqueId("egg", now, state.eggs), rarity,
        requiredMinutes: EGG_MINUTES[rarity], progressMinutes: 0, createdAt: now };
      return withEvent(
        {
          ...state,
          gems: state.gems - price,
          pity,
          eggs: [...state.eggs, egg],
          selectedEggId: state.eggs.length ? state.selectedEggId : egg.id,
        },
        "egg-bought",
        `Egg tucked away · ${egg.requiredMinutes} focus minutes to hatch`,
        now,
        { egg },
      );
    }
    case "HATCH_EGG": {
      const egg = state.eggs.find((item) => item.id === action.id);
      if (!egg) return state;
      if (egg.progressMinutes < egg.requiredMinutes)
        return fail(state, `${egg.requiredMinutes - egg.progressMinutes} more focus minutes until this egg can hatch.`, now);
      const species =
        ANIMALS[
          Math.min(
            ANIMALS.length - 1,
            Math.floor(randomRoll(action.roll) * ANIMALS.length),
          )
        ];
      const existing = state.animals.find((animal) => animal.species === species.id && animal.rarity === egg.rarity);
      const capped = existing?.upgrades >= MAX_UPGRADES;
      const animal = existing ? { ...existing, upgrades: Math.min(MAX_UPGRADES, (existing.upgrades || 0) + 1) } : {
        id: uniqueId("animal", now, state.animals),
        species: species.id,
        rarity: egg.rarity,
        name: species.name,
        accessory: "none",
        x: 25 + ((state.animals.length * 17) % 55),
        y: 65 + (state.animals.length % 3) * 8,
        placed: true,
        upgrades: 0,
      };
      const eggs = state.eggs.filter((item) => item.id !== egg.id);
      return withEvent(
        {
          ...state,
          gems: Math.min(Number.MAX_SAFE_INTEGER, state.gems + (capped ? 5 : 0)),
          animals: existing ? state.animals.map((item) => item.id === existing.id ? animal : item) : [...state.animals, animal],
          eggs,
          selectedEggId: state.selectedEggId === egg.id ? oldestEggId(eggs) : state.selectedEggId,
        },
        "animal-hatched",
        capped ? `${animal.name} is already maxed · +5 Shilligems`
          : existing ? `${animal.name} grew closer · animation ${animationCount(animal)} unlocked!`
            : `Welcome, little ${species.name.toLowerCase()}!`,
        now,
        { animal, duplicate: Boolean(existing), upgrades: animal.upgrades, capped, gems: capped ? 5 : 0 },
      );
    }
    case "BUY_ITEM": {
      const catalog = {
        backgrounds: BACKGROUNDS,
        accessories: ACCESSORIES,
        decorations: DECORATIONS,
      }[action.category];
      if (!Array.isArray(catalog)) return state;
      const item = catalog.find((entry) => entry.id === action.id);
      if (!item || (action.category !== "decorations" && state.owned[action.category].includes(item.id))) return state;
      if (action.category === "decorations" && decorationQuantity(state, item.id) >= 999) return state;
      const available = spendableGems(state);
      if (available < item.price)
        return fail(
          state,
          `You need ${item.price - available} more available Shilligems for ${item.name.toLowerCase()}.`,
          now,
        );
      return withEvent(
        {
          ...state,
          gems: state.gems - item.price,
          owned: {
            ...state.owned,
            [action.category]: [...new Set([...state.owned[action.category], item.id])],
            ...(action.category === "decorations" ? { decorationCounts: { ...state.owned.decorationCounts, [item.id]: decorationQuantity(state, item.id) + 1 } } : {}),
          },
        },
        "item-bought",
        `${item.name} is yours!`,
        now,
        { category: action.category, item },
      );
    }
    case "SET_BACKGROUND":
      return state.owned.backgrounds.includes(action.id)
        ? { ...state, room: { ...state.room, background: action.id } }
        : state;
    case "SET_ACCESSORY":
      return state.owned.accessories.includes(action.id)
        ? {
            ...state,
            animals: state.animals.map((animal) =>
              animal.id === action.animalId
                ? { ...animal, accessory: action.id }
                : animal,
            ),
          }
        : state;
    case "PLACE_ANIMAL":
      return typeof action.placed === "boolean"
        ? {
            ...state,
            animals: state.animals.map((animal) =>
              animal.id === action.id
                ? { ...animal, placed: action.placed }
                : animal,
            ),
          }
        : state;
    case "MOVE_ANIMAL":
      return {
        ...state,
        animals: state.animals.map((animal) =>
          animal.id === action.id
            ? {
                ...animal,
                x: roomX(action.x, animal.x),
                y: roomY(action.y, animal.y),
              }
            : animal,
        ),
      };
    case "PLACE_DECORATION": {
      if (decorationAvailable(state, action.item) < 1) return state;
      const decoration = {
        id: uniqueId("decoration", now, state.room.decorations),
        item: action.item,
        x: roomX(action.x),
        y: roomY(action.y),
      };
      return {
        ...state,
        room: {
          ...state.room,
          decorations: [...state.room.decorations, decoration],
        },
      };
    }
    case "MOVE_DECORATION":
      return {
        ...state,
        room: {
          ...state.room,
          decorations: state.room.decorations.map((item) =>
            item.id === action.id
              ? {
                  ...item,
                  x: roomX(action.x, item.x),
                  y: roomY(action.y, item.y),
                }
              : item,
          ),
        },
      };
    case "REMOVE_DECORATION":
      return {
        ...state,
        room: {
          ...state.room,
          decorations: state.room.decorations.filter(
            (item) => item.id !== action.id,
          ),
        },
      };
    default:
      return state;
  }
}
