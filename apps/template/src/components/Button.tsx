import {
  type KeyEvent,
  type LightningElementStyle,
  useFocus,
} from '@plex/react-lightning';
import { useCallback, useMemo } from 'react';
import { Text } from './Text';

type Variants = 'accent' | 'default';
type VariantTheme = {
  active: number;
  inactive: number;
  activeText: number;
  inactiveText: number;
};

const themes: Record<Variants, VariantTheme> = {
  accent: {
    active: 0xe5a00dff,
    inactive: 0xffffff99,
    activeText: 0x1c1c1cff,
    inactiveText: 0xffffff99,
  },
  default: {
    active: 0x225544ff,
    inactive: 0x22554499,
    activeText: 0x225544ff,
    inactiveText: 0x22554499,
  },
};

type Props = {
  label: string;
  variant?: Variants;
  style?: LightningElementStyle;
  autoFocus?: boolean;
  onPress: () => void;
};

export const Button = ({
  label,
  variant = 'default',
  style,
  autoFocus,
  onPress,
}: Props) => {
  const { focused, ref } = useFocus({ autoFocus });
  const { active, inactive, activeText, inactiveText } = useMemo(
    () => themes[variant],
    [variant],
  );

  const handleOnKeyUp = useCallback(
    (event: KeyEvent) => {
      if (event.key === 'Enter') {
        onPress();

        return true;
      }

      return false;
    },
    [onPress],
  );

  return (
    <lng-view
      ref={ref}
      style={{
        ...style,
        color: focused ? active : 0,
        borderRadius: 16,
        border: focused
          ? { width: 0, color: active }
          : { width: 2, color: inactive },
      }}
      onKeyUp={handleOnKeyUp}
    >
      <Text
        style={{
          x: (style?.width ?? 0) / 2,
          y: (style?.height ?? 0) / 2,
          mount: 0.5,
          color: focused ? activeText : inactiveText,
        }}
      >
        {label}
      </Text>
    </lng-view>
  );
};
