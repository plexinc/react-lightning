import { type DependencyList, useCallback, useRef } from 'react';
import type {
  ScrollHandlerProcessed,
  useAnimatedScrollHandler as useAnimatedScrollHandlerRN,
} from 'react-native-reanimated-original';

type UseAnimatedScrollHandlerFn = (
  ...args: Parameters<typeof useAnimatedScrollHandlerRN>
) => ScrollHandlerProcessed;

export const useAnimatedScrollHandler: UseAnimatedScrollHandlerFn = (
  scrollHandlers,
  dependencies,
) => {
  const inputs: DependencyList = dependencies ?? [];
  // We want to persist context between scroll events
  // The caller should use it, we won't do any assignment in
  // this function.
  const contextRef = useRef({});

  return useCallback(
    (event) => {
      const context = contextRef.current;
      // Only allow onScroll event
      const reanimatedEvent = {
        eventName: 'onScroll',
        ...event.nativeEvent,
      };

      if (typeof scrollHandlers === 'function') {
        scrollHandlers(reanimatedEvent, context);
        return;
      }

      if (scrollHandlers && typeof scrollHandlers.onScroll === 'function') {
        scrollHandlers.onScroll(reanimatedEvent, context);
      }
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: We're passing a dependencies array from the props
    inputs,
  );
};
