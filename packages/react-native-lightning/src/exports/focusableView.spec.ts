import { describe, expect, it } from 'vitest';

import { isFocusActive, shouldRegisterFocus } from './focusableView';

describe('shouldRegisterFocus', () => {
  it('registers a View that sets focusable either way', () => {
    expect(shouldRegisterFocus({ focusable: true })).toBe(true);
    expect(shouldRegisterFocus({ focusable: false })).toBe(true);
  });

  it('registers a directional-only catcher that only excludes restoration', () => {
    // The edge guard opts in via focusRestorationExcluded alone, with no
    // focusable prop — it must still become a spatial-nav target.
    expect(shouldRegisterFocus({ focusRestorationExcluded: true })).toBe(true);
  });

  it('leaves a plain View as a bare node', () => {
    expect(shouldRegisterFocus({})).toBe(false);
    expect(shouldRegisterFocus({ focusable: null })).toBe(false);
    expect(shouldRegisterFocus({ focusRestorationExcluded: false })).toBe(
      false,
    );
  });
});

describe('isFocusActive', () => {
  it('is inactive only when focusable is explicitly false', () => {
    expect(isFocusActive({ focusable: false })).toBe(false);
  });

  it('is active for focusable Views and restoration-excluded catchers', () => {
    expect(isFocusActive({ focusable: true })).toBe(true);
    expect(isFocusActive({ focusRestorationExcluded: true })).toBe(true);
    expect(isFocusActive({})).toBe(true);
  });
});
