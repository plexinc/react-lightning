// Extracted and adapted from Reanimated's spring implementation
// See: https://github.com/software-mansion/react-native-reanimated/tree/main/packages/react-native-reanimated/src/animation/spring
import type { AnimationSettings } from '@lightningjs/renderer';
import {
  GentleSpringConfig,
  GentleSpringConfigWithDuration,
  ReduceMotion,
  type WithSpringConfig,
} from 'react-native-reanimated-original';
import {
  calculateNewStiffnessToMatchDuration,
  checkIfConfigIsValid,
  criticallyDampedSpringCalculations,
  type DefaultSpringConfig,
  getEnergy,
  getEstimatedDuration,
  initialCalculations,
  isAnimationTerminatingCalculation,
  underDampedSpringCalculations,
} from './springUtils';

const cache = new Map<string, AnimationSettings>();

const DefaultConfig: DefaultSpringConfig = {
  ...GentleSpringConfig,
  ...GentleSpringConfigWithDuration,
  overshootClamping: false,
  energyThreshold: 6e-9,
  velocity: 0,
  reduceMotion: undefined,
  delay: 0,
  clamp: undefined,
};

export function createSpringAnimation(
  userConfig?: WithSpringConfig,
): AnimationSettings {
  const key = JSON.stringify(userConfig);
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  const config: DefaultSpringConfig = {
    ...DefaultConfig,
    ...userConfig,
  };

  if (
    config.reduceMotion === ReduceMotion.Always ||
    config.duration === 0 ||
    !checkIfConfigIsValid(config)
  ) {
    const instant: AnimationSettings = {
      duration: config.duration,
      easing: 'ease-out',
      delay: config.delay,
      loop: false,
      repeat: 0,
      repeatDelay: 0,
      stopMethod: false,
    };

    cache.set(key, instant);

    return instant;
  }

  const startValue = 0;
  const toValue = 1;
  const x0 = startValue - toValue;
  const useDuration =
    userConfig?.dampingRatio != null || userConfig?.duration != null;

  let current = startValue;
  let velocity = config.velocity;

  const { zeta, omega0, omega1 } = initialCalculations(useDuration, config);

  if (useDuration) {
    config.stiffness = calculateNewStiffnessToMatchDuration(x0, config);
  } else {
    config.duration = getEstimatedDuration(zeta, omega0);
  }

  const initialEnergy = getEnergy(
    x0,
    config.velocity,
    config.stiffness,
    config.mass,
  );

  function easing(progress: number): number {
    const t = (progress * config.duration) / 1000;
    const v0 = velocity;
    const x0 = progress - toValue;

    const { position: newPosition, velocity: newVelocity } =
      zeta < 1
        ? underDampedSpringCalculations({
            zeta,
            v0,
            x0,
            omega0,
            omega1,
            t,
          })
        : criticallyDampedSpringCalculations({
            v0,
            x0,
            omega0,
            t,
          });

    current = newPosition;
    velocity = newVelocity;

    if (
      isAnimationTerminatingCalculation(
        startValue,
        toValue,
        current,
        velocity,
        initialEnergy,
        config,
      )
    ) {
      velocity = 0;
      current = toValue;
    }

    return current;
  }

  const animation: AnimationSettings = {
    duration: config.duration,
    easing,
    delay: config.delay,
    loop: false,
    repeat: 0,
    repeatDelay: 0,
    stopMethod: false,
  };

  cache.set(key, animation);

  return animation;
}
