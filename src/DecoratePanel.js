import { Button } from "./Controls";
import { useEffect, useState } from "react";
import { ACCESSORIES, ATELIER_PLACEMENTS, BACKGROUNDS, DECORATIONS, decorationAvailable, decorationQuantity, spendableGems } from "./game";
import { AnimalArt, Icon, Sprite } from "./ui";
import RoomBackdrop from "./RoomBackdrop";
import ArrangePanel from "./ArrangePanel";
import { OutcomeAccent } from "./OutcomeFeedback";

export default function DecoratePanel({ state, act, arranging, setArranging, selection, setSelection, accessoryPetId, onBackToPet }) {
  const available = spendableGems(state);
  const [category, setCategory] = useState(accessoryPetId ? "accessories" : "decorations");
  const [friendId, setFriendId] = useState(accessoryPetId || state.animals[0]?.id || "");
  useEffect(() => {
    if (accessoryPetId) { setCategory("accessories"); setFriendId(accessoryPetId); }
  }, [accessoryPetId]);
  const friend = state.animals.find(animal => animal.id === friendId) || state.animals[0];
  const catalog = { backgrounds: BACKGROUNDS, accessories: ACCESSORIES, decorations: DECORATIONS }[category];
  function applyItem(item) {
    if (category === "backgrounds") act({ type: "SET_BACKGROUND", id: item.id });
    if (category === "accessories" && friend) act({ type: "SET_ACCESSORY", animalId: friend.id, id: item.id });
    if (category === "decorations") {
      act({ type: "PLACE_DECORATION", item: item.id, ...(ATELIER_PLACEMENTS[item.id] || { x: 35, y: 72 }) });
    }
  }
  if (arranging) return <ArrangePanel state={state} act={act} setArranging={setArranging} selection={selection} setSelection={setSelection} onOpenShop={() => { setCategory("decorations"); setSelection(null); setArranging(false); }} />;
  return <div className={`decoration-catalog catalogue-${category}`}>
      {onBackToPet && friend && <div className="catalogue-pet-return"><Button className="secondary-button" onClick={() => onBackToPet(friend.id)}>Back to {friend.name}</Button><span className="small">Buy an accessory, then choose Use to equip it.</span></div>}
      <div className="panel-toolbar catalog-toolbar">
        <div className="segmented" role="group" aria-label="Decoration categories">
          {[['decorations', 'Furniture'], ['backgrounds', 'Room style'], ['accessories', 'Accessories']].map(([id, name]) => <Button type="button" key={id} aria-pressed={category === id} className={category === id ? "selected" : ""} onClick={() => setCategory(id)}>{name}</Button>)}
        </div>
        <Button type="button" className="primary-button arrange-start" onClick={() => setArranging(true)}><Icon name="move" size={18} /> Arrange room</Button>
      </div>
      {available < state.gems && <p className="small pending-reward">{available} Shilligems available · Finish this session to spend the {state.gems - available} earned so far.</p>}
      {category === "accessories" && <label className="field-label catalogue-pet">Pet<select value={friend?.id || ""} onChange={event => setFriendId(event.target.value)}>
        {state.animals.map(animal => <option key={animal.id} value={animal.id}>{animal.name} · {animal.rarity}</option>)}
      </select></label>}
      <div className={`shop-items ${category === "backgrounds" ? "room-items" : ""}`}>
        {catalog.map(item => {
          const owned = state.owned[category].includes(item.id);
          const furniture = category === "decorations";
          const stock = furniture ? decorationAvailable(state, item.id) : 0;
          const quantity = furniture ? decorationQuantity(state, item.id) : 0;
          const active = category === "backgrounds" ? state.room.background === item.id : category === "accessories" && friend?.accessory === item.id;
          const stockLabel = furniture && owned ? stock ? `${stock} available` : `${quantity} owned` : "";
          return <section className={`shop-item catalogue-item ${owned ? "is-owned" : ""} ${active ? "is-active" : ""}`} key={item.id}>
            <OutcomeAccent channel="purchase" target={`${category}:${item.id}`} className="purchase-accent" />
            <OutcomeAccent channel="apply" target={`${category}:${item.id}`} className="apply-accent" />
            <div className="catalogue-art">{category === "backgrounds" ? <RoomBackdrop theme={item.id} preview /> : category === "accessories" ? <div className="catalogue-pet-preview"><AnimalArt animal={{ ...friend, accessory: item.id }} /></div> : <Sprite kind="object" id={item.id} />}</div>
            <h3>{item.name}</h3>
            <div className="catalogue-status">{stockLabel && <span className={owned ? "stock-badge" : "muted"} aria-label={furniture && owned ? `${quantity} owned, ${stock} available` : undefined}>{stockLabel}</span>}</div>
            <div className="catalogue-actions">
              <Button type="button" sound={null} className={owned ? "small-button" : "primary-button"} disabled={active || (furniture && owned ? stock === 0 : !owned && available < item.price)} aria-label={owned ? `${active ? "Using" : furniture ? stock ? "Add" : "Placed" : "Use"} ${item.name}` : `Unlock ${item.name} for ${item.price} Shilligems`} onClick={() => owned ? applyItem(item) : act({ type: "BUY_ITEM", category, id: item.id })}>
                {active ? <><Icon name="check" size={16} /> {category === "backgrounds" ? "Active" : "Wearing"}</> : owned ? furniture ? stock ? <><Icon name="plus" size={16} /> Add</> : "Placed" : "Use" : "Buy"}
              </Button>
              {!owned && <span className="catalogue-price"><Icon name="gem" size={18} /> {item.price}</span>}
              {furniture && owned && <Button sound={null} className="text-button furniture-buy" disabled={available < item.price || quantity >= 999} aria-label={`Buy another ${item.name} for ${item.price} Shilligems`} onClick={() => act({ type: "BUY_ITEM", category, id: item.id })}>Buy more <Icon name="gem" size={14} /> {item.price}</Button>}
            </div>
          </section>;
        })}
      </div>
    </div>;
}
