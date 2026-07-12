import type { DependencyList } from 'react';
import { useRef } from 'react';

import { useTrackedReaction } from './useTrackedReaction';

export function useAnimatedReaction<PreparedResult>(
  prepare: () => PreparedResult,
  react: (prepared: PreparedResult, previous: PreparedResult | null) => void,
  dependencies?: DependencyList,
): void {
  const previousRef = useRef<PreparedResult | null>(null);

  useTrackedReaction(
    prepare,
    (result) => {
      react(result, previousRef.current);
      previousRef.current = result;
    },
    dependencies,
  );
}
