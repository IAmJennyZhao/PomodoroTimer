import React, { useEffect, useState } from "react";
import {
  ACCESSORIES,
  ANIMALS,
  BACKGROUNDS,
  DECORATIONS,
  PRESETS,
  todayStats,
} from "./game";
import { Icon, Sprite, AnimalArt, Accessory, RangeField } from "./ui";

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const speciesName = (animal) =>
  ANIMALS.find((species) => species.id === animal.species)?.name || "Animal";
const sameDay = (first, second) =>
  new Date(first).toDateString() === new Date(second).toDateString();

function Segments({ label, options, value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.id}
          aria-pressed={value === option.id}
          className={value === option.id ? "selected" : ""}
          onClick={() => onChange(option.id)}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}

function Wallet({ gems }) {
  return (
    <div className="wallet-line">
      <Icon name="gem" />
      <strong>{gems.toLocaleString()}</strong>
      <span>Shilligems</span>
    </div>
  );
}

export function AnimalsPanel({ state, act, selected, setSelected }) {
  const animal =
    state.animals.find((friend) => friend.id === selected) || state.animals[0];
  const discovered = new Set(state.animals.map((friend) => friend.species));
  return (
    <>
      <p className="intro">
        A little company for your next big idea. Every friend has a place here.
      </p>
      <p className="small muted">
        {state.animals.length}{" "}
        {state.animals.length === 1 ? "friend" : "friends"} · {discovered.size}{" "}
        of {ANIMALS.length} species discovered
      </p>
      <div className="collection-grid">
        {state.animals.map((friend, index) => (
          <button
            type="button"
            key={friend.id}
            className={`animal-card ${friend.id === animal?.id ? "selected" : ""}`}
            aria-pressed={friend.id === animal?.id}
            aria-label={`Select ${friend.name}, ${friend.rarity} ${speciesName(friend)}, friend ${index + 1}`}
            onClick={() => setSelected(friend.id)}
          >
            <AnimalArt animal={friend} />
            <strong>{friend.name}</strong>
            <span className={`rarity-label ${friend.rarity}`}>
              {titleCase(friend.rarity)}
            </span>
            <span className="in-room">
              {friend.placed ? "In your room" : "Resting in collection"}
            </span>
          </button>
        ))}
      </div>
      {animal && (
        <section className="detail-card" aria-label={`${animal.name} details`}>
          <h3>
            {animal.name}{" "}
            <span className="small muted">· {speciesName(animal)}</span>
          </h3>
          <label className="toggle-line">
            <span>Keep in my room</span>
            <input
              type="checkbox"
              checked={animal.placed}
              onChange={(event) =>
                act({
                  type: "PLACE_ANIMAL",
                  id: animal.id,
                  placed: event.target.checked,
                })
              }
            />
          </label>
          <label className="field-label">
            Their little accessory
            <select
              value={animal.accessory}
              onChange={(event) =>
                act({
                  type: "SET_ACCESSORY",
                  animalId: animal.id,
                  id: event.target.value,
                })
              }
            >
              {ACCESSORIES.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={!state.owned.accessories.includes(item.id)}
                >
                  {item.name}
                  {!state.owned.accessories.includes(item.id)
                    ? " · unlock in Decorate"
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="small muted">
            Arrange your friends around the room from Decorate. Extra animals
            are extra company, even when they’re the same species.
          </p>
        </section>
      )}
      {discovered.size < ANIMALS.length && (
        <div className="undiscovered">
          <h3>Still waiting to meet you</h3>
          <p className="small muted">
            {ANIMALS.filter((species) => !discovered.has(species.id))
              .map((species) => species.name)
              .join(" · ")}
          </p>
        </div>
      )}
    </>
  );
}

export function ShopPanel({ state, act }) {
  return (
    <>
      <p className="intro">
        A small surprise, earned one focused minute at a time.
      </p>
      <Wallet gems={state.gems} />
      <p className="small muted">
        Every completed focus minute earns 1 Shilligem. Breaks and skipped
        sessions earn none.
      </p>
      <div className="egg-options">
        <section className="egg-card">
          <Sprite kind="object" id="everyday" />
          <h3>A little egg</h3>
          <p>An everyday friend, with a whole lot of heart.</p>
          <button
            type="button"
            className="secondary-button full-width"
            disabled={state.gems < 25}
            onClick={() => act({ type: "BUY_EGG", kind: "basic" })}
          >
            <Icon name="gem" /> Buy basic egg · 25
          </button>
        </section>
        <section className="egg-card">
          <Sprite kind="object" id="dreamy" />
          <h3>A little wonder</h3>
          <p>Roll for an egg with a chance of a special coat.</p>
          <button
            type="button"
            className="secondary-button full-width"
            disabled={state.gems < 60}
            onClick={() => act({ type: "BUY_EGG", kind: "mystery" })}
          >
            <Icon name="sparkle" /> Roll mystery egg · 60
          </button>
        </section>
      </div>
      <p className="odds">
        <strong>Mystery odds:</strong> Everyday 60% · Rare 30% · Dreamy 10%.
        Every egg can hatch any of the {ANIMALS.length} species, with equal
        chances.
      </p>
      <p className="pity-count">
        <Icon name="sparkle" />{" "}
        {state.pity >= 4
          ? "Your next mystery roll is guaranteed rare or dreamy."
          : `A rare-or-better egg is guaranteed within ${5 - state.pity} more mystery rolls.`}
      </p>
      <p className="small muted">
        On a guaranteed roll, the odds are Rare 90% · Dreamy 10%. Finding either
        resets the count; basic eggs don’t change it.
      </p>
      <h3 className="section-heading">
        Your nest{" "}
        <span className="small muted">
          {state.eggs.length} {state.eggs.length === 1 ? "egg" : "eggs"}
        </span>
      </h3>
      {state.eggs.length ? (
        <div className="nest-grid">
          {state.eggs.map((egg, index) => (
            <section className={`nest-egg ${egg.rarity}`} key={egg.id}>
              <Sprite kind="object" id={egg.rarity} />
              <span className={`rarity-label ${egg.rarity}`}>
                {titleCase(egg.rarity)}
              </span>
              <button
                type="button"
                className="small-button"
                aria-label={`Hatch ${egg.rarity} egg ${index + 1}`}
                onClick={() => act({ type: "HATCH_EGG", id: egg.id })}
              >
                Hatch egg
              </button>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="leaf" />
          <p>A cozy nest, ready for its first egg.</p>
          <span className="small muted">
            Finish a focus session to start filling it.
          </span>
        </div>
      )}
    </>
  );
}

export function DecoratePanel({
  state,
  act,
  arranging,
  setArranging,
  selection,
  setSelection,
}) {
  const [category, setCategory] = useState("backgrounds");
  const [friendId, setFriendId] = useState(state.animals[0]?.id || "");
  const friend =
    state.animals.find((animal) => animal.id === friendId) || state.animals[0];
  const catalog = {
    backgrounds: BACKGROUNDS,
    accessories: ACCESSORIES,
    decorations: DECORATIONS,
  }[category];
  const selectedObject =
    selection?.type === "animal"
      ? state.animals.find(
          (animal) => animal.id === selection.id && animal.placed,
        )
      : selection?.type === "decoration"
        ? state.room.decorations.find((item) => item.id === selection.id)
        : null;
  const selectedName =
    selectedObject &&
    (selection.type === "animal"
      ? selectedObject.name
      : DECORATIONS.find((item) => item.id === selectedObject.item)?.name);
  function applyItem(item) {
    if (category === "backgrounds")
      act({ type: "SET_BACKGROUND", id: item.id });
    if (category === "accessories" && friend)
      act({ type: "SET_ACCESSORY", animalId: friend.id, id: item.id });
    if (category === "decorations")
      act({
        type: "PLACE_DECORATION",
        item: item.id,
        x: 35 + Math.random() * 30,
        y: 70 + Math.random() * 12,
      });
  }
  function move(axis, value) {
    if (!selectedObject) return;
    act({
      type: selection.type === "animal" ? "MOVE_ANIMAL" : "MOVE_DECORATION",
      id: selectedObject.id,
      [axis]: value,
    });
  }
  return (
    <>
      <p className="intro">Make a soft little corner of the world your own.</p>
      <Wallet gems={state.gems} />
      <Segments
        label="Decoration categories"
        options={[
          { id: "backgrounds", name: "Rooms" },
          { id: "accessories", name: "Accessories" },
          { id: "decorations", name: "Furniture" },
        ]}
        value={category}
        onChange={setCategory}
      />
      {category === "accessories" && (
        <label className="field-label">
          Dress a friend
          <select
            value={friend?.id || ""}
            onChange={(event) => setFriendId(event.target.value)}
          >
            {state.animals.map((animal, index) => (
              <option key={animal.id} value={animal.id}>
                {animal.name} · {titleCase(animal.rarity)} · #{index + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      <div
        className={`shop-items ${category === "backgrounds" ? "room-items" : ""}`}
      >
        {catalog.map((item) => {
          const owned = state.owned[category].includes(item.id);
          const active =
            category === "backgrounds"
              ? state.room.background === item.id
              : category === "accessories" && friend?.accessory === item.id;
          return (
            <section className="shop-item" key={item.id}>
              {category === "backgrounds" ? (
                <img
                  src={`/art/room-${item.id}.png`}
                  alt={`${item.name} preview`}
                  loading="lazy"
                />
              ) : category === "accessories" ? (
                <div className="accessory-preview">
                  {item.id === "none" ? (
                    <span aria-hidden="true">—</span>
                  ) : (
                    <Accessory id={item.id} />
                  )}
                </div>
              ) : (
                <Sprite kind="object" id={item.id} />
              )}
              <h3>{item.name}</h3>
              {item.description && (
                <p className="small muted">{item.description}</p>
              )}
              <button
                type="button"
                className="small-button"
                disabled={active || (!owned && state.gems < item.price)}
                aria-label={
                  owned
                    ? `${active ? "Using" : category === "decorations" ? "Add" : "Use"} ${item.name}`
                    : `Unlock ${item.name} for ${item.price} Shilligems`
                }
                onClick={() =>
                  owned
                    ? applyItem(item)
                    : act({ type: "BUY_ITEM", category, id: item.id })
                }
              >
                {active ? (
                  <>
                    <Icon name="check" />{" "}
                    {category === "backgrounds" ? "Your room" : "Wearing"}
                  </>
                ) : owned ? (
                  category === "decorations" ? (
                    "Add to room"
                  ) : (
                    "Use"
                  )
                ) : (
                  <>
                    <Icon name="gem" /> Unlock · {item.price}
                  </>
                )}
              </button>
            </section>
          );
        })}
      </div>
      {category === "decorations" && (
        <p className="small muted">
          Unlock furniture once, then add as many as you like.
        </p>
      )}
      <section className="detail-card" aria-label="Arrange your room">
        <label className="toggle-line">
          <span>
            <strong>Arrange your room</strong>
            <span className="small muted">
              {" "}
              Move friends and furniture into place.
            </span>
          </span>
          <input
            type="checkbox"
            checked={arranging}
            onChange={(event) => setArranging(event.target.checked)}
          />
        </label>
        <p className="small muted">
          Turn on arranging to drag things around your room. Or pick something
          below and use the position sliders.
        </p>
        <label className="field-label">
          Choose a friend or furnishing
          <select
            value={
              selectedObject ? `${selection.type}:${selectedObject.id}` : ""
            }
            onChange={(event) => {
              const separator = event.target.value.indexOf(":");
              setSelection(
                separator < 0
                  ? null
                  : {
                      type: event.target.value.slice(0, separator),
                      id: event.target.value.slice(separator + 1),
                    },
              );
            }}
          >
            <option value="">Choose something to arrange…</option>
            {state.animals
              .filter((animal) => animal.placed)
              .map((animal, index) => (
                <option key={animal.id} value={`animal:${animal.id}`}>
                  {animal.name} · friend {index + 1}
                </option>
              ))}
            {state.room.decorations.map((item, index) => (
              <option key={item.id} value={`decoration:${item.id}`}>
                {
                  DECORATIONS.find((decoration) => decoration.id === item.item)
                    ?.name
                }{" "}
                · furnishing {index + 1}
              </option>
            ))}
          </select>
        </label>
        {selectedObject && (
          <>
            <p className="small">
              <strong>{selectedName}</strong>
            </p>
            <RangeField
              label="Left to right"
              value={selectedObject.x}
              min={5}
              max={95}
              step={1}
              suffix="%"
              onChange={(value) => move("x", value)}
            />
            <RangeField
              label="Back to front"
              value={selectedObject.y}
              min={48}
              max={85}
              step={1}
              suffix="%"
              onChange={(value) => move("y", value)}
            />
            <button
              type="button"
              className="text-button"
              onClick={() => {
                act(
                  selection.type === "animal"
                    ? {
                        type: "PLACE_ANIMAL",
                        id: selectedObject.id,
                        placed: false,
                      }
                    : { type: "REMOVE_DECORATION", id: selectedObject.id },
                );
                setSelection(null);
              }}
            >
              {selection.type === "animal"
                ? "Return to collection"
                : "Remove from room"}
            </button>
          </>
        )}
      </section>
    </>
  );
}

function SessionList({ sessions, showDate = false }) {
  return sessions.length ? (
    <ol className="session-list">
      {[...sessions]
        .sort((first, second) => second.completedAt - first.completedAt)
        .map((session) => (
          <li key={session.id}>
            <span className="session-dot" aria-hidden="true" />
            <div>
              <strong>{session.task || "A little focused time"}</strong>
              <span className="small muted">
                {new Date(session.completedAt).toLocaleString(
                  undefined,
                  showDate
                    ? {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    : { hour: "numeric", minute: "2-digit" },
                )}
              </span>
            </div>
            <span>{session.minutes} min</span>
          </li>
        ))}
    </ol>
  ) : (
    <div className="empty-state">
      <Icon name="leaf" />
      <p>Your next small step starts here.</p>
      <span className="small muted">
        Completed focus sessions will appear in your journal.
      </span>
    </div>
  );
}

export function JournalPanel({ state, act, now }) {
  const [tab, setTab] = useState("today");
  const stats = todayStats(state, now);
  const today = state.history.filter((session) =>
    sameDay(session.completedAt, now),
  );
  const allMinutes = state.history.reduce(
    (total, session) => total + session.minutes,
    0,
  );
  return (
    <>
      <p className="intro">
        Little steps add up. Here’s a place to notice them.
      </p>
      <Segments
        label="Journal views"
        options={[
          { id: "today", name: "Today" },
          { id: "history", name: "History" },
          { id: "scratchpad", name: "Scratchpad" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "scratchpad" ? (
        <div className="scratchpad">
          <label className="field-label" htmlFor="distraction-notes">
            Park a thought, then come back to it.
          </label>
          <p className="small muted">
            A quick place for distractions, reminders, and ideas. Your notes
            save on this computer.
          </p>
          <textarea
            id="distraction-notes"
            rows={12}
            maxLength={10000}
            placeholder="That thing I don’t need to do right now…"
            value={state.scratchpad}
            onChange={(event) =>
              act({ type: "SET_SCRATCHPAD", text: event.target.value })
            }
          />
          <p className="small muted">
            {state.scratchpad.length.toLocaleString()} / 10,000 characters
          </p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div>
              <strong>{tab === "today" ? stats.minutes : allMinutes}</strong>
              <span>focus minutes</span>
            </div>
            <div>
              <strong>
                {tab === "today" ? stats.sessions : state.history.length}
              </strong>
              <span>sessions</span>
            </div>
            <div>
              <strong>{tab === "today" ? stats.gems : allMinutes}</strong>
              <span>Shilligems earned</span>
            </div>
          </div>
          {tab === "today" && (
            <section
              className={`daily-goal ${stats.progress >= 1 ? "complete" : ""}`}
            >
              <h3>
                {stats.progress >= 1
                  ? "Your daily goal, beautifully done."
                  : "A gentle goal for today"}
              </h3>
              <p>
                {stats.sessions} of {stats.goal} focus sessions
              </p>
              <progress
                aria-label="Daily focus goal"
                value={stats.progress}
                max={1}
              />
              <div className="goal-controls">
                <button
                  type="button"
                  className="small-button"
                  aria-label="Decrease daily goal"
                  disabled={stats.goal <= 1}
                  onClick={() =>
                    act({
                      type: "SET_SETTINGS",
                      settings: { dailyGoal: stats.goal - 1 },
                    })
                  }
                >
                  <Icon name="minus" />
                </button>
                <span>
                  {stats.goal} {stats.goal === 1 ? "session" : "sessions"} per
                  day
                </span>
                <button
                  type="button"
                  className="small-button"
                  aria-label="Increase daily goal"
                  disabled={stats.goal >= 24}
                  onClick={() =>
                    act({
                      type: "SET_SETTINGS",
                      settings: { dailyGoal: stats.goal + 1 },
                    })
                  }
                >
                  <Icon name="plus" />
                </button>
              </div>
            </section>
          )}
          <h3 className="section-heading">
            {tab === "today"
              ? "Today’s little victories"
              : "Your focus history"}
          </h3>
          <SessionList
            sessions={tab === "today" ? today : state.history}
            showDate={tab === "history"}
          />
        </>
      )}
    </>
  );
}

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
          "Audio couldn’t start in this browser. You can try again whenever you like.",
        );
    } catch (_) {
      setPlaying(false);
      report("Audio couldn’t start. Try playing the soundscape again.");
    } finally {
      setStarting(false);
    }
  }
  return (
    <>
      <p className="intro">Settle into a soundscape that feels like you.</p>
      <button
        type="button"
        className="secondary-button full-width"
        onClick={togglePlayback}
        disabled={starting}
        aria-pressed={playing}
      >
        <Icon name={playing ? "pause" : "play"} />{" "}
        {starting
          ? "Waking up the sounds…"
          : playing
            ? "Pause soundscape"
            : "Play soundscape"}
      </button>
      <div className="mixer">
        {[
          {
            id: "rain",
            name: "Soft rainfall",
            description: "A gentle wash of rain at the window.",
          },
          {
            id: "fire",
            name: "Fireplace",
            description: "Warm low tones and little crackles.",
          },
          {
            id: "noise",
            name: "Brown noise",
            description: "A steady, soft blanket for busy thoughts.",
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
            <p className="small muted">{channel.description}</p>
          </section>
        ))}
      </div>
      <label className="toggle-line">
        <span>Session completion chime</span>
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
      <p className="small muted">
        Mix each sound independently. Your levels are remembered; playback
        starts only when you choose.
      </p>
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

export function SettingsPanel({ state, act, persistence }) {
  return (
    <>
      <p className="intro">Your pace, your little rituals.</p>
      <h3 className="section-heading">Find your rhythm</h3>
      <div className="preset-list">
        {PRESETS.map((preset) => {
          const selected = Object.entries(preset.settings).every(
            ([key, value]) => state.settings[key] === value,
          );
          return (
            <button
              type="button"
              key={preset.id}
              className={`preset-button ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              onClick={() => act({ type: "SET_PRESET", id: preset.id })}
            >
              <strong>{preset.name}</strong>
              <span>
                {preset.settings.focusMinutes} min focus ·{" "}
                {preset.settings.breakMinutes} min break
              </span>
            </button>
          );
        })}
      </div>
      <h3 className="section-heading">Make it your own</h3>
      {[
        { key: "focusMinutes", name: "Focus time", max: 180, suffix: "min" },
        { key: "breakMinutes", name: "Short break", max: 60, suffix: "min" },
        {
          key: "longBreakMinutes",
          name: "Long break",
          max: 120,
          suffix: "min",
        },
        {
          key: "longBreakEvery",
          name: "Long break after",
          max: 12,
          suffix: "sessions",
        },
      ].map((field) => (
        <NumberSetting
          key={field.key}
          label={field.name}
          value={state.settings[field.key]}
          max={field.max}
          suffix={field.suffix}
          onChange={(value) =>
            act({ type: "SET_SETTINGS", settings: { [field.key]: value } })
          }
        />
      ))}
      {state.timer.status !== "idle" && (
        <p className="small muted">
          New durations apply to the next session. Reset the timer if you’d like
          to use them now.
        </p>
      )}
      <div className="settings-toggles">
        {[
          { key: "autoStartBreaks", name: "Start breaks automatically" },
          { key: "autoStartFocus", name: "Start focus sessions automatically" },
          { key: "soundEnabled", name: "Session completion chime" },
          { key: "reducedMotion", name: "Reduce animation" },
        ].map((setting) => (
          <label className="toggle-line" key={setting.key}>
            <span>{setting.name}</span>
            <input
              type="checkbox"
              checked={state.settings[setting.key]}
              onChange={(event) =>
                act({
                  type: "SET_SETTINGS",
                  settings: { [setting.key]: event.target.checked },
                })
              }
            />
          </label>
        ))}
      </div>
      <section className="save-info">
        <h3>
          <Icon name="leaf" /> A little space of your own
        </h3>
        <p className="small">
          Your animals, room, notes, and progress save in a private folder on
          this computer, outside the project.
        </p>
        {persistence.storagePath && (
          <p className="small">
            <code>{persistence.storagePath}</code>
          </p>
        )}
        <p className="small muted">
          {
            {
              loading: "Opening your local save…",
              saving: "Saving your latest changes…",
              saved: "All changes saved locally.",
              error: "Your latest changes need attention.",
              conflict: "Another window has changed this save.",
            }[persistence.status]
          }
        </p>
        {persistence.recovered && (
          <p className="small">Your save was recovered from its backup.</p>
        )}
        {persistence.error && (
          <p role="alert" className="small">
            {persistence.error}
          </p>
        )}
        {persistence.status === "error" && (
          <button
            type="button"
            className="small-button"
            onClick={persistence.retrySave}
          >
            Retry saving
          </button>
        )}
        {persistence.status === "conflict" && (
          <>
            <p className="small">
              Reloading replaces this window’s changes with the saved version.
            </p>
            <button
              type="button"
              className="small-button"
              onClick={persistence.reload}
            >
              Reload saved version
            </button>
          </>
        )}
        <p className="small muted">
          No account needed. Keep the local app running while you use your room.
        </p>
      </section>
    </>
  );
}
