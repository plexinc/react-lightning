import { type ForwardRefExoticComponent, forwardRef } from 'react';
import type { ViewProps } from 'react-native';

import type { LightningViewElement, Rect } from '@plextv/react-lightning';
import RLColumn, {
  type ColumnProps as RLColumnProps,
} from '@plextv/react-lightning-components/layout/Column';
import { createLayoutEvent } from '@plextv/react-native-lightning';

export interface ColumnProps extends Omit<RLColumnProps, 'onLayout'> {
  onLayout?: ViewProps['onLayout'];
}

const Column: ForwardRefExoticComponent<ColumnProps> = forwardRef<
  LightningViewElement,
  ColumnProps
>(({ onLayout, ...props }, ref) => {
  const handleLayout = (rect: Rect) => {
    onLayout?.(createLayoutEvent(rect));
  };

  return <RLColumn {...props} ref={ref} onLayout={handleLayout} />;
});

Column.displayName = 'Column';

export default Column;
