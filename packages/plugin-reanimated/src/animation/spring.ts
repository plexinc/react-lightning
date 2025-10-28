import type { AnimationSettings } from '@lightningjs/renderer';
import type { WithSpringConfig } from 'react-native-reanimated-original';
import { ReduceMotion } from 'react-native-reanimated-original';

const MAX_SIM_FRAMES = 600; // ~2 seconds @ 60 FPS
const TARGET_FPS = 1 / 60;
const _SPRING_LENGTH = 0.2;

const cache = new Map<string, AnimationSettings>();
const timingFunctionCache = new Map<string, (delta: number) => number>();

const DefaultSpringConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
  velocity: 0,
  dampingRatio: 0.5,
  reduceMotion: ReduceMotion.System,
};

export function createSpringTimingFunction(
  config?: WithSpringConfig,
): (delta: number) => number {
  const {
    mass,
    stiffness,
    damping,
    velocity: _velocity,
    restDisplacementThreshold,
    restSpeedThreshold,
    overshootClamping,
  } = { ...DefaultSpringConfig, ...config };

  const key = JSON.stringify({
    mass,
    stiffness,
    damping,
    velocity: _velocity,
    restDisplacementThreshold,
    restSpeedThreshold,
    overshootClamping,
  });

  const cachedResult = timingFunctionCache.get(key);
  if (cachedResult) {
    return cachedResult;
  }

  const SPRING_TARGET = 1;
  let position = 0;
  let velocity = _velocity;
  const positions: number[] = [];
  let frame = 0;

  while (frame < MAX_SIM_FRAMES) {
    const springAmount = -stiffness * (position - SPRING_TARGET);
    const dampingAmount = -damping * velocity;
    const acceleration = (springAmount + dampingAmount) / mass;

    velocity += acceleration * TARGET_FPS;
    position += velocity * TARGET_FPS;

    if (overshootClamping && position > 1) {
      position = 1;
      velocity = 0;
    }

    positions.push(position);
    frame++;

    const isAtRest =
      Math.abs(position - SPRING_TARGET) < restDisplacementThreshold &&
      Math.abs(velocity) < restSpeedThreshold;

    if (isAtRest) {
      break;
    }
  }

  const timingFunction = (delta: number): number => {
    if (delta < 0) {
      delta = 0;
    }

    if (delta > 1) {
      delta = 1;
    }

    const index = Math.round(delta * (positions.length - 1));

    return positions[index] ?? 0;
  };

  timingFunctionCache.set(key, timingFunction);
  return timingFunction;
}

// Temporary until https://github.com/lightning-js/renderer/pull/639 is landed in a beta
export function createSpringAnimation(
  config?: WithSpringConfig,
): AnimationSettings {
  const {
    mass,
    stiffness,
    damping,
    velocity: _velocity,
    restDisplacementThreshold,
    restSpeedThreshold,
    overshootClamping,
  } = { ...DefaultSpringConfig, ...config };

  const key = JSON.stringify({
    mass,
    stiffness,
    damping,
    velocity: _velocity,
    restDisplacementThreshold,
    restSpeedThreshold,
    overshootClamping,
  });

  const cachedResult = cache.get(key);
  if (cachedResult) {
    return cachedResult;
  }

  const timingFn = createSpringTimingFunction(config);

  // Find the four points for the cubic bezier
  const y1 = timingFn(1 / 3);
  const y2 = timingFn(2 / 3);

  const p1_y = (9 * y1 - 3 * y2) / 4;
  const p2_y = (6 * y2 - 3 * y1) / 4;

  const animation = {
    duration: 350,
    easing: `cubic-bezier(${1 / 3}, ${p1_y}, ${2 / 3}, ${p2_y})`,
    delay: config?.delay ?? 0,
    loop: false,
    repeat: 0,
    repeatDelay: 0,
    stopMethod: false,
  } satisfies AnimationSettings;

  cache.set(key, animation);

  return animation;
}
