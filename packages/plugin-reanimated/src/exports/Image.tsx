import { type ImageProps, Image as RNImage } from 'react-native';
import {
  type AnimatedComponent,
  createAnimatedComponent,
} from './createAnimatedComponent';

export const Image: AnimatedComponent<ImageProps> =
  createAnimatedComponent(RNImage);
