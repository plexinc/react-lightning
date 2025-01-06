// Default export react-native-web for any exports we don't override
export * from 'react-native-web';

export { useRef as usePlatformMethods } from 'react';

// Override RN exports with our own
export {
  ActivityIndicator,
  type ActivityIndicatorProps,
} from './exports/ActivityIndicator';
export { Button, type ButtonProps } from './exports/Button';
export { FlatList, type FlatListProps } from './exports/FlatList';
export { FocusGroup, type FocusGroupProps } from './exports/FocusGroup';
export { FocusableView } from './exports/FocusableView';
export { Image, type ImageProps } from './exports/Image';
export * as Platform from './exports/Platform';
export { Pressable, type PressableProps } from './exports/Pressable';
export { ScrollView, type ScrollViewProps } from './exports/ScrollView';
export * as StyleSheet from './exports/StyleSheet';
export { Text, type TextProps } from './exports/Text';
export {
  TouchableHighlight,
  type TouchableHighlightProps,
} from './exports/TouchableHighlight';
export {
  TouchableOpacity,
  type TouchableOpacityProps,
} from './exports/TouchableOpacity';
export {
  TouchableWithoutFeedback,
  type TouchableWithoutFeedbackProps,
} from './exports/TouchableWithoutFeedback';
export { View, type ViewProps } from './exports/View';
export {
  VirtualizedList,
  type VirtualizedListProps,
} from './exports/VirtualizedList/VirtualizedList';
export { AppRegistry, getPlugins } from './render/AppRegistry';
export { createSyntheticEvent } from './utils/createSyntheticEvent';
export { cssClassNameTransformPlugin } from './plugins/cssClassNameTransformPlugin';
export { domPolyfillsPlugin } from './plugins/domPolyfillsPlugin';
export { reactNativePolyfillsPlugin } from './plugins/reactNativePolyfillsPlugin';
