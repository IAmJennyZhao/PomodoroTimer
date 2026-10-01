const MINUTE = 60_000;
const RARITIES = ['everyday', 'rare', 'dreamy'];
const MODES = ['focus', 'break', 'longBreak'];
const MAX_MINUTES = { focus: 180, break: 60, longBreak: 120 };
const ROOM_BOUNDS = { minX: 5, maxX: 95, minY: 48, maxY: 85 };

export const ANIMALS = [
  { id: 'cat', name: 'Cat', emoji: '🐈', color: '#e8a06b' },
  { id: 'dog', name: 'Dog', emoji: '🐕', color: '#bc8660' },
  { id: 'squirrel', name: 'Squirrel', emoji: '🐿️', color: '#ba7550' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐇', color: '#decddc' },
  { id: 'fox', name: 'Fox', emoji: '🦊', color: '#db8659' },
  { id: 'deer', name: 'Deer', emoji: '🦌', color: '#bc9975' },
];

export const BACKGROUNDS = [
  { id: 'sunroom', name: 'Sunlit nook', price: 0, description: 'A warm little room for a fresh start.' },
  { id: 'moonroom', name: 'Moonlit den', price: 75, description: 'Soft moonlight for your evening focus.' },
  { id: 'greenhouse', name: 'Garden room', price: 100, description: 'A leafy hideaway full of gentle light.' },
];

export const ACCESSORIES = [
  { id: 'none', name: 'No accessory', price: 0, emoji: '' },
  { id: 'bow', name: 'Little bow', price: 20, emoji: '🎀' },
  { id: 'crown', name: 'Tiny crown', price: 50, emoji: '👑' },
  { id: 'flower', name: 'Daisy', price: 30, emoji: '🌼' },
];

export const DECORATIONS = [
  { id: 'plant', name: 'Leafy friend', price: 20, emoji: '🪴' },
  { id: 'cushion', name: 'Cozy cushion', price: 25, emoji: '🛋️' },
  { id: 'books', name: 'Book stack', price: 30, emoji: '📚' },
];

export const PRESETS = [
  { id: 'quick', name: 'Quick sprint', settings: { focusMinutes: 15, breakMinutes: 3, longBreakMinutes: 10 } },
  { id: 'classic', name: 'Classic', settings: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 } },
  { id: 'deep', name: 'Deep work', settings: { focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 20 } },
];

const DEFAULT_SETTINGS = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  dailyGoal: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  reducedMotion: false,
  ambient: { rain: 0.3, fire: 0, noise: 0 },
};

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, min, max, fallback) => finite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const integer = (value, min, max, fallback) => Math.round(clamp(value, min, max, fallback));
const cleanText = (value, max, fallback = '') => typeof value === 'string' ? value.slice(0, max) : fallback;
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
const has = (catalog, id) => catalog.some(item => item.id === id);
const timeNow = value => finite(value) && value >= 0 ? value : Date.now();
const durationFor = (mode, settings) => settings[mode === 'focus' ? 'focusMinutes' : mode === 'longBreak' ? 'longBreakMinutes' : 'breakMinutes'] * MINUTE;
const roomX = (value, fallback = 50) => clamp(value, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX, fallback);
const roomY = (value, fallback = 76) => clamp(value, ROOM_BOUNDS.minY, ROOM_BOUNDS.maxY, fallback);

function settingsFrom(value, base = DEFAULT_SETTINGS) {
  const input = isRecord(value) ? value : {};
  const next = { ...base, ambient: { ...base.ambient } };
  for (const [key, max] of [['focusMinutes', 180], ['breakMinutes', 60], ['longBreakMinutes', 120], ['longBreakEvery', 12], ['dailyGoal', 24]]) {
    next[key] = integer(input[key], 1, max, base[key]);
  }
  for (const key of ['autoStartBreaks', 'autoStartFocus', 'soundEnabled', 'reducedMotion']) {
    if (typeof input[key] === 'boolean') next[key] = input[key];
  }
  for (const key of ['rain', 'fire', 'noise']) {
    next.ambient[key] = clamp(input.ambient?.[key], 0, 1, base.ambient[key]);
  }
  return next;
}

function freshTimer(mode, settings, now, previous) {
  const durationMs = durationFor(mode, settings);
  const serial = Number(previous?.id?.split(':').pop()) || 0;
  return {
    mode, status: 'idle', durationMs, remainingMs: durationMs, endsAt: null,
    task: previous?.task || '', cycle: previous?.cycle || 0,
    id: `session:${now}:${serial + 1}`,
  };
}

function withEvent(state, type, message, now, extra = {}) {
  const serial = Number(state.event?.id?.split(':').pop()) || 0;
  return { ...state, event: { id: `event:${now}:${serial + 1}`, type, message, ...extra } };
}

const fail = (state, message, now) => withEvent(state, 'error', message, now);

export function createInitialState(now = Date.now()) {
  const timestamp = timeNow(now);
  const settings = settingsFrom(DEFAULT_SETTINGS);
  return {
    schemaVersion: 1,
    gems: 0,
    animals: [{ id: 'starter-cat', species: 'cat', rarity: 'everyday', name: 'Miso', accessory: 'none', x: 28, y: 76, placed: true }],
    room: { background: 'sunroom', decorations: [] },
    owned: { backgrounds: ['sunroom'], accessories: ['none'], decorations: [] },
    eggs: [],
    settings,
    timer: freshTimer('focus', settings, timestamp),
    history: [],
    scratchpad: '',
    pity: 0,
    event: null,
  };
}

export function remainingTime(timer, now = Date.now()) {
  if (!timer) return 0;
  const remaining = timer.status === 'running' && finite(timer.endsAt)
    ? timer.endsAt - timeNow(now)
    : timer.remainingMs;
  return clamp(remaining, 0, timer.durationMs || 0, 0);
}

export function formatTime(ms) {
  const seconds = Math.ceil(clamp(ms, 0, Number.MAX_SAFE_INTEGER, 0) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function localDay(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function todayStats(state, now = Date.now()) {
  const today = localDay(timeNow(now));
  const sessions = state.history.filter(entry => localDay(entry.completedAt) === today);
  const minutes = sessions.reduce((sum, entry) => sum + entry.minutes, 0);
  return {
    sessions: sessions.length, minutes, gems: minutes,
    goal: state.settings.dailyGoal,
    progress: Math.min(1, sessions.length / state.settings.dailyGoal),
  };
}

function finishTimer(state, now, allowAutoStart = true) {
  const { timer, settings } = state;
  const focus = timer.mode === 'focus';
  const alreadyLogged = focus && state.history.some(entry => entry.id === timer.id);
  const minutes = Math.round(timer.durationMs / MINUTE);
  const cycle = focus && !alreadyLogged ? timer.cycle + 1 : timer.cycle;
  const mode = focus ? (cycle > 0 && cycle % settings.longBreakEvery === 0 ? 'longBreak' : 'break') : 'focus';
  const next = freshTimer(mode, settings, now, { ...timer, cycle });
  const auto = allowAutoStart && (focus ? settings.autoStartBreaks : settings.autoStartFocus);
  if (auto) {
    next.status = 'running';
    next.endsAt = now + next.durationMs;
  }
  const updated = {
    ...state,
    gems: Math.min(Number.MAX_SAFE_INTEGER, state.gems + (focus && !alreadyLogged ? minutes : 0)),
    history: focus && !alreadyLogged ? [...state.history, {
      id: timer.id, task: timer.task.trim(), minutes, completedAt: timer.endsAt || now,
    }] : state.history,
    timer: next,
  };
  return withEvent(updated, focus ? 'focus-complete' : 'break-complete',
    focus ? `Lovely work. You earned ${alreadyLogged ? 0 : minutes} Shilligems!` : 'Feeling refreshed? Your next focus session is ready.',
    now, focus ? { gems: alreadyLogged ? 0 : minutes, minutes } : {});
}

export function normalizeState(saved, now = Date.now()) {
  const timestamp = timeNow(now);
  const initial = createInitialState(timestamp);
  if (!isRecord(saved) || saved.schemaVersion !== 1) return initial;
  const settings = settingsFrom(saved.settings);
  const ownedInput = isRecord(saved.owned) ? saved.owned : {};
  const owned = {};
  for (const [category, catalog, required] of [
    ['backgrounds', BACKGROUNDS, ['sunroom']], ['accessories', ACCESSORIES, ['none']], ['decorations', DECORATIONS, []],
  ]) {
    owned[category] = [...new Set([...required, ...(Array.isArray(ownedInput[category]) ? ownedInput[category].filter(id => has(catalog, id)) : [])])];
  }
  const animalIds = new Set();
  const animals = (Array.isArray(saved.animals) ? saved.animals : []).filter(animal => {
    if (!isRecord(animal) || !validId(animal.id) || animalIds.has(animal.id) || !has(ANIMALS, animal.species)) return false;
    animalIds.add(animal.id);
    return true;
  }).map(animal => ({
    id: animal.id, species: animal.species,
    rarity: RARITIES.includes(animal.rarity) ? animal.rarity : 'everyday',
    name: cleanText(animal.name, 40, ANIMALS.find(item => item.id === animal.species).name),
    accessory: owned.accessories.includes(animal.accessory) ? animal.accessory : 'none',
    x: roomX(animal.x), y: roomY(animal.y), placed: animal.placed !== false,
  }));
  const roomInput = isRecord(saved.room) ? saved.room : {};
  const decorationIds = new Set();
  const decorations = (Array.isArray(roomInput.decorations) ? roomInput.decorations : []).filter(item => {
    if (!isRecord(item) || !validId(item.id) || decorationIds.has(item.id) || !owned.decorations.includes(item.item)) return false;
    decorationIds.add(item.id);
    return true;
  }).map(item => ({ id: item.id, item: item.item, x: roomX(item.x), y: roomY(item.y) }));
  const eggIds = new Set();
  const eggs = (Array.isArray(saved.eggs) ? saved.eggs : []).filter(egg => {
    if (!isRecord(egg) || !validId(egg.id) || eggIds.has(egg.id) || !RARITIES.includes(egg.rarity)) return false;
    eggIds.add(egg.id);
    return true;
  }).map(({ id, rarity }) => ({ id, rarity }));
  const historyIds = new Set();
  const history = (Array.isArray(saved.history) ? saved.history : []).filter(entry => {
    if (!isRecord(entry) || !validId(entry.id) || historyIds.has(entry.id) || !finite(entry.completedAt) || entry.completedAt < 0 || !finite(entry.minutes) || entry.minutes <= 0) return false;
    historyIds.add(entry.id);
    return true;
  }).map(entry => ({ id: entry.id, task: cleanText(entry.task, 200), minutes: integer(entry.minutes, 1, 180, 25), completedAt: entry.completedAt }));
  const timerInput = isRecord(saved.timer) ? saved.timer : {};
  const mode = MODES.includes(timerInput.mode) ? timerInput.mode : 'focus';
  const timer = freshTimer(mode, settings, timestamp);
  timer.durationMs = integer(timerInput.durationMs / MINUTE, 1, MAX_MINUTES[mode], timer.durationMs / MINUTE) * MINUTE;
  timer.remainingMs = clamp(timerInput.remainingMs, 0, timer.durationMs, timer.durationMs);
  timer.task = cleanText(timerInput.task, 200);
  timer.cycle = integer(timerInput.cycle, 0, Number.MAX_SAFE_INTEGER, 0);
  timer.id = validId(timerInput.id) ? timerInput.id : timer.id;
  timer.status = ['idle', 'paused', 'running'].includes(timerInput.status) ? timerInput.status : 'idle';
  if (timer.status === 'running' && finite(timerInput.endsAt) && timerInput.endsAt >= 0) {
    // A corrupted deadline must not extend a session beyond its configured length.
    timer.endsAt = Math.min(timerInput.endsAt, timestamp + timer.durationMs);
  } else if (timer.status === 'running') {
    timer.status = 'paused';
  }
  if (timer.status === 'idle') timer.remainingMs = timer.durationMs;
  let result = {
    schemaVersion: 1,
    gems: integer(saved.gems, 0, Number.MAX_SAFE_INTEGER, 0),
    animals: animals.length ? animals : initial.animals,
    room: { background: owned.backgrounds.includes(roomInput.background) ? roomInput.background : 'sunroom', decorations },
    owned, eggs, settings, timer, history,
    scratchpad: cleanText(saved.scratchpad, 10_000),
    pity: integer(saved.pity, 0, 4, 0),
    event: null,
  };
  if (timer.status === 'running' && remainingTime(timer, timestamp) === 0) result = finishTimer(result, timestamp, false);
  return result;
}

function randomRoll(value) {
  return finite(value) ? clamp(value, 0, 1, 0) : Math.random();
}

function uniqueId(prefix, now, collection) {
  let serial = collection.length + 1;
  while (collection.some(item => item.id === `${prefix}:${now}:${serial}`)) serial += 1;
  return `${prefix}:${now}:${serial}`;
}

export function gameReducer(state, action) {
  if (!isRecord(action)) return state;
  const now = timeNow(action.now);
  switch (action.type) {
    case 'START': {
      if (state.timer.status === 'running') return state;
      const remainingMs = state.timer.remainingMs || state.timer.durationMs;
      return { ...state, timer: { ...state.timer, status: 'running', remainingMs, endsAt: now + remainingMs } };
    }
    case 'PAUSE': {
      if (state.timer.status !== 'running') return state;
      const remainingMs = remainingTime(state.timer, now);
      if (remainingMs === 0) return finishTimer(state, now);
      return { ...state, timer: { ...state.timer, status: 'paused', remainingMs, endsAt: null } };
    }
    case 'RESET':
      return { ...state, timer: freshTimer(state.timer.mode, state.settings, now, state.timer) };
    case 'SKIP':
      return { ...state, timer: freshTimer(state.timer.mode === 'focus' ? 'break' : 'focus', state.settings, now, state.timer) };
    case 'TICK':
      return state.timer.status === 'running' && remainingTime(state.timer, now) === 0 ? finishTimer(state, now) : state;
    case 'SET_MODE':
      return MODES.includes(action.mode) ? { ...state, timer: freshTimer(action.mode, state.settings, now, state.timer) } : state;
    case 'SET_TASK':
      return { ...state, timer: { ...state.timer, task: cleanText(action.task, 200) } };
    case 'SET_SETTINGS': {
      const settings = settingsFrom(action.settings, state.settings);
      return { ...state, settings, timer: state.timer.status === 'idle' ? freshTimer(state.timer.mode, settings, now, state.timer) : state.timer };
    }
    case 'SET_PRESET': {
      const preset = PRESETS.find(item => item.id === action.id);
      return preset ? gameReducer(state, { type: 'SET_SETTINGS', settings: preset.settings, now }) : state;
    }
    case 'SET_SCRATCHPAD':
      return { ...state, scratchpad: cleanText(action.text, 10_000) };
    case 'BUY_EGG': {
      if (!['basic', 'mystery'].includes(action.kind)) return state;
      const price = action.kind === 'basic' ? 25 : 60;
      if (state.gems < price) return fail(state, `You need ${price - state.gems} more Shilligems for this egg.`, now);
      let rarity = 'everyday';
      let pity = state.pity;
      if (action.kind === 'mystery') {
        const roll = randomRoll(action.roll);
        rarity = roll < 0.6 ? 'everyday' : roll < 0.9 ? 'rare' : 'dreamy';
        if (pity >= 4 && rarity === 'everyday') rarity = 'rare';
        pity = rarity === 'everyday' ? pity + 1 : 0;
      }
      const egg = { id: uniqueId('egg', now, state.eggs), rarity };
      return withEvent({ ...state, gems: state.gems - price, pity, eggs: [...state.eggs, egg] }, 'egg-bought', 'A new egg is ready to hatch.', now, { egg });
    }
    case 'HATCH_EGG': {
      const egg = state.eggs.find(item => item.id === action.id);
      if (!egg) return state;
      const species = ANIMALS[Math.min(ANIMALS.length - 1, Math.floor(randomRoll(action.roll) * ANIMALS.length))];
      const animal = {
        id: uniqueId('animal', now, state.animals), species: species.id, rarity: egg.rarity,
        name: species.name, accessory: 'none',
        x: 25 + (state.animals.length * 17) % 55, y: 65 + (state.animals.length % 3) * 8,
        placed: true,
      };
      return withEvent({ ...state, animals: [...state.animals, animal], eggs: state.eggs.filter(item => item.id !== egg.id) }, 'animal-hatched', `Welcome, little ${species.name.toLowerCase()}!`, now, { animal });
    }
    case 'BUY_ITEM': {
      const catalog = { backgrounds: BACKGROUNDS, accessories: ACCESSORIES, decorations: DECORATIONS }[action.category];
      if (!Array.isArray(catalog)) return state;
      const item = catalog.find(entry => entry.id === action.id);
      if (!item || state.owned[action.category].includes(item.id)) return state;
      if (state.gems < item.price) return fail(state, `You need ${item.price - state.gems} more Shilligems for ${item.name.toLowerCase()}.`, now);
      return withEvent({ ...state, gems: state.gems - item.price, owned: { ...state.owned, [action.category]: [...state.owned[action.category], item.id] } }, 'item-bought', `${item.name} is yours!`, now, { category: action.category, item });
    }
    case 'SET_BACKGROUND':
      return state.owned.backgrounds.includes(action.id) ? { ...state, room: { ...state.room, background: action.id } } : state;
    case 'SET_ACCESSORY':
      return state.owned.accessories.includes(action.id) ? { ...state, animals: state.animals.map(animal => animal.id === action.animalId ? { ...animal, accessory: action.id } : animal) } : state;
    case 'PLACE_ANIMAL':
      return typeof action.placed === 'boolean' ? { ...state, animals: state.animals.map(animal => animal.id === action.id ? { ...animal, placed: action.placed } : animal) } : state;
    case 'MOVE_ANIMAL':
      return { ...state, animals: state.animals.map(animal => animal.id === action.id ? { ...animal, x: roomX(action.x, animal.x), y: roomY(action.y, animal.y) } : animal) };
    case 'PLACE_DECORATION': {
      if (!state.owned.decorations.includes(action.item)) return state;
      const decoration = { id: uniqueId('decoration', now, state.room.decorations), item: action.item, x: roomX(action.x), y: roomY(action.y) };
      return { ...state, room: { ...state.room, decorations: [...state.room.decorations, decoration] } };
    }
    case 'MOVE_DECORATION':
      return { ...state, room: { ...state.room, decorations: state.room.decorations.map(item => item.id === action.id ? { ...item, x: roomX(action.x, item.x), y: roomY(action.y, item.y) } : item) } };
    case 'REMOVE_DECORATION':
      return { ...state, room: { ...state.room, decorations: state.room.decorations.filter(item => item.id !== action.id) } };
    default:
      return state;
  }
}
