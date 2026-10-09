import { ArtFragment, ATELIER_ART } from "../../shared/AtelierArt";
import { useContext, useRef } from "react";
import { OutcomeFeedbackContext } from "../../shared/OutcomeFeedback";
import { MotionPreferenceContext } from "../../shared/useReducedMotion";
import { useRoomAnimation } from "./RoomInteraction";

export default function RoomBackdrop({ theme = "sunroom", preview = false }) {
  const room = ["sunroom", "moonroom", "greenhouse"].includes(theme) ? theme : "sunroom";
  const ref = useRef(null);
  const feedback = useContext(OutcomeFeedbackContext);
  const reduced = useContext(MotionPreferenceContext);
  const outcome = !preview && feedback.apply?.target === `backgrounds:${room}` ? feedback.apply : null;
  useRoomAnimation(ref, outcome, reduced, false, room, "backdrop");
  return <img ref={ref} className={`room-backdrop ${preview ? "room-preview" : ""}`} src={`${ATELIER_ART}/room-${room}.png`} alt="" aria-hidden="true" draggable="false" />;
}

const furniture = {
  couch: [8, 118, 431, 297], rug: [443, 145, 385, 246], bookshelf: [862, 39, 394, 401],
  "window-plants": [43, 476, 380, 350], table: [450, 543, 372, 250], "side-table": [939, 440, 223, 391],
  plant: [54, 838, 362, 391], cushion: [473, 881, 329, 290], books: [869, 917, 363, 277],
};

export function FurnitureArt({ id, className = "", ...props }) {
  const rect = furniture[id] || furniture.plant;
  // Compress the rug's illustrated plane, including its border and fringe. Giving
  // a contain-fitted SVG a wider box alone leaves the upright artwork unchanged.
  const height = id === "rug" ? rect[3] * .48 : rect[3];
  return <ArtFragment sheet="furniture-sheet" size={[1280, 1280]} rect={rect} preserveAspectRatio={id === "rug" ? "none" : "xMidYMid meet"} data-furniture={id} className={`furniture-art ${className}`} style={{ aspectRatio: `${rect[2]} / ${height}` }} {...props} />;
}
