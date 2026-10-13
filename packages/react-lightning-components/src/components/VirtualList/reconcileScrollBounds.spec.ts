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
  endReachedForCount: 0,
  itemCount: 20,
  isScroll: false,
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
      ...shrunk,
      scrollOffset: 0,
      maxScroll: 0,
      totalContentSize: 400, // shorter than the viewport
    });

    expect(result.fireEndReached).toBe(true);
    expect(result.endReachedForCount).toBe(20);
    expect(result.distanceFromEnd).toBe(400 - 0 - 1920);
  });

  it('does not fire for an empty list', () => {
    const result = reconcileScrollBounds({
      ...shrunk,
      scrollOffset: 0,
      maxScroll: 0,
      totalContentSize: 0,
      itemCount: 0,
    });

    expect(result.fireEndReached).toBe(false);
  });

  it('reports distanceFromEnd 0 and fires when the shrink lands us at the end', () => {
    const result = reconcileScrollBounds(shrunk);

    expect(result.distanceFromEnd).toBe(0);
    expect(result.fireEndReached).toBe(true);
  });

  it('does not re-fire for the same item count', () => {
    const result = reconcileScrollBounds({ ...shrunk, endReachedForCount: 20 });

    expect(result.fireEndReached).toBe(false);
    expect(result.endReachedForCount).toBe(20);
  });

  it('fires again once the item count changes while still within threshold', () => {
    const result = reconcileScrollBounds({
      ...shrunk,
      endReachedForCount: 20,
      itemCount: 40,
    });

    expect(result.fireEndReached).toBe(true);
    expect(result.endReachedForCount).toBe(40);
  });

  it('keeps the latch when content grows past the threshold without a scroll', () => {
    const grown = { ...shrunk, scrollOffset: 0, maxScroll: 8000, totalContentSize: 8000 + 1920 };
    const out = reconcileScrollBounds({ ...grown, endReachedForCount: 20 });

    expect(out.endReachedForCount).toBe(20);

    const back = reconcileScrollBounds({ ...shrunk, endReachedForCount: out.endReachedForCount });

    expect(back.fireEndReached).toBe(false);
  });

  it('re-arms once a scroll moves back outside the threshold', () => {
    const result = reconcileScrollBounds({
      ...shrunk,
      scrollOffset: 0,
      maxScroll: 8000,
      totalContentSize: 8000 + 1920,
      endReachedForCount: 20,
      isScroll: true,
    });

    expect(result.fireEndReached).toBe(false);
    expect(result.endReachedForCount).toBe(0);
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
      ...shrunk,
      scrollOffset: 100,
      onEndReachedThreshold: null,
    });

    expect(result.distanceFromEnd).toBe(1000 + 1920 - 100 - 1920);
    expect(result.fireEndReached).toBe(true);
  });
});
