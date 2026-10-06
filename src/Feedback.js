import { Button } from "./Controls";
import { useRef } from "react";
import { Icon, InfoTip, trapDialogFocus, useModalFocus } from "./ui";
import { PastelButtonArt } from "./AtelierArt";

export function ToastNotice({ notice, onDismiss, onPauseChange }) {
  const ref = useRef(null);
  const previousFocus = useRef(document.activeElement);
  if (!notice.visible) return <span className="visually-hidden">{notice.message}</span>;
  const dismiss = () => {
    const restoreFocus = ref.current?.contains(document.activeElement);
    onDismiss();
    onPauseChange(false);
    if (restoreFocus && previousFocus.current?.isConnected) previousFocus.current.focus();
  };
  return <div ref={ref} className={`toast feedback-note paper feedback-${notice.tone}`}
    onPointerEnter={() => onPauseChange(true)} onPointerLeave={() => onPauseChange(Boolean(ref.current?.contains(document.activeElement)))}
    onFocus={() => onPauseChange(true)} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) onPauseChange(event.currentTarget.matches(":hover"));
    }}>
    <span className="feedback-emblem"><Icon name={notice.tone === "success" ? "check" : notice.tone === "warning" ? "info" : "leaf"} size={18} /></span>
    <span>{notice.message}</span>
    <Button type="button" className="icon-button" onClick={dismiss} aria-label="Dismiss notification"><Icon name="close" size={17} /></Button>
  </div>;
}

export function SaveNotice({ persistence }) {
  const conflict = persistence.status === "conflict";
  return <section className="save-warning feedback-note paper" role="alert" aria-labelledby="save-notice-title">
    <span className="feedback-emblem warning"><Icon name="note" size={20} /></span>
    <div className="save-notice-copy">
      <h2 id="save-notice-title">{conflict ? "Save changed elsewhere" : "Changes not saved"}</h2>
      <p>{conflict ? "Reload replaces this window’s edits." : "Your edits are still here."}</p>
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
        <p>Check that the local app is running.</p>
        <Button ref={retry} type="button" className="primary-button celebration-done" onClick={persistence.reload}><PastelButtonArt />Try again</Button>
        <details className="connection-details"><summary>Connection help</summary><p>{persistence.error}</p></details>
      </>}
    </section>
  </div>;
}
