// The scene renders at a fixed logical resolution, so one layout pixel is one canvas pixel.
// rn-web's devicePixelRatio fetched 2x retina assets: 4x texture memory, evicting visible tiles.

export function get(): number {
  return 1;
}

export function getFontScale(): number {
  return 1;
}

export function getPixelSizeForLayoutSize(layoutSize: number): number {
  return Math.round(layoutSize);
}

export function roundToNearestPixel(layoutSize: number): number {
  return Math.round(layoutSize);
}
