import type { ColorValue } from 'react-native';
import { htmlColorCodes } from './htmlColorCodes';

const hexRgbRegex = /^#?([a-f0-9]{6})$/i;
const hexShortRgbRegex = /^#?([a-f0-9]{3})$/i;
const rgbRegex =
  /^rgba?\(([0-9.]+)[, ]+([0-9.]+)[, ]+([0-9.]+)[, ]*([0-9.]+)?\)$/i;

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
): number {
  if (!color) {
    return 0;
  }

  if (typeof color === 'number') {
    return withAlphaOverride(color, overrideAlpha);
  }

  const colorLower = String(color).toLowerCase();
  const colorFromCode = htmlColorCodes[colorLower];

  if (colorFromCode != null) {
    return withAlphaOverride(colorFromCode, overrideAlpha);
  }

  const rgbResult = rgbRegex.exec(colorLower);

  if (rgbResult) {
    const parts = rgbResult.slice() as [
      string,
      string,
      string,
      string,
      string?,
    ];

    const rgbColor =
      ((Number.parseInt(parts[1], 10) << 24) >>> 0) +
      (Number.parseInt(parts[2], 10) << 16) +
      (Number.parseInt(parts[3], 10) << 8) +
      (parts[4] != null ? Math.round(Number.parseFloat(parts[4]) * 255) : 255);

    return withAlphaOverride(rgbColor, overrideAlpha);
  }

  const hexRgbResult = hexRgbRegex.exec(colorLower);

  if (hexRgbResult?.[1]) {
    return withAlphaOverride(
      Number.parseInt(`${hexRgbResult[1]}ff`, 16),
      overrideAlpha,
    );
  }

  const hexShortRgbResult = hexShortRgbRegex.exec(colorLower);

  if (hexShortRgbResult?.[1]) {
    const shortRgbText = hexShortRgbResult[1];
    const rgbText = `${shortRgbText[0]}${shortRgbText[0]}${shortRgbText[1]}${shortRgbText[1]}${shortRgbText[2]}${shortRgbText[2]}ff`;

    return withAlphaOverride(Number.parseInt(rgbText, 16), overrideAlpha);
  }

  throw new Error(
    `Invalid hex value specified for conversion: ${color.toString()}`,
  );
}
