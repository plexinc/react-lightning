import type { AnimationSettings } from '@lightningjs/renderer';

type EasingFactory = { factory: () => AnimationSettings['easing'] };

function hasFactory(value: unknown): value is EasingFactory {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as EasingFactory).factory === 'function'
  );
}

// reanimated defaults withTiming to Easing.inOut(Easing.quad); the renderer has
// no named token for it, so use the equivalent cubic-bezier its parser accepts.
const DEFAULT_EASING = 'cubic-bezier(0.455, 0.03, 0.515, 0.955)';

// reanimated Easing.* are functions; Easing.bezier(...) returns a { factory }
// object. The renderer's CoreAnimation takes a function easing directly and
// resolves a string via getTimingFunction, so pass functions through, unwrap
// the factory, default the unset case to inOut-quad, and treat anything else as
// linear.
export function resolveTimingEasing(
  easing: unknown,
): AnimationSettings['easing'] {
  if (typeof easing === 'function') {
    return easing as AnimationSettings['easing'];
  }

  if (hasFactory(easing)) {
    return easing.factory();
  }

  if (easing == null) {
    return DEFAULT_EASING;
  }

  return 'linear';
}
