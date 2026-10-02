import { useEffect, useRef, useState } from "react";
import { ACCESSORIES, ANIMALS, RARITIES, RARITY_STARS, EGG_MINUTES, animationCount, gemBonus, spendableGems } from "./game";
import { AnimalArt, Icon, InfoTip, Sprite } from "./ui";
import "./collection.css";

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const speciesName = (animal) => ANIMALS.find((species) => species.id === animal.species)?.name || "Animal";

export function RarityStars({ rarity, label = true }) {
  const stars = RARITY_STARS[rarity];
  return <span className={`rarity-stars ${rarity}`} aria-label={`${stars} ${stars === 1 ? "star" : "stars"}${label ? ` · ${titleCase(rarity)}` : ""}`}>
    <span aria-hidden="true">{"★".repeat(stars)}</span>
    {label && <span aria-hidden="true">{titleCase(rarity)}</span>}
  </span>;
}

export function AnimalsPanel({ state, act, selected, setSelected }) {
  const [mystery, setMystery] = useState(null);
  const mysteryDetails = useRef(null);
  useEffect(() => {
    if (mystery) mysteryDetails.current?.scrollIntoView?.({ block: "nearest" });
  }, [mystery]);
  const animal = state.animals.find((friend) => friend.id === selected) || state.animals[0];
  const discovered = new Set(state.animals.map((friend) => `${friend.species}:${friend.rarity}`));
  const missing = RARITIES.flatMap((rarity) => ANIMALS.filter((species) => !discovered.has(`${species.id}:${rarity}`)).map((species) => ({ ...species, rarity })));
  const bonus = Math.round(gemBonus(state) * 100);
  return <>
    <div className="panel-toolbar">
      <span className="small muted">{discovered.size}/{ANIMALS.length * RARITIES.length} pets discovered{bonus > 0 ? ` · +${bonus}% Shilligems` : ""}</span>
      <InfoTip label="Animal collection">
        Collect each animal in four rarities. Matching species and rarity upgrade your pet, up to six times.
        Each upgrade unlocks another animation. A maxed pet adds 10% to focus Shilligems, up to 50% total.
        Further copies give 5 Shilligems.
      </InfoTip>
    </div>
    <div className="collection-layout">
      <div className="collection-main">
        <div className="collection-grid">
          {state.animals.map((friend, index) => <button type="button" key={friend.id}
            className={`animal-card ${friend.id === animal?.id && !mystery ? "selected" : ""}`}
            aria-pressed={friend.id === animal?.id && !mystery}
            aria-label={`Select ${friend.name}, ${friend.rarity} ${speciesName(friend)}, animal ${index + 1}`}
            onClick={() => { setSelected(friend.id); setMystery(null); }}>
            <AnimalArt animal={friend} />
            <strong>{friend.name}</strong>
            <RarityStars rarity={friend.rarity} />
            <span className="pet-level">{friend.upgrades === 6 ? "Maxed · +10% gems" : `${friend.upgrades || 0}/6 upgrades`}</span>
            <span className="in-room">{friend.placed ? "In room" : "In collection"}</span>
          </button>)}
        </div>
        {missing.length > 0 && <section className="undiscovered-collection" aria-label="Undiscovered pets">
          <h3>Still to meet <span className="small muted">· {missing.length}</span></h3>
          <p className="small muted">Pick a mystery tile to find its egg.</p>
          <div className="mystery-grid">{missing.map((species) => <button key={`${species.id}:${species.rarity}`}
            className={`mystery-tile ${mystery?.id === species.id && mystery?.rarity === species.rarity ? "selected" : ""}`}
            aria-label={`Discover ${titleCase(species.rarity)} ${species.name}, ${RARITY_STARS[species.rarity]} stars`}
            aria-pressed={mystery?.id === species.id && mystery?.rarity === species.rarity}
            onClick={() => setMystery(species)}>
            <span className="mystery-mark" aria-hidden="true">?</span>
            <RarityStars rarity={species.rarity} label={false} />
          </button>)}</div>
        </section>}
      </div>
      {mystery ? <section ref={mysteryDetails} className="detail-card collection-detail mystery-detail" aria-label="Undiscovered pet details" aria-live="polite">
        <span className="mystery-mark" aria-hidden="true">?</span>
        <RarityStars rarity={mystery.rarity} />
        <h3>{titleCase(mystery.rarity)} {mystery.name}</h3>
        <Sprite kind="object" id={mystery.rarity} />
        <p>Found in a <strong>{titleCase(mystery.rarity)} egg</strong>.</p>
        <p className="small muted">{mystery.rarity === "basic" ? "Buy a Basic egg in the egg shop." : `Mystery rolls can reveal ${titleCase(mystery.rarity)} eggs.`} Each has a 1 in {ANIMALS.length} chance of this pet.</p>
        <p className="small muted">{EGG_MINUTES[mystery.rarity]} focus minutes to hatch.</p>
        <button className="small-button" onClick={() => setMystery(null)}>Back to my pet</button>
      </section> : animal && <section className="detail-card collection-detail" aria-label={`${animal.name} details`}>
        <AnimalArt animal={animal} />
        <h3>{animal.name} <span className="small muted">· {speciesName(animal)}</span></h3>
        <RarityStars rarity={animal.rarity} />
        <div className="upgrade-track" aria-label={`${animal.upgrades || 0} of 6 upgrades`}>
          {Array.from({ length: 6 }, (_, i) => <span key={i} className={i < (animal.upgrades || 0) ? "earned" : ""} aria-hidden="true"><Icon name="sparkle" size={16} /></span>)}
        </div>
        <p className="small">{animationCount(animal)} of 7 animations unlocked</p>
        <p className="small muted">{animal.upgrades === 6 ? "Maxed! This friend gives +10% focus Shilligems." : "Hatch this same pet again to unlock a new animation. Six upgrades earn a +10% Shilligem bonus."}</p>
        <label className="toggle-line"><span>Show in room</span>
          <input type="checkbox" checked={animal.placed} onChange={(event) => act({ type: "PLACE_ANIMAL", id: animal.id, placed: event.target.checked })} />
        </label>
        <label className="field-label">Accessory
          <select value={animal.accessory} onChange={(event) => act({ type: "SET_ACCESSORY", animalId: animal.id, id: event.target.value })}>
            {ACCESSORIES.map((item) => <option key={item.id} value={item.id} disabled={!state.owned.accessories.includes(item.id)}>{item.name}{!state.owned.accessories.includes(item.id) ? " · locked" : ""}</option>)}
          </select>
        </label>
      </section>}
    </div>
  </>;
}

export function ShopPanel({ state, act }) {
  const activeSession = state.timer.mode === "focus" && ["running", "paused"].includes(state.timer.status);
  const available = spendableGems(state);
  return <>
    {available < state.gems && <p className="small pending-reward">{available} Shilligems available · Finish this session to spend the {state.gems - available} earned so far.</p>}
    <div className="egg-options">
      <section className="egg-card">
        <Sprite kind="object" id="basic" />
        <h3>Basic egg</h3><RarityStars rarity="basic" />
        <p className="egg-description">25 focus minutes · a little beginning</p>
        <button type="button" className="secondary-button full-width" aria-label="Buy basic egg for 25 Shilligems" disabled={available < 25} onClick={() => act({ type: "BUY_EGG", kind: "basic" })}>Buy <Icon name="gem" /> 25</button>
      </section>
      <section className="egg-card">
        <Sprite kind="object" id="dreamy" />
        <div className="catalog-heading"><h3>Mystery egg</h3><InfoTip label="Egg odds">
          <strong>Everyday 60% · Rare 30% · Dreamy 10%.</strong>
          <p>Every egg has an equal chance of each of the {ANIMALS.length} species.</p>
          <p>A rare-or-better egg is guaranteed within 5 mystery rolls. On a guaranteed roll: Rare 90% · Dreamy 10%. Rare or dreamy eggs reset the count; basic eggs do not affect it.</p>
        </InfoTip></div>
        <span className="mystery-range">★★–★★★★ <span>2–4 star surprise</span></span>
        <p className="egg-description">{state.pity >= 4 ? "Rare+ next roll" : `Rare+ within ${5 - state.pity} rolls`}</p>
        <button type="button" className="secondary-button full-width" aria-label="Roll mystery egg for 60 Shilligems" disabled={available < 60} onClick={() => act({ type: "BUY_EGG", kind: "mystery" })}>Roll <Icon name="gem" /> 60</button>
      </section>
    </div>
    <div className="egg-rarity-guide" aria-label="Egg rarities">{RARITIES.map((rarity) => <div key={rarity}>
      <RarityStars rarity={rarity} /><span>{EGG_MINUTES[rarity]} min to hatch</span>
    </div>)}</div>
    <div className="section-heading"><h3>Your nest <span className="small muted">· {state.eggs.length}</span></h3>
      <InfoTip label="Earning Shilligems">Earn 1 Shilligem per completed focus minute, plus your maxed pet bonus. Pomodoros allow two pauses of up to one minute each; exceeding either limit forfeits that session’s Shilligems.</InfoTip>
    </div>
    <p className="small muted incubation-explainer">One egg studies with you at a time. The oldest is selected first. {activeSession ? "Changes here apply to your next session." : "Choose one before starting, or deselect to study without an egg."} Progress is saved when you finish focus; extra minutes do not spill into another egg.</p>
    {state.eggs.length ? <div className="nest-grid">{state.eggs.map((egg, index) => {
      const required = egg.requiredMinutes || EGG_MINUTES[egg.rarity];
      const progress = Math.min(required, egg.progressMinutes || 0);
      const ready = progress >= required;
      const selected = egg.id === state.selectedEggId;
      const current = activeSession && state.timer.eggId === egg.id;
      return <section className={`nest-egg ${egg.rarity} ${selected ? "selected" : ""}`} key={egg.id}>
        <Sprite kind="object" id={egg.rarity} /><RarityStars rarity={egg.rarity} />
        <span className="egg-order">Egg {index + 1}{index === 0 ? " · oldest" : ""}</span>
        <progress aria-label={`${titleCase(egg.rarity)} egg ${index + 1} hatch progress`} value={progress} max={required} />
        <span className="egg-progress">{ready ? "Ready to meet you" : `${progress}/${required} focus min`}</span>
        {current && <span className="egg-current">Studying with you</span>}
        <button className="small-button egg-select" aria-pressed={selected}
          aria-label={`${selected ? "Deselect" : "Select"} ${egg.rarity} egg ${index + 1}`}
          onClick={() => act({ type: "SELECT_EGG", id: selected ? null : egg.id })}>
          {selected && <Icon name="check" size={14} />}{selected ? (activeSession ? "Next session" : "Selected") : "Choose egg"}
        </button>
        <button type="button" className="small-button egg-hatch" disabled={!ready} aria-label={`Hatch ${egg.rarity} egg ${index + 1}`} onClick={() => act({ type: "HATCH_EGG", id: egg.id })}>Hatch</button>
      </section>;
    })}</div> : <div className="empty-state compact-empty"><Icon name="egg" /><p>Your nest is waiting. Buy an egg, then focus to help it hatch.</p></div>}
  </>;
}
