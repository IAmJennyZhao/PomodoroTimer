import { useEffect, useId, useRef } from "react";
import { Button } from "./Controls";
import { ANIMALS, RARITIES, RARITY_STARS, EGG_MINUTES, spendableGems } from "./game";
import { Icon, InfoTip, Sprite } from "./ui";
import { ArtFragment, ATELIER_ART, PastelButtonArt } from "./AtelierArt";
import { OutcomeAccent } from "./OutcomeFeedback";
import { eggSessionSelection } from "./EggSelection";
import "./egg-shop.css";

const title = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export function EggShopTools({ state }) {
  const available = spendableGems(state);
  return <div className="shop-tools">
        {available < state.gems && <div className="shop-pending"><Icon name="gem" size={16} />{state.gems - available} pending
          <InfoTip label="Pending Shilligems">Finish this session to spend the {state.gems - available} earned so far. {available} Shilligems are available now.</InfoTip>
        </div>}
        <div className="shop-odds"><InfoTip label="Egg odds" contentClassName="egg-odds-note">
          <strong>Everyday 60% · Rare 30% · Dreamy 10%.</strong>
          <p>Every egg has an equal chance of each of the {ANIMALS.length} species.</p>
          <p>A rare-or-better egg is guaranteed within 5 mystery rolls. On a guaranteed roll: Rare 90% · Dreamy 10%. Rare or dreamy eggs reset the count; basic eggs do not affect it.</p>
          <p>{state.pity >= 4 ? "Rare+ next roll" : `Rare+ within ${5 - state.pity} rolls`}</p>
          <div className="egg-rarity-guide" aria-label="Egg rarities">{RARITIES.map((rarity) => <div key={rarity}>
            <span className="rarity-name">{title(rarity)}</span>
            <span className="rarity-rating" aria-label={`${RARITY_STARS[rarity]} ${RARITY_STARS[rarity] === 1 ? "star" : "stars"}`}>{"★".repeat(RARITY_STARS[rarity])}</span>
            <span className="rarity-hatch-time">{EGG_MINUTES[rarity]} min to hatch</span>
          </div>)}</div>
        </InfoTip><span>Odds</span>{state.pity >= 4 && <span className="guaranteed-roll">Rare+ next roll</span>}</div>
      </div>;
}

export default function EggShop({ state, act, onFocus, startAtNest = false, toolsInHeading = false }) {
  const counterPattern = useId();
  const nestHeading = useRef(null);
  useEffect(() => {
    if (startAtNest) {
      nestHeading.current?.closest("section")?.scrollIntoView?.({ block: "start" });
      nestHeading.current?.focus({ preventScroll: true });
    }
  }, [startAtNest]);
  const available = spendableGems(state);
  const { active, current, next } = eggSessionSelection(state);
  const purchase = (kind, price, label) => <div className="shop-offer">
    <Button sound={null} className="pastel-purchase" aria-label={label} aria-describedby={`${kind}-affordability`} disabled={available < price} onClick={() => act({ type: "BUY_EGG", kind })}>
      <PastelButtonArt /><span><Icon name="gem" size={18} />{kind === "mystery" ? "Roll " : "Buy "}{price}</span>
      <OutcomeAccent channel="purchase" target={`egg:${kind}`} className="purchase-accent" />
    </Button>
    <span id={`${kind}-affordability`} className="shop-affordability">{available < price ? `Need ${price - available} more gems` : kind === "basic" ? "25 min to hatch" : "50–100 min to hatch"}</span>
  </div>;
  return <div className="atelier-shop">
    <div className="shop-stage">
      {/* Slice from the painted wall through the back of the counter. Both bases
          share this slice's bottom edge; horizontal cropping cannot move it. */}
      <ArtFragment sheet="shop-backdrop" size={[1672, 941]} rect={[0, 0, 1672, 741]} preserveAspectRatio="xMidYMax slice" className="shop-backdrop" />
      {!toolsInHeading && <EggShopTools state={state} />}
      <div className="shop-displays">
        <section className="basic-display" aria-label="Basic egg">
          <Sprite kind="object" id="basic" className="basic-display-egg" />
          <ArtFragment rect={[1090, 126, 388, 349]} className="basic-pedestal" />
          <div className="basic-plaque"><h3>Basic</h3><span className="shop-stars" aria-label="1 star">★</span></div>
        </section>
        <section className="mystery-machine" aria-label="Mystery egg machine">
          <img className="machine-art" src={`${ATELIER_ART}/gumball-machine.png`} alt="" />
          <div className="machine-plaque"><h3>Mystery</h3><span className="shop-stars" aria-label="2 to 4 stars">★★ ~ ★★★★</span></div>
        </section>
      </div>
    </div>
    <div className="shop-counter">
      <svg className="shop-counter-art" aria-hidden="true">
        <defs><pattern id={counterPattern} width="100%" height="125" patternUnits="userSpaceOnUse" viewBox="0 741 1672 125" preserveAspectRatio="none">
          <image href={`${ATELIER_ART}/shop-backdrop.png`} width="1672" height="941" />
        </pattern></defs><rect width="100%" height="100%" fill={`url(#${counterPattern})`} />
      </svg>
      <div className="shop-offers" aria-label="Egg purchases">
        {purchase("basic", 25, "Buy basic egg for 25 Shilligems")}
        {purchase("mystery", 60, "Roll mystery egg for 60 Shilligems")}
      </div>
      <section className="atelier-nest" aria-label="Your nest">
        <div className="nest-heading"><h3 ref={nestHeading} tabIndex={-1}>Nest</h3><InfoTip label="Nest rules">Choose one egg before focus. Click it again to deselect. Selection changes during a session apply next time. Minutes stay with the egg attached at the start; they never spill into another.</InfoTip></div>
        {state.eggs.length ? <>
          <div className="nest-grid">{state.eggs.map((egg, index) => {
            const required = egg.requiredMinutes || EGG_MINUTES[egg.rarity];
            const progress = Math.min(required, egg.progressMinutes || 0);
            const ready = progress >= required;
            const selected = egg.id === next?.id;
            const studying = egg.id === current?.id;
            return <div className={`nest-egg ${selected ? "selected" : ""} ${studying ? "studying" : ""}`} key={egg.id} role="group" aria-label={`${title(egg.rarity)} egg ${index + 1}`}>
              <OutcomeAccent channel="purchase" target={egg.id} className="purchase-accent egg-arrival" />
              <Button className="nest-select" aria-pressed={selected} aria-label={`${selected ? "Deselect" : "Select"} ${egg.rarity} egg ${index + 1}`} title={`${title(egg.rarity)} · ${RARITY_STARS[egg.rarity]} stars${index === 0 ? " · oldest" : ""}`} onClick={() => act({ type: "SELECT_EGG", id: selected ? null : egg.id })}>
                <Sprite kind="object" id={egg.rarity} />
                <ArtFragment rect={[84, 690, 369, 219]} className="egg-cup" />
                {selected && <span className="nest-check"><Icon name="check" size={15} /></span>}
              </Button>
              <span className="nest-egg-name">{title(egg.rarity)} egg {index + 1}</span>
              <progress className="nest-progress" aria-label={`${title(egg.rarity)} egg ${index + 1} hatch progress`} value={progress} max={required} />
              <span className="egg-progress">{progress}/{required} min</span>
              <div className="egg-selection-badges">
                {studying && <span className="egg-current-badge">Studying with you</span>}
                {selected && <span className="egg-next-badge">Next session</span>}
              </div>
              <Button sound={null} className="text-button egg-hatch" disabled={!ready} aria-label={`Hatch ${egg.rarity} egg ${index + 1}`} onClick={() => act({ type: "HATCH_EGG", id: egg.id })}>{ready ? "Hatch" : <span aria-hidden="true">{"★".repeat(RARITY_STARS[egg.rarity])}</span>}</Button>
            </div>;
          })}</div>
          <p className="nest-guidance">{active ? current ? "This session's minutes stay with the egg studying with you." : "No egg is attached to this session." : next ? "Your selected egg will study with you when you start focus." : "Choose an egg to study with you, or focus without one."}{active && !next && " No egg selected for next session."}</p>
        </> : <div className="nest-empty">
          <ArtFragment rect={[84, 690, 369, 219]} className="empty-nest-art" />
          <div><strong>Your nest is empty :3</strong><p>Buy an egg above, choose it, then focus to help it hatch.</p></div>
        </div>}
        {onFocus && <Button className="secondary-button nest-focus" onClick={onFocus}>{active ? "Return to focus" : available < 25 && !state.eggs.length ? "Focus to earn gems" : "Go to focus"}</Button>}
      </section>
      <p className="shop-flow">Buy an egg → Choose it in your nest → Focus → Hatch</p>
    </div>
  </div>;
}
