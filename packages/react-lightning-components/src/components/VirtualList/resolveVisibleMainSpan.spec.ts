import { describe, expect, it } from 'vitest';

import { capSelfMeasuredViewport } from './capSelfMeasuredViewport';
import { resolveFocusScrollTarget } from './resolveFocusScrollTarget';
import { resolveVisibleMainSpan } from './resolveVisibleMainSpan';

describe('resolveVisibleMainSpan', () => {
  it('measures a horizontal list from its left edge to the stage right edge', () => {
    expect(resolveVisibleMainSpan(true, 1920, 1080, 0, 300)).toBe(1920);
  });

  it('measures a vertical list from its top edge to the stage bottom edge', () => {
    expect(resolveVisibleMainSpan(false, 1920, 1080, 200, 300)).toBe(780);
  });

  it('grows the span for a full-bleed list that starts off the left edge', () => {
    // marginLeft pulls the list start negative; it overflows nothing on screen.
    expect(resolveVisibleMainSpan(true, 1920, 1080, -848, 0)).toBe(2768);
  });

  // The centered switch-user row: its -848 overflow margin inflates the
  // self-measured width to 2768, but only 1920 is on screen. Capping to the
  // visible span is what lets center snap land the focused tile at 960.
  it('caps the inflated switch-user viewport and centers the focused tile', () => {
    const rawMeasured = 2768;
    const span = resolveVisibleMainSpan(true, 1920, 1080, 0, 0);
    const viewportSize = capSelfMeasuredViewport(rawMeasured, span);

    expect(viewportSize).toBe(1920);

    const target = resolveFocusScrollTarget({
      childOffset: 1144,
      childSize: 224,
      viewportSize,
      snapToAlignment: 'center',
      paddingStart: 848,
      paddingEnd: 1696,
      headerSize: 0,
      footerSize: 0,
      maxScroll: 4248 - viewportSize,
    });

    // Centers the tile in the visible 1920: 1144 + 112 - 960.
    expect(target).toBe(296);
    // On-screen tile center = childOffset - target + childSize / 2 = 960.
    expect(1144 - target + 224 / 2).toBe(960);
  });

  it('does not center against the off-screen width when left uncapped', () => {
    // Regression guard: with the raw 2768 viewport the center target goes
    // negative and clamps to 0, so the tile never leaves its start position.
    const target = resolveFocusScrollTarget({
      childOffset: 1144,
      childSize: 224,
      viewportSize: 2768,
      snapToAlignment: 'center',
      paddingStart: 848,
      paddingEnd: 1696,
      headerSize: 0,
      footerSize: 0,
      maxScroll: 4248 - 2768,
    });

    expect(target).toBeLessThan(0);
  });
});
