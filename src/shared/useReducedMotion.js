import { createContext, useEffect, useState } from "react";

export const MotionPreferenceContext = createContext(false);

// The app setting can reduce motion further, but cannot override the OS.
// Shared with portals and future JS-driven sequences through React context.
export default function useReducedMotion(preference = false) {
  const [systemReduced, setSystemReduced] = useState(() =>
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return undefined;
    const update = () => setSystemReduced(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);
  return preference || systemReduced;
}
