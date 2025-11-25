import { focusable } from '@plextv/react-lightning';
import type { ForwardRefExoticComponent } from 'react';
import { View, type ViewProps } from './View';

const FocusableView: ForwardRefExoticComponent<ViewProps> =
  focusable<ViewProps>(View, undefined, ({ active, autoFocus }) => ({
    active,
    autoFocus,
  }));

export { FocusableView };
