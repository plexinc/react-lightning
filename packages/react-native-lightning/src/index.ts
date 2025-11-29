// Default export react-native-web for any exports we don't override

export { useRef as usePlatformMethods } from 'react';
// @ts-expect-error: We're only using web for re-exports so we don't want the
// types. If we include the types, the react-native types gets augmented with
// extra props that we don't want. For example, the 'Image' component receiving
// focus events.
export * from 'react-native-web';

// Override RN exports with our own
export {
  ActivityIndicator,
  type ActivityIndicatorProps,
} from './exports/ActivityIndicator';
export { Button, type ButtonProps } from './exports/Button';
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

export { useBlurHandler, useFocusHandler } from './hooks/useFocusHandler';
export { useImageLoadedHandler } from './hooks/useImageLoadedHandler';
export { useKeyEventHandler } from './hooks/useKeyEventHandler';
export { useLayoutHandler } from './hooks/useLayoutHandler';
export { useTextLayoutHandler } from './hooks/useTextLayoutHandler';

export { cssClassNameTransformPlugin } from './plugins/cssClassNameTransformPlugin';
export { domPolyfillsPlugin } from './plugins/domPolyfillsPlugin';
export { reactNativePolyfillsPlugin } from './plugins/reactNativePolyfillsPlugin';
export { createLayoutEvent } from './utils/createLayoutEvent';
export { createSyntheticEvent } from './utils/createSyntheticEvent';
export {
  getReactNativePlugins,
  type PluginOptions,
} from './utils/getReactNativePlugins';
