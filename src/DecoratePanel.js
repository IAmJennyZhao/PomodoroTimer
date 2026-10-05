import { useState } from "react";
import { ACCESSORIES, ATELIER_PLACEMENTS, BACKGROUNDS, DECORATIONS, decorationAvailable, decorationQuantity, spendableGems } from "./game";
import { Accessory, Icon, Sprite } from "./ui";
import RoomBackdrop from "./RoomBackdrop";
import ArrangePanel from "./ArrangePanel";

export default function DecoratePanel({ state, act, arranging, setArranging, selection, setSelection, onNudgeWidget }) {
  const available = spendableGems(state);
  const [category, setCategory] = useState("decorations");
  const [friendId, setFriendId] = useState(state.animals[0]?.id || "");
  const friend = state.animals.find(animal => animal.id === friendId) || state.animals[0];
  const catalog = { backgrounds: BACKGROUNDS, accessories: ACCESSORIES, decorations: DECORATIONS }[category];
  function applyItem(item) {
    if (category === "backgrounds") act({ type: "SET_BACKGROUND", id: item.id });
    if (category === "accessories" && friend) act({ type: "SET_ACCESSORY", animalId: friend.id, id: item.id });
    if (category === "decorations") {
      act({ type: "PLACE_DECORATION", item: item.id, ...(ATELIER_PLACEMENTS[item.id] || { x: 35, y: 72 }) });
    }
  }
  if (arranging) return <ArrangePanel state={state} act={act} setArranging={setArranging} selection={selection} setSelection={setSelection} onNudgeWidget={onNudgeWidget} />;
  return <div className={`decoration-catalog catalogue-${category}`}>
      <div className="panel-toolbar catalog-toolbar">
        <div className="segmented" role="group" aria-label="Decoration categories">
          {[['decorations', 'Furniture'], ['backgrounds', 'Room style'], ['accessories', 'Accessories']].map(([id, name]) => <button type="button" key={id} aria-pressed={category === id} className={category === id ? "selected" : ""} onClick={() => setCategory(id)}>{name}</button>)}
        </div>
        <button type="button" className="primary-button arrange-start" onClick={() => setArranging(true)}><Icon name="move" size={18} /> Arrange room</button>
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
          const stockLabel = furniture ? owned ? stock ? `${stock} available` : `${quantity} owned` : "Not owned" : owned ? "" : "Not owned";
          return <section className={`shop-item catalogue-item ${owned ? "is-owned" : ""} ${active ? "is-active" : ""}`} key={item.id}>
            <div className="catalogue-art">{category === "backgrounds" ? <RoomBackdrop theme={item.id} preview /> : category === "accessories" ? <div className="accessory-preview">{item.id === "none" ? <span aria-hidden="true">—</span> : <Accessory id={item.id} />}</div> : <Sprite kind="object" id={item.id} />}</div>
            <h3>{item.name}</h3>
            <div className="catalogue-status">{stockLabel && <span className={owned ? "stock-badge" : "muted"} aria-label={furniture && owned ? `${quantity} owned, ${stock} available` : undefined}>{stockLabel}</span>}</div>
            <div className="catalogue-actions">
              <button type="button" className={owned ? "small-button" : "primary-button"} disabled={active || (furniture && owned ? stock === 0 : !owned && available < item.price)} aria-label={owned ? `${active ? "Using" : furniture ? stock ? "Add" : "Placed" : "Use"} ${item.name}` : `Unlock ${item.name} for ${item.price} Shilligems`} onClick={() => owned ? applyItem(item) : act({ type: "BUY_ITEM", category, id: item.id })}>
                {active ? <><Icon name="check" size={16} /> {category === "backgrounds" ? "Active" : "Wearing"}</> : owned ? furniture ? stock ? <><Icon name="plus" size={16} /> Add</> : "Placed" : "Use" : "Buy"}
              </button>
              {!owned && <span className="catalogue-price"><Icon name="gem" size={18} /> {item.price}</span>}
              {furniture && owned && <button className="text-button furniture-buy" disabled={available < item.price || quantity >= 999} aria-label={`Buy another ${item.name} for ${item.price} Shilligems`} onClick={() => act({ type: "BUY_ITEM", category, id: item.id })}>Buy more <Icon name="gem" size={14} /> {item.price}</button>}
            </div>
          </section>;
        })}
      </div>
    </div>;
}
