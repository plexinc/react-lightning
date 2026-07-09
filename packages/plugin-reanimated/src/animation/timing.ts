import type { AnimationSettings } from '@lightningjs/renderer';
import type { WithTimingConfig } from 'react-native-reanimated-original';

import { resolveTimingEasing } from './resolveTimingEasing';

const DefaultTimingConfig = {
  duration: 300,
};

export function createTimingAnimation(config?: WithTimingConfig): AnimationSettings {
  return {
    duration: config?.duration ?? DefaultTimingConfig.duration,
    easing: resolveTimingEasing(config?.easing),
    delay: config?.delay ?? 0,
    loop: false,
    repeat: 0,
    stopMethod: false,
  };
}
