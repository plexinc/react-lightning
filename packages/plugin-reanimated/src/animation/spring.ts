import type { AnimationSettings } from '@lightningjs/renderer';
import type { WithSpringConfig } from 'react-native-reanimated-original';
import { ReduceMotion } from 'react-native-reanimated-original';

const DefaultSpringConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
  velocity: 0,
  duration: 2000,
  dampingRatio: 0.5,
  reduceMotion: ReduceMotion.System,
};

export function createSpringAnimation(
  config?: WithSpringConfig,
): AnimationSettings {
  // TODO
  return {
    duration: config?.duration ?? DefaultSpringConfig.duration,
    easing: 'linear',
    delay: 0,
    loop: false,
    repeat: 0,
    repeatDelay: 0,
    stopMethod: false,
  };
}
