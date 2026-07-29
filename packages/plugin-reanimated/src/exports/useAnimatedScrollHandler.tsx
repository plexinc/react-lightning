import { type DependencyList, useCallback, useRef } from 'react';
import type {
  ScrollHandlerProcessed,
  useAnimatedScrollHandler as useAnimatedScrollHandlerRN,
} from 'react-native-reanimated-original';

import {
  type ScrollHandlers,
  type WrappedScrollEvent,
  dispatchAnimatedScrollEvent,
} from './dispatchAnimatedScrollEvent';

type UseAnimatedScrollHandlerFn = (
  ...args: Parameters<typeof useAnimatedScrollHandlerRN>
) => ScrollHandlerProcessed;

export const useAnimatedScrollHandler: UseAnimatedScrollHandlerFn = (
  scrollHandlers,
  dependencies,
) => {
  'use no memo';

  const inputs: DependencyList = dependencies ?? [];
  // We want to persist context between scroll events
  // The caller should use it, we won't do any assignment in
  // this function.
  const contextRef = useRef({});

  return useCallback((event) => {
    // The FlashList.lng mapping tags momentum events with an `eventName`; a
    // plain scroll has none and defaults to onScroll.
    dispatchAnimatedScrollEvent(
      scrollHandlers as ScrollHandlers,
      event as unknown as WrappedScrollEvent,
      contextRef.current,
    );
  }, inputs);
};
