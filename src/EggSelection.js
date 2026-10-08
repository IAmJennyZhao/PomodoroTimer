import { Button } from "./Controls";
import { EGG_MINUTES } from "./game";

export function eggSessionSelection(state) {
  const active = state.timer.mode === "focus" && ["running", "paused"].includes(state.timer.status);
  return {
    active,
    current: active ? state.eggs.find(egg => egg.id === state.timer.eggId) : null,
    next: state.eggs.find(egg => egg.id === state.selectedEggId),
  };
}

export function eggDescription(egg, eggs) {
  return `${egg.rarity.charAt(0).toUpperCase() + egg.rarity.slice(1)} egg ${eggs.findIndex(item => item.id === egg.id) + 1}`;
}

function progressLabel(egg) {
  const required = egg.requiredMinutes || EGG_MINUTES[egg.rarity];
  const progress = Math.min(required, egg.progressMinutes || 0);
  return progress >= required ? "Ready to hatch" : `${progress}/${required} min`;
}

export default function EggSelection({ state, openNest }) {
  const { active, current, next } = eggSessionSelection(state);
  const describe = egg => `${eggDescription(egg, state.eggs)} · ${progressLabel(egg)}`;
  return <div className="focus-egg-summary" aria-label="Focus egg">
    <div>
      {active && <span><strong>Studying with you:</strong> {current ? describe(current) : "No egg this session"}</span>}
      {(!active || current?.id !== next?.id) && <span><strong>Next session:</strong> {next ? describe(next) : "No egg selected"}</span>}
      {active && current && current.id === next?.id && <span className="egg-summary-next">Also selected for next session</span>}
    </div>
    <Button className="text-button" onClick={openNest} aria-label="Open nest">Nest</Button>
  </div>;
}
