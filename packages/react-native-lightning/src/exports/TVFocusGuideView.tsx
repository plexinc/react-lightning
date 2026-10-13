import { type ForwardRefExoticComponent, forwardRef } from 'react';

import type { LightningElement } from '@plextv/react-lightning';

import { FocusGroup, type FocusGroupProps } from './FocusGroup';
import { toFocusGroupOptions } from './tvFocusGuide';

export type TVFocusGuideViewProps = Omit<
  FocusGroupProps,
  'autoFocus' | 'destinations' | 'disable' | 'focusEntry' | 'focusRedirect' | 'focusable'
> & {
  autoFocus?: boolean;
  destinations?: readonly (LightningElement | null | undefined)[] | null;
  focusable?: boolean;
  safePadding?: 'both' | 'horizontal' | 'vertical' | null;
};

const TVFocusGuideView: ForwardRefExoticComponent<TVFocusGuideViewProps> = forwardRef<
  LightningElement,
  TVFocusGuideViewProps
>(({ autoFocus, destinations, focusable, safePadding: _safePadding, ...props }, ref) => {
  const options = toFocusGroupOptions({ autoFocus, destinations, focusable });

  return (
    <FocusGroup
      {...props}
      ref={ref}
      destinations={options.destinations}
      focusRedirect={options.focusRedirect}
      focusEntry={options.focusEntry}
      disable={options.disable}
    />
  );
});

TVFocusGuideView.displayName = 'TVFocusGuideView';

export { TVFocusGuideView };
