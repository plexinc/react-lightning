import {
  type MutableRefObject,
  type Ref,
  type RefCallback,
  useCallback,
} from 'react';

/**
 * This hook allows you to combine multiple refs into a single ref. This is useful when you need to pass a ref to a component that already has a ref. See the example below
 *
 * ```tsx
 * import React, { forwardRef, useCallback, useRef } from 'react';
 * import { TouchableOpacity } from 'react-native';
 * import useCombinedRef from '@plex/react-native-helpers/hooks/useCombinedRef';
 *
 * export const Component = forwardRef<TouchableOpacity, ComponentProps>(
 *   ({ children, icon, onPress, ...props }, ref) => {
 *     const internalRef = useRef(null);
 *     const combinedRef = useCombinedRef(ref, internalRef);
 *
 *     const handlePress = useCallback(
 *       (e) => {
 *         // Do something custom
 *         console.log('Button pressed!', internalRef.current);
 *
 *         onPress?.(e);
 *       },
 *       [onPress]
 *     );
 *
 *     return <TouchableOpacity ref={combinedRef} onPress={handlePress} />;
 *   }
 * );
 * ```
 */
export const useCombinedRef = <T>(...refs: Ref<T>[]): RefCallback<T> => {
  const combinedCallback = useCallback(
    (node: T) => {
      for (const ref of refs) {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as MutableRefObject<T>).current = node;
        }
      }
    },
    [refs],
  );

  return combinedCallback;
};
