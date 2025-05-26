import { focusable } from '@plextv/react-lightning';
import { Image, View } from '@plextv/react-native-lightning';
import { type ReactNode, useEffect, useMemo } from 'react';
import { type ColorValue, Text } from 'react-native';

export type ScrollItemProps = {
  children: ReactNode;
  index: number;
  width?: number;
  height?: number;
  horizontal?: boolean;
  color: ColorValue;
  altColor: ColorValue;
  image?: boolean;
  onFocused: (index: number) => void;
};

const ScrollItem = focusable<ScrollItemProps, View>(
  (
    {
      color,
      altColor,
      image,
      index,
      horizontal,
      width = 200,
      height = 75,
      focused,
      children,
      onFocused,
    },
    ref,
  ) => {
    useEffect(() => {
      if (focused) {
        onFocused(index);
      }
    }, [index, focused, onFocused]);

    const multiplier = index % 3 === 0 ? 1.25 : 1;
    const finalColor = index % 3 === 0 ? altColor : color;
    const finalWidth = Math.round(horizontal ? height * multiplier : width);
    const finalHeight = Math.round(horizontal ? width : height * multiplier);
    const imageSrc = useMemo(
      () =>
        `https://picsum.photos/${finalWidth}/${finalHeight}?seed=${Math.random()}`,
      [finalWidth, finalHeight],
    );

    return (
      <View
        ref={ref}
        style={{
          width: finalWidth,
          height: finalHeight,
          borderWidth: focused ? 0 : 1,
          borderStyle: 'solid',
          borderColor: finalColor,
          borderRadius: 4,
          backgroundColor: focused ? finalColor : 'transparent',
          display: 'flex' as const,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        }}
      >
        {image ? (
          <Image
            src={imageSrc}
            style={{
              opacity: focused ? 1 : 0.25,
              width: finalWidth - 2,
              height: finalHeight - 2,
            }}
            transition={{
              alpha: {
                duration: 250,
                easing: 'ease-in-out',
              },
            }}
          />
        ) : (
          <Text
            style={{
              fontSize: 12,
              color: focused ? 'black' : finalColor,
              transform: `rotate(${horizontal ? '-90deg' : '0deg'})`,
            }}
          >
            {children}
          </Text>
        )}
      </View>
    );
  },
);

export default ScrollItem;
