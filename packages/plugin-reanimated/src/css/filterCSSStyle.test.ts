import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCSSStyleParts, filterCSSStyle, finalizeCSSStyleParts } from './filterCSSStyle';
import { resetWarnOnce } from './warnOnce';

function filter(...styles: Record<string, unknown>[]) {
  const parts = createCSSStyleParts();

  for (const style of styles) {
    filterCSSStyle(style, parts);
  }

  return finalizeCSSStyleParts(parts);
}

describe('filterCSSStyle', () => {
  beforeEach(() => {
    resetWarnOnce();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('keeps plain style props in the rendered style', () => {
    expect(filter({ opacity: 0.5, padding: 10 }).style).toEqual({ opacity: 0.5, padding: 10 });
  });

  it('splits a pseudo-selector value into a resting value and an override', () => {
    const parts = filter({
      opacity: { default: 1, ':focus': 0.5 },
      padding: 10,
    });

    expect(parts.style).toEqual({ padding: 10 });
    expect(parts.base).toEqual({ opacity: 1 });
    expect(parts.pseudoStyles).toEqual({ ':focus': { opacity: 0.5 } });
  });

  it('takes the resting value from an earlier style object', () => {
    const parts = filter({ opacity: 1 }, { opacity: { ':focus': 0.5 } });

    expect(parts.style).toEqual({});
    expect(parts.base).toEqual({ opacity: 1 });
  });

  it('collects transition props', () => {
    const parts = filter({
      transitionProperty: 'opacity',
      transitionDuration: 200,
    });

    expect(parts.style).toEqual({});
    expect(parts.transitionProps).toEqual({
      transitionProperty: 'opacity',
      transitionDuration: 200,
    });
  });

  it('lets the transition shorthand drop everything set before it', () => {
    const parts = filter({ transitionDuration: 200 }, { transition: 'opacity 100ms' });

    expect(parts.transitionProps).toEqual({ transition: 'opacity 100ms' });
  });

  it('ignores selectors that need pointer or press state', () => {
    const parts = filter({ opacity: { default: 1, ':hover': 0.5, ':focus': 0.8 } });

    expect(parts.pseudoStyles).toEqual({ ':focus': { opacity: 0.8 } });
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('ignores css animation props', () => {
    const parts = filter({ animationName: { from: { opacity: 0 } }, animationDuration: 100 });

    expect(parts.style).toEqual({});
    expect(parts.transitionProps).toBeNull();
  });

  it('treats an explicit undefined as unset', () => {
    expect(filter({ opacity: undefined }).style).toEqual({});
  });

  it('leaves a transform array alone', () => {
    const parts = filter({ transform: [{ translateY: 10 }] });

    expect(parts.style).toEqual({ transform: [{ translateY: 10 }] });
  });
});
