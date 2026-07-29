import type { AnimationSettings } from '@lightningjs/renderer';
import { describe, expect, it, vi } from 'vitest';
import type { LightningElementStyle } from '@plextv/react-lightning';
import type { ScheduledAnimation } from '../utils/toLightningAnimationAndStyles';
import { leafProgram, sequenceProgram } from './animationProgram';
import { type RunningProgram, reconcileRunners } from './reconcileRunners';

const settings = (): AnimationSettings => ({
  duration: 100,
  easing: 'linear',
  delay: 0,
  loop: false,
  repeat: 0,
  stopMethod: false,
});

type Prop = keyof LightningElementStyle;

// A looping pulse held by one shared value: the same program object comes back
// on every recompute.
const pulseSettings = settings();
const pulse = sequenceProgram([
  leafProgram({ toValue: 1, lngAnimation: pulseSettings }),
  leafProgram({ toValue: 0, lngAnimation: pulseSettings }),
]);

const schedule = (
  prop: Prop,
  program: ScheduledAnimation['program'],
): ScheduledAnimation => ({
  prop,
  program,
});

describe('reconcileRunners', () => {
  it('leaves a running program untouched when its key is unchanged', () => {
    const pulseCancel = vi.fn();
    const current = new Map<Prop, RunningProgram>([
      ['scaleX', { program: pulse, cancel: pulseCancel }],
    ]);
    const start = vi.fn(() => vi.fn());

    const next = reconcileRunners(current, [schedule('scaleX', pulse)], start);

    expect(pulseCancel).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(next.get('scaleX')?.cancel).toBe(pulseCancel);
  });

  it('restarts only the changed key, leaving an unrelated pulse running', () => {
    const pulseCancel = vi.fn();
    const scrollCancel = vi.fn();
    const current = new Map<Prop, RunningProgram>([
      ['scaleX', { program: pulse, cancel: pulseCancel }],
      [
        'x',
        {
          program: leafProgram({ toValue: 0, lngAnimation: settings() }),
          cancel: scrollCancel,
        },
      ],
    ]);
    const restartedCancel = vi.fn();
    const start = vi.fn(() => restartedCancel);

    // Same pulse for scaleX, but x moved — mirrors a scroll tick that must not
    // reset the pulse.
    const next = reconcileRunners(
      current,
      [
        schedule('scaleX', pulse),
        schedule('x', leafProgram({ toValue: 120, lngAnimation: settings() })),
      ],
      start,
    );

    expect(pulseCancel).not.toHaveBeenCalled();
    expect(scrollCancel).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(next.get('scaleX')?.cancel).toBe(pulseCancel);
    expect(next.get('x')?.cancel).toBe(restartedCancel);
  });

  it('cancels a program whose key disappears from the schedule', () => {
    const cancel = vi.fn();
    const current = new Map<Prop, RunningProgram>([
      [
        'x',
        {
          program: leafProgram({ toValue: 0, lngAnimation: settings() }),
          cancel,
        },
      ],
    ]);

    const next = reconcileRunners(current, [], vi.fn());

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(next.size).toBe(0);
  });

  it('restarts a program whose leaf settings ref changed (never leaves it stale)', () => {
    const oldCancel = vi.fn();
    // Same target and tree shape, but a fresh settings object — must count as
    // changed so a real update never keeps playing the stale program.
    const before = leafProgram({ toValue: 1, lngAnimation: settings() });
    const after = leafProgram({ toValue: 1, lngAnimation: settings() });
    const current = new Map<Prop, RunningProgram>([
      ['scaleX', { program: before, cancel: oldCancel }],
    ]);
    const restarted = vi.fn();
    const start = vi.fn(() => restarted);

    const next = reconcileRunners(current, [schedule('scaleX', after)], start);

    expect(oldCancel).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(next.get('scaleX')?.cancel).toBe(restarted);
  });

  it('starts a program for a newly scheduled key', () => {
    const started = vi.fn();
    const start = vi.fn(() => started);
    const program = leafProgram({ toValue: 1, lngAnimation: settings() });

    const next = reconcileRunners(
      new Map(),
      [schedule('scaleY', program)],
      start,
    );

    expect(start).toHaveBeenCalledTimes(1);
    expect(next.get('scaleY')?.cancel).toBe(started);
  });
});
