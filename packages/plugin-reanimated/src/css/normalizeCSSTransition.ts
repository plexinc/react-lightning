import type { AnimationSettings } from '@lightningjs/renderer';

import { resolveTimingEasing } from '../animation/resolveTimingEasing';
import type { CSSTransitionProps, PropertyTransitions } from './types';
import { warnOnce } from './warnOnce';

type ShorthandItem = {
  property: string;
  duration: number;
  delay: number;
  easing: AnimationSettings['easing'];
};

const TIME_PATTERN = /^-?\d*\.?\d+(ms|s)$/;

const EASING_KEYWORDS: ReadonlySet<string> = new Set([
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
]);

// CSS default for transition-timing-function.
const DEFAULT_EASING = 'ease';

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

/** CSS repeats a shorter settings list over the property list. */
function at<T>(values: T[], index: number, fallback: T): T {
  return values.length ? (values[index % values.length] as T) : fallback;
}

export function timeToMs(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const amount = Number.parseFloat(value);

    if (!Number.isNaN(amount)) {
      return value.endsWith('ms') ? amount : amount * 1000;
    }
  }

  return fallback;
}

/**
 * The renderer parses `ease*` names and `cubic-bezier(...)` itself, and takes a
 * function easing directly. Anything else (steps(), linear() with points) has
 * no equivalent, so it falls back to linear.
 */
export function resolveCSSTimingFunction(value: unknown): AnimationSettings['easing'] {
  if (value == null) {
    return DEFAULT_EASING;
  }

  if (typeof value === 'string') {
    if (EASING_KEYWORDS.has(value) || value.startsWith('cubic-bezier')) {
      return value;
    }

    warnOnce(`Timing function "${value}" is not supported on Lightning, using linear.`);

    return 'linear';
  }

  if (typeof value === 'object') {
    const bezier = value as { x1?: number; y1?: number; x2?: number; y2?: number };

    if (typeof bezier.x1 === 'number' && typeof bezier.x2 === 'number') {
      return `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`;
    }
  }

  // Easing.* functions and Easing.bezier factories still work.
  return resolveTimingEasing(value);
}

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of value) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    }

    if (depth === 0 && char === separator) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  parts.push(current);

  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseShorthandItem(item: string): ShorthandItem | null {
  const tokens = splitTopLevel(item, ' ');
  const times: number[] = [];
  let property: string | null = null;
  let easing: unknown;

  for (const token of tokens) {
    if (TIME_PATTERN.test(token)) {
      times.push(timeToMs(token));
    } else if (EASING_KEYWORDS.has(token) || token.includes('(')) {
      easing = token;
    } else if (property === null) {
      property = token;
    } else {
      warnOnce(`Ignoring unknown transition shorthand token "${token}".`);
    }
  }

  if (property === 'none') {
    return null;
  }

  return {
    property: property ?? 'all',
    duration: times[0] ?? 0,
    delay: times[1] ?? 0,
    easing: resolveCSSTimingFunction(easing),
  };
}

/**
 * Turns the `transition*` props (or the `transition` shorthand) into per-property
 * animation settings. `all` is kept as a key and expanded by the caller.
 */
export function normalizeCSSTransition(props: CSSTransitionProps): PropertyTransitions | null {
  const transitions: PropertyTransitions = new Map();

  if (typeof props.transition === 'string') {
    for (const item of splitTopLevel(props.transition, ',')) {
      const parsed = parseShorthandItem(item);

      if (parsed) {
        transitions.set(parsed.property, {
          duration: parsed.duration,
          delay: parsed.delay,
          easing: parsed.easing,
        });
      }
    }

    return transitions.size ? transitions : null;
  }

  const properties = toArray(props.transitionProperty as string | string[] | undefined);
  const durations = toArray(props.transitionDuration as unknown[]);
  const delays = toArray(props.transitionDelay as unknown[]);
  const easings = toArray(props.transitionTimingFunction as unknown[]);

  // CSS defaults transition-property to `all`; without any timing there is
  // nothing to animate.
  if (!properties.length) {
    if (!durations.length) {
      return null;
    }

    properties.push('all');
  }

  properties.forEach((property, index) => {
    if (property === 'none') {
      return;
    }

    transitions.set(property, {
      duration: timeToMs(at(durations, index, 0)),
      delay: timeToMs(at(delays, index, 0)),
      easing: resolveCSSTimingFunction(at(easings, index, undefined)),
    });
  });

  return transitions.size ? transitions : null;
}
