import { type ForwardRefExoticComponent, forwardRef, useEffect, useRef, useState } from 'react';

import { useCombinedRef } from '../hooks/useCombinedRef';
import type { KeyEvent, LightningElement, LightningViewElementProps } from '../types';
import { FocusGroupContext } from './FocusGroupContext';
import type { FocusEntry, FocusExits } from './FocusManager';
import { useFocus } from './useFocus';
import { useFocusKeyManager } from './useFocusKeyManager';

export interface FocusGroupProps extends Omit<LightningViewElementProps, 'style'> {
  autoFocus?: boolean;
  disable?: boolean;
  focusRedirect?: boolean;
  destinations?: (LightningElement | null)[];
  focusKey?: string;
  destinationKeys?: readonly string[];
  exits?: FocusExits;
  focusEntry?: FocusEntry;
  rememberAs?: string;
  scope?: boolean;
  active?: boolean;
  initialFocus?: number;
  onFocusEnter?: () => void;
  onFocusLeave?: () => void;
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  /** When true, focus navigation can target non-visible children (e.g. clipped items in a virtualized list). Defaults to false. */
  allowOffscreen?: boolean;
  style?:
    | LightningViewElementProps['style']
    | ((focused: boolean) => LightningViewElementProps['style']);
  onChildFocused?: (child: LightningElement) => void;
}

const markFocusGroup = (element: LightningElement | null) => {
  if (element) {
    element.isFocusGroup = true;
  }
};

export const FocusGroup: ForwardRefExoticComponent<FocusGroupProps> = forwardRef<
  LightningElement,
  FocusGroupProps
>(
  (
    {
      autoFocus = false,
      disable,
      focusRedirect,
      destinations,
      focusKey,
      destinationKeys,
      exits,
      focusEntry,
      rememberAs,
      scope,
      active,
      initialFocus,
      onFocusEnter,
      onFocusLeave,
      trapFocusUp,
      trapFocusRight,
      trapFocusDown,
      trapFocusLeft,
      allowOffscreen,
      style,
      onKeyDown,
      onChildFocused,
      ...otherProps
    },
    ref,
  ) => {
    const focusKeyManager = useFocusKeyManager();
    const traps = {
      up: trapFocusUp ?? false,
      right: trapFocusRight ?? false,
      down: trapFocusDown ?? false,
      left: trapFocusLeft ?? false,
    };

    const { ref: focusRef, focused } = useFocus({
      autoFocus,
      active: !disable,
      focusRedirect,
      destinations,
      onChildFocused,
      allowOffscreen,
      focusKey,
      destinationKeys,
      exits,
      traps,
      focusEntry,
      rememberAs,
      scope,
      scopeActive: active,
      initialFocus,
      onFocusEnter,
      onFocusLeave,
    });
    const [viewElement, setViewElement] = useState<LightningElement | null>(null);
    const viewRef = useRef<LightningElement>(null);
    const combinedRef = useCombinedRef(ref, focusRef, viewRef, markFocusGroup);

    const handleFocusKeyDown = (event: KeyEvent) => {
      if (!viewRef.current) {
        return onKeyDown?.(event);
      }

      const result = focusKeyManager.handleKeyDown(viewRef.current, event);

      return result === false ? false : onKeyDown?.(event);
    };

    const finalStyle = typeof style === 'function' ? style(focused) : style;

    useEffect(() => {
      if (viewRef.current) {
        viewRef.current.isFocusGroup = true;
        setViewElement(viewRef.current);
      }

      return () => {
        if (viewRef.current) {
          viewRef.current.isFocusGroup = false;
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
