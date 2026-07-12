import type { DependencyList } from 'react';
import { useState } from 'react';
import type { DerivedValue } from 'react-native-reanimated-original';
import { makeMutable } from 'react-native-reanimated-original';

import { instrumentSharedValue } from '../utils/sharedValueTracking';
import { useTrackedReaction } from './useTrackedReaction';

export function useDerivedValue<Value>(
  updater: () => Value,
  dependencies?: DependencyList,
): DerivedValue<Value> {
  const [mutable] = useState(() => instrumentSharedValue(makeMutable(updater())));

  useTrackedReaction(
    updater,
    (result) => {
      mutable.value = result;
    },
    dependencies,
  );

  return mutable as DerivedValue<Value>;
}
