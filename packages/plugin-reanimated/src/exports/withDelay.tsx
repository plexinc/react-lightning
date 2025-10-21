import type {
  AnimationObject,
  withDelay as withDelayRN,
} from 'react-native-reanimated-original';

export type WithDelayFn = (
  ...args: Parameters<typeof withDelayRN>
) => AnimationObject;

export const withDelay: WithDelayFn = (
  _delayMs,
  _nextAnimation,
  _reduceMotion,
): AnimationObject => {
  // withTiming and withSpring supports `delay`. The client should pass it directly
  return typeof _nextAnimation === 'function'
    ? (_nextAnimation as () => AnimationObject)()
    : (_nextAnimation as AnimationObject);
};
