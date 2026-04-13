import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { useState } from 'react';
import type { PressableProps as RNPressableProps } from 'react-native';

import type { KeyEvent } from '@plextv/react-lightning';
import { focusable, Keys, type LightningViewElement } from '@plextv/react-lightning';

import { useBlurHandler, useFocusHandler } from '../hooks/useFocusHandler';
import { useLayoutHandler } from '../hooks/useLayoutHandler';
import { createGestureResponderEvent } from '../utils/createGestureResponderEvent';
import { View, type ViewProps } from './View';

export type PressableProps = RNPressableProps & RefAttributes<LightningViewElement>;

function useEnterKeyHandler(handler: (e: KeyEvent) => void): (e: KeyEvent) => boolean {
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
    const [state, setState] = useState({ pressed: false });

    const handleFocus = useFocusHandler(onFocus);
    const handleBlur = useBlurHandler(onBlur);
    const handleLayout = useLayoutHandler(onLayout);

    const handleKeyDown = useEnterKeyHandler((e) => {
      onPressIn?.(createGestureResponderEvent(e, ref));
      setState({ pressed: true });
    });

    const handleKeyUp = useEnterKeyHandler((e) => {
      onPressOut?.(createGestureResponderEvent(e, ref));
      setState({ pressed: false });
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
  ({ active, autoFocus }) => ({
    active,
    autoFocus,
  }),
);
