import type { Dimensions } from '@lightningjs/renderer';
import type { LightningImageElement } from '@plex/react-lightning';
import { forwardRef, useCallback } from 'react';
import type {
  ImageLoadEventData,
  ImageSourcePropType,
  ImageURISource,
  ImageProps as RNImageProps,
} from 'react-native';
import { createLayoutEvent } from '../utils/createLayoutEvent';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';
import type { ViewProps } from './View';

export interface ImageProps extends RNImageProps, Omit<ViewProps, 'style'> {
  onImageLoaded?: (dimensions: { width: number; height: number }) => void;
}

function isImageURISource(
  source: ImageSourcePropType,
): source is ImageURISource {
  return !Array.isArray(source);
}

export const Image = forwardRef<LightningImageElement, ImageProps>(
  (
    {
      onLoad,
      onImageLoaded,
      onLayout,
      width,
      height,
      src,
      source,
      style,
      ...otherProps
    },
    ref,
  ) => {
    const onImageLayout = useCallback(
      (dimensions: { width: number; height: number }) => {
        onLayout?.(createLayoutEvent({ ...dimensions, x: 0, y: 0 }));
      },
      [onLayout],
    );

    const handleImageLoaded = useCallback(
      (dimensions: Dimensions) => {
        onLoad?.(
          createNativeSyntheticEvent<ImageLoadEventData>({
            source: {
              height: dimensions.height,
              width: dimensions.width,
              uri: src as string,
            },
          }),
        );
        onImageLoaded?.(dimensions);
      },
      [src, onLoad, onImageLoaded],
    );

    let finalSource: string | undefined = undefined;

    if (typeof source === 'object') {
      if (!isImageURISource(source)) {
        console.error(
          '[Image] Lightning images only support ImageURISource as a source',
        );
      } else {
        finalSource = source.uri;
      }
    } else if (typeof source === 'number') {
      console.error('[Image] Lightning images do not support numeric sources');
    } else if (source || src) {
      finalSource = source ?? src;
    } else {
      return null;
    }

    return (
      <lng-image
        {...otherProps}
        ref={ref}
        src={finalSource}
        style={[
          style,
          width
            ? {
                width,
              }
            : undefined,
          height
            ? {
                height,
              }
            : undefined,
        ]}
        onTextureLoaded={handleImageLoaded}
        onLayout={onImageLayout}
      />
    );
  },
);

Image.displayName = 'Image';
