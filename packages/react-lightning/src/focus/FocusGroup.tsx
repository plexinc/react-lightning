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

export interface FocusGroupProps
  extends Omit<LightningViewElementProps, 'style'> {
  autoFocus?: boolean;
  disable?: boolean;
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
    const focusKeyManager = useFocusKeyManager();
    const { ref: focusRef, focused } = useFocus({
      autoFocus,
      active: !disable,
      trapFocusUp,
      trapFocusRight,
      trapFocusDown,
      trapFocusLeft,
    });
    const [viewElement, setViewElement] = useState<LightningElement | null>(
      null,
    );
    const viewRef = useRef<LightningElement>(null);
    const combinedRef = useCombinedRef(ref, focusRef, viewRef);

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
