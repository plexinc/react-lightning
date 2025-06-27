// Default export react-native-web for any exports we don't override

export { useRef as usePlatformMethods } from 'react';
export * from 'react-native-web';

// Override RN exports with our own
export {
  ActivityIndicator,
  type ActivityIndicatorProps,
} from './exports/ActivityIndicator';
export { Button, type ButtonProps } from './exports/Button';
export { FocusableView } from './exports/FocusableView';
export { FocusGroup, type FocusGroupProps } from './exports/FocusGroup';
export { Image, type ImageProps } from './exports/Image';
export * as Platform from './exports/Platform';
export { Pressable, type PressableProps } from './exports/Pressable';
export { ScrollView } from './exports/ScrollView';
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
export { VirtualizedList } from './exports/VirtualizedList';
export { cssClassNameTransformPlugin } from './plugins/cssClassNameTransformPlugin';
export { domPolyfillsPlugin } from './plugins/domPolyfillsPlugin';
export { reactNativePolyfillsPlugin } from './plugins/reactNativePolyfillsPlugin';
export {
  AppRegistry,
  getPlugins,
  type PluginOptions,
} from './render/AppRegistry';
export { createLayoutEvent } from './utils/createLayoutEvent';
export { createSyntheticEvent } from './utils/createSyntheticEvent';
