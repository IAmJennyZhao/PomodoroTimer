import { Button } from "./Controls";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const HOLD_MS = 5000;

export default function HoldToStop({ onStop, disabled }) {
  const helpId = useId();
  const hold = useRef(null);
  const resetFeedback = useRef(null);
  const stop = useRef(onStop);
  stop.current = onStop;
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [releasedProgress, setReleasedProgress] = useState(0);
  const cancel = useCallback((feedback = true) => {
    const previous = hold.current;
    clearTimeout(hold.current?.timeout);
    clearInterval(hold.current?.interval);
    hold.current = null;
    setProgress(0);
    if (previous && feedback) {
      clearTimeout(resetFeedback.current);
      setReleasedProgress(Math.min(1, (Date.now() - previous.started) / HOLD_MS));
      setPhase("cancelled");
      resetFeedback.current = setTimeout(() => setPhase("idle"), 400);
    } else if (!feedback) {
      clearTimeout(resetFeedback.current);
      setPhase("idle");
    }
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
      clearTimeout(resetFeedback.current);
    };
  }, [cancel]);
  useEffect(() => { if (disabled) cancel(false); }, [disabled, cancel]);
  function begin(source, id) {
    if (disabled || hold.current) return;
    clearTimeout(resetFeedback.current);
    setPhase("holding");
    setProgress(0);
    const started = Date.now();
    const interval = setInterval(() => setProgress(Math.min(1, (Date.now() - started) / HOLD_MS)), 50);
    const timeout = setTimeout(() => {
      cancel(false);
      stop.current();
    }, HOLD_MS);
    hold.current = { source, id, started, interval, timeout };
  }
  return <>
    <Button type="button" sound={null} data-hold={phase} className={`stop-button ${phase === "holding" ? "holding" : ""}`} aria-label="Abandon session" aria-describedby={helpId}
      disabled={disabled} style={{ "--hold-fraction": progress, "--hold-cancel-fraction": releasedProgress }}
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
      onPointerUp={() => cancel()} onPointerCancel={() => cancel()} onPointerLeave={() => cancel()} onLostPointerCapture={() => cancel()} onBlur={() => cancel()}
      onContextMenu={event => event.preventDefault()}
      onKeyDown={event => {
        if (event.key === "Escape" && hold.current) { event.preventDefault(); cancel(); return; }
        if (![" ", "Enter"].includes(event.key)) return;
        event.preventDefault();
        if (!event.repeat) begin("keyboard", event.key);
      }}
      onKeyUp={event => {
        if (hold.current?.source === "keyboard" && hold.current.id === event.key) { event.preventDefault(); cancel(); }
      }}>
      <span>Abandon</span><small aria-hidden="true">{phase === "cancelled" ? "Cancelled" : phase === "holding" ? `Hold ${Math.ceil((1 - progress) * 5)}s` : "Hold 5s"}</small>
    </Button>
    <span className="visually-hidden" id={helpId}>Hold for five seconds to abandon this session without saving unfinished focus time or rewards. Release to cancel.</span>
    {phase === "cancelled" && <span className="visually-hidden" role="status">Abandon cancelled</span>}
  </>;
}
