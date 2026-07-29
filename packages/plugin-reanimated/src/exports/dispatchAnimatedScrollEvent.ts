// oxlint-disable typescript/no-explicit-any -- mirrors reanimated's loosely-typed scroll handlers

type ScrollHandlerFn = (event: any, context: any) => void;

export interface ScrollHandlers {
  onScroll?: ScrollHandlerFn;
  onBeginDrag?: ScrollHandlerFn;
  onEndDrag?: ScrollHandlerFn;
  onMomentumBegin?: ScrollHandlerFn;
  onMomentumEnd?: ScrollHandlerFn;
}

export interface WrappedScrollEvent {
  nativeEvent: Record<string, unknown>;
  /** RN ScrollView event name; defaults to a plain scroll. */
  eventName?: string;
}

// Route a wrapped scroll event to the matching reanimated handler key. Lightning
// only emits scroll + focus-driven momentum (no touch drag on TV), so the begin/
// end-drag keys are never reached here.
export function dispatchAnimatedScrollEvent(
  scrollHandlers: ScrollHandlers | ScrollHandlerFn,
  event: WrappedScrollEvent,
  context: unknown,
): void {
  const eventName = event.eventName ?? 'onScroll';
  const reanimatedEvent = { eventName, ...event.nativeEvent };

  // Function form is the onScroll-only shorthand in reanimated's API.
  if (typeof scrollHandlers === 'function') {
    if (eventName === 'onScroll') {
      scrollHandlers(reanimatedEvent, context);
    }

    return;
  }

  if (!scrollHandlers) {
    return;
  }

  const handler =
    eventName === 'onMomentumScrollBegin'
      ? scrollHandlers.onMomentumBegin
      : eventName === 'onMomentumScrollEnd'
        ? scrollHandlers.onMomentumEnd
        : scrollHandlers.onScroll;

  handler?.(reanimatedEvent, context);
}
