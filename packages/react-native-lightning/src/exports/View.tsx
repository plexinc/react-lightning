import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { forwardRef } from 'react';
import type { View as RNView, ViewProps as RNViewProps } from 'react-native';

import {
  type FocusableProps,
  type LightningElementEventProps,
  type LightningViewElement,
  type LightningViewElementProps,
  useCombinedRef,
  useFocus,
} from '@plextv/react-lightning';
import type { AllStyleProps } from '@plextv/react-lightning-plugin-css-transform';

import { useLayoutHandler } from '../hooks/useLayoutHandler';
import type { NativeLightningViewElement } from '../types/NativeLightningViewElement';
import { isFocusActive, shouldRegisterFocus } from './focusableView';

type CombinedProps = RNViewProps &
  LightningViewElementProps &
  RefAttributes<LightningViewElement> &
  Omit<LightningElementEventProps, 'onLayout'> &
  FocusableProps & {
    // Directional-only focus catcher: reachable by a deliberate move but never
    // by restoration or the mount-time default (drawer edge guard).
    focusRestorationExcluded?: boolean;
  };

export type ViewProps = Omit<CombinedProps, 'style' | 'onLayout'> & {
  style?: AllStyleProps & RNViewProps['style'];
  onLayout?: RNViewProps['onLayout'];
};

export const defaultViewStyle = {
  alignItems: 'stretch' as const,
  display: 'flex' as const,
  flexBasis: 'auto' as const,
  flexDirection: 'column' as const,
  flexShrink: 0,
  position: 'relative' as const,
  zIndex: 0,
};

export type View = RNView & NativeLightningViewElement;

// Native treats any View with `focusable` set as a spatial-nav target, but
// react-lightning only registers useFocus/FocusGroup elements. Register the
// View as a focus leaf so a plain `focusable` View is reachable and fires
// onFocus like it does on tvOS/Android TV.
const FocusableView = forwardRef<LightningViewElement, CombinedProps>(
  ({ focusRestorationExcluded, ...props }, ref) => {
    const { ref: focusRef } = useFocus<LightningViewElement>({
      active: isFocusActive(props),
      focusRestorationExcluded,
    });
    const combinedRef = useCombinedRef(ref, focusRef);

    return <lng-view ref={combinedRef} {...props} />;
  },
);

FocusableView.displayName = 'FocusableView';

export const View: ForwardRefExoticComponent<ViewProps> = forwardRef<
  LightningViewElement,
  ViewProps
>(({ onLayout, ...props }, ref) => {
  const handleLayout = useLayoutHandler(onLayout);
  const viewProps = { ...(props as CombinedProps), onLayout: handleLayout };

  // Only opt-in focusable Views pay for focus registration; everything else
  // renders as a bare node exactly as before.
  if (shouldRegisterFocus(viewProps)) {
    return <FocusableView ref={ref} {...viewProps} />;
  }

  return <lng-view ref={ref} {...viewProps} />;
});

View.displayName = 'View';
