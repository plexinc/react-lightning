import type { DimensionValue } from '@plex/react-lightning-plugin-flexbox';
import type { Animated } from 'react-native';

const unitRegex = /^(\d+)(px|vw|vh|%)?$/i;

/**
 * Converts CSS units to pixels that Lightning uses. If calculating percentages,
 * the `screenWidth` will be used as the relative size to calculate against
 * @param value The value to convert. Eg: `18px`, `50%`, `40vh`
 * @returns Converted value in pixels
 */
export function fromCssUnit(
  value?: DimensionValue | Animated.AnimatedNode,
  containerSize = 1920,
): number | undefined {
  if (typeof value === 'object') {
    // TODO: Support animated nodes
    console.warn('[fromCssUnit] Unsupported css unit:', value);
    return;
  }

  if (value == null || typeof value !== 'string') {
    return value;
  }

  const match = value.match(unitRegex);

  if (!match) {
    return 0;
  }

  const numberValue = Number.parseFloat(match[0]);

  switch (match[2]) {
    case 'vh':
    case 'vw':
    case '%':
      return (numberValue / 100) * containerSize;
    // TODO: Handle em and rem
    default:
      return numberValue;
  }
}
