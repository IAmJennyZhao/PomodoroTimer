import { ArtFragment, ATELIER_ART } from "./AtelierArt";

export default function RoomBackdrop({ theme = "sunroom", preview = false }) {
  const room = ["sunroom", "moonroom", "greenhouse"].includes(theme) ? theme : "sunroom";
  return <img className={`room-backdrop ${preview ? "room-preview" : ""}`} src={`${ATELIER_ART}/room-${room}.png`} alt="" aria-hidden="true" draggable="false" />;
}

const furniture = {
  couch: [8, 118, 431, 297], rug: [443, 145, 385, 246], bookshelf: [862, 39, 394, 401],
  "window-plants": [43, 476, 380, 350], table: [450, 543, 372, 250], "side-table": [939, 440, 223, 391],
  plant: [54, 838, 362, 391], cushion: [473, 881, 329, 290], books: [869, 917, 363, 277],
};

export function FurnitureArt({ id, className = "", ...props }) {
  const rect = furniture[id] || furniture.plant;
  return <ArtFragment sheet="furniture-sheet" size={[1280, 1280]} rect={rect} className={`furniture-art ${className}`} style={{ aspectRatio: `${rect[2]} / ${rect[3]}` }} {...props} />;
}
