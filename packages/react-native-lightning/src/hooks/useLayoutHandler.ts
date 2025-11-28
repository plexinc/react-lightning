import type { Rect } from '@plextv/react-lightning';
import { useCallback } from 'react';
import type { LayoutChangeEvent, ViewProps } from 'react-native';
import { createLayoutEvent } from '../utils/createLayoutEvent';

type Handler = (event: LayoutChangeEvent | Rect) => void;

export function useLayoutHandler(
  onLayout?: ViewProps['onLayout'],
): Handler | undefined {
  const handleLayout = useCallback<Handler>(
    (event) => {
      if ('nativeEvent' in event) {
        onLayout?.(event);
      } else {
        onLayout?.(createLayoutEvent(event));
      }
    },
    [onLayout],
  );

  return onLayout ? handleLayout : undefined;
}
