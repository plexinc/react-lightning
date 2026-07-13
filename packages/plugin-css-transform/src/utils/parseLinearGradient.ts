import { htmlColorToLightningColor } from './htmlColorToLightningColor';

export interface LinearGradientShaderProps {
  colors: number[];
  stops: number[];
  angle: number;
}

// CSS keyword directions in CSS degrees (0deg = to top, 90deg = to right, ...).
const KEYWORD_ANGLES: Record<string, number> = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
  'top right': 45,
  'right top': 45,
  'bottom right': 135,
  'right bottom': 135,
  'bottom left': 225,
  'left bottom': 225,
  'top left': 315,
  'left top': 315,
};

const ANGLE_UNIT_TO_DEG: Record<string, number> = {
  deg: 1,
  grad: 0.9,
  rad: 180 / Math.PI,
  turn: 360,
};

// Lightning's LinearGradient shader points top-to-bottom at angle 0, which is
// CSS "to bottom" (180deg), and rotates the same way. So lightning = css - 180,
// normalised into [0, 2π) so equivalent directions map to one stable value.
function cssDegToLightningRadians(cssDeg: number): number {
  const radians = ((cssDeg - 180) * Math.PI) / 180;
  const twoPi = Math.PI * 2;

  return ((radians % twoPi) + twoPi) % twoPi;
}

function parseDirection(token: string): number | undefined {
  const angleMatch = /^(-?[\d.]+)(deg|grad|rad|turn)$/.exec(token);

  if (angleMatch) {
    const value = Number.parseFloat(angleMatch[1] ?? '');
    const factor = ANGLE_UNIT_TO_DEG[angleMatch[2] ?? ''];

    if (factor == null || Number.isNaN(value)) {
      return undefined;
    }

    return cssDegToLightningRadians(value * factor);
  }

  if (token.startsWith('to ')) {
    const sides = token.slice(3).trim().split(/\s+/).join(' ');
    const cssDeg = KEYWORD_ANGLES[sides];

    if (cssDeg != null) {
      return cssDegToLightningRadians(cssDeg);
    }
  }

  return undefined;
}

// Split on commas that aren't nested inside parens (rgba(...), hsl(...)).
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      parts.push(input.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(input.slice(start));

  return parts.map((part) => part.trim()).filter(Boolean);
}

// Fill missing stops the way CSS does: first defaults to 0, last to 1, runs of
// omitted stops are spread evenly between their defined neighbours, and the
// sequence is clamped to be non-decreasing.
function normalizeStops(positions: (number | undefined)[]): number[] {
  const out = positions.slice();
  const lastIndex = out.length - 1;

  if (out[0] == null) {
    out[0] = 0;
  }

  if (out[lastIndex] == null) {
    out[lastIndex] = 1;
  }

  let i = 0;

  while (i < out.length) {
    if (out[i] != null) {
      i++;
      continue;
    }

    const startIndex = i - 1;
    const startVal = out[startIndex];
    let end = i;

    while (end < out.length && out[end] == null) {
      end++;
    }

    const endVal = out[end];

    if (startVal != null && endVal != null) {
      const span = end - startIndex;

      for (let k = i; k < end; k++) {
        out[k] = startVal + ((endVal - startVal) * (k - startIndex)) / span;
      }
    }

    i = end;
  }

  let prev = out[0] ?? 0;

  return out.map((value) => {
    const resolved = value ?? prev;
    const clamped = resolved < prev ? prev : resolved;

    prev = clamped;

    return clamped;
  });
}

function parseStopPosition(raw: string | undefined): number | undefined {
  if (raw == null) {
    return undefined;
  }

  const match = /^(-?[\d.]+)(%|px)?$/.exec(raw);
  const value = match?.[1];

  if (value == null) {
    return undefined;
  }

  // px positions need the element size to normalise, which we don't have here.
  // Fall back to even distribution for those (rare in practice).
  if (match?.[2] === 'px') {
    return undefined;
  }

  return Number.parseFloat(value) / 100;
}

/**
 * Parse a CSS `linear-gradient(...)` value into the props Lightning's
 * LinearGradient shader expects. Returns undefined for anything that isn't a
 * linear gradient (url(), radial-gradient, etc.) or that resolves to fewer than
 * two colors.
 */
export function parseLinearGradient(
  value: string | undefined | null,
): LinearGradientShaderProps | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  const match = /^\s*linear-gradient\((.*)\)\s*$/is.exec(value.trim());
  const inner = match?.[1];

  if (inner == null) {
    return undefined;
  }

  const segments = splitTopLevel(inner);
  const first = segments[0];

  if (first == null) {
    return undefined;
  }

  let angle = cssDegToLightningRadians(180);
  const direction = parseDirection(first);

  if (direction != null) {
    angle = direction;
    segments.shift();
  }

  const colors: number[] = [];
  const positions: (number | undefined)[] = [];

  for (const segment of segments) {
    // Strip a trailing position token, leaving the color (which may itself
    // contain spaces, e.g. `rgba(0, 0, 0, 0.8)`).
    const posMatch = /\s+(-?[\d.]+(?:%|px)?)\s*$/.exec(segment);
    const colorText = posMatch ? segment.slice(0, posMatch.index).trim() : segment;

    try {
      const color = htmlColorToLightningColor(colorText);

      if (color == null) {
        return undefined;
      }

      colors.push(color);
    } catch {
      return undefined;
    }

    positions.push(parseStopPosition(posMatch?.[1]));
  }

  if (colors.length < 2) {
    return undefined;
  }

  return {
    colors,
    stops: normalizeStops(positions),
    angle,
  };
}
