import { describe, expect, it } from 'vitest';

import { createCriticalSpring } from './scrollSpring';

// UIKit mapping for a 0.6s nominal spring (2*pi/duration).
const OMEGA = (2 * Math.PI) / 600;

describe('createCriticalSpring', () => {
  it('starts at the initial displacement and velocity', () => {
    const spring = createCriticalSpring(-800, 3, OMEGA);

    expect(spring.position(0)).toBe(-800);
    expect(spring.velocity(0)).toBeCloseTo(3, 5);

    // Numeric derivative agrees with the analytic velocity.
    const h = 0.01;
    const numeric = (spring.position(h) - spring.position(0)) / h;

    expect(numeric).toBeCloseTo(spring.velocity(0), 2);
  });

  it('leaves under ~1.5% of the distance at the UIKit cutoff', () => {
    const spring = createCriticalSpring(-800, 0, OMEGA);

    expect(Math.abs(spring.position(600))).toBeLessThan(800 * 0.015);
    expect(Math.abs(spring.position(600))).toBeGreaterThan(0);
  });

  it('decelerates through the tail instead of stopping hard', () => {
    const spring = createCriticalSpring(-800, 0, OMEGA);
    const speedAt = (t: number) => Math.abs(spring.velocity(t));

    // Velocity ramps up, peaks, then decays smoothly.
    expect(speedAt(150)).toBeGreaterThan(speedAt(300));
    expect(speedAt(300)).toBeGreaterThan(speedAt(450));
  });

  it('crosses the target at most once with a large carried velocity', () => {
    const spring = createCriticalSpring(-100, 10, OMEGA);
    let crossings = 0;
    let prevSign = Math.sign(spring.position(0));

    for (let t = 1; t <= 1000; t++) {
      const sign = Math.sign(spring.position(t));

      if (sign !== 0 && sign !== prevSign) {
        crossings += 1;
        prevSign = sign;
      }
    }

    expect(crossings).toBeLessThanOrEqual(1);
    expect(Math.abs(spring.position(2000))).toBeLessThan(1);
  });
});
