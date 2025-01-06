import { useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  serialize: (value: T) => string = JSON.stringify,
  deserialize: (value: string) => T = JSON.parse,
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const storedValue = window.localStorage.getItem(key);

    if (storedValue) {
      return deserialize(storedValue);
    }

    return initialValue;
  });

  const setLocalStorageState = (value: T) => {
    setState(value);
    window.localStorage.setItem(key, serialize(value));
  };

  return [state, setLocalStorageState];
}
