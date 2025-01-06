import type Animated from 'react-native-reanimated-original';
import { AnimatedValue } from '../animation/AnimatedValue';
import { AnimationType } from '../types/AnimationType';

export type WithSpringFn = (
  ...args: Parameters<typeof Animated.withSpring>
) => AnimatedValue<AnimationType.Spring>;

export const withSpring: WithSpringFn = (toValue, config, callback) => {
  return new AnimatedValue(AnimationType.Spring, toValue, config, callback);
};
