import { createAnimatedComponent } from './exports/createAnimatedComponent';
import { FlatList } from './exports/FlatList';
import { Image } from './exports/Image';
import { ScrollView } from './exports/ScrollView';
import { Text } from './exports/Text';
import { View } from './exports/View';

const Noop = () => null;

export type * from 'react-native-reanimated-original';
export * from 'react-native-reanimated-original';

// Overrides
export default {
  createAnimatedComponent,
  addWhitelistedUIProps: Noop,
  addWhitelistedNativeProps: Noop,
  Image,
  FlatList,
  ScrollView,
  Text,
  View,
};

export {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
} from './builders/Fade';

export {
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  SlideOutDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
} from './builders/Slide';

export { useAnimatedScrollHandler } from './exports/useAnimatedScrollHandler';
export { useAnimatedStyle } from './exports/useAnimatedStyle';
export { useComposedEventHandler } from './exports/useComposedEventHandler';
export { withDelay } from './exports/withDelay';
export { withRepeat } from './exports/withRepeat';
export { withSpring } from './exports/withSpring';
export { withTiming } from './exports/withTiming';

export type { AnimatedObject } from './types/AnimatedObject';
export type { AnimatedStyle } from './types/AnimatedStyle';
export type { AnimationType } from './types/AnimationType';
export type { ReanimatedAnimation } from './types/ReanimatedAnimation';
