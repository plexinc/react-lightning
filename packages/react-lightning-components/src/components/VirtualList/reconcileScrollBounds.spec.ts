import { describe, expect, it } from 'vitest';

import { reconcileScrollBounds } from './reconcileScrollBounds';

// A list scrolled near the end, then filtered down so the content is now
// shorter than the current offset — the offset must reclamp to the new end.
const shrunk = {
  scrollOffset: 4000,
  maxScroll: 1000,
  totalContentSize: 1000 + 1920, // maxScroll + viewportSize
  viewportSize: 1920,
  onEndReachedThreshold: 0.5,
  endReached: false,
  hasEndReachedListener: true,
};

describe('reconcileScrollBounds', () => {
  it('reclamps an offset that now sits past maxScroll', () => {
    const result = reconcileScrollBounds(shrunk);

    expect(result.clampedOffset).toBe(1000);
    expect(result.didClamp).toBe(true);
  });

  it('leaves an in-bounds offset untouched', () => {
    const result = reconcileScrollBounds({
      ...shrunk,
      scrollOffset: 500,
      maxScroll: 5000,
      totalContentSize: 5000 + 1920,
    });

    expect(result.clampedOffset).toBe(500);
    expect(result.didClamp).toBe(false);
  });

  it('fires onEndReached on mount when a short list is within threshold', () => {
    const result = reconcileScrollBounds({
      scrollOffset: 0,
      maxScroll: 0,
      totalContentSize: 400, // shorter than the viewport
      viewportSize: 1920,
      onEndReachedThreshold: 0.5,
      endReached: false,
      hasEndReachedListener: true,
    });

    expect(result.fireEndReached).toBe(true);
    expect(result.endReached).toBe(true);
    expect(result.distanceFromEnd).toBe(400 - 0 - 1920);
  });

  it('reports distanceFromEnd 0 and fires when the shrink lands us at the end', () => {
    const result = reconcileScrollBounds(shrunk);

    expect(result.distanceFromEnd).toBe(0);
    expect(result.fireEndReached).toBe(true);
    expect(result.endReached).toBe(true);
  });

  it('does not re-fire while already latched at the end', () => {
    const result = reconcileScrollBounds({ ...shrunk, endReached: true });

    expect(result.fireEndReached).toBe(false);
    expect(result.endReached).toBe(true);
  });

  it('re-arms the latch once back outside the threshold', () => {
    const result = reconcileScrollBounds({
      scrollOffset: 0,
      maxScroll: 8000,
      totalContentSize: 8000 + 1920,
      viewportSize: 1920,
      onEndReachedThreshold: 0.5,
      endReached: true,
      hasEndReachedListener: true,
    });

    expect(result.fireEndReached).toBe(false);
    expect(result.endReached).toBe(false);
  });

  it('never fires without a listener', () => {
    const result = reconcileScrollBounds({
      ...shrunk,
      hasEndReachedListener: false,
    });

    expect(result.fireEndReached).toBe(false);
  });

  it('defaults the threshold to 0.5 of the viewport when null', () => {
    // distanceFromEnd 900 sits just inside 0.5 * 1920 = 960.
    const result = reconcileScrollBounds({
      scrollOffset: 100,
      maxScroll: 1000,
      totalContentSize: 1000 + 1920,
      viewportSize: 1920,
      onEndReachedThreshold: null,
      endReached: false,
      hasEndReachedListener: true,
    });

    expect(result.distanceFromEnd).toBe(1000 + 1920 - 100 - 1920);
    expect(result.fireEndReached).toBe(true);
  });
});
