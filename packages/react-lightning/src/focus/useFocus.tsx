import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { LightningElement } from '../types';
import { FocusGroupContext } from './FocusGroupContext';

type Props = {
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
  }: Props = {
    active: true,
    autoFocus: false,
    trapFocusUp: false,
    trapFocusRight: false,
    trapFocusDown: false,
    trapFocusLeft: false,
  },
) {
  const ref = useRef<T>(null);
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
  const [runAutoFocus, setRunAutoFocus] = useState(false);
  const initialRender = useRef(true);
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
    if (ref.current) {
      elementRef.current = ref.current;
      parentFocusable.addChild(elementRef.current);
    } else {
      console.error(
        '[useFocusable] ref was not assigned to a Lightning element!',
      );
    }

    return () => {
      if (elementRef.current) {
        parentFocusable.removeChild(elementRef.current);
      }
    };
  }, [parentFocusable.addChild, parentFocusable.removeChild]);

  useEffect(() => {
    if (elementRef.current) {
      parentFocusable.updateTraps(elementRef.current, traps);
    }
  }, [parentFocusable.updateTraps, traps]);

  useEffect(() => {
    if (ref.current && active !== undefined) {
      ref.current.focusable = active;
    }
  }, [active]);

  useEffect(() => {
    if (runAutoFocus && ref.current) {
      parentFocusable.focusChild(ref.current);
    }
  }, [runAutoFocus, parentFocusable.focusChild]);

  if (ref.current?.focusable && initialRender.current) {
    initialRender.current = false;

    if (autoFocus) {
      setRunAutoFocus(true);
    }
  }

  return { ref, focused };
}
