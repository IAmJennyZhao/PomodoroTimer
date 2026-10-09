import { Children, forwardRef, useLayoutEffect, useRef, useState } from "react";
import { fitRoomCamera, ROOM_SIZE } from "./roomGeometry";

// Background and furniture share a camera so saved room coordinates continue
// to line up with the illustrated floor while the workbench is open.
const RoomObjects = forwardRef(function RoomObjects({ arranging, children, onCameraChange, layoutKey }, forwardedRef) {
  const localRef = useRef(null);
  const [camera, setCamera] = useState({ scale: 1, top: 0, left: 0 });
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
      // Reserve a physical control row above even the highest saved footprint.
      const top = header.bottom - room.top + 48;
      const dockBounds = dock?.getBoundingClientRect();
      const sidebar = dockBounds && dockBounds.left > room.left + room.width / 2 && dockBounds.top < header.bottom + 60;
      const right = sidebar ? dockBounds.left - room.left - 24 : room.width - 24;
      const bottom = sidebar ? room.height - 24 : (dockBounds?.top ?? room.bottom) - room.top - 24;
      const next = fitRoomCamera({ left: 24, top, width: Math.max(1, right - 24), height: Math.max(1, bottom - top) },
        residents.map(item => ({ x: parseFloat(item.style.getPropertyValue("--room-x")) / 100 * ROOM_SIZE.width,
          y: parseFloat(item.style.getPropertyValue("--room-y")) / 100 * ROOM_SIZE.height, width: item.offsetWidth, height: item.offsetHeight })));
      setCamera(previous => Math.abs(previous.scale - next.scale) < .001 && Math.abs(previous.top - next.top) < .5 && Math.abs(previous.left - next.left) < .5 ? previous : next);
    };
    measure();
    let frame;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    observer?.observe(scene);
    const header = scene.parentElement.querySelector(".app-header");
    if (header) observer?.observe(header);
    objects.querySelectorAll(".room-resident").forEach(item => observer?.observe(item));
    if (dock) observer?.observe(dock);
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", schedule); };
  }, [arranging, itemCount, layoutKey]);
  useLayoutEffect(() => { if (arranging) onCameraChange?.(camera); }, [arranging, camera, onCameraChange]);
  return <div className="room-objects" ref={element => { localRef.current = element; if (forwardedRef) forwardedRef.current = element; }} style={arranging ? {
    width: ROOM_SIZE.width, height: ROOM_SIZE.height, left: camera.left, top: camera.top,
    transform: `scale(${camera.scale})`, transformOrigin: "0 0",
    "--room-edit-scale": camera.scale, "--room-edit-inverse": 1 / camera.scale,
  } : undefined}>{children}</div>;
});
export default RoomObjects;
