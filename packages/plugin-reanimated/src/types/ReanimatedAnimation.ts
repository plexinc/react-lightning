import type {
  ILayoutAnimationBuilder,
  Keyframe,
  LayoutAnimationFunction,
} from 'react-native-reanimated-original';

export type ReanimatedAnimation =
  | ILayoutAnimationBuilder
  | LayoutAnimationFunction
  | Keyframe;
