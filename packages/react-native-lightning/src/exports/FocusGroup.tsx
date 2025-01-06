import type {
  LightningElement,
  FocusGroupProps as RLFocusGroupProps,
  Rect,
} from '@plex/react-lightning';
import { FocusGroup as RLFocusGroup } from '@plex/react-lightning';
import { forwardRef, useCallback } from 'react';
import { createLayoutEvent } from '../utils/createLayoutEvent';
import type { ViewProps } from './View';

export type FocusGroupProps = AddMissingProps<ViewProps, RLFocusGroupProps>;

const FocusGroup = forwardRef<LightningElement, FocusGroupProps>(
  ({ onLayout, ...props }, ref) => {
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
  },
);

export { FocusGroup };
