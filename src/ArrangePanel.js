import { useEffect, useRef, useState } from "react";
import { ATELIER_PLACEMENTS, DECORATIONS, decorationAvailable, decorationQuantity } from "./game";
import { Icon, InfoTip, Sprite } from "./ui";

const directions = ["left", "right", "up", "down"];

export default function ArrangePanel({ state, act, setArranging, selection, setSelection, onNudgeWidget, onOpenShop }) {
  const libraryRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const selectedObject = selection?.type === "animal" ? state.animals.find(item => item.id === selection.id && item.placed)
    : selection?.type === "widget" && ["timer", "goal"].includes(selection.id) ? { id: selection.id }
    : selection?.type === "decoration" ? state.room.decorations.find(item => item.id === selection.id) : null;
  const furnitureName = item => {
    const copies = state.room.decorations.filter(copy => copy.item === item.item);
    const name = DECORATIONS.find(kind => kind.id === item.item)?.name || "Furniture";
    return copies.length > 1 ? `${name} · ${copies.findIndex(copy => copy.id === item.id) + 1}` : name;
  };
  useEffect(() => {
    const library = libraryRef.current;
    const measure = () => setEdges({ start: library.scrollLeft <= 1, end: library.scrollLeft + library.clientWidth >= library.scrollWidth - 1 });
    measure();
    library.addEventListener("scroll", measure);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(library);
    window.addEventListener("resize", measure);
    return () => { library.removeEventListener("scroll", measure); observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [state.owned.decorations, state.animals]);
  useEffect(() => {
    const library = libraryRef.current;
    const tile = library.querySelector(".library-item.selected");
    if (!tile) return;
    const bounds = library.getBoundingClientRect();
    const item = tile.getBoundingClientRect();
    const delta = item.left < bounds.left ? item.left - bounds.left : item.right > bounds.right ? item.right - bounds.right : 0;
    if (delta) library.scrollBy({ left: delta, behavior: state.settings.reducedMotion ? "auto" : "smooth" });
  }, [selection, state.settings.reducedMotion]);
  const browse = direction => libraryRef.current.scrollBy({ left: direction * libraryRef.current.clientWidth * .75, behavior: state.settings.reducedMotion ? "auto" : "smooth" });
  function nudge(direction) {
    if (!selectedObject) return;
    if (selection.type === "widget") { onNudgeWidget?.(selection.id, direction); return; }
    const axis = ["left", "right"].includes(direction) ? "x" : "y";
    const delta = ["left", "up"].includes(direction) ? -1 : 1;
    act({ type: selection.type === "animal" ? "MOVE_ANIMAL" : "MOVE_DECORATION", id: selectedObject.id,
      [axis]: Math.max(axis === "x" ? 5 : 20, Math.min(axis === "x" ? 95 : 85, selectedObject[axis] + delta)) });
  }
  return <div className="arrange-panel">
    <div className="arrange-toolbar">
      <label className="field-label"><span className="visually-hidden">Selected item</span>
        <select value={selectedObject ? `${selection.type}:${selectedObject.id}` : ""} onChange={event => {
          const separator = event.target.value.indexOf(":");
          setSelection(separator < 0 ? null : { type: event.target.value.slice(0, separator), id: event.target.value.slice(separator + 1) });
        }}>
          <option value="">Select an item</option><option value="widget:timer">Timer</option><option value="widget:goal">Daily goal</option>
          {state.animals.filter(item => item.placed).map(item => <option key={item.id} value={`animal:${item.id}`}>{item.name}</option>)}
          {state.room.decorations.map(item => <option key={item.id} value={`decoration:${item.id}`}>{furnitureName(item)}</option>)}
        </select>
      </label>
      <button type="button" className="icon-button arrange-deselect" aria-label="Deselect item" disabled={!selectedObject} onClick={() => setSelection(null)}><Icon name="close" size={18} /></button>
      <InfoTip label="Arrange controls">Drag an item or its move handle. Arrow keys nudge; Shift moves farther. Click a library tile to select placed furniture; click again to select its next copy.</InfoTip>
      <div className="arrange-nudges" role="group" aria-label="Move selected item">
        {directions.map(direction => <button type="button" className="small-button" key={direction} disabled={!selectedObject} aria-label={`Move selected item ${direction}`} onClick={() => nudge(direction)}><span className={`nudge-arrow nudge-${direction}`}><Icon name="arrow" size={18} /></span></button>)}
      </div>
      <button type="button" className="text-button arrange-remove" disabled={!selectedObject || selection.type === "widget"} onClick={() => {
        act(selection.type === "animal" ? { type: "PLACE_ANIMAL", id: selectedObject.id, placed: false } : { type: "REMOVE_DECORATION", id: selectedObject.id });
        setSelection(null);
      }}>Remove</button>
      <button type="button" className="secondary-button arrange-finish" onClick={() => { setSelection(null); setArranging(false); }}><Icon name="check" size={17} /> Done</button>
    </div>
    <div className="library-browser">
      <button type="button" className="icon-button library-previous" disabled={edges.start} aria-label="Previous library items" onClick={() => browse(-1)}><span className="nudge-arrow nudge-left"><Icon name="arrow" size={20} /></span></button>
      <div ref={libraryRef} className="arrange-library" role="region" aria-label="Room library" tabIndex={0}>
        {DECORATIONS.filter(item => decorationQuantity(state, item.id) > 0).map(item => {
          const stock = decorationAvailable(state, item.id);
          const copies = state.room.decorations.filter(copy => copy.item === item.id);
          const selected = selection?.type === "decoration" && copies.some(copy => copy.id === selection.id);
          const add = () => act({ type: "PLACE_DECORATION", item: item.id, ...(ATELIER_PLACEMENTS[item.id] || { x: 50, y: 65 }) });
          return <div className="library-card" key={item.id}>
            <button type="button" className={`library-item ${selected ? "selected" : ""}`} aria-pressed={selected}
              aria-label={copies.length ? `Select ${item.name}, ${copies.length} in room` : `Add ${item.name}, ${stock} available`}
              onClick={() => copies.length ? setSelection({ type: "decoration", id: copies[(copies.findIndex(copy => copy.id === selection?.id) + 1) % copies.length].id }) : add()}>
              <Sprite kind="object" id={item.id} /><span>{item.name}</span><small>{stock ? `${stock} available` : copies.length > 1 ? `${copies.length} in room` : "Placed"}</small>
            </button>
            {copies.length > 0 && stock > 0 && <button type="button" className="library-add icon-button" aria-label={`Add ${item.name}, ${stock} available`} onClick={add}><Icon name="plus" size={17} /></button>}
          </div>;
        })}
        {state.animals.map(animal => <button type="button" className={`library-item ${selection?.type === "animal" && selection.id === animal.id ? "selected" : ""}`} key={animal.id}
          aria-pressed={selection?.type === "animal" && selection.id === animal.id} aria-label={`${animal.placed ? "Select" : "Add"} ${animal.name}`}
          onClick={() => { if (!animal.placed) act({ type: "PLACE_ANIMAL", id: animal.id, placed: true }); setSelection({ type: "animal", id: animal.id }); }}>
          <Sprite id={animal.species} rarity={animal.rarity} /><span>{animal.name}</span><small>{animal.placed ? "In room" : "Add"}</small>
        </button>)}
        {[["timer", "Timer", "clock"], ["goal", "Daily goal", "check"]].map(([id, name, icon]) => <button type="button" key={id} className={`library-item library-widget ${selection?.type === "widget" && selection.id === id ? "selected" : ""}`} aria-label={`Select ${name}`} aria-pressed={selection?.type === "widget" && selection.id === id} onClick={() => setSelection({ type: "widget", id })}><span className="widget-sketch"><Icon name={icon} size={30} /></span><span>{name}</span><small>Move</small></button>)}
        <button type="button" className="library-item library-shop" onClick={onOpenShop}><Icon name="plus" size={26} /><span>Furniture shop</span></button>
      </div>
      <button type="button" className="icon-button library-next" disabled={edges.end} aria-label="Next library items" onClick={() => browse(1)}><Icon name="arrow" size={20} /></button>
    </div>
  </div>;
}
