import { useState } from "react";
import { ACCESSORIES, BACKGROUNDS, DECORATIONS, spendableGems } from "./game";
import { Accessory, Icon, RangeField, Sprite } from "./ui";
import RoomBackdrop from "./RoomBackdrop";

const DEFAULT_PLACEMENTS = {
  couch: { x: 76, y: 65 }, rug: { x: 53, y: 79 }, bookshelf: { x: 91, y: 47 },
  "window-plants": { x: 81, y: 54 }, table: { x: 26, y: 66 }, "side-table": { x: 58, y: 65 },
};

export default function DecoratePanel({ state, act, arranging, setArranging, selection, setSelection }) {
  const available = spendableGems(state);
  const [category, setCategory] = useState("decorations");
  const [friendId, setFriendId] = useState(state.animals[0]?.id || "");
  const friend = state.animals.find(animal => animal.id === friendId) || state.animals[0];
  const catalog = { backgrounds: BACKGROUNDS, accessories: ACCESSORIES, decorations: DECORATIONS }[category];
  const selectedObject = selection?.type === "animal"
    ? state.animals.find(animal => animal.id === selection.id && animal.placed)
    : state.room.decorations.find(item => item.id === selection?.id);

  function applyItem(item) {
    if (category === "backgrounds") act({ type: "SET_BACKGROUND", id: item.id });
    if (category === "accessories" && friend) act({ type: "SET_ACCESSORY", animalId: friend.id, id: item.id });
    if (category === "decorations") {
      act({ type: "PLACE_DECORATION", item: item.id, ...(DEFAULT_PLACEMENTS[item.id] || { x: 35, y: 72 }) });
    }
  }
  function move(axis, value) {
    if (selectedObject) act({ type: selection.type === "animal" ? "MOVE_ANIMAL" : "MOVE_DECORATION", id: selectedObject.id, [axis]: value });
  }
  return <>
    {arranging ? <>
      <p className="arrange-tip">Drag a pet or decoration anywhere in the room. Use the sliders or arrow keys for a little nudge. Pets can sit on furniture.</p>
      <section className="detail-card arrange-controls" aria-label="Room position">
        <label className="field-label">Selected item
          <select value={selectedObject ? `${selection.type}:${selectedObject.id}` : ""} onChange={event => {
            const separator = event.target.value.indexOf(":");
            setSelection(separator < 0 ? null : { type: event.target.value.slice(0, separator), id: event.target.value.slice(separator + 1) });
          }}>
            <option value="">Choose an item</option>
            {state.animals.filter(animal => animal.placed).map(animal => <option key={animal.id} value={`animal:${animal.id}`}>{animal.name}</option>)}
            {state.room.decorations.map((item, index) => <option key={item.id} value={`decoration:${item.id}`}>{DECORATIONS.find(decoration => decoration.id === item.item)?.name} · {index + 1}</option>)}
          </select>
        </label>
        {selectedObject && <>
          <RangeField label="Left to right" value={selectedObject.x} min={5} max={95} suffix="%" onChange={value => move("x", value)} />
          <RangeField label="Higher to lower" value={selectedObject.y} min={20} max={85} suffix="%" onChange={value => move("y", value)} />
          <button type="button" className="text-button" onClick={() => {
            act(selection.type === "animal" ? { type: "PLACE_ANIMAL", id: selectedObject.id, placed: false } : { type: "REMOVE_DECORATION", id: selectedObject.id });
            setSelection(null);
          }}>{selection.type === "animal" ? "Return to collection" : "Remove from room"}</button>
        </>}
      </section>
      <button type="button" className="secondary-button full-width arrange-start" onClick={() => setArranging(false)}><Icon name="check" size={18} /> Back to decorating</button>
    </> : <>
      <div className="arrange-intro">
        <div><h3>A little room, your way</h3><p>Add something cozy, then put it wherever you like.</p></div>
        <button type="button" className="primary-button arrange-start" onClick={() => setArranging(true)}><Icon name="move" size={18} /> Arrange room</button>
      </div>
      <div className="panel-toolbar catalog-toolbar">
        <div className="segmented" role="group" aria-label="Decoration categories">
          {[['decorations', 'Furniture'], ['backgrounds', 'Room style'], ['accessories', 'Accessories']].map(([id, name]) => <button type="button" key={id} aria-pressed={category === id} className={category === id ? "selected" : ""} onClick={() => setCategory(id)}>{name}</button>)}
        </div>
        <div className="wallet-line"><Icon name="gem" size={18} /><strong>{available.toLocaleString()}</strong></div>
      </div>
      {available < state.gems && <p className="small pending-reward">{available} Shilligems available · Finish this session to spend the {state.gems - available} earned so far.</p>}
      {category === "accessories" && <label className="field-label">Animal<select value={friend?.id || ""} onChange={event => setFriendId(event.target.value)}>
        {state.animals.map(animal => <option key={animal.id} value={animal.id}>{animal.name} · {animal.rarity}</option>)}
      </select></label>}
      <div className={`shop-items ${category === "backgrounds" ? "room-items" : ""}`}>
        {catalog.map(item => {
          const owned = state.owned[category].includes(item.id);
          const active = category === "backgrounds" ? state.room.background === item.id : category === "accessories" && friend?.accessory === item.id;
          return <section className="shop-item" key={item.id}>
            {category === "backgrounds" ? <RoomBackdrop theme={item.id} preview /> : category === "accessories" ? <div className="accessory-preview">{item.id === "none" ? <span aria-hidden="true">—</span> : <Accessory id={item.id} />}</div> : <Sprite kind="object" id={item.id} />}
            <h3>{item.name}</h3>
            {category === "backgrounds" && <p className="room-item-description">Wall, floor & window</p>}
            <button type="button" className="small-button" disabled={active || (!owned && available < item.price)} aria-label={owned ? `${active ? "Using" : category === "decorations" ? "Add" : "Use"} ${item.name}` : `Unlock ${item.name} for ${item.price} Shilligems`} onClick={() => owned ? applyItem(item) : act({ type: "BUY_ITEM", category, id: item.id })}>
              {active ? <><Icon name="check" size={16} /> {category === "backgrounds" ? "Active" : "Wearing"}</> : owned ? category === "decorations" ? <><Icon name="plus" size={16} /> Add to room</> : "Use" : <><Icon name="gem" size={16} /> {item.price}</>}
            </button>
          </section>;
        })}
      </div>
      {category === "decorations" && <p className="furniture-library-note">The couch, rug, bookshelf, window plants and tables are yours to place. Furniture stays in your collection when you remove it. Add as many copies as you like.</p>}
    </>}
  </>;
}
