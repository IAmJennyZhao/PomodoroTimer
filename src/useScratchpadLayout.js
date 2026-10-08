import { useLayoutEffect, useState } from "react";

function readViewport() {
  const viewport = window.visualViewport;
  return { width: window.innerWidth, height: viewport?.height ?? window.innerHeight,
    top: viewport?.offsetTop ?? 0, keyboard: Boolean(viewport && viewport.height < window.innerHeight - 100) };
}

export default function useScratchpadLayout({ open, focusView, panel, arranging, headerHeight }) {
  const [viewport, setViewport] = useState(readViewport);
  useLayoutEffect(() => {
    const update = () => {
      const next = readViewport();
      setViewport(previous => Object.keys(next).every(key => next[key] === previous[key]) ? previous : next);
    };
    update();
    window.addEventListener("resize", update);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
    };
  }, []);
  const layout = viewport.width < 1000 ? "sheet" : panel || focusView ? "docked" : "floating";
  const compact = layout === "sheet" && (viewport.keyboard || viewport.height < 520);
  const arrangingSheet = arranging && layout === "sheet";
  const visibleHeader = focusView || compact || arrangingSheet ? 0 : headerHeight;
  const sheetHeight = compact ? Math.max(120, viewport.height - 96)
    : arrangingSheet ? Math.min(260, viewport.height * .4)
    : Math.max(160, Math.min(360, viewport.height * .56, viewport.height - visibleHeader - 80));
  return {
    layout, compact: open && compact, hideHeader: open && (compact || arrangingSheet),
    style: { "--notes-visible-top": `${viewport.top}px`, "--notes-visible-height": `${viewport.height}px`,
      "--notes-header-height": `${visibleHeader}px`, "--notes-sheet-height": `${sheetHeight}px` },
  };
}
