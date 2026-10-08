import { Button } from "./Controls";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Icon, InfoTip, trapDialogFocus, useModalFocus } from "./ui";
import { PastelButtonArt } from "./AtelierArt";
import { exitProps, useSurfaceTransition } from "./Transitions";

export function useNoticeTimeout(notice, paused, setNotice) {
  const clock = useRef(null);
  useEffect(() => {
    if (!notice) return undefined;
    if (clock.current?.id !== notice.id) clock.current = { id: notice.id,
      remaining: notice.tone === "warning" ? 6500 : notice.tone === "success" ? 4500 : 3500 };
    if (paused) return undefined;
    const current = clock.current;
    const started = Date.now();
    // Reading pauses retain the remaining budget, with a short grace on resume.
    const timeout = setTimeout(() => setNotice(previous => previous?.id === current.id ? null : previous), Math.max(1000, current.remaining));
    return () => { clearTimeout(timeout); current.remaining = Math.max(0, current.remaining - (Date.now() - started)); };
  }, [notice, paused, setNotice]);
}

function restoreNoticeFocus(previous) {
  const candidates = [previous, ...document.querySelectorAll('.hatch-modal button, .workspace[data-presence="present"] .drawer-heading button, .timer-card .pause-button, .timer-card .start-button, .timer-card .break-buttons button, .timer-card .finish-button, .top-nav button')];
  const target = candidates.find(node => node?.isConnected && node !== document.body && !node.disabled && !node.closest('[inert], [hidden], [aria-hidden="true"]'));
  target?.focus();
}

export function ToastNotice({ notice, onDismiss, onPauseChange, active = true }) {
  const ref = useRef(null);
  const previousFocus = useRef(document.activeElement);
  useSurfaceTransition(ref, active);
  useLayoutEffect(() => {
    if (!active && ref.current?.contains(document.activeElement)) {
      restoreNoticeFocus(previousFocus.current);
    }
  }, [active]);
  if (!notice.visible) return <span className="visually-hidden">{notice.message}</span>;
  const dismiss = () => {
    const restoreFocus = ref.current?.contains(document.activeElement);
    onDismiss();
    onPauseChange(false);
    if (restoreFocus) restoreNoticeFocus(previousFocus.current);
  };
  return <div ref={ref} {...exitProps(active)} className={`toast feedback-note paper feedback-${notice.tone}`}
    onPointerEnter={() => { if (active) onPauseChange(true); }} onPointerLeave={() => { if (active) onPauseChange(Boolean(ref.current?.contains(document.activeElement))); }}
    onFocus={() => { if (active) onPauseChange(true); }} onBlur={event => {
      if (active && !event.currentTarget.contains(event.relatedTarget)) onPauseChange(event.currentTarget.matches(":hover"));
    }} onKeyDown={event => {
      if (active && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(); }
    }}>
    <span className="feedback-emblem"><Icon name={notice.tone === "success" ? "check" : notice.tone === "warning" ? "info" : "leaf"} size={18} /></span>
    <span>{notice.message}</span>
    <Button sound={null} type="button" className="icon-button" onClick={dismiss} aria-label="Dismiss notification"><Icon name="close" size={17} /></Button>
  </div>;
}

export function SaveNotice({ persistence }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    const app = node?.closest('.app');
    if (!app) return undefined;
    const measure = () => app.style.setProperty('--save-notice-height', `${node.getBoundingClientRect().height}px`);
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); app.style.removeProperty('--save-notice-height'); };
  }, []);
  const conflict = persistence.status === "conflict";
  return <section ref={ref} className="save-warning feedback-note paper" role="alert" aria-labelledby="save-notice-title">
    <span className="feedback-emblem warning"><Icon name="note" size={20} /></span>
    <div className="save-notice-copy">
      <h2 id="save-notice-title">{conflict ? "Save changed elsewhere" : "Changes not saved"}</h2>
      <p>{conflict ? "Reload replaces this window’s edits." : "Your edits are still here."}</p>
      {!conflict && persistence.failure && <p>{persistence.failure.message} {persistence.failure.action}</p>}
      <div className="save-notice-actions">
        <Button type="button" className="small-button" onClick={conflict ? persistence.reload : persistence.retrySave}>{conflict ? "Reload saved room" : "Retry save"}</Button>
        <InfoTip label="Save details">{persistence.error || "Your latest changes have not been saved."}</InfoTip>
      </div>
    </div>
  </section>;
}

export function RoomLoading({ persistence }) {
  const ref = useRef(null);
  const retry = useRef(null);
  useModalFocus(ref, retry, persistence.status);
  const failed = Boolean(persistence.error);
  return <div className="loading-screen">
    <section ref={ref} className="paper loading-card feedback-note" tabIndex={-1}
      role={failed ? "alertdialog" : "status"} aria-modal={failed ? true : undefined}
      aria-labelledby="room-loading-title" onKeyDown={event => trapDialogFocus(event, ref.current)}>
      <span className={`feedback-emblem ${failed ? "warning" : ""}`}><Icon name={failed ? "note" : "leaf"} size={30} /></span>
      <h1 id="room-loading-title">{failed ? "Couldn’t load your room" : "Opening your room…"}</h1>
      {failed && <>
        <p>{persistence.failure?.message || "Your room couldn’t be loaded."}</p>
        <p>{persistence.failure?.action || "Try again. Your existing save has not been replaced."}</p>
        <Button ref={retry} type="button" className="primary-button celebration-done" onClick={persistence.reload}><PastelButtonArt />Try again</Button>
        <details className="connection-details"><summary>Load details</summary><p>{persistence.failure?.detail || persistence.error}</p>{persistence.storagePath && <p><code>{persistence.storagePath}</code></p>}</details>
      </>}
    </section>
  </div>;
}
