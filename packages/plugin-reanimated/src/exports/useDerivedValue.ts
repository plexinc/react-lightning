import type { DependencyList } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { DerivedValue } from 'react-native-reanimated-original';
import { makeMutable } from 'react-native-reanimated-original';

import { AnimatedValue } from '../animation/AnimatedValue';
import { restingValue } from '../animation/animationProgram';
import { sampleAnimation } from '../animation/sampleAnimation';
import { instrumentSharedValue } from '../utils/sharedValueTracking';
import { useTrackedReaction } from './useTrackedReaction';

type Mutable = { value: unknown };

// The plain number reanimated would settle on: a composed program
// (withSequence/withRepeat/withDelay) uses its resting target, a leaf its target.
function restingTarget(av: AnimatedValue): unknown {
  if (av.program) {
    const resting = restingValue(av.program);

    return typeof resting === 'number' ? resting : av.value;
  }

  return av.value;
}

// A derived value must read as a live number while it animates; storing the raw AnimatedValue
// broke arithmetic and styles reading it. Tick toward the target on the JS thread instead;
// composed programs snap to their resting value.
function animate(mutable: Mutable, av: AnimatedValue): () => void {
  const target = restingTarget(av);
  const from = mutable.value;

  if (
    av.program ||
    typeof target !== 'number' ||
    typeof from !== 'number' ||
    from === target
  ) {
    mutable.value = target;
    av.callback?.(true);

    return () => {};
  }

  const to = target;
  const start = performance.now();
  let frame = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled) {
      return;
    }

    const { value, done } = sampleAnimation(
      from,
      to,
      performance.now() - start,
      av.lngAnimation,
    );

    mutable.value = value;

    if (done) {
      av.callback?.(true);

      return;
    }

    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}

export function useDerivedValue<Value>(
  updater: () => Value,
  dependencies?: DependencyList,
): DerivedValue<Value> {
  const [mutable] = useState(() => {
    const initial: unknown = updater();
    const value =
      initial instanceof AnimatedValue ? restingTarget(initial) : initial;

    return instrumentSharedValue(makeMutable(value as Value));
  });
  const cancelRef = useRef<(() => void) | undefined>(undefined);

  useTrackedReaction(
    updater,
    (result) => {
      cancelRef.current?.();
      cancelRef.current = undefined;

      if (result instanceof AnimatedValue) {
        cancelRef.current = animate(mutable as Mutable, result);
      } else {
        mutable.value = result;
      }
    },
    dependencies,
  );

  useEffect(() => () => cancelRef.current?.(), []);

  return mutable as DerivedValue<Value>;
}
