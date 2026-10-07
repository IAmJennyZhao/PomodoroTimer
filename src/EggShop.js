import { Button } from "./Controls";
import { ANIMALS, RARITIES, RARITY_STARS, EGG_MINUTES, spendableGems } from "./game";
import { Icon, InfoTip, Sprite } from "./ui";
import { ArtFragment, ATELIER_ART, PastelButtonArt } from "./AtelierArt";
import { OutcomeAccent } from "./OutcomeFeedback";

const title = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export default function EggShop({ state, act }) {
  const available = spendableGems(state);
  const active = state.timer.mode === "focus" && ["running", "paused"].includes(state.timer.status);
  return <div className="atelier-shop">
    <img className="shop-backdrop" src={`${ATELIER_ART}/shop-backdrop.png`} alt="" />
    {available < state.gems && <div className="shop-pending"><Icon name="gem" size={16} />{state.gems - available} pending
      <InfoTip label="Pending Shilligems">Finish this session to spend the {state.gems - available} earned so far. {available} Shilligems are available now.</InfoTip>
    </div>}
    <div className="shop-stage">
      <section className="basic-display" aria-label="Basic egg">
        <Sprite kind="object" id="basic" className="basic-display-egg" />
        <ArtFragment rect={[1090, 126, 388, 349]} className="basic-pedestal" />
        <div className="basic-plaque"><h3>Basic</h3><span className="shop-stars" aria-label="1 star">★</span>
          <Button sound={null} className="pastel-purchase" aria-label="Buy basic egg for 25 Shilligems" disabled={available < 25} onClick={() => act({ type: "BUY_EGG", kind: "basic" })}>
            <PastelButtonArt /><span><Icon name="gem" size={18} />25</span>
            <OutcomeAccent channel="purchase" target="egg:basic" className="purchase-accent" />
          </Button>
        </div>
      </section>
      <section className="mystery-machine" aria-label="Mystery egg machine">
        <img className="machine-art" src={`${ATELIER_ART}/gumball-machine.png`} alt="" />
        <div className="machine-plaque"><h3>Mystery</h3><span className="shop-stars" aria-label="2 to 4 stars">★★ ~ ★★★★</span>
          <Button sound={null} className="pastel-purchase" aria-label="Roll mystery egg for 60 Shilligems" disabled={available < 60} onClick={() => act({ type: "BUY_EGG", kind: "mystery" })}>
            <PastelButtonArt /><span><Icon name="gem" size={18} />Roll 60</span>
            <OutcomeAccent channel="purchase" target="egg:mystery" className="purchase-accent" />
          </Button>
        </div>
      </section>
      <div className="shop-odds"><InfoTip label="Egg odds">
        <strong>Everyday 60% · Rare 30% · Dreamy 10%.</strong>
        <p>Every egg has an equal chance of each of the {ANIMALS.length} species.</p>
        <p>A rare-or-better egg is guaranteed within 5 mystery rolls. On a guaranteed roll: Rare 90% · Dreamy 10%. Rare or dreamy eggs reset the count; basic eggs do not affect it.</p>
        <p>{state.pity >= 4 ? "Rare+ next roll" : `Rare+ within ${5 - state.pity} rolls`}</p>
        <div className="egg-rarity-guide" aria-label="Egg rarities">{RARITIES.map((rarity) => <div key={rarity}><span>{title(rarity)} {"★".repeat(RARITY_STARS[rarity])}</span><span>{EGG_MINUTES[rarity]} min to hatch</span></div>)}</div>
      </InfoTip><span>Odds</span>{state.pity >= 4 && <span className="guaranteed-roll">Rare+ next roll</span>}</div>
    </div>
    <section className="atelier-nest" aria-label="Your nest">
      <div className="nest-heading"><h3>Nest</h3><InfoTip label="Nest rules">Choose one egg before focus. Click it again to deselect. Selection changes during a session apply next time. Minutes stay with that egg; they never spill into another.</InfoTip></div>
      {state.eggs.length ? <div className="nest-grid">{state.eggs.map((egg, index) => {
        const required = egg.requiredMinutes || EGG_MINUTES[egg.rarity];
        const progress = Math.min(required, egg.progressMinutes || 0);
        const ready = progress >= required;
        const selected = egg.id === state.selectedEggId;
        return <div className={`nest-egg ${selected ? "selected" : ""}`} key={egg.id}>
          <OutcomeAccent channel="purchase" target={egg.id} className="purchase-accent egg-arrival" />
          <Button className="nest-select" aria-pressed={selected} aria-label={`${selected ? "Deselect" : "Select"} ${egg.rarity} egg ${index + 1}`} title={`${title(egg.rarity)} · ${RARITY_STARS[egg.rarity]} stars${index === 0 ? " · oldest" : ""}`} onClick={() => act({ type: "SELECT_EGG", id: selected ? null : egg.id })}>
            <Sprite kind="object" id={egg.rarity} />
            <ArtFragment rect={[84, 690, 369, 219]} className="egg-cup" />
            {selected && <span className="nest-check"><Icon name="check" size={15} /></span>}
          </Button>
          <progress className="nest-progress" aria-label={`${title(egg.rarity)} egg ${index + 1} hatch progress`} value={progress} max={required} />
          <span className="egg-progress">{progress}/{required}</span>
          <Button sound={null} className="text-button egg-hatch" disabled={!ready} aria-label={`Hatch ${egg.rarity} egg ${index + 1}`} onClick={() => act({ type: "HATCH_EGG", id: egg.id })}>{ready ? "Hatch" : <span aria-hidden="true">{"★".repeat(RARITY_STARS[egg.rarity])}</span>}</Button>
        </div>;
      })}</div> : <p className="nest-empty">Choose a little beginning.</p>}
      {active && state.eggs.length > 0 && <span className="nest-next-session">Next session</span>}
    </section>
  </div>;
}
