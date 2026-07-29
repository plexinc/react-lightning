import { describe, expect, it, vi } from 'vitest';

import { type MomentumCallbacks, createMomentumTracker } from './createMomentumTracker';
import type { ScrollEvent } from './VirtualListTypes';

const evt = (offset: number): ScrollEvent => ({
  contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
  contentOffset: { x: 0, y: offset },
  contentSize: { width: 0, height: 0 },
  layoutMeasurement: { width: 0, height: 0 },
});

const setup = () => {
  const onMomentumScrollBegin = vi.fn();
  const onMomentumScrollEnd = vi.fn();
  const callbacks: { current: MomentumCallbacks } = {
    current: { onMomentumScrollBegin, onMomentumScrollEnd },
  };

  return {
    tracker: createMomentumTracker(callbacks),
    onMomentumScrollBegin,
    onMomentumScrollEnd,
  };
};

describe('createMomentumTracker', () => {
  it('fires begin once on start and end once on settle', () => {
    const { tracker, onMomentumScrollBegin, onMomentumScrollEnd } = setup();

    tracker.start(evt(0));
    tracker.settle(evt(120));

    expect(onMomentumScrollBegin).toHaveBeenCalledTimes(1);
    expect(onMomentumScrollEnd).toHaveBeenCalledTimes(1);
    expect(onMomentumScrollEnd).toHaveBeenCalledWith(evt(120));
  });

  it('fires end once when an in-flight animation is cancelled', () => {
    const { tracker, onMomentumScrollBegin, onMomentumScrollEnd } = setup();

    tracker.start(evt(0));
    tracker.cancel(evt(40));

    expect(onMomentumScrollBegin).toHaveBeenCalledTimes(1);
    expect(onMomentumScrollEnd).toHaveBeenCalledTimes(1);
  });

  it('never emits an unbalanced end (settle/cancel before any start)', () => {
    const { tracker, onMomentumScrollEnd } = setup();

    tracker.settle(evt(0));
    tracker.cancel(evt(0));

    expect(onMomentumScrollEnd).not.toHaveBeenCalled();
  });

  it('does not double-fire begin while already animating', () => {
    const { tracker, onMomentumScrollBegin } = setup();

    tracker.start(evt(0));
    tracker.start(evt(10));

    expect(onMomentumScrollBegin).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire end after it has already settled', () => {
    const { tracker, onMomentumScrollEnd } = setup();

    tracker.start(evt(0));
    tracker.settle(evt(120));
    tracker.settle(evt(120));
    tracker.cancel(evt(120));

    expect(onMomentumScrollEnd).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh begin/end cycle after settling', () => {
    const { tracker, onMomentumScrollBegin, onMomentumScrollEnd } = setup();

    tracker.start(evt(0));
    tracker.settle(evt(120));
    tracker.start(evt(200));
    tracker.settle(evt(320));

    expect(onMomentumScrollBegin).toHaveBeenCalledTimes(2);
    expect(onMomentumScrollEnd).toHaveBeenCalledTimes(2);
  });
});
