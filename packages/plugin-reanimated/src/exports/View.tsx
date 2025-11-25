import { View as RNView, type ViewProps } from 'react-native';
import {
  type AnimatedComponent,
  createAnimatedComponent,
} from './createAnimatedComponent';

export const View: AnimatedComponent<ViewProps> =
  createAnimatedComponent(RNView);
