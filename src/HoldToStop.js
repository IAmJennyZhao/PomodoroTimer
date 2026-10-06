import { Button } from "./Controls";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const HOLD_MS = 5000;

export default function HoldToStop({ onStop, disabled }) {
  const helpId = useId();
  const hold = useRef(null);
  const stop = useRef(onStop);
  stop.current = onStop;
  const [progress, setProgress] = useState(0);
  const cancel = useCallback(() => {
    clearTimeout(hold.current?.timeout);
    clearInterval(hold.current?.interval);
    hold.current = null;
    setProgress(0);
  }, []);
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState !== "visible") cancel(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", cancel);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", cancel);
      clearTimeout(hold.current?.timeout);
      clearInterval(hold.current?.interval);
    };
  }, [cancel]);
  useEffect(() => { if (disabled) cancel(); }, [disabled, cancel]);
  function begin(source, id) {
    if (disabled || hold.current) return;
    const started = Date.now();
    const interval = setInterval(() => setProgress(Math.min(1, (Date.now() - started) / HOLD_MS)), 50);
    const timeout = setTimeout(() => {
      cancel();
      stop.current();
    }, HOLD_MS);
    hold.current = { source, id, interval, timeout };
  }
  return <>
    <Button type="button" sound={null} className={`stop-button ${progress ? "holding" : ""}`} aria-label="Stop session" aria-describedby={helpId}
      disabled={disabled} style={{ "--hold-progress": `${progress * 100}%` }}
      onPointerDown={event => {
        if (event.button !== 0 || event.isPrimary === false || disabled) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        begin("pointer", event.pointerId);
      }}
      onPointerMove={event => {
        if (hold.current?.source !== "pointer" || hold.current.id !== event.pointerId) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) cancel();
      }}
      onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
      onContextMenu={event => event.preventDefault()}
      onKeyDown={event => {
        if (![" ", "Enter"].includes(event.key)) return;
        event.preventDefault();
        if (!event.repeat) begin("keyboard", event.key);
      }}
      onKeyUp={event => {
        if (hold.current?.source === "keyboard" && hold.current.id === event.key) { event.preventDefault(); cancel(); }
      }}>
      <span>Stop</span><small aria-hidden="true">{progress ? `Hold ${Math.ceil((1 - progress) * 5)}s` : "Hold 5s"}</small>
    </Button>
    <span className="visually-hidden" id={helpId}>Hold for five seconds to abandon this timer. Release to cancel.</span>
  </>;
}
