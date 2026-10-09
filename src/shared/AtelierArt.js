import { useId } from "react";

export const ATELIER_ART = `${process.env.PUBLIC_URL || ""}/art/atelier`;

// Viewports select the original PNG pixels without altering the source artwork.
export function ArtFragment({ sheet = "interface-sheet", rect, size = [1536, 1024], clipShape, className = "", ...props }) {
  const clip = useId();
  return <svg aria-hidden="true" className={`pastel-cutout ${className}`} viewBox={rect.join(" ")} preserveAspectRatio="none" {...props}>
    <defs><clipPath id={clip}>{clipShape || <rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} />}</clipPath></defs>
    <image clipPath={`url(#${clip})`} href={`${ATELIER_ART}/${sheet}.png`} width={size[0]} height={size[1]} />
  </svg>;
}

export function PastelButtonArt() {
  return <ArtFragment rect={[565, 226, 460, 155]} className="pastel-button-art" />;
}
