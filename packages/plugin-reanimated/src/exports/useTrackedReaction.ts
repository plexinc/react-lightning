import type { DependencyList } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Mutable } from 'react-native-reanimated/lib/typescript/commonTypes';

import { collectSharedValueReads, nextTrackingListenerId } from '../utils/sharedValueTracking';

type TrackedState<T> = {
  compute: (() => T) | null;
  apply: (result: T) => void;
};

/**
 * Runs `compute` with shared-value read tracking and re-runs it (microtask
 * coalesced) whenever one of the values it read changes. With explicit
 * `dependencies` the subscription set still comes from tracking; the deps only
 * gate the per-render recompute, mirroring reanimated's web behavior.
 */
export function useTrackedReaction<T>(
  compute: (() => T) | null,
  apply: (result: T) => void,
  dependencies?: DependencyList,
): void {
  const [listenerId] = useState(nextTrackingListenerId);
  const stateRef = useRef<TrackedState<T>>({ compute, apply });
  const subscribedRef = useRef(new Set<Mutable<unknown>>());
  const pendingRef = useRef(false);
  const disposedRef = useRef(false);

  const [schedule] = useState(() => (): void => {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;

    queueMicrotask(() => {
      pendingRef.current = false;

      const { compute: currentCompute, apply: currentApply } = stateRef.current;

      if (!currentCompute) {
        return;
      }

      const { result, reads } = collectSharedValueReads(currentCompute);
      const subscribed = subscribedRef.current;

      if (!disposedRef.current) {
        for (const value of subscribed) {
          if (!reads.has(value)) {
            value.removeListener(listenerId);
            subscribed.delete(value);
          }
        }

        for (const value of reads) {
          // Re-adding an id replaces the callback, keeping listeners current.
          value.addListener(listenerId, schedule);
          subscribed.add(value);
        }
      }

      currentApply(result);
    });
  });

  useEffect(
    () => {
      stateRef.current = { compute, apply };

      if (compute) {
        schedule();
      }
    },
    // Per-render on purpose when no deps are given: plain props captured by
    // the updater only refresh through re-renders.
    dependencies ? [schedule, ...dependencies] : undefined,
  );

  useEffect(() => {
    disposedRef.current = false;

    return () => {
      disposedRef.current = true;

      for (const value of subscribedRef.current) {
        value.removeListener(listenerId);
      }

      subscribedRef.current.clear();
    };
  }, [listenerId]);
}
