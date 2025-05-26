import type { LightningElement, Rect } from '@plextv/react-lightning';
import { convertCSSStyleToLightning } from '@plextv/react-lightning-plugin-css-transform';
import {
  type ViewProps,
  createLayoutEvent,
} from '@plextv/react-native-lightning';
import { forwardRef, useCallback, useMemo } from 'react';

type CellContainerProps = ViewProps & {
  estimatedSize?: number;
};

const CellContainer = forwardRef<LightningElement, CellContainerProps>(
  ({ style, estimatedSize, onLayout, ...props }, forwardedRef) => {
    const lngStyle = useMemo(() => convertCSSStyleToLightning(style), [style]);

    const handleOnLayout = useCallback(
      (rect: Rect) => {
        onLayout?.(createLayoutEvent(rect));
      },
      [onLayout],
    );
    if (!estimatedSize && process.env.NODE_ENV !== 'production') {
      console.error(
        'FlashList: estimatedItemSize is required when using CellRendererComponent. Defaulting to 2.',
      );
    }

    // We need to not set overflow: 'hidden' on the cell view, otherwise the
    // FlashList will not render the items correctly.
    return (
      <lng-view
        {...props}
        onLayout={handleOnLayout}
        ref={forwardedRef}
        style={[
          style,
          {
            clipping: false,
            initialDimensions: {
              x: lngStyle?.x ?? 0,
              y: lngStyle?.y ?? 0,
              width: lngStyle?.width ?? estimatedSize ?? 2,
              height: lngStyle?.height ?? estimatedSize ?? 2,
            },
          },
        ]}
      />
    );
  },
);

CellContainer.displayName = 'LightningCellContainer';

export default CellContainer;
