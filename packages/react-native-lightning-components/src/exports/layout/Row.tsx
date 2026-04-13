import { type ForwardRefExoticComponent, forwardRef } from 'react';
import type { ViewProps } from 'react-native';

import type { LightningViewElement, Rect } from '@plextv/react-lightning';
import RLRow, { type RowProps as RLRowProps } from '@plextv/react-lightning-components/layout/Row';
import { createLayoutEvent } from '@plextv/react-native-lightning';

export interface RowProps extends Omit<RLRowProps, 'onLayout'> {
  onLayout?: ViewProps['onLayout'];
}

const Row: ForwardRefExoticComponent<RowProps> = forwardRef<LightningViewElement, RowProps>(
  ({ onLayout, ...props }, ref) => {
    const handleLayout = (rect: Rect) => {
      onLayout?.(createLayoutEvent(rect));
    };

    return <RLRow {...props} ref={ref} onLayout={handleLayout} />;
  },
);

Row.displayName = 'Row';

export default Row;
