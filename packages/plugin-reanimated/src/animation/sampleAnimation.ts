import type { AnimationSettings } from '@lightningjs/renderer';

function easeInOut(progress: number): number {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - (2 - 2 * progress) ** 2 / 2;
}

// Renderer easings arrive as a progress function (custom timings and springs bake one) or a
// string; map the strings the renderer emits, fall back to linear.
const STRING_EASINGS: Record<string, (progress: number) => number> = {
  linear: (progress) => progress,
  ease: easeInOut,
  'ease-in': (progress) => progress * progress,
  'ease-out': (progress) => 1 - (1 - progress) * (1 - progress),
  'ease-in-out': easeInOut,
};

function toEasingFn(
  easing: AnimationSettings['easing'],
): (progress: number) => number {
  if (typeof easing === 'function') {
    return easing as (progress: number) => number;
  }

  return STRING_EASINGS[easing as string] ?? ((progress) => progress);
}

// Sample a leaf timing/spring at elapsedMs (a spring bakes its physics into `easing`, so both
// share this path). Done once the duration elapses so the driver can settle and stop.
export function sampleAnimation(
  from: number,
  to: number,
  elapsedMs: number,
  settings: AnimationSettings,
): { value: number; done: boolean } {
  const delay = settings.delay ?? 0;
  const duration = settings.duration ?? 0;
  const elapsed = elapsedMs - delay;

  if (elapsed <= 0) {
    return { value: from, done: false };
  }

  if (duration <= 0 || elapsed >= duration) {
    return { value: to, done: true };
  }

  const eased = toEasingFn(settings.easing)(elapsed / duration);

  return { value: from + (to - from) * eased, done: false };
}
