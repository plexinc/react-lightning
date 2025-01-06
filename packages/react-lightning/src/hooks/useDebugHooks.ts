import {
  type DependencyList,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

// biome-ignore lint/suspicious/noExplicitAny: any is used so we can pass any function
type DebuggableHook = (...args: any[]) => any;

function wrapHook<T extends DebuggableHook>(hook: T, name: string): T {
  return ((...args) => {
    const dependencies = args.at(-1) as DependencyList;
    const prevValue = useRef<DependencyList>([]);

    const changedDeps = dependencies.reduce<
      Record<number, { old: unknown; new: unknown }>
    >((acc, dependency, index) => {
      if (dependency !== prevValue.current[index]) {
        acc[index] = {
          old: prevValue.current[index],
          new: dependency,
        };
      }

      return acc;
    }, {});

    if (Object.keys(changedDeps).length) {
      console.log(`[${name}] `, changedDeps);
    }

    prevValue.current = dependencies;

    return hook(...args);
  }) as T;
}

export const useEffectDebug = wrapHook(useEffect, 'useEffectDebug');
export const useCallbackDebug = wrapHook(useCallback, 'useCallbackDebug');
export const useMemoDebug = wrapHook(useMemo, 'useMemoDebug');
