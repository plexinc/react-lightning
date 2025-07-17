import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import type { LightningElement } from '../types';
import { FocusGroupContext } from './FocusGroupContext';
import { useFocusManager } from './useFocusManager';

export type FocusOptions = {
  active?: boolean;
  autoFocus?: boolean;
  focusRedirect?: boolean;
  destinations?: (LightningElement | null)[];
};

export function useFocus<T extends LightningElement>(
  { active, autoFocus, focusRedirect, destinations }: FocusOptions = {
    active: true,
    autoFocus: false,
    focusRedirect: false,
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

  useEffect(() => {
    if (ref.current && parentFocusable) {
      elementRef.current = ref.current;
      focusManager.addElement(elementRef.current, parentFocusable, {
        autoFocus,
        focusRedirect,
        destinations,
      });
    }

    return () => {
      if (elementRef.current) {
        focusManager.removeElement(elementRef.current);
      }
    };
  }, [focusManager, parentFocusable, autoFocus, focusRedirect, destinations]);

  useEffect(() => {
    if (ref.current) {
      focusManager.setFocusRedirect(ref.current, focusRedirect);
    }
  }, [focusManager.setFocusRedirect, focusRedirect]);

  useEffect(() => {
    if (ref.current) {
      focusManager.setDestinations(ref.current, destinations);
    }
  }, [focusManager.setDestinations, destinations]);

  useEffect(() => {
    if (ref.current) {
      ref.current.focusable = active !== undefined ? active : true;
    }
  }, [active]);

  return { ref, focused };
}
