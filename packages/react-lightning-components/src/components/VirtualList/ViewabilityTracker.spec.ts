import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComputedLayout } from './LayoutManager';
import { ViewabilityTracker } from './ViewabilityTracker';

const makeLayout = (offset: number, size: number): ComputedLayout => ({
  offset,
  size,
  column: 0,
  crossOffset: 0,
  crossSize: 100,
});

function getCallArgs(fn: ReturnType<typeof vi.fn>, index: number) {
  const call = fn.mock.calls[index];
  if (!call) {
    throw new Error(`Expected mock call at index ${index}`);
  }
  return call[0];
}

describe('ViewabilityTracker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports newly viewable items', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100), makeLayout(100, 100), makeLayout(200, 100)];

    const tracker = new ViewabilityTracker({
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    tracker.update([0, 1, 2], 0, 250);

    expect(onChange).toHaveBeenCalledTimes(1);
    const { viewableItems, changed } = getCallArgs(onChange, 0);
    expect(viewableItems).toHaveLength(3);
    expect(changed).toHaveLength(3);
  });

  it('does not fire when nothing changes', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100), makeLayout(100, 100)];

    const tracker = new ViewabilityTracker({
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    tracker.update([0, 1], 0, 300);
    onChange.mockClear();

    tracker.update([0, 1], 0, 300);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects itemVisiblePercentThreshold', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100), makeLayout(100, 100)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { itemVisiblePercentThreshold: 50 },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    // Viewport 0–120: item 0 fully visible, item 1 only 20% visible
    tracker.update([0, 1], 0, 120);

    const items = getCallArgs(onChange, 0).viewableItems;
    expect(items).toHaveLength(1);
    expect(items[0].index).toBe(0);
  });

  it('respects viewAreaCoveragePercentThreshold', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 50), makeLayout(50, 50)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { viewAreaCoveragePercentThreshold: 20 },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    // Viewport 0–100, both items are 50px → each covers 50%
    tracker.update([0, 1], 0, 100);
    expect(getCallArgs(onChange, 0).viewableItems).toHaveLength(2);
  });

  it('respects waitForInteraction', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { waitForInteraction: true },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    tracker.update([0], 0, 200);
    expect(onChange).not.toHaveBeenCalled();

    tracker.recordInteraction();
    tracker.update([0], 0, 200);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('respects minimumViewTime', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { minimumViewTime: 500 },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    tracker.update([0], 0, 200);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('cancels pending timer if item leaves before minimumViewTime', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { minimumViewTime: 500 },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    tracker.update([0], 0, 200);
    // Item leaves before timer fires
    tracker.update([], 200, 200);

    vi.advanceTimersByTime(500);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports items that left the viewport as not viewable', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100), makeLayout(100, 100)];

    const tracker = new ViewabilityTracker({
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    tracker.update([0, 1], 0, 300);
    onChange.mockClear();

    // Only item 1 visible now
    tracker.update([1], 100, 100);
    const { changed } = getCallArgs(onChange, 0);
    const left = changed.find(
      (t: { index: number; isViewable: boolean }) => t.index === 0 && !t.isViewable,
    );
    expect(left).toBeDefined();
  });

  it('graduates each item individually when timers fire simultaneously', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100), makeLayout(100, 100), makeLayout(200, 100)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { minimumViewTime: 500 },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    // Both items enter at t=0 — both timers start simultaneously
    tracker.update([0], 0, 200);
    tracker.update([0, 1], 0, 300);

    // Both timers fire at t=500; each graduates its own item
    vi.advanceTimersByTime(500);
    expect(onChange).toHaveBeenCalledTimes(2);
    // Final state includes both items
    const lastCall = getCallArgs(onChange, onChange.mock.calls.length - 1);
    expect(lastCall.viewableItems).toHaveLength(2);
  });

  it('does not graduate items that have not met minimumViewTime', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100), makeLayout(100, 100)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { minimumViewTime: 500 },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    // Item 0 enters at t=0
    tracker.update([0], 0, 200);

    // Item 1 enters at t=300
    vi.advanceTimersByTime(300);
    tracker.update([0, 1], 0, 300);

    // At t=500, only T0 fires (item 0 visible 500ms, item 1 only 200ms)
    vi.advanceTimersByTime(200);
    expect(onChange).toHaveBeenCalledTimes(1);
    const firstCall = getCallArgs(onChange, 0);
    expect(firstCall.viewableItems).toHaveLength(1);
    expect(firstCall.viewableItems[0].index).toBe(0);

    // At t=800, T1 fires (item 1 visible 500ms)
    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(getCallArgs(onChange, 1).viewableItems).toHaveLength(2);
  });

  it('immediately reports committed items leaving with minimumViewTime', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { minimumViewTime: 500 },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    tracker.update([0], 0, 200);
    vi.advanceTimersByTime(500);
    expect(onChange).toHaveBeenCalledTimes(1);
    onChange.mockClear();

    // Item 0 leaves — should be reported immediately
    tracker.update([], 200, 200);
    expect(onChange).toHaveBeenCalledTimes(1);
    const { changed, viewableItems } = getCallArgs(onChange, 0);
    expect(viewableItems).toHaveLength(0);
    expect(changed).toHaveLength(1);
    expect(changed[0].index).toBe(0);
    expect(changed[0].isViewable).toBe(false);
  });

  it('disposes all timers', () => {
    const onChange = vi.fn();
    const layouts = [makeLayout(0, 100)];

    const tracker = new ViewabilityTracker({
      viewabilityConfig: { minimumViewTime: 500 },
      onViewableItemsChanged: onChange,
      getLayout: (i) => layouts[i],
      getData: (i) => ({ id: i }),
      getKey: (i) => String(i),
    });

    tracker.update([0], 0, 200);
    tracker.dispose();

    vi.advanceTimersByTime(500);
    expect(onChange).not.toHaveBeenCalled();
  });
});
