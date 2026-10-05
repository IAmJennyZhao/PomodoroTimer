import { Children, forwardRef, useLayoutEffect, useRef, useState } from "react";

// A temporary zoom keeps the editable furniture canvas above the workbench.
// Coordinates and source art proportions remain unchanged.
const RoomObjects = forwardRef(function RoomObjects({ arranging, children }, forwardedRef) {
  const localRef = useRef(null);
  const [scale, setScale] = useState(1);
  const itemCount = Children.count(children);
  useLayoutEffect(() => {
    if (!arranging) return;
    const objects = localRef.current;
    const scene = objects.parentElement;
    const dock = scene.parentElement.querySelector(".workspace-decorate");
    const measure = () => {
      const room = scene.getBoundingClientRect();
      const residents = Array.from(objects.children);
      const lowest = Math.max(room.height * .5, ...residents.map(item => parseFloat(item.style.getPropertyValue("--room-y")) / 100 * room.height + item.offsetHeight / 2));
      const horizontalExtent = Math.max(room.width * .25, ...residents.map(item => Math.abs(parseFloat(item.style.getPropertyValue("--room-x")) / 100 * room.width - room.width / 2) + item.offsetWidth / 2));
      const available = (dock?.getBoundingClientRect().top ?? room.bottom) - room.top - 18;
      const fitHeight = available / (lowest + 18);
      const fitWidth = (room.width / 2 - 18) / (horizontalExtent + 18);
      const next = Math.max(.2, Math.min(1, fitHeight, fitWidth));
      setScale(previous => Math.abs(previous - next) < .001 ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(scene);
    if (dock) observer?.observe(dock);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [arranging, itemCount]);
  return <div className="room-objects" ref={element => { localRef.current = element; if (forwardedRef) forwardedRef.current = element; }} style={arranging ? { "--room-edit-scale": scale, "--room-edit-inverse": 1 / scale } : undefined}>{children}</div>;
});
export default RoomObjects;
