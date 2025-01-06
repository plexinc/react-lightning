import { type ReactNode, createContext } from 'react';
import { useRefStore } from './useRefStore';

export type RefStore<T> = {
  get: () => T;
  set: (newData: T) => void;
  subscribe: (callback: () => void) => () => void;
};

export function createRefStoreContext<T>(defaultData: T) {
  const Context = createContext<RefStore<T>>({
    get: () => defaultData,
    set: () => {},
    subscribe: () => () => {},
  });

  return {
    Provider: ({ children }: { children: ReactNode }) => {
      const { get, set, subscribe } = useRefStore<T>(defaultData);

      return (
        <Context.Provider
          value={{
            get,
            set,
            subscribe,
          }}
        >
          {children}
        </Context.Provider>
      );
    },
    Context,
  };
}
