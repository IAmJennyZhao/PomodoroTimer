import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./ui";

// Saved positions use the top-left corner, relative to the room. Clamp the
// rendered location to the current screen without overwriting the saved layout.
export default function RoomWidget({ as: Tag = "div", id, name, className, position, arranging, selected, onSelect, onMove, onDeselect, hidden, children }) {
  const ref = useRef(null);
  const pointer = useRef(null);
  const [draft, setDraft] = useState(null);
  const [location, setLocation] = useState(null);
  useLayoutEffect(() => {
    const place = () => {
      if (!position || !ref.current) { setLocation(null); return; }
      const room = ref.current.parentElement.getBoundingClientRect();
      const bounds = ref.current.getBoundingClientRect();
      const minTop = (window.innerWidth <= 600 ? 104 : 74) + (arranging ? 30 : 0);
      setLocation({
        left: Math.max(12, Math.min(room.width - bounds.width - 12, room.width * position.x / 100)),
        top: Math.max(minTop, Math.min(room.height - bounds.height - 12, room.height * position.y / 100)),
      });
    };
    place();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (ref.current) observer?.observe(ref.current);
    window.addEventListener("resize", place);
    return () => { observer?.disconnect(); window.removeEventListener("resize", place); };
  }, [position, hidden, arranging]);
  function move(left, top) {
    const room = ref.current.parentElement.getBoundingClientRect();
    const bounds = ref.current.getBoundingClientRect();
    const next = {
      left: Math.max(12, Math.min(room.width - bounds.width - 12, left)),
      top: Math.max((window.innerWidth <= 600 ? 104 : 74) + (arranging ? 30 : 0), Math.min(room.height - bounds.height - 12, top)),
    };
    setDraft(next);
    return { x: next.left / room.width * 100, y: next.top / room.height * 100 };
  }
  const rendered = draft || location;
  return <Tag ref={ref} className={`${className} room-widget ${arranging ? "arrange-widget" : ""} ${selected ? "chosen" : ""}`} hidden={hidden}
    style={rendered ? { left: rendered.left, top: rendered.top, right: "auto", transform: "none" } : undefined}>
    <div className="widget-content" inert={arranging ? "" : undefined}>{children}</div>
    {arranging && <>
      <button className="widget-move-handle" aria-label={`Move ${name}`} aria-pressed={selected}
        onClick={() => onSelect({ type: "widget", id })}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          const bounds = ref.current.getBoundingClientRect();
          const room = ref.current.parentElement.getBoundingClientRect();
          pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: bounds.left - room.left, top: bounds.top - room.top, next: null };
          onSelect({ type: "widget", id });
        }}
        onPointerMove={event => {
          const start = pointer.current;
          if (start?.id === event.pointerId) start.next = move(start.left + event.clientX - start.x, start.top + event.clientY - start.y);
        }}
        onPointerUp={() => {
          if (pointer.current?.next) onMove(pointer.current.next);
          pointer.current = null;
          setDraft(null);
        }}
        onPointerCancel={() => { pointer.current = null; setDraft(null); }}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          const room = ref.current.parentElement.getBoundingClientRect();
          const bounds = ref.current.getBoundingClientRect();
          const step = event.shiftKey ? 40 : 10;
          onSelect({ type: "widget", id });
          onMove(move(bounds.left - room.left + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
            bounds.top - room.top + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0)));
          setDraft(null);
        }}><Icon name="move" size={17} /> {name}</button>
      {selected && <button className="selection-close" aria-label={`Deselect ${name}`} onClick={onDeselect}><Icon name="close" size={16} /></button>}
    </>}
  </Tag>;
}
