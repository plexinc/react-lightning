import { describe, expect, it, vi } from 'vitest';

import { type ScrollHandlers, dispatchAnimatedScrollEvent } from './dispatchAnimatedScrollEvent';

const scrollEvent = (offset: number) => ({
  nativeEvent: { contentOffset: { x: 0, y: offset } },
});

describe('dispatchAnimatedScrollEvent', () => {
  it('routes a plain scroll to onScroll', () => {
    const handlers: ScrollHandlers = {
      onScroll: vi.fn(),
      onMomentumBegin: vi.fn(),
      onMomentumEnd: vi.fn(),
    };

    dispatchAnimatedScrollEvent(handlers, scrollEvent(10), {});

    expect(handlers.onScroll).toHaveBeenCalledTimes(1);
    expect(handlers.onMomentumBegin).not.toHaveBeenCalled();
    expect(handlers.onMomentumEnd).not.toHaveBeenCalled();
  });

  it('routes onMomentumScrollBegin to onMomentumBegin, not onScroll', () => {
    const handlers: ScrollHandlers = {
      onScroll: vi.fn(),
      onMomentumBegin: vi.fn(),
      onMomentumEnd: vi.fn(),
    };

    dispatchAnimatedScrollEvent(
      handlers,
      { ...scrollEvent(0), eventName: 'onMomentumScrollBegin' },
      {},
    );

    expect(handlers.onMomentumBegin).toHaveBeenCalledTimes(1);
    expect(handlers.onScroll).not.toHaveBeenCalled();
    expect(handlers.onMomentumEnd).not.toHaveBeenCalled();
  });

  it('routes onMomentumScrollEnd to onMomentumEnd, not onScroll', () => {
    const handlers: ScrollHandlers = {
      onScroll: vi.fn(),
      onMomentumBegin: vi.fn(),
      onMomentumEnd: vi.fn(),
    };

    dispatchAnimatedScrollEvent(
      handlers,
      { ...scrollEvent(120), eventName: 'onMomentumScrollEnd' },
      {},
    );

    expect(handlers.onMomentumEnd).toHaveBeenCalledTimes(1);
    expect(handlers.onScroll).not.toHaveBeenCalled();
    expect(handlers.onMomentumBegin).not.toHaveBeenCalled();
  });

  it('tags the dispatched event with its RN event name', () => {
    const onMomentumEnd = vi.fn();

    dispatchAnimatedScrollEvent(
      { onMomentumEnd },
      { ...scrollEvent(120), eventName: 'onMomentumScrollEnd' },
      {},
    );

    expect(onMomentumEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'onMomentumScrollEnd',
        contentOffset: { x: 0, y: 120 },
      }),
      {},
    );
  });

  it('drops momentum for the function (onScroll-only) form', () => {
    const onScroll = vi.fn();

    dispatchAnimatedScrollEvent(
      onScroll,
      { ...scrollEvent(0), eventName: 'onMomentumScrollBegin' },
      {},
    );

    expect(onScroll).not.toHaveBeenCalled();
  });
});
