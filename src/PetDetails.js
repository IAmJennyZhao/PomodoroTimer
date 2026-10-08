import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, ChoiceInput } from "./Controls";
import { ACCESSORIES, ANIMALS, animationCount, MAX_UPGRADES } from "./game";
import { AnimalArt, Icon, InfoTip, RarityStars } from "./ui";
import { RoomVisual } from "./RoomInteraction";
import { MotionPreferenceContext } from "./useReducedMotion";
import { SurfaceActivityContext } from "./Transitions";
import { PET_MOTIONS } from "./petMotions";

export default function PetDetails({ animal, state, act, detailsRef, onShopAccessories }) {
  const reduced = useContext(MotionPreferenceContext);
  const active = useContext(SurfaceActivityContext);
  const [preview, setPreview] = useState(null);
  const portraitRef = useRef(null);
  const serial = useRef(0);
  const unlocked = animationCount(animal);
  const previewMotion = PET_MOTIONS.find(motion => motion.id === preview?.motion);
  const previewSerial = preview?.serial;
  const previewDuration = previewMotion?.durationMs;
  useEffect(() => {
    if (!previewSerial) return undefined;
    const timeout = setTimeout(() => setPreview(current => current?.serial === previewSerial ? null : current), previewDuration + 150);
    return () => clearTimeout(timeout);
  }, [previewSerial, previewDuration]);
  useLayoutEffect(() => {
    setPreview(current => !active ? null : reduced && current && !current.suppressed ? { ...current, suppressed: true } : current);
  }, [active, reduced]);
  const play = (motion, index) => {
    if (!active || index >= unlocked) return;
    portraitRef.current?.scrollIntoView?.({ block: "nearest" });
    setPreview({ motion: motion.id, serial: ++serial.current, suppressed: reduced });
  };
  return <section ref={detailsRef} className="detail-card collection-detail" aria-label={`${animal.name} details`}>
    <div ref={portraitRef} className="pet-portrait"><RoomVisual target={`animal:${animal.id}`} surface="portrait"><AnimalArt animal={animal} preview={preview}
      onPreviewEnd={finished => setPreview(current => current?.serial === finished ? null : current)} /></RoomVisual></div>
    <h3>{animal.name} <span className="small muted">· {ANIMALS.find(species => species.id === animal.species)?.name || "Animal"}</span></h3>
    <RarityStars rarity={animal.rarity} />
    <section className="pet-motions" aria-label="Pet animations">
      <p className="small" aria-label={`${animal.upgrades || 0} of ${MAX_UPGRADES} upgrades`}>{unlocked} / {PET_MOTIONS.length} animations <InfoTip label="Pet upgrades">{animal.upgrades === MAX_UPGRADES ? "Maxed! This friend gives +10% focus Shilligems." : "Paw 1 is your default animation. Hatch this same pet again to unlock another paw. Six upgrades earn a +10% Shilligem bonus."}</InfoTip></p>
      <div className="motion-paws" role="group" aria-label="Animation previews">{PET_MOTIONS.map((motion, index) => {
        const locked = index >= unlocked;
        const selected = preview?.motion === motion.id;
        return <Button key={motion.id} className="motion-paw" disabled={locked} aria-pressed={selected}
          aria-label={`${locked ? "Locked" : "Preview"} ${motion.name} animation, paw ${index + 1}`}
          title={locked ? `${motion.name} · unlock with ${index} matching-pet upgrade${index === 1 ? "" : "s"}` : `Preview ${motion.name}`}
          onClick={() => play(motion, index)}>
          <span className="motion-paw-icon"><Icon name="paw" size={24} /><span className="motion-paw-number">{index + 1}</span>
            {locked && <Icon name="lock" size={13} />}{selected && <Icon name={preview.suppressed ? "check" : "play"} size={13} />}</span>
          <span>{motion.name}</span>
        </Button>;
      })}</div>
      <p className="motion-preview-status" role="status">{preview ? preview.suppressed ? `${previewMotion.name} selected · motion reduced.` : `Previewing ${previewMotion.name} · plays once.` : "Choose an unlocked paw to preview. Paw 1 is Default."}</p>
    </section>
    <label className="toggle-line"><span>Show in room</span>
      <ChoiceInput sound={animal.placed ? undefined : null} type="checkbox" checked={animal.placed} onChange={event => act({ type: "PLACE_ANIMAL", id: animal.id, placed: event.target.checked })} />
    </label>
    <section className="pet-accessories" aria-label="Pet accessories">
      <h4>Accessories</h4>
      <div className="pet-accessory-tiles">{ACCESSORIES.map(item => {
        const owned = state.owned.accessories.includes(item.id);
        const equipped = animal.accessory === item.id;
        return <Button key={item.id} className="pet-accessory-tile" disabled={!owned} aria-pressed={equipped}
          aria-label={`${owned ? "Equip" : "Locked"} ${item.name}${owned ? "" : `, ${item.price} Shilligems`}`}
          onClick={() => act({ type: "SET_ACCESSORY", animalId: animal.id, id: item.id })}>
          <span className="accessory-tile-art" aria-hidden="true"><AnimalArt animal={{ ...animal, accessory: item.id }} /></span>
          <span>{item.name}</span>
          <small>{equipped ? <><Icon name="check" size={14} /> Equipped</> : owned ? "Owned" : <><Icon name="gem" size={14} /> {item.price} · Locked</>}</small>
        </Button>;
      })}</div>
      {onShopAccessories && <Button className="secondary-button pet-accessory-shop" onClick={() => onShopAccessories(animal.id)}>Shop accessories</Button>}
    </section>
  </section>;
}
