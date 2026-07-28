import type { ColorValue } from 'react-native';

import { htmlColorCodes } from './htmlColorCodes';

const hexRgbaRegex = /^#?([a-f0-9]{8})$/i;
const hexRgbRegex = /^#?([a-f0-9]{6})$/i;
const hexShortRgbaRegex = /^#?([a-f0-9]{4})$/i;
const hexShortRgbRegex = /^#?([a-f0-9]{3})$/i;
// Accept both legacy comma form and modern space form with a `/` alpha delimiter.
const rgbRegex =
  /^rgba?\(([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)[,\s/]*([0-9.]+)?\)$/i;
const hslRegex =
  /^hsla?\(([0-9.]+)(?:deg)?[,\s]+([0-9.]+)%[,\s]+([0-9.]+)%[,\s/]*([0-9.]+)?\)$/i;
// Keyword colors (inherit, currentColor, …) have no fixed value to resolve, so
// they reach the throw below and take the whole screen down. Drop them instead.
const cssKeywordColorRegex = /^(inherit|initial|unset|revert|currentcolor)$/i;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));

  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
}

function packRgba(r: number, g: number, b: number, alpha?: string): number {
  return (
    ((r << 24) >>> 0) +
    (g << 16) +
    (b << 8) +
    (alpha != null ? Math.round(Number.parseFloat(alpha) * 255) : 255)
  );
}

function withAlphaOverride(
  color: number,
  overrideAlpha?: number | string,
): number {
  if (overrideAlpha == null) {
    return color;
  }

  const alphaInt =
    typeof overrideAlpha === 'string'
      ? Number.parseInt(overrideAlpha, 16)
      : overrideAlpha;

  // Create a bitmask for the alpha value
  const alphaMask = 0xffffff00 | alphaInt;

  // Combine the color and alpha values and convert to unsigned
  return (color & alphaMask) >>> 0;
}

export function htmlColorToLightningColor(
  color?: ColorValue | number,
  overrideAlpha?: number | string,
): number | undefined {
  if (!color) {
    return 0;
  }

  if (typeof color === 'number') {
    return withAlphaOverride(color, overrideAlpha);
  }

  // PlatformColor / OpaqueColorValue have no resolvable string form. Drop them
  // like unresolvable keywords rather than throwing and killing the screen.
  if (typeof color === 'object') {
    console.warn('[htmlColorToLightningColor] Unsupported color value:', color);
    return undefined;
  }

  const colorLower = String(color).toLowerCase();
  const colorFromCode = htmlColorCodes[colorLower];

  if (colorFromCode != null) {
    return withAlphaOverride(colorFromCode, overrideAlpha);
  }

  const rgbResult = rgbRegex.exec(colorLower);

  if (rgbResult) {
    const [, r, g, b, alpha] = rgbResult.slice() as [
      string,
      string,
      string,
      string,
      string?,
    ];
    const rgbColor = packRgba(
      Number.parseInt(r, 10),
      Number.parseInt(g, 10),
      Number.parseInt(b, 10),
      alpha,
    );

    return withAlphaOverride(rgbColor, overrideAlpha);
  }

  const hslResult = hslRegex.exec(colorLower);

  if (hslResult) {
    const [, h, s, l, alpha] = hslResult.slice() as [
      string,
      string,
      string,
      string,
      string?,
    ];
    const [r, g, b] = hslToRgb(
      Number.parseFloat(h),
      Number.parseFloat(s),
      Number.parseFloat(l),
    );

    return withAlphaOverride(packRgba(r, g, b, alpha), overrideAlpha);
  }

  const hexRgbaResult = hexRgbaRegex.exec(colorLower);

  if (hexRgbaResult?.[1]) {
    return withAlphaOverride(
      Number.parseInt(hexRgbaResult[1], 16),
      overrideAlpha,
    );
  }

  const hexRgbResult = hexRgbRegex.exec(colorLower);

  if (hexRgbResult?.[1]) {
    return withAlphaOverride(
      Number.parseInt(`${hexRgbResult[1]}ff`, 16),
      overrideAlpha,
    );
  }

  const hexShortRgbaResult = hexShortRgbaRegex.exec(colorLower);

  if (hexShortRgbaResult?.[1]) {
    const short = hexShortRgbaResult[1];
    const rgbaText = [...short].map((c) => `${c}${c}`).join('');

    return withAlphaOverride(Number.parseInt(rgbaText, 16), overrideAlpha);
  }

  const hexShortRgbResult = hexShortRgbRegex.exec(colorLower);

  if (hexShortRgbResult?.[1]) {
    const short = hexShortRgbResult[1];
    const rgbText = `${[...short].map((c) => `${c}${c}`).join('')}ff`;

    return withAlphaOverride(Number.parseInt(rgbText, 16), overrideAlpha);
  }

  if (cssKeywordColorRegex.test(colorLower)) {
    return undefined;
  }

  throw new Error(
    `Invalid hex value specified for conversion: ${color.toString()}`,
  );
}
