import { createAnimatedComponent } from './exports/createAnimatedComponent';
import { FlatList } from './exports/FlatList';
import { Image } from './exports/Image';
import { ScrollView } from './exports/ScrollView';
import { Text } from './exports/Text';
import { View } from './exports/View';

const Noop = () => null;

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

export { useAnimatedStyle } from './exports/useAnimatedStyle';
export { useComposedEventHandler } from './exports/useComposedEventHandler';
export { withRepeat } from './exports/withRepeat';
export { withSpring } from './exports/withSpring';
export { withTiming } from './exports/withTiming';
