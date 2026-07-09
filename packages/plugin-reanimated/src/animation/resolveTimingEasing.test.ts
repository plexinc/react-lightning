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

  it('falls back to linear when easing is missing', () => {
    expect(resolveTimingEasing(undefined)).toBe('linear');
  });

  it('falls back to linear for an unrecognized easing value', () => {
    expect(resolveTimingEasing({ nope: true })).toBe('linear');
    expect(resolveTimingEasing('ease-in')).toBe('linear');
  });
});
