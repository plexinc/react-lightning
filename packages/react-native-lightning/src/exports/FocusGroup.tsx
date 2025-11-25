import type {
  LightningElement,
  Rect,
  FocusGroupProps as RLFocusGroupProps,
} from '@plextv/react-lightning';
import { FocusGroup as RLFocusGroup } from '@plextv/react-lightning';
import { type ForwardRefExoticComponent, forwardRef, useCallback } from 'react';
import { createLayoutEvent } from '../utils/createLayoutEvent';
import type { ViewProps } from './View';

export type FocusGroupProps = AddMissingProps<ViewProps, RLFocusGroupProps>;

const FocusGroup: ForwardRefExoticComponent<FocusGroupProps> = forwardRef<
  LightningElement,
  FocusGroupProps
>(({ onLayout, ...props }, ref) => {
  const handleFocusGroupLayout = useCallback(
    (event: Rect) => {
      onLayout?.(createLayoutEvent(event));
    },
    [onLayout],
  );

  return (
    <RLFocusGroup
      {...(props as RLFocusGroupProps)}
      ref={ref}
      onLayout={handleFocusGroupLayout}
    />
  );
});

export { FocusGroup };
