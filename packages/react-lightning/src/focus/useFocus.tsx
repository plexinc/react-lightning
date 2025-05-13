import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { LightningElement } from '../types';
import { FocusGroupContext } from './FocusGroupContext';
import { useFocusManager } from './useFocusManager';

export type FocusOptions = {
  active?: boolean;
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
};

export function useFocus<T extends LightningElement>(
  {
    active,
    autoFocus,
    trapFocusUp,
    trapFocusRight,
    trapFocusDown,
    trapFocusLeft,
  }: FocusOptions = {
    active: true,
    autoFocus: false,
    trapFocusUp: false,
    trapFocusRight: false,
    trapFocusDown: false,
    trapFocusLeft: false,
  },
) {
  const ref = useRef<T>(null);
  const focusManager = useFocusManager();
  const parentFocusable = useContext(FocusGroupContext);

  const focused = useSyncExternalStore(
    (onStoreChange) => {
      if (ref.current) {
        return ref.current?.on('focusChanged', onStoreChange);
      }

      return () => {};
    },
    () => ref.current?.focused ?? false,
  );

  // We need to keep a copy of the ref around for when this hook is unmounted,
  // so we can properly remove the child element.
  const elementRef = useRef<T>();
  const traps = useMemo(
    () => ({
      up: trapFocusUp ?? false,
      right: trapFocusRight ?? false,
      down: trapFocusDown ?? false,
      left: trapFocusLeft ?? false,
    }),
    [trapFocusUp, trapFocusRight, trapFocusDown, trapFocusLeft],
  );

  useEffect(() => {
    if (ref.current && parentFocusable) {
      elementRef.current = ref.current;
      focusManager.addElement(elementRef.current, parentFocusable, {
        autoFocus,
        traps,
      });
    }

    return () => {
      if (elementRef.current) {
        focusManager.removeElement(elementRef.current);
      }
    };
  }, [focusManager, parentFocusable, autoFocus, traps]);

  useEffect(() => {
    if (elementRef.current) {
      focusManager.setTraps(elementRef.current, traps);
    }
  }, [focusManager.setTraps, traps]);

  useEffect(() => {
    if (ref.current) {
      ref.current.focusable = active !== undefined ? active : true;
    }
  }, [active]);

  return { ref, focused };
}
