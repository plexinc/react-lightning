import { describe, expect, it } from 'vitest';

import { RevealGate } from './RevealGate';

const QUIET = 120;
const MAX = 1000;

describe('RevealGate', () => {
  it('reports Infinity until a key is noted', () => {
    const gate = new RevealGate();

    expect(gate.timeUntilSettled('a', 0, QUIET, MAX)).toBe(Infinity);
  });

  it('counts down the quiet window from the last size change', () => {
    const gate = new RevealGate();

    gate.note('a', 456, 0);

    expect(gate.timeUntilSettled('a', 0, QUIET, MAX)).toBe(QUIET);
    expect(gate.timeUntilSettled('a', 100, QUIET, MAX)).toBe(20);
    expect(gate.timeUntilSettled('a', 120, QUIET, MAX)).toBe(0);
    expect(gate.timeUntilSettled('a', 500, QUIET, MAX)).toBe(0);
  });

  it('restarts the quiet window when the size changes (grow)', () => {
    const gate = new RevealGate();

    gate.note('a', 120, 0);
    // Grows to its real height mid-window; the clock restarts so it can't
    // be revealed at the transient smaller size.
    gate.note('a', 456, 80);

    expect(gate.timeUntilSettled('a', 120, QUIET, MAX)).toBe(80);
    expect(gate.timeUntilSettled('a', 200, QUIET, MAX)).toBe(0);
  });

  it('ignores sub-pixel jitter (does not restart the window)', () => {
    const gate = new RevealGate();

    gate.note('a', 456, 0);
    gate.note('a', 456.4, 80);

    expect(gate.timeUntilSettled('a', 120, QUIET, MAX)).toBe(0);
  });

  it('force-settles after the max window even while still changing', () => {
    const gate = new RevealGate();

    gate.note('a', 100, 0);
    gate.note('a', 200, 500);
    gate.note('a', 300, 1000);

    // Never quiet for QUIET ms, but MAX ms elapsed since first seen.
    expect(gate.timeUntilSettled('a', 1000, QUIET, MAX)).toBe(0);
  });

  it('takes the sooner of the quiet and max deadlines', () => {
    const gate = new RevealGate();

    gate.note('a', 100, 0);
    gate.note('a', 200, 950);

    // quiet would finish at 950+120=1070; max finishes at 0+1000=1000.
    expect(gate.timeUntilSettled('a', 950, QUIET, MAX)).toBe(50);
  });

  it('stays settled once revealed, even when the size changes later', () => {
    const gate = new RevealGate();

    gate.note('a', 456, 0);
    gate.markRevealed('a');

    // A background refresh re-measures the already-visible row to a new
    // height; it must not re-gate (hiding it would drop focus).
    gate.note('a', 500, 1000);

    expect(gate.timeUntilSettled('a', 1000, QUIET, MAX)).toBe(0);
  });

  it('forgets a key so a recycled slot re-gates from scratch', () => {
    const gate = new RevealGate();

    gate.note('a', 456, 0);
    gate.markRevealed('a');
    gate.forget('a');

    expect(gate.timeUntilSettled('a', 0, QUIET, MAX)).toBe(Infinity);
  });

  it('reveals a final-marked key immediately, skipping the quiet window', () => {
    const gate = new RevealGate();

    gate.note('a', 456, 0);
    // Yoga reported layout settled — the size is authoritative, no quiet wait.
    expect(gate.markFinal('a')).toBe(true);

    expect(gate.timeUntilSettled('a', 0, QUIET, MAX)).toBe(0);
  });

  it('markFinal returns false the second time (already final)', () => {
    const gate = new RevealGate();

    gate.note('a', 456, 0);

    expect(gate.markFinal('a')).toBe(true);
    expect(gate.markFinal('a')).toBe(false);
  });

  it('forget clears the final flag so a recycled slot re-gates', () => {
    const gate = new RevealGate();

    gate.note('a', 456, 0);
    gate.markFinal('a');
    gate.forget('a');

    expect(gate.timeUntilSettled('a', 0, QUIET, MAX)).toBe(Infinity);
  });
});
