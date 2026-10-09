import { Button } from "../../shared/Controls";
import { useContext, useEffect, useRef, useState } from "react";
import { ANIMALS, RARITIES, RARITY_STARS, EGG_MINUTES, gemBonus } from "../../domain/game";
import { AnimalArt, Icon, InfoTip, RarityStars, Sprite } from "../../shared/ui";
import { PetResponseContext } from "../room/RoomInteraction";
import PetDetails from "./PetDetails";

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const speciesName = (animal) => ANIMALS.find((species) => species.id === animal.species)?.name || "Animal";

export function AnimalsPanel({ state, act, selected, setSelected, onShopAccessories }) {
  const respondToPet = useContext(PetResponseContext);
  const [mystery, setMystery] = useState(null);
  const petDetails = useRef(null);
  useEffect(() => {
    petDetails.current?.scrollIntoView?.({ block: "start" });
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
          {state.animals.map((friend, index) => <Button type="button" key={friend.id}
            className={`animal-card ${friend.id === animal?.id && !mystery ? "selected" : ""}`}
            aria-pressed={friend.id === animal?.id && !mystery}
            aria-label={`Select ${friend.name}, ${friend.rarity} ${speciesName(friend)}, animal ${index + 1}`}
            onClick={() => { respondToPet(friend.id); setSelected(friend.id); setMystery(null); }}>
            <AnimalArt animal={friend} />
            <strong>{friend.name}</strong>
            <RarityStars rarity={friend.rarity} label={false} />
            <span className="in-room">{friend.placed ? "In room" : "In collection"}</span>
          </Button>)}
        </div>
        {missing.length > 0 && <section className="undiscovered-collection" aria-label="Undiscovered pets">
          <h3>Still to meet <span className="small muted">· {missing.length}</span></h3>
          <div className="mystery-grid">{missing.map((species) => <Button key={`${species.id}:${species.rarity}`}
            className={`mystery-tile ${mystery?.id === species.id && mystery?.rarity === species.rarity ? "selected" : ""}`}
            aria-label={`${titleCase(species.rarity)} mystery pet ${ANIMALS.findIndex(item => item.id === species.id) + 1}, ${RARITY_STARS[species.rarity]} ${RARITY_STARS[species.rarity] === 1 ? "star" : "stars"}`}
            aria-pressed={mystery?.id === species.id && mystery?.rarity === species.rarity}
            onClick={() => setMystery(species)}>
            <span className="mystery-mark" aria-hidden="true">?</span>
            <RarityStars rarity={species.rarity} label={false} />
          </Button>)}</div>
        </section>}
      </div>
      {mystery ? <section ref={petDetails} className="detail-card collection-detail mystery-detail" aria-label="Undiscovered pet details" aria-live="polite">
        <span className="mystery-mark" aria-hidden="true">?</span>
        <RarityStars rarity={mystery.rarity} label={false} />
        <Sprite kind="object" id={mystery.rarity} />
        <p>Found in <strong>{titleCase(mystery.rarity)} egg</strong> <InfoTip label="Egg details">{EGG_MINUTES[mystery.rarity]} focus minutes to hatch. Each egg has a 1 in {ANIMALS.length} chance of this pet.</InfoTip></p>
        <Button className="icon-button mystery-close" aria-label="Back to my pet" title="Back" onClick={() => setMystery(null)}><Icon name="close" size={18} /></Button>
      </section> : animal && <PetDetails key={animal.id} animal={animal} state={state} act={act} detailsRef={petDetails} onShopAccessories={onShopAccessories} />}
    </div>
  </div>;
}
