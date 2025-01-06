import type { AnimationSettings } from '@lightningjs/renderer';
import type { WithTimingConfig } from 'react-native-reanimated-original';
import { ReduceMotion } from 'react-native-reanimated-original';

const DefaultTimingConfig = {
  duration: 300,
  easing: (t: number) => t,
  reduceMotion: ReduceMotion.System,
};

export function createTimingAnimation(
  config?: WithTimingConfig,
): AnimationSettings {
  return {
    duration: config?.duration ?? DefaultTimingConfig.duration,
    easing: 'linear',
    delay: 0,
    loop: false,
    repeat: 0,
    repeatDelay: 0,
    stopMethod: false,
  };
}
