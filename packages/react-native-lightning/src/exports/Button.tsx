import {
  type LightningViewElement,
  useCombinedRef,
  useFocus,
} from '@plextv/react-lightning';
import { forwardRef, type RefAttributes } from 'react';
import type {
  ButtonProps as RNButtonProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type ButtonProps = RNButtonProps &
  RefAttributes<LightningViewElement> & {
    style?:
      | StyleProp<ViewStyle>
      | ((props: { pressed: boolean }) => StyleProp<ViewStyle>);
  };

export const Button = forwardRef<LightningViewElement, ButtonProps>(
  ({ title, color, style, ...props }, forwardedRef) => {
    // TODO: height should come from text size
    // TODO: Move to a stylesheet object (not doing this yet because vite caches things outside of the component function)
    const baseStyles: ViewStyle = {
      height: 40,
      display: 'flex' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderRadius: 4,
    };

    const { ref, focused } = useFocus<LightningViewElement>();
    const combinedRef = useCombinedRef(forwardedRef, ref);

    if (color && focused) {
      baseStyles.backgroundColor = color;
    } else {
      baseStyles.backgroundColor = 'transparent';
    }

    return (
      <Pressable
        ref={combinedRef}
        {...props}
        style={({ pressed }) => [
          baseStyles,
          typeof style === 'function' ? style({ pressed }) : style,
          { borderWidth: focused ? 4 : 0 },
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={{ fontWeight: focused ? 'bold' : 'normal' }}>{title}</Text>
      </Pressable>
    );
  },
);

Button.displayName = 'Button';
