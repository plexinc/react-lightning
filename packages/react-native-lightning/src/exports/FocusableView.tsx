import { focusable } from '@plextv/react-lightning';
import { View, type ViewProps } from './View';

const FocusableView = focusable<ViewProps>(
  View,
  undefined,
  ({ active, autoFocus }) => ({
    active,
    autoFocus,
  }),
);

export { FocusableView };
