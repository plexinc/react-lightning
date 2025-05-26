import type { LightningViewElement, Rect } from '@plextv/react-lightning';
import RLRow, {
  type RowProps as RLRowProps,
} from '@plextv/react-lightning-components/layout/Row';
import { createLayoutEvent } from '@plextv/react-native-lightning';
import { forwardRef, useCallback } from 'react';
import type { ViewProps } from 'react-native';

export interface RowProps extends Omit<RLRowProps, 'onLayout'> {
  onLayout?: ViewProps['onLayout'];
}

const Row = forwardRef<LightningViewElement, RowProps>(
  ({ onLayout, ...props }, ref) => {
    const handleLayout = useCallback(
      (rect: Rect) => {
        onLayout?.(createLayoutEvent(rect));
      },
      [onLayout],
    );

    return <RLRow {...props} ref={ref} onLayout={handleLayout} />;
  },
);

Row.displayName = 'Row';

export default Row;
