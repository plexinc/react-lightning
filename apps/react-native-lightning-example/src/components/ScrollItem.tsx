import { focusable } from '@plextv/react-lightning';
import { Image, View } from '@plextv/react-native-lightning';
import { type ReactNode, useEffect, useMemo } from 'react';
import { type ColorValue, Text } from 'react-native';

export type ScrollItemProps = {
  children: ReactNode;
  index: number;
  horizontal?: boolean;
  color: ColorValue;
  altColor: ColorValue;
  image?: boolean;
  onFocused: (index: number) => void;
};

const ScrollItem = focusable<ScrollItemProps, View>(
  (
    { color, altColor, image, index, horizontal, focused, children, onFocused },
    ref,
  ) => {
    useEffect(() => {
      if (focused) {
        onFocused(index);
      }
    }, [index, focused, onFocused]);

    const multiplier = useMemo(() => (index % 3 === 0 ? 1.25 : 1), [index]);
    const finalColor = useMemo(
      () => (index % 3 === 0 ? altColor : color),
      [index, color, altColor],
    );
    const width = Math.round(horizontal ? 75 * multiplier : 200);
    const height = Math.round(horizontal ? 200 : 75 * multiplier);
    const imageSrc = useMemo(
      () => `https://picsum.photos/${width}/${height}?seed=${Math.random()}`,
      [width, height],
    );

    return (
      <View
        ref={ref}
        style={{
          width,
          height,
          borderWidth: focused ? 0 : 1,
          borderStyle: 'solid',
          borderColor: finalColor,
          backgroundColor: focused ? finalColor : 'transparent',
          display: 'flex' as const,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          borderRadius: 4,
        }}
      >
        {image ? (
          <Image
            src={imageSrc}
            style={{
              opacity: focused ? 1 : 0.25,
              width: width - 2,
              height: height - 2,
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
              color: focused ? 'black' : color,
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
