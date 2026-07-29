import type { LightningElementStyle } from '@plextv/react-lightning';
import type { ScheduledAnimation } from '../utils/toLightningAnimationAndStyles';
import { type AnimationProgram, programsEqual } from './animationProgram';
import type { CancelAnimation } from './runAnimationProgram';

type PropKey = keyof LightningElementStyle;

export interface RunningProgram {
  program: AnimationProgram;
  cancel: CancelAnimation;
}

// Reconcile the programs playing on a view against a freshly computed schedule
// set. A key whose program is unchanged keeps its runner; only added, removed,
// or changed keys are (re)started. Restarting every program on any dependency
// change resets unrelated loops (a pulse restarting on every scroll tick).
export function reconcileRunners(
  running: Map<PropKey, RunningProgram>,
  schedules: ScheduledAnimation[],
  start: (schedule: ScheduledAnimation) => CancelAnimation,
): Map<PropKey, RunningProgram> {
  const next = new Map<PropKey, RunningProgram>();
  const scheduled = new Set<PropKey>();

  for (const schedule of schedules) {
    scheduled.add(schedule.prop);

    const existing = running.get(schedule.prop);

    if (existing && programsEqual(existing.program, schedule.program)) {
      next.set(schedule.prop, existing);
      continue;
    }

    existing?.cancel();
    next.set(schedule.prop, {
      program: schedule.program,
      cancel: start(schedule),
    });
  }

  for (const [prop, run] of running) {
    if (!scheduled.has(prop)) {
      run.cancel();
    }
  }

  return next;
}
