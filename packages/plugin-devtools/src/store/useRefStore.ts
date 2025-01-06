import { useCallback, useRef } from 'react';

export function useRefStore<T>(defaultData: T) {
  const data = useRef<T>(defaultData);
  const subscribers = useRef<Set<() => void>>(new Set());

  const get = useCallback(() => data.current, []);
  const set = useCallback((newData: T) => {
    data.current = newData;
    for (const callback of subscribers.current) {
      callback();
    }
  }, []);
  const subscribe = useCallback((callback: () => void) => {
    subscribers.current.add(callback);

    return () => {
      subscribers.current.delete(callback);
    };
  }, []);

  return { get, set, subscribe };
}
