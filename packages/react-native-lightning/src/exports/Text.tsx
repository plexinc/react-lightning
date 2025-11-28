import type {
  LightningTextElement,
  LightningTextElementStyle,
} from '@plextv/react-lightning';
import { type ForwardRefExoticComponent, forwardRef, useMemo } from 'react';
import type { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useLayoutHandler } from '../hooks/useLayoutHandler';
import { useTextLayoutHandler } from '../hooks/useTextLayoutHandler';

export type TextProps = RNTextProps;

const defaultTextStyle: Partial<LightningTextElementStyle> = {
  fontWeight: 'normal',
};

export type Text = RNText & LightningTextElement;

export const Text: ForwardRefExoticComponent<RNTextProps> = forwardRef<
  LightningTextElement,
  RNTextProps
>(
  (
    {
      onLayout,
      onTextLayout,
      // Press events ignored on purpose in lightning
      onLongPress,
      onPress,
      onPressIn,
      onPressOut,
      children,
      ellipsizeMode,
      numberOfLines,
      style,
      ...otherProps
    },
    ref,
  ) => {
    const handleTextLayout = useTextLayoutHandler(onTextLayout);
    const handleLayout = useLayoutHandler(onLayout);

    const overflowStyle = useMemo(() => {
      const overflow: LightningTextElementStyle = {
        maxLines: numberOfLines,
      };

      if (ellipsizeMode === 'clip') {
        overflow.textOverflow = 'clip';
      } else if (ellipsizeMode === 'tail') {
        overflow.textOverflow = 'ellipsis';
      }

      return overflow;
    }, [ellipsizeMode, numberOfLines]);

    return (
      <lng-text
        ref={ref}
        {...otherProps}
        style={[
          defaultTextStyle,
          overflowStyle,
          style as LightningTextElementStyle,
        ]}
        onLayout={handleLayout}
        onTextureReady={handleTextLayout}
      >
        {children}
      </lng-text>
    );
  },
);

Text.displayName = 'Text';
