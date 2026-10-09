import { Button } from "../../shared/Controls";
import { useContext, useEffect, useRef, useState } from "react";
import { DECORATIONS, decorationAvailable, decorationQuantity } from "../../domain/game";
import { Icon, InfoTip, Sprite } from "../../shared/ui";
import { MotionPreferenceContext } from "../../shared/useReducedMotion";

export default function ArrangePanel({ state, act, setArranging, selection, setSelection, onOpenShop, pendingFurniture, onPlaceFurniture, onConfirmPlacement, onCancelPlacement, onFinish }) {
  const libraryRef = useRef(null);
  const reduced = useContext(MotionPreferenceContext) || state.settings.reducedMotion;
  const [edges, setEdges] = useState({ start: true, end: true });
  const selectedObject = selection?.id === pendingFurniture?.id && pendingFurniture ? pendingFurniture : selection?.type === "animal" ? state.animals.find(item => item.id === selection.id && item.placed)
    : selection?.type === "widget" && ["timer", "goal"].includes(selection.id) ? { id: selection.id }
    : selection?.type === "decoration" ? state.room.decorations.find(item => item.id === selection.id) : null;
  const furnitureName = item => {
    const copies = state.room.decorations.filter(copy => copy.item === item.item);
    const name = DECORATIONS.find(kind => kind.id === item.item)?.name || "Furniture";
    return copies.length > 1 ? `${name} · ${copies.findIndex(copy => copy.id === item.id) + 1}` : name;
  };
  const revealSelection = behavior => {
    const library = libraryRef.current;
    const tile = library?.querySelector(".library-item.selected");
    if (!tile) return;
    const bounds = library.getBoundingClientRect();
    const item = tile.getBoundingClientRect();
    const delta = item.left < bounds.left ? item.left - bounds.left : item.right > bounds.right ? item.right - bounds.right : 0;
    if (delta) library.scrollBy({ left: delta, behavior });
  };
  useEffect(() => {
    const library = libraryRef.current;
    const measure = () => setEdges({ start: library.scrollLeft <= 1, end: library.scrollLeft + library.clientWidth >= library.scrollWidth - 1 });
    measure();
    library.addEventListener("scroll", measure);
    const resize = () => { measure(); revealSelection("auto"); };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(library);
    window.addEventListener("resize", resize);
    return () => { library.removeEventListener("scroll", measure); observer?.disconnect(); window.removeEventListener("resize", resize); };
  }, [state.owned.decorations, state.animals]);
  useEffect(() => {
    revealSelection(reduced ? "auto" : "smooth");
  }, [selection, reduced]);
  const browse = direction => libraryRef.current.scrollBy({ left: direction * libraryRef.current.clientWidth * .75, behavior: reduced ? "auto" : "smooth" });
  return <div className={`arrange-panel ${pendingFurniture ? "has-placement" : ""}`}>
    <div className="arrange-toolbar">
      <label className="field-label"><span className="visually-hidden">Selected item</span>
        <select value={selectedObject ? `${selection.type}:${selectedObject.id}` : ""} onChange={event => {
          const separator = event.target.value.indexOf(":");
          setSelection(separator < 0 ? null : { type: event.target.value.slice(0, separator), id: event.target.value.slice(separator + 1) });
        }}>
          <option value="">Select an item</option><option value="widget:timer">Timer</option><option value="widget:goal">Daily goal</option>
          {pendingFurniture && <option value={`decoration:${pendingFurniture.id}`}>Placing {DECORATIONS.find(item => item.id === pendingFurniture.item)?.name}</option>}
          {state.animals.filter(item => item.placed).map(item => <option key={item.id} value={`animal:${item.id}`}>{item.name}</option>)}
          {state.room.decorations.map(item => <option key={item.id} value={`decoration:${item.id}`}>{furnitureName(item)}</option>)}
        </select>
      </label>
      <Button type="button" className="icon-button arrange-deselect" aria-label="Deselect item" disabled={!selectedObject} onClick={() => setSelection(null)}><Icon name="close" size={18} /></Button>
      <InfoTip label="Arrange controls">Drag an item or its move handle. Arrow keys nudge; Shift moves farther. Click a library tile to select placed furniture; click again to select its next copy.</InfoTip>
      <Button type="button" className="text-button arrange-remove" disabled={!pendingFurniture && (!selectedObject || selection.type === "widget")} onClick={() => {
        if (pendingFurniture) { onCancelPlacement(); return; }
        act(selection.type === "animal" ? { type: "PLACE_ANIMAL", id: selectedObject.id, placed: false } : { type: "REMOVE_DECORATION", id: selectedObject.id });
        setSelection(null);
      }}>{pendingFurniture ? "Cancel placement" : "Remove"}</Button>
      <Button type="button" className="secondary-button arrange-finish" onClick={() => {
        if (pendingFurniture) onConfirmPlacement();
        setSelection(null); setArranging(false); onFinish?.();
      }}><Icon name="check" size={17} /> {pendingFurniture ? "Place & Done" : "Done"}</Button>
    </div>
    {pendingFurniture && <div className="placement-instructions" role="status">Drag and release to place, or choose Place &amp; Done. Cancel keeps this copy in your library.</div>}
    <div className="library-browser">
      <Button type="button" className="icon-button library-previous" disabled={edges.start} aria-label="Previous library items" onClick={() => browse(-1)}><span className="nudge-arrow nudge-left"><Icon name="arrow" size={20} /></span></Button>
      <div ref={libraryRef} className="arrange-library" role="region" aria-label="Room library" tabIndex={0}>
        {DECORATIONS.filter(item => decorationQuantity(state, item.id) > 0).map(item => {
          const stock = decorationAvailable(state, item.id);
          const copies = state.room.decorations.filter(copy => copy.item === item.id);
          const selected = selection?.type === "decoration" && (copies.some(copy => copy.id === selection.id) || pendingFurniture?.item === item.id);
          const add = () => onPlaceFurniture(item);
          return <div className="library-card" key={item.id}>
            <Button type="button" sound={copies.length ? undefined : null} className={`library-item ${selected ? "selected" : ""}`} aria-pressed={selected} title={item.name}
              aria-label={copies.length ? `Select ${item.name}, ${copies.length} in room` : `Add ${item.name}, ${stock} available`}
              onClick={() => copies.length ? setSelection({ type: "decoration", id: copies[(copies.findIndex(copy => copy.id === selection?.id) + 1) % copies.length].id }) : add()}>
              <Sprite kind="object" id={item.id} /><span>{item.name}</span><small>{stock ? `${stock} available` : copies.length > 1 ? `${copies.length} in room` : "Placed"}</small>
            </Button>
            {copies.length > 0 && stock > 0 && <Button sound={null} type="button" className="library-add icon-button" aria-label={`Add ${item.name}, ${stock} available`} onClick={add}><Icon name="plus" size={17} /></Button>}
          </div>;
        })}
        {state.animals.map(animal => <Button type="button" sound={animal.placed ? undefined : null} className={`library-item ${selection?.type === "animal" && selection.id === animal.id ? "selected" : ""}`} key={animal.id}
          aria-pressed={selection?.type === "animal" && selection.id === animal.id} title={animal.name} aria-label={`${animal.placed ? "Select" : "Add"} ${animal.name}`}
          onClick={() => { if (!animal.placed) act({ type: "PLACE_ANIMAL", id: animal.id, placed: true }); setSelection({ type: "animal", id: animal.id }); }}>
          <Sprite id={animal.species} rarity={animal.rarity} /><span>{animal.name}</span><small>{animal.placed ? "In room" : "Add"}</small>
        </Button>)}
        {[["timer", "Timer", "clock"], ["goal", "Daily goal", "check"]].map(([id, name, icon]) => <Button type="button" key={id} className={`library-item library-widget ${selection?.type === "widget" && selection.id === id ? "selected" : ""}`} aria-label={`Select ${name}`} aria-pressed={selection?.type === "widget" && selection.id === id} onClick={() => setSelection({ type: "widget", id })}><span className="widget-sketch"><Icon name={icon} size={30} /></span><span>{name}</span><small>Move</small></Button>)}
        <Button type="button" className="library-item library-shop" onClick={onOpenShop}><Icon name="plus" size={26} /><span>Furniture shop</span></Button>
      </div>
      <Button type="button" className="icon-button library-next" disabled={edges.end} aria-label="Next library items" onClick={() => browse(1)}><Icon name="arrow" size={20} /></Button>
    </div>
  </div>;
}
