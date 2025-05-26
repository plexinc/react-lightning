import type {
  FocusableProps,
  LightningElement,
  LightningViewElementProps,
  Rect,
} from '@plextv/react-lightning';
import type { LightningElementEventProps } from '@plextv/react-lightning';
import type { LightningViewElement } from '@plextv/react-lightning';
import type { AllStyleProps } from '@plextv/react-lightning-plugin-css-transform';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { forwardRef, useCallback } from 'react';
import type { View as RNView, ViewProps as RNViewProps } from 'react-native';
import { createLayoutEvent } from '../utils/createLayoutEvent';

type CombinedProps = RNViewProps &
  LightningViewElementProps &
  RefAttributes<LightningViewElement> &
  Omit<LightningElementEventProps, 'onLayout'> &
  FocusableProps;

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

export type View = RNView & LightningElement;

export const View: ForwardRefExoticComponent<ViewProps> = forwardRef<
  LightningViewElement,
  ViewProps
>(({ onLayout, ...props }, ref) => {
  const handleLayout = useCallback(
    (dimensions: Rect) => {
      onLayout?.(createLayoutEvent(dimensions));
    },
    [onLayout],
  );

  return (
    <lng-view ref={ref} {...(props as CombinedProps)} onLayout={handleLayout} />
  );
});

View.displayName = 'View';
