import {
  type Context,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { RefStore } from './createRefStoreContext';

export default function useRefStoreContext<T>(Context: Context<RefStore<T>>) {
  const context = useContext<RefStore<T>>(Context);
  const [changeCounter, setChangeCounter] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Forcefully update the context data
  const contextData = useMemo(() => {
    return context ? context.get() : null;
  }, [context, changeCounter]);

  const data = useSyncExternalStore<T | null>(
    (onUpdate) => {
      if (context) {
        return context.subscribe(() => {
          onUpdate();
          setChangeCounter((counter) => counter + 1);
        });
      }

      return () => {};
    },
    () => contextData,
  );

  return data;
}
