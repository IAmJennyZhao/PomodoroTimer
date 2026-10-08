import { createContext } from "react";

export const ROOM_SIZE = { width: 1672, height: 941 };
export const ArrangementCameraContext = createContext(null);
export const WIDGET_HOME = { timer: { x: 24, y: 24 }, goal: { x: 67, y: 14 } };

// Fit the illustrated room and any overhanging furniture without stretching it.
// Saved percentage anchors are unchanged; only this visit's camera changes.
export function fitRoomCamera(viewport, footprints = []) {
  const minX = Math.min(0, ...footprints.map(item => item.x - item.width / 2));
  const maxX = Math.max(ROOM_SIZE.width, ...footprints.map(item => item.x + item.width / 2));
  const minY = Math.min(0, ...footprints.map(item => item.y - item.height / 2));
  const maxY = Math.max(ROOM_SIZE.height, ...footprints.map(item => item.y + item.height / 2));
  const scale = Math.max(.01, Math.min(1, viewport.width / (maxX - minX), viewport.height / (maxY - minY)));
  return { scale, left: viewport.left + (viewport.width - (maxX - minX) * scale) / 2 - minX * scale,
    top: viewport.top + (viewport.height - (maxY - minY) * scale) / 2 - minY * scale };
}
