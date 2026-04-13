import type { LayoutChangeEvent, ViewProps } from 'react-native';

import type { Rect } from '@plextv/react-lightning';

import { createLayoutEvent } from '../utils/createLayoutEvent';

type Handler = (event: LayoutChangeEvent | Rect) => void;

export function useLayoutHandler(onLayout?: ViewProps['onLayout']): Handler | undefined {
  const handleLayout: Handler = (event) => {
    if ('nativeEvent' in event) {
      onLayout?.(event);
    } else {
      onLayout?.(createLayoutEvent(event));
    }
  };

  return onLayout ? handleLayout : undefined;
}
