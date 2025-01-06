import type { ReactNode, RefObject } from 'react';
import { createContext, useCallback, useRef } from 'react';
import type { LightningElement } from '../types';

type Props = {
  rootRef: RefObject<LightningElement>;
  children: ReactNode;
};

function pathDiff(
  oldPath: LightningElement[],
  newPath: LightningElement[],
): false | { added: LightningElement[]; removed: LightningElement[] } {
  const length = Math.max(oldPath.length, newPath.length);
  const added: LightningElement[] = [];
  const removed: LightningElement[] = [];

  for (let i = 0; i < length; i++) {
    const oldEl = oldPath[i];
    const newEl = newPath[i];

    if (oldEl !== newEl) {
      if (newEl) {
        added.push(newEl);
      }
      if (oldEl) {
        removed.push(oldEl);
      }
    }
  }

  return added.length === 0 && removed.length === 0
    ? false
    : { added, removed };
}

export const FocusPathContext = createContext<{
  getFocusPath: () => LightningElement[];
  subscribe: (callback: () => void) => () => void;
  focusPair: (parent: LightningElement, child: LightningElement) => void;
}>({ getFocusPath: () => [], subscribe: () => () => {}, focusPair: () => {} });

function useFocusPathData() {
  const focusPath = useRef<LightningElement[]>([]);
  const subscribers = useRef<Set<() => void>>(new Set());

  const get = useCallback(() => focusPath.current, []);
  const set = useCallback(
    (newPath: LightningElement[]) => {
      const diff = pathDiff(get(), newPath);

      if (newPath.length === 0 || diff === false) {
        return;
      }

      focusPath.current = newPath;

      if (diff.removed.length) {
        for (const removedFocus of diff.removed) {
          removedFocus.blur();
        }
      }

      if (diff.added.length) {
        for (const addedFocus of diff.added) {
          addedFocus.focus();
        }
      }

      for (const callback of subscribers.current) {
        callback();
      }
    },
    [get],
  );
  const subscribe = useCallback((callback: () => void) => {
    subscribers.current.add(callback);

    return () => {
      subscribers.current.delete(callback);
    };
  }, []);

  return { get, set, subscribe };
}

export const FocusPathProvider = ({ rootRef, children }: Props) => {
  const { get, set, subscribe } = useFocusPathData();
  const focusedPairs = useRef<Record<number, number>>({});
  const elementMap = useRef<Record<number, LightningElement>>({});

  const focusPair = useCallback(
    (parent: LightningElement, child: LightningElement) => {
      if (focusedPairs.current[parent.id] === child.id) {
        return;
      }

      focusedPairs.current[parent.id] = child.id;

      elementMap.current[parent.id] = parent;
      elementMap.current[child.id] = child;

      // Try to see if we can calculate a focus path
      let currentElement: LightningElement | undefined | null = rootRef.current;
      const newPath: LightningElement[] = [];

      while (currentElement) {
        newPath.push(currentElement);

        const nextId: number | undefined =
          focusedPairs.current[currentElement.id];

        currentElement = nextId ? elementMap.current[nextId] : null;
      }

      set(newPath);
    },
    [set, rootRef],
  );

  return (
    <FocusPathContext.Provider
      value={{ getFocusPath: get, subscribe, focusPair }}
    >
      {children}
    </FocusPathContext.Provider>
  );
};
