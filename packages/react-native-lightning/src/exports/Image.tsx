import { type ForwardRefExoticComponent, forwardRef } from 'react';
import type {
  ImageSourcePropType,
  ImageURISource,
  Image as RNImage,
  ImageProps as RNImageProps,
} from 'react-native';
import type {
  LightningElementStyle,
  LightningImageElement,
} from '@plextv/react-lightning';
import { flattenStyles } from '@plextv/react-lightning-plugin-css-transform';
import { useImageLoadedHandler } from '../hooks/useImageLoadedHandler';
import { useLayoutHandler } from '../hooks/useLayoutHandler';

export type ImageProps = RNImageProps;

function isImageURISource(
  source: ImageSourcePropType,
): source is ImageURISource {
  return !Array.isArray(source);
}

export type Image = LightningImageElement & RNImage;

// Map RN `resizeMode` to the texture resizeMode so images keep aspect. Only
// cover/contain have equivalents; others fall back to the default (stretch).
function resolveResizeMode(
  resizeMode: RNImageProps['resizeMode'],
): { type: 'contain' } | { type: 'cover' } | undefined {
  if (resizeMode === 'cover') {
    return { type: 'cover' };
  }

  if (resizeMode === 'contain') {
    return { type: 'contain' };
  }

  return undefined;
}

export const Image: ForwardRefExoticComponent<RNImageProps> = forwardRef<
  LightningImageElement,
  RNImageProps
>(
  (
    {
      onLoad,
      onLayout,
      width,
      height,
      src,
      source,
      style,
      resizeMode,
      ...otherProps
    },
    ref,
  ) => {
    const handleImageLayout = useLayoutHandler(onLayout);
    const handleImageLoaded = useImageLoadedHandler(src as string, onLoad);

    let finalSource: string | undefined;

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

    const flattenedStyle = flattenStyles(style) as LightningElementStyle;
    const resolvedResizeMode = resolveResizeMode(resizeMode);

    return (
      <lng-image
        {...otherProps}
        ref={ref}
        src={finalSource}
        style={{
          // RN allows array styles, but the lightning Image node takes a single
          // plain object: spreading an array here would produce numeric-keyed
          // garbage and silently drop width/height/borderRadius. Flatten first.
          ...flattenedStyle,
          w: width,
          h: height,
          ...(resolvedResizeMode
            ? {
                textureOptions: {
                  ...flattenedStyle.textureOptions,
                  resizeMode: resolvedResizeMode,
                },
              }
            : null),
        }}
        onLayout={handleImageLayout}
        onTextureReady={handleImageLoaded}
      />
    );
  },
);

Image.displayName = 'Image';
