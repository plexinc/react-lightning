import { createContext, useCallback, useContext, useState } from 'react';
import { getStorageKey } from '../utils/getStorageKey';
import { useLocalStorage } from '../utils/useLocalStorage';

export type InspectorOptions = {
  alwaysShowIds: boolean;
  onlyShowFocusables: boolean;
  onlyShowFocused: boolean;
};

type Context = {
  getOption: <T extends InspectorOptions, K extends keyof T>(key: K) => T[K];
  setOption: <T extends InspectorOptions, K extends keyof T>(
    key: K,
    value: T[K],
  ) => void;
};

const InspectorOptionsContext = createContext<Context>({
  getOption: () => {
    throw new Error('Not implemented');
  },
  setOption: () => {},
});

const InspectorOptionsProvider = <
  T extends InspectorOptions,
  K extends keyof T,
>({
  children,
}: { children: React.ReactNode }) => {
  const [storedOptions, setStoredOptions] = useLocalStorage<T>(
    getStorageKey('inspectorOptions'),
    {
      alwaysShowIds: false,
      onlyShowFocusables: false,
      onlyShowFocused: false,
    } as T,
  );
  const [options, setOptions] = useState<T>(storedOptions);

  const getOption = useCallback((key: K) => options[key], [options]);
  const setOption = useCallback(
    (key: K, value: T[K]) => {
      const newOptions = { ...options, [key]: value };

      setStoredOptions(newOptions);
      setOptions(newOptions);
    },
    [options, setStoredOptions],
  );

  return (
    <InspectorOptionsContext.Provider
      value={{ getOption, setOption } as Context}
    >
      {children}
    </InspectorOptionsContext.Provider>
  );
};

const useInspectorOption = (key: keyof InspectorOptions) => {
  const { getOption, setOption } = useContext(InspectorOptionsContext);

  return [
    getOption(key),
    (value: InspectorOptions[typeof key]) => setOption(key, value),
  ] as const;
};

export {
  InspectorOptionsContext,
  InspectorOptionsProvider,
  useInspectorOption,
};
