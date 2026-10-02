export const ATELIER_ART = `${process.env.PUBLIC_URL || ""}/art/atelier`;

// Viewports select the original PNG pixels without altering the source artwork.
export function ArtFragment({ sheet = "interface-sheet", rect, size = [1536, 1024], className = "", ...props }) {
  return <svg aria-hidden="true" className={`pastel-cutout ${className}`} viewBox={rect.join(" ")} preserveAspectRatio="none" {...props}>
    <image href={`${ATELIER_ART}/${sheet}.png`} width={size[0]} height={size[1]} />
  </svg>;
}

export function PastelButtonArt() {
  return <ArtFragment rect={[565, 226, 460, 155]} className="pastel-button-art" />;
}
