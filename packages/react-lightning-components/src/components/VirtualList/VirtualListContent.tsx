import {
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithChildren,
  type RefAttributes,
} from 'react';

import type { LightningElement, LightningElementStyle } from '@plextv/react-lightning';

type Props = PropsWithChildren<{
  style: LightningElementStyle;
}> &
  RefAttributes<LightningElement>;

export const VirtualListContent: ForwardRefExoticComponent<Props> = forwardRef<
  LightningElement,
  Props
>(({ style, children }, ref) => {
  return (
    <lng-view ref={ref} style={style}>
      {children}
    </lng-view>
  );
});

VirtualListContent.displayName = 'VirtualListContent';
