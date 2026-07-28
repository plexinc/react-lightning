import { describe, expect, it } from 'vitest';

import { resolveTimingEasing } from './resolveTimingEasing';

describe('resolveTimingEasing', () => {
  it('passes a function easing through unchanged', () => {
    const fn = (t: number) => t * t;

    expect(resolveTimingEasing(fn)).toBe(fn);
  });

  it('resolves an Easing.bezier factory object to its function', () => {
    const produced = (t: number) => t;
    const factoryObj = { factory: () => produced };

    expect(resolveTimingEasing(factoryObj)).toBe(produced);
  });

  it('defaults an unset easing to ease-in-out-quad', () => {
    expect(resolveTimingEasing(undefined)).toBe('cubic-bezier(0.455, 0.03, 0.515, 0.955)');
    expect(resolveTimingEasing(null)).toBe('cubic-bezier(0.455, 0.03, 0.515, 0.955)');
  });

  it('falls back to linear for an unrecognized easing value', () => {
    expect(resolveTimingEasing({ nope: true })).toBe('linear');
    expect(resolveTimingEasing('ease-in')).toBe('linear');
  });
});
