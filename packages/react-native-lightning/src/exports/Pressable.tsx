import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { useState } from 'react';
import type { PressableProps as RNPressableProps } from 'react-native';
import type { KeyEvent } from '@plextv/react-lightning';
import {
  Keys,
  type LightningViewElement,
  focusable,
} from '@plextv/react-lightning';
import { useBlurHandler, useFocusHandler } from '../hooks/useFocusHandler';
import { useLayoutHandler } from '../hooks/useLayoutHandler';
import { createGestureResponderEvent } from '../utils/createGestureResponderEvent';
import { View, type ViewProps } from './View';

export type PressableProps = RefAttributes<LightningViewElement> & RNPressableProps;

function useEnterKeyHandler(
  handler: (e: KeyEvent) => void,
): (e: KeyEvent) => boolean {
  return (e) => {
    if (e.remoteKey === Keys.Enter) {
      handler(e);

      return false;
    }

    return true;
  };
}

export const Pressable: ForwardRefExoticComponent<PressableProps> = focusable<
  PressableProps,
  LightningViewElement
>(
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
    const [state, setState] = useState({ focused: false, pressed: false });

    const forwardFocus = useFocusHandler(onFocus);
    const forwardBlur = useBlurHandler(onBlur);
    const handleLayout = useLayoutHandler(onLayout);

    // RN's Pressable exposes `focused` to its function children; mirror that by
    // tracking it locally so focus-driven visuals (rings, scale) react. Wire the
    // handlers unconditionally — consumer callbacks are optional and forwarded.
    const handleFocus = (
      element: Parameters<NonNullable<typeof forwardFocus>>[0],
    ) => {
      setState((s) => ({ ...s, focused: true }));
      forwardFocus?.(element);
    };

    const handleBlur = (
      element: Parameters<NonNullable<typeof forwardBlur>>[0],
    ) => {
      setState((s) => ({ ...s, focused: false }));
      forwardBlur?.(element);
    };

    const handleKeyDown = useEnterKeyHandler((e) => {
      onPressIn?.(createGestureResponderEvent(e, ref));
      setState((s) => ({ ...s, pressed: true }));
    });

    const handleKeyUp = useEnterKeyHandler((e) => {
      onPressOut?.(createGestureResponderEvent(e, ref));
      setState((s) => ({ ...s, pressed: false }));
    });

    const handleKeyPress = useEnterKeyHandler((e) => {
      onPress?.(createGestureResponderEvent(e, ref));
    });

    const handleLongPress = useEnterKeyHandler((e) => {
      onLongPress?.(createGestureResponderEvent(e, ref));
    });

    const finalStyle = typeof style === 'function' ? style(state) : style;

    return (
      <View
        ref={ref}
        style={finalStyle as ViewProps['style']}
        {...props}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onKeyPress={handleKeyPress}
        onKeyUp={handleKeyUp}
        onLayout={handleLayout}
        onLongPress={handleLongPress}
      >
        {typeof children === 'function' ? children(state) : children}
      </View>
    );
  },
  'Pressable(lng)',
  ({ active, autoFocus }) => ({
    active,
    autoFocus,
  }),
);
