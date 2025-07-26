import type { AutoDimensionValue } from '../types';

type FlexConfig = {
  grow: number;
  shrink: number;
  basis: AutoDimensionValue | string;
};

// Cache for parsed flex values
const flexCache = new Map<string | number, FlexConfig>();

export function parseFlexValue(
  value: string | number,
  expandToAutoFlexBasis = false,
): FlexConfig | null {
  // Check cache first for string values to prevent parsing again
  const cached = flexCache.get(value);

  if (cached) {
    return cached;
  }

  let flexConfig: {
    grow: number;
    shrink: number;
    basis: AutoDimensionValue | string;
  };

  if (typeof value === 'number') {
    flexConfig = {
      grow: value,
      shrink: 1,
      basis: expandToAutoFlexBasis ? 'auto' : '0%',
    };
  } else {
    // Trim whitespace and filter out empty parts
    const parts = value
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);

    // Return null for empty input
    if (parts.length === 0) {
      return null;
    }

    const [grow, shrink, basis] = parts;

    // Helper function to check if a string is a valid number (including decimals and negatives)
    const isValidNumber = (str: string): boolean => {
      return /^-?(\d+\.?\d*|\d*\.\d+)([eE][+-]?\d+)?$/.test(str.trim());
    };

    // https://developer.mozilla.org/en-US/docs/Web/CSS/flex
    if (parts.length === 3 && grow != null && shrink != null && basis != null) {
      flexConfig = {
        grow: Number.parseFloat(grow),
        shrink: Number.parseFloat(shrink),
        basis,
      };
    } else if (parts.length === 2 && grow != null && shrink != null) {
      // For two values, if the second value is a pure number (not "0"), treat as grow/shrink
      // If it's "0" or has units, treat as grow/basis
      if (isValidNumber(shrink) && shrink !== '0') {
        flexConfig = {
          grow: Number.parseFloat(grow),
          shrink: Number.parseFloat(shrink),
          basis: 0,
        };
      } else {
        flexConfig = {
          grow: Number.parseFloat(grow),
          shrink: 1,
          basis: shrink,
        };
      }
    } else if (parts.length === 1 && grow != null) {
      if (isValidNumber(grow)) {
        flexConfig = {
          grow: Number.parseFloat(grow),
          shrink: 1,
          basis: expandToAutoFlexBasis ? 'auto' : '0%',
        };
      } else if (grow === 'none') {
        flexConfig = { grow: 0, shrink: 0, basis: 'auto' };
      } else {
        flexConfig = { grow: 1, shrink: 1, basis: grow };
      }
    } else {
      return null;
    }
  }

  // Cache the parsed result
  flexCache.set(value, flexConfig);

  return flexConfig;
}
