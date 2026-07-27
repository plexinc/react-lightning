import { describe, expect, it } from 'vitest';

import { getEnsureVisibleOffset, usesExplicitAlignment } from './scrollFocus';

describe('usesExplicitAlignment', () => {
  it('honors deliberate center/end placements', () => {
    expect(usesExplicitAlignment('center')).toBe(true);
    expect(usesExplicitAlignment('end')).toBe(true);
  });

  it('reveals (does not snap) for item, start, and unset', () => {
    // 'item' (paging) isn't implemented by the alignment math and 'start' isn't
    // a real focus target, so a focused row must ensure-visible instead.
    expect(usesExplicitAlignment('item')).toBe(false);
    expect(usesExplicitAlignment('start')).toBe(false);
    expect(usesExplicitAlignment(undefined)).toBe(false);
    expect(usesExplicitAlignment(null)).toBe(false);
  });
});

// Offsets follow the ScrollView convention: the content container is translated
// by a non-positive offset, so scrolling down toward the end grows more negative.
describe('getEnsureVisibleOffset', () => {
  const viewport = 100;
  const container = 400;

  it('leaves the offset unchanged when the child is already fully visible', () => {
    // Child spans [10, 40] on screen while resting at the top.
    expect(getEnsureVisibleOffset(viewport, container, 0, 10, 30)).toBe(0);
  });

  it('scrolls just enough to reveal a child below the fold', () => {
    // Child at [150, 190] within the container; bottom must land on the
    // viewport edge (100), so offset = 100 - 190 = -90.
    expect(getEnsureVisibleOffset(viewport, container, 0, 150, 40)).toBe(-90);
  });

  it('aligns a child above the current window to the top', () => {
    // Already scrolled to -200; child at 50 is above the window.
    expect(getEnsureVisibleOffset(viewport, container, -200, 50, 30)).toBe(-50);
  });

  it('never scrolls past the end of the content', () => {
    // maxScroll = viewport - container = -300; a child at the very end can't
    // pull the offset past that clamp.
    expect(getEnsureVisibleOffset(viewport, container, 0, 380, 20)).toBe(-300);
  });

  it('never scrolls before the start of the content', () => {
    expect(getEnsureVisibleOffset(viewport, container, -50, 0, 20)).toBe(0);
  });

  it('does not scroll when the content fits inside the viewport', () => {
    expect(getEnsureVisibleOffset(200, 120, 0, 80, 30)).toBe(0);
  });

  it('leaves a margin below a child revealed at the bottom', () => {
    // Child at [150, 190]; with a 20px margin its bottom lands at 100 - 20 = 80,
    // so offset = 80 - 190 = -110.
    expect(getEnsureVisibleOffset(viewport, container, 0, 150, 40, 20)).toBe(-110);
  });

  it('leaves a margin above a child revealed at the top', () => {
    // Scrolled to -200; child at 50 with a 20px margin should sit at y=20,
    // so offset = 20 - 50 = -30.
    expect(getEnsureVisibleOffset(viewport, container, -200, 50, 30, 20)).toBe(-30);
  });

  it('collapses the margin at the end of the content via the clamp', () => {
    // maxScroll = -300; the margin can't push past it.
    expect(getEnsureVisibleOffset(viewport, container, 0, 380, 20, 20)).toBe(-300);
  });
});
