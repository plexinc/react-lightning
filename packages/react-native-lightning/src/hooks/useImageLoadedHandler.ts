/**
 * Maps a RN image loaded event to lightning
 */

import type { Dimensions } from '@lightningjs/renderer';
import { useCallback } from 'react';
import type { ImageLoadEvent, ImageProps } from 'react-native';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';

type Handler = (event: Dimensions) => void;

export function useImageLoadedHandler(
  src: string,
  rnOnLoadHandler?: ImageProps['onLoad'],
): Handler | undefined {
  const handler = useCallback<Handler>(
    ({ w, h }) => {
      rnOnLoadHandler?.(
        createNativeSyntheticEvent<ImageLoadEvent>({
          source: {
            height: h,
            width: w,
            uri: src,
          },
        }),
      );
    },
    [src, rnOnLoadHandler],
  );

  return rnOnLoadHandler ? handler : undefined;
}
