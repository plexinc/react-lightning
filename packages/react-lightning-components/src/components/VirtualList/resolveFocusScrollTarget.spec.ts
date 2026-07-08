import { describe, expect, it } from 'vitest';

import { resolveFocusScrollTarget } from './resolveFocusScrollTarget';

// A start-aligned row centered by large symmetric padding, like the
// "Who's watching?" user picker: item 0 sits half a viewport in, so the
// focused item's target equals its index step and must not snap to an edge.
const centeredRow = {
  viewportSize: 1920,
  snapToAlignment: 'start' as const,
  paddingStart: 848,
  paddingEnd: 1696,
  headerSize: 0,
  footerSize: 0,
  maxScroll: 848 + 5 * 233 + 1696 - 1920,
};

describe('resolveFocusScrollTarget', () => {
  it('start-aligns the focused item by its padding', () => {
    expect(
      resolveFocusScrollTarget({
        ...centeredRow,
        childOffset: 848 + 3 * 233,
        childSize: 224,
      }),
    ).toBe(3 * 233);
  });

  it('does not snap a near-start centered target to 0 (no header to protect)', () => {
    // Regression: with the old threshold (paddingStart + headerSize) this
    // near-start target fell inside the centering padding and snapped to 0.
    expect(
      resolveFocusScrollTarget({
        ...centeredRow,
        childOffset: 848 + 1 * 233,
        childSize: 224,
      }),
    ).toBe(1 * 233);
  });

  it('does not snap a near-end centered target to maxScroll (no footer to protect)', () => {
    const target = resolveFocusScrollTarget({
      ...centeredRow,
      childOffset: 848 + 4 * 233,
      childSize: 224,
    });

    expect(target).toBe(4 * 233);
    expect(target).toBeLessThan(centeredRow.maxScroll);
  });

  it('snaps to 0 to keep a real header fully visible', () => {
    expect(
      resolveFocusScrollTarget({
        viewportSize: 1920,
        snapToAlignment: 'start',
        paddingStart: 48,
        paddingEnd: 48,
        headerSize: 120,
        footerSize: 0,
        maxScroll: 5000,
        childOffset: 48 + 120,
        childSize: 256,
      }),
    ).toBe(0);
  });

  it('snaps to maxScroll to keep a real footer fully visible', () => {
    expect(
      resolveFocusScrollTarget({
        viewportSize: 1920,
        snapToAlignment: 'start',
        paddingStart: 48,
        paddingEnd: 48,
        headerSize: 0,
        footerSize: 120,
        maxScroll: 5000,
        childOffset: 5048,
        childSize: 256,
      }),
    ).toBe(5000);
  });

  it('centers when asked', () => {
    expect(
      resolveFocusScrollTarget({
        viewportSize: 1920,
        snapToAlignment: 'center',
        paddingStart: 0,
        paddingEnd: 0,
        headerSize: 0,
        footerSize: 0,
        maxScroll: 5000,
        childOffset: 1000,
        childSize: 200,
      }),
    ).toBe(1000 + 100 - 960);
  });
});
