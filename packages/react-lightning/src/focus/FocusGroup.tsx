import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCombinedRef } from '../hooks/useCombinedRef';
import type {
  KeyEvent,
  LightningElement,
  LightningViewElementProps,
} from '../types';
import { FocusGroupContext } from './FocusGroupContext';
import { useFocus } from './useFocus';
import { useFocusKeyManager } from './useFocusKeyManager';
import { useFocusManager } from './useFocusManager';

export interface FocusGroupProps
  extends Omit<LightningViewElementProps, 'style'> {
  autoFocus?: boolean;
  disable?: boolean;
  focusRedirect?: boolean;
  destinations?: (LightningElement | null)[];
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  style?:
    | LightningViewElementProps['style']
    | ((focused: boolean) => LightningViewElementProps['style']);
  onChildFocused?: (child: LightningElement) => void;
}

export const FocusGroup = forwardRef<LightningElement, FocusGroupProps>(
  (
    {
      autoFocus = false,
      disable,
      focusRedirect,
      destinations,
      trapFocusUp,
      trapFocusRight,
      trapFocusDown,
      trapFocusLeft,
      style,
      onKeyDown,
      onChildFocused,
      ...otherProps
    },
    ref,
  ) => {
    const focusManager = useFocusManager();
    const focusKeyManager = useFocusKeyManager();
    const { ref: focusRef, focused } = useFocus({
      autoFocus,
      active: !disable,
      focusRedirect,
      destinations,
    });
    const [viewElement, setViewElement] = useState<LightningElement | null>(
      null,
    );
    const viewRef = useRef<LightningElement>(null);
    const combinedRef = useCombinedRef(ref, focusRef, viewRef);

    const traps = useMemo(
      () => ({
        up: trapFocusUp ?? false,
        right: trapFocusRight ?? false,
        down: trapFocusDown ?? false,
        left: trapFocusLeft ?? false,
      }),
      [trapFocusUp, trapFocusRight, trapFocusDown, trapFocusLeft],
    );

    const handleFocusKeyDown = useCallback(
      (event: KeyEvent) => {
        if (!viewRef.current) {
          return onKeyDown?.(event);
        }

        const result = focusKeyManager.handleKeyDown(
          viewRef.current,
          event.remoteKey,
        );

        return result === false ? false : onKeyDown?.(event);
      },
      [focusKeyManager, onKeyDown],
    );

    const finalStyle = useMemo(
      () => (typeof style === 'function' ? style(focused) : style),
      [style, focused],
    );

    useEffect(() => {
      if (viewElement) {
        focusManager.setTraps(viewElement, traps);
      }
    }, [focusManager, viewElement, traps]);

    useEffect(() => {
      if (viewRef.current) {
        setViewElement(viewRef.current);
      }

      return () => {
        if (viewRef.current) {
          setViewElement(null);
        }
      };
    }, []);

    return (
      <FocusGroupContext.Provider value={viewElement}>
        <lng-view
          {...otherProps}
          ref={combinedRef}
          style={finalStyle}
          onKeyDown={handleFocusKeyDown}
        />
      </FocusGroupContext.Provider>
    );
  },
);

FocusGroup.displayName = 'FocusGroup';
