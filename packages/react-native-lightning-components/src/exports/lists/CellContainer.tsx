import type { LightningElement, Rect } from '@plextv/react-lightning';
import { convertCSSStyleToLightning } from '@plextv/react-lightning-plugin-css-transform';
import {
  createLayoutEvent,
  type ViewProps,
} from '@plextv/react-native-lightning';
import {
  type ForwardRefExoticComponent,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';

type CellContainerProps = ViewProps & {
  estimatedSize?: number;
};

const CellContainer: ForwardRefExoticComponent<CellContainerProps> = forwardRef<
  LightningElement,
  CellContainerProps
>(({ style, estimatedSize, onLayout, ...props }, forwardedRef) => {
  const lngStyle = useMemo(() => convertCSSStyleToLightning(style), [style]);

  const handleOnLayout = useCallback(
    (rect: Rect) => {
      onLayout?.(createLayoutEvent(rect));
    },
    [onLayout],
  );
  if (!estimatedSize && import.meta.env.DEV) {
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
            w: lngStyle?.w ?? estimatedSize ?? 2,
            h: lngStyle?.h ?? estimatedSize ?? 2,
          },
        },
      ]}
    />
  );
});

CellContainer.displayName = 'LightningCellContainer';

export default CellContainer;
