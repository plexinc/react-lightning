import { Text as RNText, type TextProps } from 'react-native';
import {
  type AnimatedComponent,
  createAnimatedComponent,
} from './createAnimatedComponent';

export const Text: AnimatedComponent<TextProps> =
  createAnimatedComponent(RNText);
