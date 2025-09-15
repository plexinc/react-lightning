import {
  type LightningElement,
  useCombinedRef,
  useFocus,
} from '@plextv/react-lightning';
import { forwardRef } from 'react';

export type FocusableImageProps = {
  disable?: boolean;
  hidden?: boolean;
  autoFocus?: boolean;
  style?: LightningElement['style'];
};

export const FocusableImage = forwardRef<LightningElement, FocusableImageProps>(
  ({ disable, hidden, autoFocus, style }, ref) => {
    const { focused, ref: focusRef } = useFocus({
      active: !disable,
      autoFocus,
    });
    const combinedRef = useCombinedRef(ref, focusRef);

    return (
      <lng-image
        ref={combinedRef}
        src={`https://picsum.photos/${style?.w ?? 100}/${style?.h ?? 150}`}
        style={{
          w: style?.w ?? 100,
          h: style?.h ?? 150,
          borderRadius: 8,
          alpha: disable ? 0.5 : hidden ? 0 : 1,
          scale: focused ? 1.1 : 1,
          border: { width: focused ? 2 : 0, color: 0xffffffff },
          ...style,
        }}
        transition={{
          scale: { duration: 250 },
        }}
      />
    );
  },
);
