import { type ForwardRefExoticComponent, forwardRef, useEffect, useRef, useState } from 'react';

import { useCombinedRef } from '../hooks/useCombinedRef';
import type { KeyEvent, LightningElement, LightningViewElementProps } from '../types';
import { FocusGroupContext } from './FocusGroupContext';
import { useFocus } from './useFocus';
import { useFocusKeyManager } from './useFocusKeyManager';
import { useFocusManager } from './useFocusManager';

export interface FocusGroupProps extends Omit<LightningViewElementProps, 'style'> {
  autoFocus?: boolean;
  disable?: boolean;
  focusRedirect?: boolean;
  destinations?: (LightningElement | null)[];
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
    const focusManager = useFocusManager();
    const focusKeyManager = useFocusKeyManager();
    const { ref: focusRef, focused } = useFocus({
      autoFocus,
      active: !disable,
      focusRedirect,
      destinations,
      onChildFocused,
      allowOffscreen,
    });
    const [viewElement, setViewElement] = useState<LightningElement | null>(null);
    const viewRef = useRef<LightningElement>(null);
    const combinedRef = useCombinedRef(ref, focusRef, viewRef);

    const traps = {
      up: trapFocusUp ?? false,
      right: trapFocusRight ?? false,
      down: trapFocusDown ?? false,
      left: trapFocusLeft ?? false,
    };

    const handleFocusKeyDown = (event: KeyEvent) => {
      if (!viewRef.current) {
        return onKeyDown?.(event);
      }

      const result = focusKeyManager.handleKeyDown(viewRef.current, event);

      return result === false ? false : onKeyDown?.(event);
    };

    const finalStyle = typeof style === 'function' ? style(focused) : style;

    useEffect(() => {
      if (viewElement) {
        focusManager.setTraps(viewElement, traps);
      }
    }, [focusManager, viewElement, traps]);

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
