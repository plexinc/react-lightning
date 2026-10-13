import { describe, expect, it } from 'vitest';

import { toFocusGroupOptions } from './tvFocusGuide';

describe('toFocusGroupOptions', () => {
  it('leaves a plain guide as a spatial container', () => {
    expect(toFocusGroupOptions({})).toEqual({
      destinations: undefined,
      focusRedirect: false,
      focusEntry: undefined,
      disable: false,
    });
  });

  it('forwards arrival to the remembered child for autoFocus, without a mount claim', () => {
    const options = toFocusGroupOptions({ autoFocus: true });

    expect(options.focusEntry).toBe('last-focused');
    expect(options).not.toHaveProperty('autoFocus');
  });

  it('redirects to destinations, keeping the array when every entry is live', () => {
    const destinations = [{ id: 1 }, { id: 2 }];
    const options = toFocusGroupOptions({ destinations });

    expect(options.focusRedirect).toBe(true);
    expect(options.destinations).toBe(destinations);
  });

  it('drops destinations that have not mounted yet', () => {
    const live = { id: 1 };

    expect(toFocusGroupOptions({ destinations: [null, live, undefined] }).destinations).toEqual([
      live,
    ]);
  });

  it('does not redirect when no destination is live', () => {
    expect(toFocusGroupOptions({ destinations: [null] })).toMatchObject({
      destinations: undefined,
      focusRedirect: false,
    });
    expect(toFocusGroupOptions({ destinations: [] }).focusRedirect).toBe(false);
  });

  it('disables the subtree only when focusable is explicitly false', () => {
    expect(toFocusGroupOptions({ focusable: false }).disable).toBe(true);
    expect(toFocusGroupOptions({ focusable: true }).disable).toBe(false);
    expect(toFocusGroupOptions({ focusable: null }).disable).toBe(false);
  });
});
