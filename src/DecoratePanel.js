import { useState } from "react";
import { ACCESSORIES, ATELIER_PLACEMENTS, BACKGROUNDS, DECORATIONS, decorationAvailable, decorationQuantity, spendableGems } from "./game";
import { Accessory, Icon, RangeField, Sprite } from "./ui";
import RoomBackdrop from "./RoomBackdrop";

export default function DecoratePanel({ state, act, arranging, setArranging, selection, setSelection }) {
  const available = spendableGems(state);
  const [category, setCategory] = useState("decorations");
  const [friendId, setFriendId] = useState(state.animals[0]?.id || "");
  const friend = state.animals.find(animal => animal.id === friendId) || state.animals[0];
  const catalog = { backgrounds: BACKGROUNDS, accessories: ACCESSORIES, decorations: DECORATIONS }[category];
  const selectedObject = selection?.type === "animal"
    ? state.animals.find(animal => animal.id === selection.id && animal.placed)
    : selection?.type === "widget" ? { id: selection.id, ...state.room.widgets?.[selection.id] }
    : state.room.decorations.find(item => item.id === selection?.id);

  function applyItem(item) {
    if (category === "backgrounds") act({ type: "SET_BACKGROUND", id: item.id });
    if (category === "accessories" && friend) act({ type: "SET_ACCESSORY", animalId: friend.id, id: item.id });
    if (category === "decorations") {
      act({ type: "PLACE_DECORATION", item: item.id, ...(ATELIER_PLACEMENTS[item.id] || { x: 35, y: 72 }) });
    }
  }
  function move(axis, value) {
    if (selectedObject) act({ type: selection.type === "widget" ? "MOVE_WIDGET" : selection.type === "animal" ? "MOVE_ANIMAL" : "MOVE_DECORATION", id: selectedObject.id, [axis]: value });
  }
  return <>
    {arranging ? <>
      <div className="arrange-toolbar">
        <label className="field-label">Selected item
          <select value={selectedObject ? `${selection.type}:${selectedObject.id}` : ""} onChange={event => {
            const separator = event.target.value.indexOf(":");
            setSelection(separator < 0 ? null : { type: event.target.value.slice(0, separator), id: event.target.value.slice(separator + 1) });
          }}>
            <option value="">Select to move</option>
            <option value="widget:timer">Timer</option>
            <option value="widget:goal">Daily goal</option>
            {state.animals.filter(animal => animal.placed).map(animal => <option key={animal.id} value={`animal:${animal.id}`}>{animal.name}</option>)}
            {state.room.decorations.map((item, index) => <option key={item.id} value={`decoration:${item.id}`}>{DECORATIONS.find(decoration => decoration.id === item.item)?.name} · {index + 1}</option>)}
          </select>
        </label>
        {selectedObject && <>
          {selection.type !== "widget" && <div className="arrange-sliders">
            <RangeField label="Left to right" value={selectedObject.x} min={5} max={95} suffix="%" onChange={value => move("x", value)} />
            <RangeField label="Higher to lower" value={selectedObject.y} min={20} max={85} suffix="%" onChange={value => move("y", value)} />
          </div>}
          <button className="icon-button" aria-label="Deselect item" title="Deselect" onClick={() => setSelection(null)}><Icon name="close" size={18} /></button>
          {selection.type !== "widget" && <button className="text-button" onClick={() => {
            act(selection.type === "animal" ? { type: "PLACE_ANIMAL", id: selectedObject.id, placed: false } : { type: "REMOVE_DECORATION", id: selectedObject.id });
            setSelection(null);
          }}>Remove</button>}
        </>}
        <button className="secondary-button arrange-finish" onClick={() => { setSelection(null); setArranging(false); }}><Icon name="check" size={17} /> Done</button>
      </div>
      <div className="arrange-library" role="region" aria-label="Room library" tabIndex={0}>
        {DECORATIONS.filter(item => decorationQuantity(state, item.id) > 0).map(item => {
          const stock = decorationAvailable(state, item.id);
          return <button className="library-item" key={item.id} disabled={!stock} aria-label={`Add ${item.name}, ${stock} available`}
            onClick={() => act({ type: "PLACE_DECORATION", item: item.id, ...(ATELIER_PLACEMENTS[item.id] || { x: 50, y: 65 }) })}>
            <Sprite kind="object" id={item.id} /><span>{item.name}</span><small>{stock ? `${stock} available` : "Placed"}</small>
          </button>;
        })}
        {state.animals.map(animal => <button className="library-item" key={animal.id} disabled={animal.placed} aria-label={`Add ${animal.name}`}
          onClick={() => { act({ type: "PLACE_ANIMAL", id: animal.id, placed: true }); setSelection({ type: "animal", id: animal.id }); }}>
          <Sprite id={animal.species} rarity={animal.rarity} /><span>{animal.name}</span><small>{animal.placed ? "In room" : "Add"}</small>
        </button>)}
        <button className="library-item library-shop" onClick={() => { setSelection(null); setArranging(false); }}><Icon name="plus" size={26} /><span>Furniture shop</span></button>
      </div>
    </> : <>
      <div className="panel-toolbar catalog-toolbar">
        <div className="segmented" role="group" aria-label="Decoration categories">
          {[['decorations', 'Furniture'], ['backgrounds', 'Room style'], ['accessories', 'Accessories']].map(([id, name]) => <button type="button" key={id} aria-pressed={category === id} className={category === id ? "selected" : ""} onClick={() => setCategory(id)}>{name}</button>)}
        </div>
        <button type="button" className="primary-button arrange-start" onClick={() => setArranging(true)}><Icon name="move" size={18} /> Arrange room</button>
        <div className="wallet-line"><Icon name="gem" size={18} /><strong>{available.toLocaleString()}</strong></div>
      </div>
      {available < state.gems && <p className="small pending-reward">{available} Shilligems available · Finish this session to spend the {state.gems - available} earned so far.</p>}
      {category === "accessories" && <label className="field-label">Animal<select value={friend?.id || ""} onChange={event => setFriendId(event.target.value)}>
        {state.animals.map(animal => <option key={animal.id} value={animal.id}>{animal.name} · {animal.rarity}</option>)}
      </select></label>}
      <div className={`shop-items ${category === "backgrounds" ? "room-items" : ""}`}>
        {catalog.map(item => {
          const owned = state.owned[category].includes(item.id);
          const furniture = category === "decorations";
          const stock = furniture ? decorationAvailable(state, item.id) : 0;
          const quantity = furniture ? decorationQuantity(state, item.id) : 0;
          const active = category === "backgrounds" ? state.room.background === item.id : category === "accessories" && friend?.accessory === item.id;
          return <section className="shop-item" key={item.id}>
            {category === "backgrounds" ? <RoomBackdrop theme={item.id} preview /> : category === "accessories" ? <div className="accessory-preview">{item.id === "none" ? <span aria-hidden="true">—</span> : <Accessory id={item.id} />}</div> : <Sprite kind="object" id={item.id} />}
            <h3>{item.name}</h3>
            {furniture && owned && <span className="furniture-stock">{stock} / {quantity} available</span>}
            <button type="button" className="small-button" disabled={active || (furniture && owned ? stock === 0 : !owned && available < item.price)} aria-label={owned ? `${active ? "Using" : furniture ? stock ? "Add" : "Placed" : "Use"} ${item.name}` : `Unlock ${item.name} for ${item.price} Shilligems`} onClick={() => owned ? applyItem(item) : act({ type: "BUY_ITEM", category, id: item.id })}>
              {active ? <><Icon name="check" size={16} /> {category === "backgrounds" ? "Active" : "Wearing"}</> : owned ? furniture ? stock ? <><Icon name="plus" size={16} /> Add</> : "Placed" : "Use" : <><Icon name="gem" size={16} /> {item.price}</>}
            </button>
            {furniture && owned && <button className="text-button furniture-buy" disabled={available < item.price || quantity >= 999} aria-label={`Buy another ${item.name} for ${item.price} Shilligems`} onClick={() => act({ type: "BUY_ITEM", category, id: item.id })}>Buy more <Icon name="gem" size={13} /> {item.price}</button>}
          </section>;
        })}
      </div>
    </>}
  </>;
}
