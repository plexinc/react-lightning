import { focusable } from '@plex/react-lightning';
import { View, type ViewProps } from './View';

const FocusableView = focusable<ViewProps>(View);

export { FocusableView };
