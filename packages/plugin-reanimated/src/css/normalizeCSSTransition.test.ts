import { beforeEach, describe, expect, it, vi } from 'vitest';

import { normalizeCSSTransition, timeToMs } from './normalizeCSSTransition';
import { resetWarnOnce } from './warnOnce';

describe('timeToMs', () => {
  it('reads numbers as milliseconds and parses time units', () => {
    expect(timeToMs(200)).toBe(200);
    expect(timeToMs('200ms')).toBe(200);
    expect(timeToMs('0.3s')).toBe(300);
    expect(timeToMs('nope', 50)).toBe(50);
  });
});

describe('normalizeCSSTransition', () => {
  beforeEach(() => {
    resetWarnOnce();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('reads a single property', () => {
    expect(
      normalizeCSSTransition({
        transitionProperty: 'opacity',
        transitionDuration: 200,
        transitionTimingFunction: 'ease-in',
        transitionDelay: '50ms',
      }),
    ).toEqual(new Map([['opacity', { duration: 200, delay: 50, easing: 'ease-in' }]]));
  });

  it('repeats a shorter settings list over the properties', () => {
    const result = normalizeCSSTransition({
      transitionProperty: ['transform', 'opacity', 'backgroundColor'],
      transitionDuration: [100, 200],
    });

    expect(result?.get('transform')?.duration).toBe(100);
    expect(result?.get('opacity')?.duration).toBe(200);
    expect(result?.get('backgroundColor')?.duration).toBe(100);
  });

  it('defaults the timing function to ease', () => {
    expect(
      normalizeCSSTransition({ transitionProperty: 'opacity', transitionDuration: 1 })?.get(
        'opacity',
      )?.easing,
    ).toBe('ease');
  });

  it('spells a reanimated cubicBezier easing the way the renderer parses it', () => {
    const easing = { x1: 0.22, y1: 1, x2: 0.36, y2: 1 };

    expect(
      normalizeCSSTransition({
        transitionProperty: 'transform',
        transitionDuration: 200,
        transitionTimingFunction: easing,
      })?.get('transform')?.easing,
    ).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('falls back to linear for a timing function the renderer has no equivalent for', () => {
    expect(
      normalizeCSSTransition({
        transitionProperty: 'opacity',
        transitionDuration: 200,
        transitionTimingFunction: 'steps(4, jump-end)',
      })?.get('opacity')?.easing,
    ).toBe('linear');
  });

  it('drops "none" and returns null when nothing is left', () => {
    expect(
      normalizeCSSTransition({ transitionProperty: 'none', transitionDuration: 200 }),
    ).toBeNull();
    expect(normalizeCSSTransition({})).toBeNull();
  });

  it('defaults the property to all when only a duration is given', () => {
    expect(normalizeCSSTransition({ transitionDuration: 200 })?.has('all')).toBe(true);
  });

  it('parses the transition shorthand', () => {
    expect(
      normalizeCSSTransition({ transition: 'transform 200ms ease-in 50ms, opacity 0.3s' }),
    ).toEqual(
      new Map([
        ['transform', { duration: 200, delay: 50, easing: 'ease-in' }],
        ['opacity', { duration: 300, delay: 0, easing: 'ease' }],
      ]),
    );
  });

  it('parses a shorthand cubic-bezier without splitting on its commas', () => {
    expect(
      normalizeCSSTransition({ transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)' })?.get(
        'transform',
      )?.easing,
    ).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  });
});
