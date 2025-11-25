// Extracted and adapted from Reanimated's spring implementation
// See: https://github.com/software-mansion/react-native-reanimated/tree/main/packages/react-native-reanimated/src/animation/spring
import type { WithSpringConfig } from 'react-native-reanimated-original';

export type DefaultSpringConfig = {
  [K in keyof Required<WithSpringConfig>]: K extends 'reduceMotion' | 'clamp'
    ? Required<WithSpringConfig>[K] | undefined
    : Required<WithSpringConfig>[K];
};

export function checkIfConfigIsValid(config: DefaultSpringConfig): boolean {
  let errorMessage = '';
  (
    ['stiffness', 'damping', 'dampingRatio', 'mass', 'energyThreshold'] as const
  ).forEach((prop) => {
    const value = config[prop];
    if (value <= 0) {
      errorMessage += `, ${prop} must be grater than zero but got ${value}`;
    }
  });

  if (config.duration < 0) {
    errorMessage += `, duration can't be negative, got ${config.duration}`;
  }

  if (
    config.clamp?.min &&
    config.clamp?.max &&
    config.clamp.min > config.clamp.max
  ) {
    errorMessage += `, clamp.min should be lower than clamp.max, got clamp: {min: ${config.clamp.min}, max: ${config.clamp.max}} `;
  }

  if (errorMessage !== '') {
    console.error(`Invalid spring config: ${errorMessage}`);
  }

  return errorMessage === '';
}

function bisectRoot({
  min,
  max,
  func,
  precision,
  maxIterations = 20,
}: {
  min: number;
  max: number;
  func: (x: number) => number;
  precision: number;
  maxIterations?: number;
}) {
  const direction = func(max) >= func(min) ? 1 : -1;
  let idx = maxIterations;
  let current = (max + min) / 2;

  while (Math.abs(func(current)) > precision && idx > 0) {
    idx -= 1;

    if (func(current) * direction < 0) {
      min = current;
    } else {
      max = current;
    }
    current = (min + max) / 2;
  }

  return current;
}

export function initialCalculations(
  useDuration: boolean,
  config: DefaultSpringConfig,
): {
  zeta: number;
  omega0: number;
  omega1: number;
} {
  if (useDuration) {
    const { mass: m, dampingRatio: zeta, stiffness: k } = config;

    /**
     * Omega0 and omega1 denote angular frequency and natural angular frequency,
     * see this link for formulas:
     * https://courses.lumenlearning.com/suny-osuniversityphysics/chapter/15-5-damped-oscillations/
     */
    const omega0 = Math.sqrt(k / m);
    const omega1 = omega0 * Math.sqrt(1 - zeta ** 2);

    return { zeta, omega0, omega1 };
  } else {
    const { damping: c, mass: m, stiffness: k } = config;

    const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
    const omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
    const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay

    return {
      zeta: zeta,
      omega0: omega0,
      omega1: omega1,
    };
  }
}

export function getEnergy(
  displacement: number,
  velocity: number,
  stiffness: number,
  mass: number,
): number {
  const potentialEnergy = 0.5 * stiffness * displacement ** 2;
  const kineticEnergy = 0.5 * mass * velocity ** 2;

  return potentialEnergy + kineticEnergy;
}

export function calculateNewStiffnessToMatchDuration(
  x0: number,
  config: DefaultSpringConfig,
): number {
  /**
   * Use this formula:
   * https://phys.libretexts.org/Bookshelves/University_Physics/Book%3A_University_Physics_(OpenStax)/Book%3A_University_Physics_I_-_Mechanics_Sound_Oscillations_and_Waves_(OpenStax)/15%3A_Oscillations/15.06%3A_Damped_Oscillations
   * to find the asymptote and estimate the damping that gives us the expected
   * duration
   *
   *             ⎛ ⎛ c⎞           ⎞
   *             ⎜-⎜──⎟ ⋅ duration⎟
   *             ⎝ ⎝2m⎠           ⎠
   *        A ⋅ e                   = threshold
   */
  const {
    dampingRatio: zeta,
    energyThreshold: threshold,
    mass: m,
    duration: targetDuration,
    velocity: v0,
  } = config;

  const energyDiffForStiffness = (stiffness: number) => {
    const perceptualCoefficient = 1.5;
    const MILLISECONDS_IN_SECOND = 1000;

    const settlingDuration =
      (targetDuration * perceptualCoefficient) / MILLISECONDS_IN_SECOND;
    const omega0 = Math.sqrt(stiffness / m) * zeta;

    const xtk =
      (x0 + (v0 + x0 * omega0) * settlingDuration) *
      Math.exp(-omega0 * settlingDuration);

    const vtk =
      (x0 + (v0 + x0 * omega0) * settlingDuration) *
        Math.exp(-omega0 * settlingDuration) *
        -omega0 +
      (v0 + x0 * omega0) * Math.exp(-omega0 * settlingDuration);

    const e0 = getEnergy(x0, v0, stiffness, m);

    const etk = getEnergy(xtk, vtk, stiffness, m);

    const energyFraction = etk / e0;

    return energyFraction - threshold;
  };

  const precision = config.energyThreshold * 1e-3; // Experimentally seems to be good enough.

  // Bisection turns out to be much faster than Newton's method in our case
  return bisectRoot({
    min: Number.EPSILON,
    max: 8e3 /* Stiffness for 8ms animation doesn't exceed 2e3, we add some safety margin on top of that. */,
    func: energyDiffForStiffness,
    precision,
    maxIterations: 100,
  });
}

export function criticallyDampedSpringCalculations(precalculatedValues: {
  v0: number;
  x0: number;
  omega0: number;
  t: number;
}): { position: number; velocity: number } {
  const { v0, x0, omega0, t } = precalculatedValues;

  const criticallyDampedEnvelope = Math.exp(-omega0 * t);
  const criticallyDampedPosition =
    1 + criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);

  const criticallyDampedVelocity =
    criticallyDampedEnvelope * -omega0 * (x0 + (v0 + omega0 * x0) * t) +
    criticallyDampedEnvelope * (v0 + omega0 * x0);

  return {
    position: criticallyDampedPosition,
    velocity: criticallyDampedVelocity,
  };
}

export function underDampedSpringCalculations(precalculatedValues: {
  zeta: number;
  v0: number;
  x0: number;
  omega0: number;
  omega1: number;
  t: number;
}): { position: number; velocity: number } {
  const { zeta, t, omega0, omega1, x0, v0 } = precalculatedValues;

  const sin1 = Math.sin(omega1 * t);
  const cos1 = Math.cos(omega1 * t);

  // under damped
  const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
  const underDampedFrag1 =
    underDampedEnvelope *
    (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);

  const underDampedPosition = 1 + underDampedFrag1;
  // This looks crazy -- it's actually just the derivative of the oscillation function
  const underDampedVelocity =
    -zeta * omega0 * underDampedFrag1 +
    underDampedEnvelope *
      (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);

  return { position: underDampedPosition, velocity: underDampedVelocity };
}

export function isAnimationTerminatingCalculation(
  startValue: number,
  toValue: number,
  current: number,
  velocity: number,
  initialEnergy: number,
  config: DefaultSpringConfig,
): boolean {
  if (config.overshootClamping) {
    const leftBound = startValue >= 0 ? toValue : toValue + startValue;
    const rightBound = leftBound + Math.abs(startValue);

    if (current < leftBound || current > rightBound) {
      return true;
    }
  }

  const currentEnergy = getEnergy(
    toValue - current,
    velocity,
    config.stiffness,
    config.mass,
  );

  return (
    initialEnergy === 0 ||
    currentEnergy / initialEnergy <= config.energyThreshold
  );
}

/**
 * Fast estimation of spring animation duration.
 * Uses the settling time formula for damped oscillators.
 */
export function getEstimatedDuration(zeta: number, omega0: number): number {
  let settlingTime: number;

  // For fast estimation, use the settling time formula
  if (zeta < 1) {
    settlingTime = 4 / (zeta * omega0);
  } else if (zeta === 1) {
    settlingTime = 6 / omega0;
  } else {
    settlingTime = 4 / (zeta * omega0);
  }

  return settlingTime * 1000 * 1.5;
}
