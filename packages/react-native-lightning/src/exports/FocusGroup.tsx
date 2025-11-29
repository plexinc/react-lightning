import {
  type FocusableProps,
  type LightningElement,
  FocusGroup as RLFocusGroup,
  type FocusGroupProps as RLFocusGroupProps,
} from '@plextv/react-lightning';
import { type ForwardRefExoticComponent, forwardRef } from 'react';
import type { TargetedEvent } from 'react-native';
import {
  type FocusHandler,
  useBlurHandler,
  useFocusHandler,
} from '../hooks/useFocusHandler';
import { useLayoutHandler } from '../hooks/useLayoutHandler';
import type { AddMissingProps } from '../types/AddMissingProps';
import type { ViewProps } from './View';

export type FocusGroupProps = AddMissingProps<
  Omit<ViewProps, 'onFocus' | 'onBlur'>,
  RLFocusGroupProps
> &
  FocusableProps & {
    onFocus?: FocusHandler<'focus', TargetedEvent>;
    onBlur?: FocusHandler<'blur', TargetedEvent>;
  };

const FocusGroup: ForwardRefExoticComponent<FocusGroupProps> = forwardRef<
  LightningElement,
  FocusGroupProps
>(({ onLayout, onFocus, onBlur, ...props }, ref) => {
  const handleFocusGroupLayout = useLayoutHandler(onLayout);
  const handleFocus = useFocusHandler(onFocus);
  const handleBlur = useBlurHandler(onBlur);

  return (
    <RLFocusGroup
      {...(props as RLFocusGroupProps)}
      ref={ref}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={handleFocusGroupLayout}
    />
  );
});

export { FocusGroup };
