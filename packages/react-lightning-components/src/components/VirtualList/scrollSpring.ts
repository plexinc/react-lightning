export interface CriticalSpringMotion {
  /** Displacement from the target at time t (same sign as the initial displacement). */
  position: (t: number) => number;
  /** Velocity at time t, in units/ms. */
  velocity: (t: number) => number;
}

/**
 * Critically damped spring, the motion behind UIKit's focus-driven scroll on
 * tvOS. `displacement` is start minus target, `velocity` the carried speed
 * (units/ms), `omega` the natural frequency (1/ms, higher settles faster).
 * Carried velocity can make it cross the target once and glide back; it
 * never oscillates.
 */
export function createCriticalSpring(
  displacement: number,
  velocity: number,
  omega: number,
): CriticalSpringMotion {
  const b = velocity + omega * displacement;

  return {
    position: (t: number): number => (displacement + b * t) * Math.exp(-omega * t),
    velocity: (t: number): number =>
      (b - omega * (displacement + b * t)) * Math.exp(-omega * t),
  };
}
