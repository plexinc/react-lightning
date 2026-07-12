import type { Mutable } from 'react-native-reanimated/lib/typescript/commonTypes';

// No reanimated babel plugin runs on Lightning, so hooks can't infer their
// dependencies from the updater's closure. Instead we rewrite each shared
// value's `value` getter to report reads to an active collector, and the hooks
// subscribe to exactly what their updater read.

let activeReads: Set<Mutable<unknown>> | null = null;

const instrumented = new WeakSet<object>();

export function instrumentSharedValue<T>(mutable: T): T {
  const target = mutable as object;

  if (instrumented.has(target)) {
    return mutable;
  }

  const descriptor = Object.getOwnPropertyDescriptor(target, 'value');

  if (!descriptor?.get || !descriptor.set || !descriptor.configurable) {
    return mutable;
  }

  const originalGet = descriptor.get;

  Object.defineProperty(target, 'value', {
    ...descriptor,
    get(): unknown {
      activeReads?.add(mutable as Mutable<unknown>);

      return originalGet.call(target);
    },
  });

  instrumented.add(target);

  return mutable;
}

export function collectSharedValueReads<T>(fn: () => T): {
  result: T;
  reads: Set<Mutable<unknown>>;
} {
  const previous = activeReads;
  const reads = new Set<Mutable<unknown>>();

  activeReads = reads;

  try {
    return { result: fn(), reads };
  } finally {
    activeReads = previous;
  }
}

// Negative ids so we never collide with reanimated's web mapper ids (10000+)
// or the positive ids useAnimatedStyle hands to explicit-deps listeners.
let trackingIdCount = 0;

export function nextTrackingListenerId(): number {
  trackingIdCount -= 1;

  return trackingIdCount;
}
