import type Animated from 'react-native-reanimated-original';
import { AnimatedValue } from '../animation/AnimatedValue';
import { AnimationType } from '../types/AnimationType';

export type WithTimingFn = (
  ...args: Parameters<typeof Animated.withTiming>
) => AnimatedValue<AnimationType.Timing>;

export const withTiming: WithTimingFn = (toValue, config, callback) => {
  return new AnimatedValue(AnimationType.Timing, toValue, config, callback);
};
