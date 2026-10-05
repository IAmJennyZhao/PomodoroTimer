import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FurnitureArt } from "./RoomBackdrop";
import { ArtFragment, ATELIER_ART } from "./AtelierArt";
export const ART = `${process.env.PUBLIC_URL || ""}/art`;
export const RARITY_NAMES = {
  basic: "Basic",
  everyday: "Everyday",
  rare: "Rare",
  dreamy: "Dreamy",
};
export const PANEL_NAMES = {
  animals: "Animals",
  shop: "Egg shop",
  decorate: "Decorate",
  journal: "Journal",
  sound: "Sound",
  settings: "Settings",
  session: "Session settings",
  notes: "Scratchpad",
};

export function Icon({ name, size = 22, className = "", ...props }) {
  const paths = {
    leaf: (
      <path d="M12 21V10M12 15C3 16 2 9 3 5c7 0 10 4 9 10ZM12 11c0-7 5-9 9-9 1 6-2 10-9 9Z" />
    ),
    focus: (
      <>
        <path d="M10 5c-4-3-7 0-7 5 0 6 4 11 9 11s9-5 9-11c0-5-3-8-7-5" />
        <path d="m7 5 5 2 5-2M12 7V2" />
      </>
    ),
    paw: (
      <>
        <ellipse cx="12" cy="16" rx="6" ry="5" />
        <ellipse cx="5" cy="8" rx="2" ry="3" />
        <ellipse cx="11" cy="5" rx="2" ry="3" />
        <ellipse cx="17" cy="6" rx="2" ry="3" />
        <ellipse cx="21" cy="11" rx="1.5" ry="2.5" />
      </>
    ),
    egg: <path d="M20 15c0 4-3.5 7-8 7s-8-3-8-7S8 2 12 2s8 9 8 13Z" />,
    plant: (
      <path d="m5 14 2 8h10l2-8ZM12 14V7M12 10C5 10 3 6 4 2c5 0 8 3 8 8ZM12 12c0-6 4-9 9-9 0 6-3 9-9 9Z" />
    ),
    book: (
      <path d="M12 5v16M12 5C9 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-7-2-10 1Z" />
    ),
    gem: <path d="m7 3-5 7 10 12L22 10l-5-7ZM2 10h20M7 3l5 19L17 3" />,
    settings: (
      <>
        <path d="M9 3h6l.5 3 2.5 1.5 2.8-1 3 5.2-2.3 2v2.6l2.3 2-3 5.2-2.8-1L15.5 24l-.5 3H9l-.5-3L6 22.5l-2.8 1-3-5.2 2.3-2v-2.6l-2.3-2 3-5.2 2.8 1L8.5 6Z" transform="translate(3 0.75) scale(.75)" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    sound: (
      <path d="M3 9h4l5-5v16l-5-5H3ZM16 8c3 2 3 6 0 8M19 4c6 4 6 12 0 16" />
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    play: <path d="m8 4 13 8-13 8Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    reset: <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />,
    skip: <path d="m5 5 10 7-10 7ZM19 5v14" />,
    check: <path d="m5 12 4 4L20 5" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    shuffle: (
      <path d="M3 5h3c6 0 6 14 12 14h3m-3-3 3 3-3 3M3 19h3c3 0 4-3 6-7s3-7 6-7h3m-3-3 3 3-3 3" />
    ),
    pencil: <path d="m4 16-1 5 5-1L21 7l-5-5ZM13 5l5 5" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    moon: <path d="M21 14A9 9 0 0 1 10 3a9 9 0 1 0 11 11Z" />,
    sparkle: <path d="m12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />,
    plus: <path d="M12 4v16M4 12h16" />,
    minus: <path d="M4 12h16" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v.1" /></>,
    sliders: <><path d="M4 6h16M4 12h16M4 18h16" /><path d="M8 3v6M16 9v6M10 15v6" /></>,
    note: <><path d="M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h6" /></>,
    expand: <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />,
    collapse: <path d="M3 8h5V3M16 3v5h5M8 21v-5H3M21 16h-5v5" />,
    mute: <path d="M3 9h4l5-5v16l-5-5H3ZM16 9l6 6M16 15l6-6" />,
    move: <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`atelier-icon icon-${name} ${className}`}
      {...props}
    >
      <g className="icon-pencil-echo" transform="translate(.25 .2)">{paths[name] || paths.leaf}</g>
      <g>{paths[name] || paths.leaf}</g>
    </svg>
  );
}

export function Sprite({
  kind = "animal",
  id,
  rarity = "everyday",
  className = "",
  ...props
}) {
  if (kind === "object" && ["couch", "rug", "bookshelf", "window-plants", "table", "side-table", "plant", "cushion", "books"].includes(id)) {
    return <FurnitureArt id={id} className={className} {...props} />;
  }
  const indexes =
    kind === "animal"
      ? { cat: 0, dog: 1, squirrel: 2, rabbit: 3, fox: 4, deer: 5 }
      : { basic: 0, everyday: 1, rare: 2, dreamy: 3 };
  const index = indexes[id] ?? 0;
  return (
    <span
      aria-hidden="true"
      className={`sprite ${kind}-sprite rarity-${rarity} ${kind === "object" && id === "basic" ? "egg-basic" : ""} ${className}`}
      style={{
        backgroundImage: `url(${ATELIER_ART}/${kind === "animal" ? "animals" : "eggs"}-sheet.png)`,
        backgroundSize: kind === "animal" ? "300% 200%" : "400% 100%",
        backgroundPosition: kind === "animal" ? `${(index % 3) * 50}% ${Math.floor(index / 3) * 100}%` : `${index * 100 / 3}% 0`,
        aspectRatio: kind === "animal" ? "1" : "543 / 724",
      }}
      {...props}
    />
  );
}

export function Accessory({ id }) {
  const rect = { bow: [1094, 565, 309, 217], crown: [1091, 782, 208, 145], flower: [1320, 723, 192, 193] }[id];
  if (!rect) return null;
  return <span aria-hidden="true" className={`pet-accessory accessory-${id}`}><ArtFragment rect={rect} /></span>;
}
export function AnimalArt({ animal, className = "" }) {
  const motions = ["breathe", "sway", "hop", "wiggle", "stretch", "peek", "celebrate"];
  const unlocked = Math.min(7, Math.max(1, (animal.upgrades || 0) + 1));
  const [motion, setMotion] = useState(0);
  const animate = className.includes("idle-animal");
  useEffect(() => {
    if (!animate || unlocked < 2) return undefined;
    const interval = setInterval(() => setMotion(previous => (previous + 1) % unlocked), 12000);
    return () => clearInterval(interval);
  }, [animate, unlocked]);
  return (
    <span className={`animal-art pet-motion-${motions[motion % unlocked]} ${className}`} data-animations={unlocked}>
      <Sprite id={animal.species} rarity={animal.rarity} />
      <Accessory id={animal.accessory} />
      {["rare", "dreamy"].includes(animal.rarity) && (
        <span className="rare-sparkle">
          <Icon name="sparkle" size={18} />
        </span>
      )}
    </span>
  );
}

export function InfoTip({ label = "More info", children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef(null);
  const contentRef = useRef(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const anchor = ref.current?.getBoundingClientRect();
      const content = contentRef.current?.getBoundingClientRect();
      if (!anchor || !content) return;
      const left = Math.max(12, Math.min(anchor.right - content.width, window.innerWidth - content.width - 12));
      const below = anchor.bottom + 8;
      const top = below + content.height < window.innerHeight - 12
        ? below : Math.max(12, anchor.top - content.height - 8);
      setPosition({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event) => {
      if (!ref.current?.contains(event.target) && !contentRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [open]);
  return (
    <span className="info-disclosure" ref={ref} onKeyDown={(event) => {
      if (open && event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    }}>
      <button type="button" className="info-button" aria-label={label}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <Icon name="info" size={17} />
      </button>
      {open && createPortal(<div ref={contentRef} className="info-content" style={position} role="note" id={id}>{children}</div>, document.body)}
    </span>
  );
}

export function clampNotepadPosition(position, bounds, viewport) {
  return {
    left: Math.max(12, Math.min(position.left, Math.max(12, viewport.width - bounds.width - 12))),
    top: Math.max(12, Math.min(position.top, Math.max(12, viewport.height - bounds.height - 12))),
  };
}

export function Drawer({ name, title, onClose, children, position, onMove }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const pointer = useRef(null);
  const location = useRef(null);
  const [notesPosition, setNotesPosition] = useState(null);
  const movable = name === "notes";
  const savedX = position?.x;
  const savedY = position?.y;
  const moveNotes = (left, top) => {
    const bounds = dialogRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const next = clampNotepadPosition({ left, top }, bounds, { width: window.innerWidth, height: window.innerHeight });
    location.current = next;
    setNotesPosition(next);
    return next;
  };
  const saveNotesPosition = (next) => {
    if (next) onMove?.({ x: next.left / window.innerWidth, y: next.top / window.innerHeight });
  };
  useLayoutEffect(() => {
    if (!movable) return undefined;
    const place = () => {
      const bounds = dialogRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const next = clampNotepadPosition({
        left: typeof savedX === "number" ? savedX * window.innerWidth : window.innerWidth - bounds.width - 22,
        top: typeof savedY === "number" ? savedY * window.innerHeight : window.innerWidth <= 600 ? 138 : 100,
      }, bounds, { width: window.innerWidth, height: window.innerHeight });
      location.current = next;
      setNotesPosition(previous => previous?.left === next.left && previous?.top === next.top ? previous : next);
    };
    place();
    window.addEventListener("resize", place);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (dialogRef.current) observer?.observe(dialogRef.current);
    return () => {
      window.removeEventListener("resize", place);
      observer?.disconnect();
    };
  }, [movable, savedX, savedY]);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    (name === "notes" ? dialog?.querySelector("textarea") : closeRef.current)?.focus();
    return () => {
      if (previous?.isConnected &&
        (document.activeElement === document.body || dialog?.contains(document.activeElement))) previous.focus();
    };
  }, [name]);
  return (
    <aside
      ref={dialogRef}
      className={`drawer workspace workspace-${name} paper ${movable ? "movable-notes" : ""}`}
      style={movable && notesPosition ? notesPosition : undefined}
      role="dialog"
      aria-labelledby="panel-heading"
    >
      <header className="drawer-heading">
        {movable ? <button type="button" className="notepad-drag-handle" aria-label="Move notepad" aria-describedby="notepad-move-help"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            const bounds = dialogRef.current.getBoundingClientRect();
            pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top };
          }}
          onPointerMove={(event) => {
            const start = pointer.current;
            if (start && start.id === event.pointerId) moveNotes(start.left + event.clientX - start.x, start.top + event.clientY - start.y);
          }}
          onPointerUp={(event) => {
            if (pointer.current?.id !== event.pointerId) return;
            pointer.current = null;
            saveNotesPosition(location.current);
          }}
          onPointerCancel={() => { pointer.current = null; saveNotesPosition(location.current); }}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            const step = event.shiftKey ? 40 : 10;
            const bounds = dialogRef.current.getBoundingClientRect();
            const current = location.current || bounds;
            saveNotesPosition(moveNotes(
              current.left + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
              current.top + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
            ));
          }}>
          <Icon name="move" size={19} /><span><span className="notepad-heading" id="panel-heading">{PANEL_NAMES[name]}</span><small className="visually-hidden" id="notepad-move-help">Drag to move · arrow keys to nudge</small></span>
        </button> : <div>
          <h2 id="panel-heading">{title || PANEL_NAMES[name]}</h2>
        </div>}
        <button
          ref={closeRef}
          className="icon-button"
          onClick={onClose}
          aria-label="Close panel"
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="drawer-content">{children}</div>
    </aside>
  );
}

export function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
}) {
  const displayValue = Number.isInteger(value)
    ? value
    : Number(value.toFixed(1));
  return (
    <label className="range-field">
      <span>
        {label}
        <output>
          {displayValue}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--range-progress": `${Math.max(0, Math.min(100, (value - min) / (max - min || 1) * 100))}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function HatchModal({ animal, duplicate = false, capped = false, onClose }) {
  const buttonRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    buttonRef.current?.focus();
    return () => {
      const target = previous?.isConnected
        ? previous
        : document.querySelector(".drawer-heading button") ||
          document.querySelector(".top-nav button");
      target?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <section
        className={`hatch-modal paper ${animal.rarity}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hatch-title"
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            buttonRef.current?.focus();
          }
        }}
      >
        <AnimalArt animal={animal} />
        <span className={`rarity-label ${animal.rarity}`}>
          {RARITY_NAMES[animal.rarity]} {animal.species}
        </span>
        <h2 id="hatch-title">{capped ? `${animal.name} is maxed!` : duplicate ? `${animal.name} leveled up!` : `${animal.name} joined!`}</h2>
        {duplicate && <p className="small">{capped ? "+5 Shilligems for this extra friend." : animal.upgrades === 6
          ? "All 7 animations unlocked · +10% focus Shilligems!"
          : `Animation ${(animal.upgrades || 0) + 1} of 7 unlocked · ${animal.upgrades}/6 upgrades`}</p>}
        <button ref={buttonRef} className="primary-button" onClick={onClose}>
          Done <Icon name="paw" size={18} />
        </button>
      </section>
    </div>
  );
}
