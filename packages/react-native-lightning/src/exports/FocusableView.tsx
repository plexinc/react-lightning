import { focusable } from '@plextv/react-lightning';
import { View, type ViewProps } from './View';

const FocusableView = focusable<ViewProps>(
  View,
  undefined,
  ({
    active,
    autoFocus,
    trapFocusDown,
    trapFocusUp,
    trapFocusLeft,
    trapFocusRight,
  }) => ({
    active,
    autoFocus,
    trapFocusDown,
    trapFocusUp,
    trapFocusLeft,
    trapFocusRight,
  }),
);

export { FocusableView };
