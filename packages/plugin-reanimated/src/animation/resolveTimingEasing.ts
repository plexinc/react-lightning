import type { AnimationSettings } from '@lightningjs/renderer';

type EasingFactory = { factory: () => AnimationSettings['easing'] };

function hasFactory(value: unknown): value is EasingFactory {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as EasingFactory).factory === 'function'
  );
}

// reanimated Easing.* are functions; Easing.bezier(...) returns a { factory }
// object. The renderer's CoreAnimation takes a function easing directly and
// resolves a string via getTimingFunction, so pass functions through, unwrap
// the factory, and fall back to linear for anything else.
export function resolveTimingEasing(easing: unknown): AnimationSettings['easing'] {
  if (typeof easing === 'function') {
    return easing as AnimationSettings['easing'];
  }

  if (hasFactory(easing)) {
    return easing.factory();
  }

  return 'linear';
}
