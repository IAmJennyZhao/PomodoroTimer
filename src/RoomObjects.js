import { Children, forwardRef, useLayoutEffect, useRef, useState } from "react";

// Background and furniture share a camera so saved room coordinates continue
// to line up with the illustrated floor while the workbench is open.
const RoomObjects = forwardRef(function RoomObjects({ arranging, children }, forwardedRef) {
  const localRef = useRef(null);
  const [camera, setCamera] = useState({ scale: 1, top: 0 });
  const itemCount = Children.count(children);
  useLayoutEffect(() => {
    if (!arranging) return;
    const objects = localRef.current;
    const scene = objects.parentElement;
    const dock = scene.parentElement.querySelector(".workspace-decorate");
    const measure = () => {
      const room = scene.getBoundingClientRect();
      const residents = Array.from(objects.querySelectorAll(".room-resident"));
      const header = scene.parentElement.querySelector(".app-header").getBoundingClientRect();
      const top = header.bottom - room.top + 12;
      const lowest = Math.max(room.height, ...residents.map(item => parseFloat(item.style.getPropertyValue("--room-y")) / 100 * room.height + item.offsetHeight / 2));
      const horizontalExtent = Math.max(room.width / 2, ...residents.map(item => Math.abs(parseFloat(item.style.getPropertyValue("--room-x")) / 100 * room.width - room.width / 2) + item.offsetWidth / 2));
      const available = (dock?.getBoundingClientRect().top ?? room.bottom) - room.top - top - 12;
      const fitHeight = available / lowest;
      const fitWidth = (room.width / 2 - 12) / horizontalExtent;
      const next = Math.max(.2, Math.min(1, fitHeight, fitWidth));
      setCamera(previous => Math.abs(previous.scale - next) < .001 && previous.top === top ? previous : { scale: next, top });
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(scene);
    if (dock) observer?.observe(dock);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [arranging, itemCount]);
  return <div className="room-objects" ref={element => { localRef.current = element; if (forwardedRef) forwardedRef.current = element; }} style={arranging ? { "--room-edit-scale": camera.scale, "--room-edit-inverse": 1 / camera.scale, "--room-edit-top": `${camera.top}px` } : undefined}>{children}</div>;
});
export default RoomObjects;
