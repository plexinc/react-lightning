import { ScrollView as RNScrollView, type ScrollViewProps } from 'react-native';
import {
  type AnimatedComponent,
  createAnimatedComponent,
} from './createAnimatedComponent';

export const ScrollView: AnimatedComponent<ScrollViewProps> =
  createAnimatedComponent(RNScrollView);
