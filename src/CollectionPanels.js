import { useEffect, useRef, useState } from "react";
import { ACCESSORIES, ANIMALS, RARITIES, RARITY_STARS, EGG_MINUTES, animationCount, gemBonus } from "./game";
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
  const petDetails = useRef(null);
  useEffect(() => {
    petDetails.current?.scrollIntoView?.({ block: "nearest" });
  }, [mystery, selected]);
  const animal = state.animals.find((friend) => friend.id === selected) || state.animals[0];
  const discovered = new Set(state.animals.map((friend) => `${friend.species}:${friend.rarity}`));
  const missing = RARITIES.flatMap((rarity) => ANIMALS.filter((species) => !discovered.has(`${species.id}:${rarity}`)).map((species) => ({ ...species, rarity })));
  const bonus = Math.round(gemBonus(state) * 100);
  return <div className="pet-album">
    <div className="panel-toolbar">
      <span className="small muted" aria-label={`${discovered.size} of ${ANIMALS.length * RARITIES.length} pets discovered`}>{discovered.size} / {ANIMALS.length * RARITIES.length}{bonus > 0 ? ` · +${bonus}% gems` : ""}</span>
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
            <RarityStars rarity={friend.rarity} label={false} />
            <span className="in-room">{friend.placed ? "In room" : "In collection"}</span>
          </button>)}
        </div>
        {missing.length > 0 && <section className="undiscovered-collection" aria-label="Undiscovered pets">
          <h3>Still to meet <span className="small muted">· {missing.length}</span></h3>
          <div className="mystery-grid">{missing.map((species) => <button key={`${species.id}:${species.rarity}`}
            className={`mystery-tile ${mystery?.id === species.id && mystery?.rarity === species.rarity ? "selected" : ""}`}
            aria-label={`${titleCase(species.rarity)} mystery pet ${ANIMALS.findIndex(item => item.id === species.id) + 1}, ${RARITY_STARS[species.rarity]} ${RARITY_STARS[species.rarity] === 1 ? "star" : "stars"}`}
            aria-pressed={mystery?.id === species.id && mystery?.rarity === species.rarity}
            onClick={() => setMystery(species)}>
            <span className="mystery-mark" aria-hidden="true">?</span>
            <RarityStars rarity={species.rarity} label={false} />
          </button>)}</div>
        </section>}
      </div>
      {mystery ? <section ref={petDetails} className="detail-card collection-detail mystery-detail" aria-label="Undiscovered pet details" aria-live="polite">
        <span className="mystery-mark" aria-hidden="true">?</span>
        <RarityStars rarity={mystery.rarity} label={false} />
        <Sprite kind="object" id={mystery.rarity} />
        <p>Found in <strong>{titleCase(mystery.rarity)} egg</strong> <InfoTip label="Egg details">{EGG_MINUTES[mystery.rarity]} focus minutes to hatch. Each egg has a 1 in {ANIMALS.length} chance of this pet.</InfoTip></p>
        <button className="icon-button mystery-close" aria-label="Back to my pet" title="Back" onClick={() => setMystery(null)}><Icon name="close" size={18} /></button>
      </section> : animal && <section ref={petDetails} className="detail-card collection-detail" aria-label={`${animal.name} details`}>
        <div className="pet-portrait"><AnimalArt animal={animal} /></div>
        <h3>{animal.name} <span className="small muted">· {speciesName(animal)}</span></h3>
        <RarityStars rarity={animal.rarity} />
        <div className="upgrade-track" aria-label={`${animal.upgrades || 0} of 6 upgrades`}>
          {Array.from({ length: 6 }, (_, i) => <span key={i} className={i < (animal.upgrades || 0) ? "earned" : ""} aria-hidden="true"><Icon name="paw" size={17} /></span>)}
        </div>
        <p className="small">{animationCount(animal)} / 7 animations <InfoTip label="Pet upgrades">{animal.upgrades === 6 ? "Maxed! This friend gives +10% focus Shilligems." : "Hatch this same pet again to unlock a new animation. Six upgrades earn a +10% Shilligem bonus."}</InfoTip></p>
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
  </div>;
}

export { default as ShopPanel } from "./EggShop";
