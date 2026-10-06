import { Children, createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from "react";

export const ControlFeedbackContext = createContext(() => {});
const ACTIVATION_PULSE_MS = 100;

function usePressFeedback(inactive, handlers, keys = ["Enter", " "]) {
  const [pressed, setPressed] = useState(false);
  const active = useRef(false);
  const source = useRef(null);
  const keyboardClick = useRef(false);
  const pulse = useRef(null);
  const release = useCallback((preserveKeyboardClick = false) => {
    clearTimeout(pulse.current);
    pulse.current = null;
    source.current = null;
    if (!preserveKeyboardClick) keyboardClick.current = false;
    if (active.current) {
      active.current = false;
      setPressed(false);
    }
  }, []);
  useEffect(() => {
    if (inactive) release();
  }, [inactive, release]);
  useEffect(() => {
    if (!pressed) return undefined;
    const cancel = () => release();
    const onVisibility = () => { if (document.visibilityState !== "visible") cancel(); };
    document.addEventListener("pointerup", cancel);
    document.addEventListener("pointercancel", cancel);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", cancel);
    return () => {
      document.removeEventListener("pointerup", cancel);
      document.removeEventListener("pointercancel", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", cancel);
    };
  }, [pressed, release]);
  useEffect(() => () => clearTimeout(pulse.current), []);
  const unavailable = event => inactive || Boolean(event.currentTarget.closest("[inert]"));
  return {
    pressed: pressed && !inactive,
    unavailable,
    activate(event) {
      // Native Enter/Space already have a down/up visual. Assistive technology
      // click events get the same short press without delaying their action.
      if (event.detail === 0 && !keyboardClick.current && !source.current) {
        active.current = true;
        setPressed(true);
        clearTimeout(pulse.current);
        pulse.current = setTimeout(() => release(), ACTIVATION_PULSE_MS);
      }
      keyboardClick.current = false;
    },
    handlers: {
      onPointerDown(event) {
        if (unavailable(event)) return;
        handlers.onPointerDown?.(event);
        if ((event.button != null && event.button !== 0) || event.isPrimary === false) return;
        source.current = { pointer: event.pointerId };
        keyboardClick.current = false;
        active.current = true;
        setPressed(true);
      },
      onPointerUp(event) { handlers.onPointerUp?.(event); release(); },
      onPointerCancel(event) { handlers.onPointerCancel?.(event); release(); },
      onPointerLeave(event) { handlers.onPointerLeave?.(event); release(); },
      onLostPointerCapture(event) { handlers.onLostPointerCapture?.(event); release(); },
      onBlur(event) { handlers.onBlur?.(event); release(); },
      onKeyDown(event) {
        if (unavailable(event)) return;
        handlers.onKeyDown?.(event);
        if (!keys.includes(event.key)) return;
        if (event.repeat) { event.preventDefault(); return; }
        source.current = { key: event.key };
        keyboardClick.current = true;
        active.current = true;
        setPressed(true);
      },
      onKeyUp(event) {
        handlers.onKeyUp?.(event);
        if (source.current?.key === event.key) release(true);
      },
    },
  };
}

// Preserve the original child layout and artwork selectors. Only bare text is
// given a visual span; element children remain direct children of the button.
export const Button = forwardRef(function Button({ children, className = "", disabled,
  sound, onClick, ...props }, ref) {
  const feedback = useContext(ControlFeedbackContext);
  const inactive = Boolean(disabled || props["aria-disabled"] === true || props["aria-disabled"] === "true");
  const press = usePressFeedback(inactive, props);
  const selectedControl = "aria-pressed" in props || "aria-current" in props || props.role === "tab";
  const effect = sound === undefined ? selectedControl ? "selection" : "tap" : sound;
  return <button type="button" {...props} {...press.handlers} ref={ref} disabled={disabled}
    className={`tactile-button ${className}`} data-pressed={press.pressed ? "true" : undefined}
    onClick={event => {
      if (press.unavailable(event)) { event.preventDefault(); return; }
      press.activate(event);
      onClick?.(event);
      if (!event.defaultPrevented && effect) feedback(effect);
    }}>
    {Children.map(children, child =>
      (typeof child === "string" && child.trim()) || typeof child === "number"
        ? <span className="control-label">{child}</span> : child)}
  </button>;
});

export const ChoiceInput = forwardRef(function ChoiceInput({ disabled, readOnly, onChange, className = "", ...props }, ref) {
  const feedback = useContext(ControlFeedbackContext);
  const press = usePressFeedback(Boolean(disabled || readOnly), props, [" "]);
  return <input {...props} {...press.handlers} ref={ref} disabled={disabled} readOnly={readOnly}
    className={`tactile-choice ${className}`} data-pressed={press.pressed ? "true" : undefined}
    onChange={event => {
      if (press.unavailable(event)) return;
      onChange?.(event);
      if (!event.defaultPrevented) feedback("selection");
    }} />;
});
