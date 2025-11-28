/**
 * Maps a RN image loaded event to lightning
 */

import type { Dimensions } from '@lightningjs/renderer';
import { useCallback } from 'react';
import type { TextLayoutEvent, TextProps } from 'react-native';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';

type Handler = (event: Dimensions) => void;

export function useTextLayoutHandler(
  onTextLayout?: TextProps['onTextLayout'],
): Handler | undefined {
  const handler = useCallback<Handler>(() => {
    onTextLayout?.(
      createNativeSyntheticEvent<TextLayoutEvent>({
        // TODO: Calculate lines properly
        lines: [],
        target: 0,
      }),
    );
  }, [onTextLayout]);

  return onTextLayout ? handler : undefined;
}
