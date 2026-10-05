import { useRef } from "react";
import { Icon } from "./ui";

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
    onPointerEnter={() => onPauseChange(true)} onPointerLeave={() => onPauseChange(false)}
    onFocus={() => onPauseChange(true)} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) onPauseChange(false);
    }}>
    <span className="feedback-emblem"><Icon name={notice.tone === "success" ? "check" : notice.tone === "warning" ? "info" : "leaf"} size={18} /></span>
    <span>{notice.message}</span>
    <button type="button" className="icon-button" onClick={dismiss} aria-label="Dismiss notification"><Icon name="close" size={17} /></button>
  </div>;
}
