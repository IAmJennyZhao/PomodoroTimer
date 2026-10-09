import { Button } from "../../shared/Controls";
import { forwardRef, useCallback, useContext, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../../shared/ui";
import usePlacementGesture from "./usePlacementGesture";
import { RoomVisual } from "./RoomInteraction";
import { OutcomeFeedbackContext } from "../../shared/OutcomeFeedback";
import { ArrangementCameraContext, ROOM_SIZE, WIDGET_HOME } from "./roomGeometry";

// Saved positions use the top-left corner, relative to the room. Clamp the
// rendered location to the current screen without overwriting the saved layout.
const RoomWidget = forwardRef(function RoomWidget({ as: Tag = "div", id, name, className, position, arranging, selected, onSelect, onMove, onDeselect, hidden, concealed, children }, controlRef) {
  const ref = useRef(null);
  const camera = useContext(ArrangementCameraContext);
  const effectivePosition = position || (camera ? WIDGET_HOME[id] : null);
  const roomBounds = () => camera ? ROOM_SIZE : ref.current.parentElement.getBoundingClientRect();
  const widgetBounds = () => {
    const bounds = ref.current.getBoundingClientRect();
    return camera ? { width: ref.current.offsetWidth, height: ref.current.offsetHeight } : bounds;
  };
  const { showOutcome, clearOutcome } = useContext(OutcomeFeedbackContext);
  const cancelId = useRef(0);
  const [location, setLocation] = useState(null);
  const clampLocation = useCallback((left, top, room, bounds) => {
    if (camera) return { left: Math.max(12, Math.min(room.width - bounds.width - 12, left)),
      top: Math.max(60, Math.min(room.height - bounds.height - 12, top)) };
    const dock = arranging ? ref.current.parentElement.querySelector(".workspace-decorate")?.getBoundingClientRect() : null;
    const narrowLandscape = window.innerWidth >= 500 && window.innerWidth <= 600 && window.innerHeight <= 500;
    const header = narrowLandscape ? ref.current.parentElement.querySelector(".app-header")?.getBoundingClientRect() : null;
    const minTop = header ? header.bottom - room.top + (arranging ? 48 : 12)
      : (window.innerWidth <= 600 ? 104 : 74) + (arranging ? 36 : 0);
    const bottom = dock ? dock.top - room.top - 12 : room.height - 12;
    return { left: Math.max(12, Math.min(room.width - bounds.width - 12, left)),
      top: Math.max(minTop, Math.min(bottom - bounds.height, top)) };
  }, [arranging, camera]);
  useLayoutEffect(() => {
    const place = () => {
      if (!effectivePosition || !ref.current) { setLocation(null); return; }
      const room = camera ? ROOM_SIZE : ref.current.parentElement.getBoundingClientRect();
      const bounds = camera ? { width: ref.current.offsetWidth, height: ref.current.offsetHeight } : ref.current.getBoundingClientRect();
      const next = clampLocation(room.width * effectivePosition.x / 100, room.height * effectivePosition.y / 100, room, bounds);
      setLocation(previous => previous?.left === next.left && previous?.top === next.top ? previous : next);
    };
    place();
    let frame;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (ref.current) observer?.observe(ref.current);
    const dock = ref.current?.parentElement.querySelector(".workspace-decorate");
    if (arranging && dock) observer?.observe(dock);
    window.addEventListener("resize", place);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", place); };
  }, [effectivePosition, camera, hidden, concealed, arranging, clampLocation]);
  function move(left, top) {
    const room = roomBounds();
    const bounds = widgetBounds();
    const next = clampLocation(left, top, room, bounds);
    return { x: next.left / room.width * 100, y: next.top / room.height * 100 };
  }
  const gesture = usePlacementGesture({
    enabled: arranging && !hidden && !concealed,
    project: (origin, event) => {
      const room = roomBounds();
      const scale = camera?.scale || 1;
      const next = clampLocation(origin.left + (event.clientX - origin.pointerX) / scale, origin.top + (event.clientY - origin.pointerY) / scale, room, widgetBounds());
      return { ...next, x: next.left / room.width * 100, y: next.top / room.height * 100 };
    },
    commit: (next, origin) => { if (next.left !== origin.left || next.top !== origin.top) onMove({ x: next.x, y: next.y }); },
    onCancel: (origin, reason) => showOutcome?.("room", { id: `widget-return:${id}:${++cancelId.current}`, target: `widget:${id}`, kind: "cancelled",
      dx: reason === "cancel" ? origin.next.left - origin.left : 0,
      dy: reason === "cancel" ? origin.next.top - origin.top : 0 }),
  });
  const draft = gesture.draft;
  const rendered = draft || location;
  function nudge(direction, large = false) {
    if (hidden || concealed) return;
    const room = ref.current.parentElement.getBoundingClientRect();
    const bounds = ref.current.getBoundingClientRect();
    const step = large ? 40 : 10;
    onSelect({ type: "widget", id });
    const left = camera ? location.left : bounds.left - room.left;
    const top = camera ? location.top : bounds.top - room.top;
    const distance = step / (camera?.scale || 1);
    onMove(move(left + (direction === "left" ? -distance : direction === "right" ? distance : 0),
      top + (direction === "up" ? -distance : direction === "down" ? distance : 0)));
  }
  useImperativeHandle(controlRef, () => ({ nudge }));
  return <Tag ref={ref} className={`${className} room-widget ${arranging ? "arrange-widget" : ""} ${selected ? "chosen" : ""}`} hidden={hidden}
    data-concealed={concealed ? "true" : undefined} aria-hidden={concealed ? true : undefined} inert={concealed ? "" : undefined}
    style={rendered ? { left: camera ? camera.left + rendered.left * camera.scale : rendered.left,
      top: camera ? camera.top + rendered.top * camera.scale : rendered.top, right: "auto",
      transform: camera ? `scale(${camera.scale})` : "none", transformOrigin: "0 0",
      ...(camera ? { "--room-edit-inverse": 1 / camera.scale,
        "--selection-close-offset": camera.left + (rendered.left + ref.current?.offsetWidth / 2) * camera.scale > window.innerWidth - 74 ? "-70px" : "26px" } : {}) } : undefined}>
    {arranging && <span className="widget-preview-name" aria-hidden="true">{id === "timer" ? "Timer" : "Daily goal"}</span>}
    <RoomVisual target={`widget:${id}`} lifted={Boolean(draft)} className="widget-content" inert={arranging ? "" : undefined}>{children}</RoomVisual>
    {arranging && <>
      <span className="visually-hidden" id={`${id}-move-help`}>Drag to move. Arrow keys nudge; Shift moves farther.</span>
      <button type="button" className="widget-move-handle" aria-label={`Move ${name}`} aria-describedby={`${id}-move-help`} aria-pressed={selected}
        onClick={() => onSelect({ type: "widget", id })}
        onPointerDown={event => {
          const bounds = ref.current.getBoundingClientRect();
          const room = ref.current.parentElement.getBoundingClientRect();
          if (gesture.start(event, { left: camera ? location.left : bounds.left - room.left,
            top: camera ? location.top : bounds.top - room.top })) {
            clearOutcome?.("room");
            onSelect({ type: "widget", id });
          }
        }}
        {...gesture.handlers}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          if (draft) { gesture.cancel(); return; }
          nudge(event.key.replace("Arrow", "").toLowerCase(), event.shiftKey);
        }}><Icon name="move" size={20} /></button>
      {selected && <Button className="selection-close" aria-label={`Deselect ${name}`} onClick={() => { ref.current.querySelector(".widget-move-handle").focus(); onDeselect(); }}><Icon name="close" size={16} /></Button>}
    </>}
  </Tag>;
});
export default RoomWidget;
