import type {
  LightningElement,
  FocusGroupProps as RLFocusGroupProps,
} from '@plextv/react-lightning';
import { FocusGroup as RLFocusGroup } from '@plextv/react-lightning';
import { type ForwardRefExoticComponent, forwardRef } from 'react';
import { useLayoutHandler } from '../hooks/useLayoutHandler';
import type { AddMissingProps } from '../types/AddMissingProps';
import type { ViewProps } from './View';

export type FocusGroupProps = AddMissingProps<ViewProps, RLFocusGroupProps>;

const FocusGroup: ForwardRefExoticComponent<FocusGroupProps> = forwardRef<
  LightningElement,
  FocusGroupProps
>(({ onLayout, ...props }, ref) => {
  const handleFocusGroupLayout = useLayoutHandler(onLayout);

  return (
    <RLFocusGroup
      {...(props as RLFocusGroupProps)}
      ref={ref}
      onLayout={handleFocusGroupLayout}
    />
  );
});

export { FocusGroup };
