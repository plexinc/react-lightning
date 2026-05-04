import { type ForwardRefExoticComponent, forwardRef } from 'react';
import type { Text as RNText, TextProps as RNTextProps } from 'react-native';

import type { LightningTextElement, LightningTextElementStyle } from '@plextv/react-lightning';

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
      onLongPress: _onLongPress,
      onPress: _onPress,
      onPressIn: _onPressIn,
      onPressOut: _onPressOut,
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

    const overflowStyle: LightningTextElementStyle = {
      maxLines: numberOfLines,
    };

    if (ellipsizeMode === 'clip') {
      overflowStyle.textOverflow = 'clip';
    } else if (ellipsizeMode === 'tail') {
      overflowStyle.textOverflow = 'ellipsis';
    }

    return (
      <lng-text
        ref={ref}
        {...otherProps}
        style={[defaultTextStyle, overflowStyle, style as LightningTextElementStyle]}
        onLayout={handleLayout}
        onTextureReady={handleTextLayout}
      >
        {children}
      </lng-text>
    );
  },
);

Text.displayName = 'Text';
