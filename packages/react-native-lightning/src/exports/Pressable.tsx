import type { KeyEvent, LightningElement, Rect } from '@plextv/react-lightning';
import { Keys, focusable } from '@plextv/react-lightning';
import type { LightningViewElement } from '@plextv/react-lightning';
import type { DependencyList, RefAttributes } from 'react';
import { useCallback, useState } from 'react';
import type {
  LayoutChangeEvent,
  PressableProps as RNPressableProps,
} from 'react-native';
import { createGestureResponderEvent } from '../utils/createGestureResponderEvent';
import { createLayoutEvent } from '../utils/createLayoutEvent';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';
import { View, type ViewProps } from './View';

export type PressableProps = RNPressableProps &
  RefAttributes<LightningViewElement>;

function useEnterKeyHandler(
  handler: (e: KeyEvent) => void,
  dependencies: DependencyList,
): (e: KeyEvent) => boolean {
  return useCallback(
    (e) => {
      if (e.remoteKey === Keys.Enter) {
        handler(e);
        return false;
      }

      return true;
    },
    [...dependencies, handler],
  );
}

export const Pressable = focusable<PressableProps, LightningViewElement>(
  function Pressable(
    {
      style,
      children,
      onPress,
      onPressIn,
      onPressOut,
      onBlur,
      onFocus,
      onLongPress,
      onLayout,
      focused: _focused,
      ...props
    },
    ref,
  ) {
    const [state, setState] = useState({ pressed: false });

    const handleFocus = useCallback(
      (target: LightningElement) => {
        onFocus?.(createNativeSyntheticEvent({ target: target.id }, target));
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (target: LightningElement) => {
        onBlur?.(createNativeSyntheticEvent({ target: target.id }, target));
      },
      [onBlur],
    );

    const handleLayout = useCallback(
      (event: LayoutChangeEvent | Rect) => {
        if ('nativeEvent' in event) {
          onLayout?.(event);
        } else {
          onLayout?.(createLayoutEvent(event));
        }
      },
      [onLayout],
    );

    const handleKeyDown = useEnterKeyHandler(
      (e) => {
        onPressIn?.(createGestureResponderEvent(e, ref));
        setState({ pressed: true });
      },
      [onPressIn, setState],
    );

    const handleKeyUp = useEnterKeyHandler(
      (e) => {
        onPressOut?.(createGestureResponderEvent(e, ref));
        setState({ pressed: false });
      },
      [onPressOut, setState],
    );

    const handleKeyPress = useEnterKeyHandler(
      (e) => {
        onPress?.(createGestureResponderEvent(e, ref));
      },
      [onPress],
    );

    const handleLongPress = useEnterKeyHandler(
      (e) => {
        onLongPress?.(createGestureResponderEvent(e, ref));
      },
      [onLongPress],
    );

    const finalStyle = typeof style === 'function' ? style(state) : style;

    return (
      <View
        ref={ref}
        style={finalStyle as ViewProps['style']}
        {...props}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onKeyPress={handleKeyPress}
        onLongPress={handleLongPress}
        onLayout={handleLayout}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {typeof children === 'function' ? children(state) : children}
      </View>
    );
  },
  'Pressable(lng)',
  ({
    active,
    autoFocus,
    trapFocusDown,
    trapFocusUp,
    trapFocusLeft,
    trapFocusRight,
  }) => ({
    active,
    autoFocus,
    trapFocusDown,
    trapFocusUp,
    trapFocusLeft,
    trapFocusRight,
  }),
);
