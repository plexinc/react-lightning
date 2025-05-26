import { useFocus } from '@plextv/react-lightning';
import type { LightningViewElement } from '@plextv/react-lightning';
import type { RefAttributes } from 'react';
import type { ButtonProps as RNButtonProps, ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type ButtonProps = RNButtonProps & RefAttributes<LightningViewElement>;

export const Button = ({ title, color, ...props }: ButtonProps) => {
  // TODO: height should come from text size
  // TODO: Move to a stylesheet object (not doing this yet because vite caches things outside of the component function)
  const style: ViewStyle = {
    height: 40,
    display: 'flex' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderRadius: 4,
  };

  const { ref, focused } = useFocus<LightningViewElement>();

  if (color && focused) {
    style.backgroundColor = color;
  } else {
    style.backgroundColor = 'transparent';
  }

  return (
    <Pressable
      ref={ref}
      {...props}
      style={({ pressed }) => [
        style,
        { borderWidth: focused ? 4 : 0 },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={{ fontWeight: focused ? 'bold' : 'normal' }}>{title}</Text>
    </Pressable>
  );
};

Button.displayName = 'Button';
