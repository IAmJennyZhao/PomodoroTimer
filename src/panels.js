import React, { useEffect, useState } from "react";
import {
  ACCESSORIES,
  ANIMALS,
  BACKGROUNDS,
  DECORATIONS,
  PRESETS,
} from "./game";
import { Icon, Sprite, AnimalArt, Accessory, RangeField, InfoTip } from "./ui";

export { default as JournalPanel } from "./JournalPanel";

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const speciesName = (animal) =>
  ANIMALS.find((species) => species.id === animal.species)?.name || "Animal";

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
  const animal = state.animals.find((friend) => friend.id === selected) || state.animals[0];
  const discovered = new Set(state.animals.map((friend) => friend.species));
  return (
    <>
      <div className="panel-toolbar">
        <span className="small muted">
          {state.animals.length} {state.animals.length === 1 ? "animal" : "animals"} · {discovered.size}/{ANIMALS.length} species
        </span>
        <InfoTip label="Animal collection">
          Hatch eggs to collect animals. Each animal can live in your room,
          including duplicates. Move them in Decorate.
        </InfoTip>
      </div>
      <div className="collection-layout">
        <div className="collection-main">
          <div className="collection-grid">
            {state.animals.map((friend, index) => (
              <button type="button" key={friend.id}
                className={`animal-card ${friend.id === animal?.id ? "selected" : ""}`}
                aria-pressed={friend.id === animal?.id}
                aria-label={`Select ${friend.name}, ${friend.rarity} ${speciesName(friend)}, animal ${index + 1}`}
                onClick={() => setSelected(friend.id)}>
                <AnimalArt animal={friend} />
                <strong>{friend.name}</strong>
                <span className={`rarity-label ${friend.rarity}`}>{titleCase(friend.rarity)}</span>
                <span className="in-room">{friend.placed ? "In room" : "In collection"}</span>
              </button>
            ))}
          </div>
          {discovered.size < ANIMALS.length && (
            <div className="undiscovered">
              <h3>Undiscovered</h3>
              <p className="small muted">
                {ANIMALS.filter((species) => !discovered.has(species.id)).map((species) => species.name).join(" · ")}
              </p>
            </div>
          )}
        </div>
        {animal && (
          <section className="detail-card collection-detail" aria-label={`${animal.name} details`}>
            <AnimalArt animal={animal} />
            <h3>{animal.name} <span className="small muted">· {speciesName(animal)}</span></h3>
            <label className="toggle-line">
              <span>Show in room</span>
              <input type="checkbox" checked={animal.placed}
                onChange={(event) => act({ type: "PLACE_ANIMAL", id: animal.id, placed: event.target.checked })} />
            </label>
            <label className="field-label">
              Accessory
              <select value={animal.accessory}
                onChange={(event) => act({ type: "SET_ACCESSORY", animalId: animal.id, id: event.target.value })}>
                {ACCESSORIES.map((item) => (
                  <option key={item.id} value={item.id} disabled={!state.owned.accessories.includes(item.id)}>
                    {item.name}{!state.owned.accessories.includes(item.id) ? " · locked" : ""}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}
      </div>
    </>
  );
}

export function ShopPanel({ state, act }) {
  return (
    <>
      <div className="egg-options">
        <section className="egg-card">
          <Sprite kind="object" id="everyday" />
          <h3>Basic egg</h3>
          <span className="rarity-label everyday">Everyday</span>
          <button type="button" className="secondary-button full-width"
            aria-label="Buy basic egg for 25 Shilligems" disabled={state.gems < 25}
            onClick={() => act({ type: "BUY_EGG", kind: "basic" })}>
            Buy <Icon name="gem" /> 25
          </button>
        </section>
        <section className="egg-card">
          <Sprite kind="object" id="dreamy" />
          <div className="catalog-heading">
            <h3>Mystery egg</h3>
            <InfoTip label="Egg odds">
              <strong>Everyday 60% · Rare 30% · Dreamy 10%.</strong>
              <p>Every egg has an equal chance of each of the {ANIMALS.length} species.</p>
              <p>A rare-or-better egg is guaranteed within 5 mystery rolls.
                On a guaranteed roll: Rare 90% · Dreamy 10%.
                Rare or dreamy eggs reset the count; basic eggs do not affect it.</p>
            </InfoTip>
          </div>
          <span className="small muted">
            {state.pity >= 4 ? "Rare+ next roll" : `Rare+ within ${5 - state.pity} rolls`}
          </span>
          <button type="button" className="secondary-button full-width"
            aria-label="Roll mystery egg for 60 Shilligems" disabled={state.gems < 60}
            onClick={() => act({ type: "BUY_EGG", kind: "mystery" })}>
            Roll <Icon name="gem" /> 60
          </button>
        </section>
      </div>
      <div className="section-heading">
        <h3>Eggs <span className="small muted">· {state.eggs.length}</span></h3>
        <InfoTip label="Earning Shilligems">
          Earn 1 Shilligem per focus minute when you finish a session.
          Breaks and skipped sessions earn none.
        </InfoTip>
      </div>
      {state.eggs.length ? (
        <div className="nest-grid">
          {state.eggs.map((egg, index) => (
            <section className={`nest-egg ${egg.rarity}`} key={egg.id}>
              <Sprite kind="object" id={egg.rarity} />
              <span className={`rarity-label ${egg.rarity}`}>{titleCase(egg.rarity)}</span>
              <button type="button" className="small-button"
                aria-label={`Hatch ${egg.rarity} egg ${index + 1}`}
                onClick={() => act({ type: "HATCH_EGG", id: egg.id })}>Hatch</button>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty"><Icon name="egg" /><p>No eggs yet</p></div>
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
      <div className="panel-toolbar catalog-toolbar">
        {!arranging && <Wallet gems={state.gems} />}
        <label className="toggle-line arrange-toggle">
          <span>Arrange room</span>
          <input type="checkbox" checked={arranging}
            onChange={(event) => setArranging(event.target.checked)} />
        </label>
        <InfoTip label="Arranging the room">
          Turn on Arrange room to drag animals and furniture into place.
          Select an item to adjust its position with sliders.
        </InfoTip>
      </div>
      {!arranging && <>
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
          Animal
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
                    {category === "backgrounds" ? "Active" : "Wearing"}
                  </>
                ) : owned ? (
                  category === "decorations" ? (
                    "Add"
                  ) : (
                    "Use"
                  )
                ) : (
                  <>
                    Buy <Icon name="gem" /> {item.price}
                  </>
                )}
              </button>
            </section>
          );
        })}
      </div>
      {category === "decorations" && (
        <div className="catalog-note">
          <InfoTip label="Furniture purchases">
            Buy furniture once, then add as many copies as you like.
          </InfoTip>
        </div>
      )}
      </>}
      {arranging && <section className="detail-card arrange-controls" aria-label="Room position">
        <label className="field-label">
          Selected item
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
            <option value="">Choose an item</option>
            {state.animals
              .filter((animal) => animal.placed)
              .map((animal, index) => (
                <option key={animal.id} value={`animal:${animal.id}`}>
                  {animal.name} · #{index + 1}
                </option>
              ))}
            {state.room.decorations.map((item, index) => (
              <option key={item.id} value={`decoration:${item.id}`}>
                {
                  DECORATIONS.find((decoration) => decoration.id === item.item)
                    ?.name
                }{" "}
                · #{index + 1}
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
      </section>}
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
        <span>Completion chime</span>
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
  return (
    <div className="session-controls" role="group" aria-label="Session timing">
      <div className="preset-list session-presets">
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
      </div>
      <div className="session-duration-grid">
        {[
          { key: "focusMinutes", name: "Focus time", max: 180, suffix: "min" },
          { key: "breakMinutes", name: "Short break", max: 60, suffix: "min" },
          { key: "longBreakMinutes", name: "Long break", max: 120, suffix: "min" },
          { key: "longBreakEvery", name: "Long break every", max: 12, suffix: "sessions" },
        ].map((field) => (
          <NumberSetting key={field.key} label={field.name}
            value={state.settings[field.key]} max={field.max} suffix={field.suffix}
            onChange={(value) => act({ type: "SET_SETTINGS", settings: { [field.key]: value } })} />
        ))}
      </div>
      {state.timer.status !== "idle" && (
        <div className="session-timing-note">
          <span className="small muted">Applies next session</span>
          <InfoTip label="Changing an active timer">
            Reset the timer to apply new durations to this session.
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
          { key: "autoStartBreaks", name: "Auto-start breaks" },
          { key: "autoStartFocus", name: "Auto-start focus" },
          { key: "soundEnabled", name: "Completion chime" },
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
