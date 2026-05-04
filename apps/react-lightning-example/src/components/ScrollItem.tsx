import { type ReactNode, useRef } from 'react';

import { focusable } from '@plextv/react-lightning';

export type ScrollItemProps = {
  children: ReactNode;
  index: number;
  width?: number;
  height?: number;
  focused?: boolean;
  horizontal?: boolean;
  color: number;
  altColor: number;
};

export const ScrollItem = focusable<ScrollItemProps>(
  ({ color, altColor, index, focused, horizontal, width = 200, height = 75, children }, ref) => {
    const isImage = useRef(Math.random() < 0.5).current;
    const multiplier = index % 3 === 0 ? (horizontal ? 1.25 : 1.5) : 1;
    const finalColor = index % 3 === 0 ? altColor : color;
    const finalWidth = Math.round(horizontal ? width * multiplier : width);
    const finalHeight = Math.round(horizontal ? height : height * multiplier);
    const imageUrl = isImage
      ? `https://picsum.photos/${horizontal ? finalWidth : finalWidth + 50}/${horizontal ? finalHeight + 25 : finalHeight}?seed=${index}`
      : null;

    return (
      <lng-view
        ref={ref}
        style={{
          w: finalWidth,
          h: finalHeight,
          border: {
            w: focused ? 0 : 1,
            color: finalColor,
          },
          color: focused ? finalColor : 0x00000000,
        }}
      >
        {imageUrl ? (
          <lng-image
            src={imageUrl}
            style={{
              w: finalWidth - 2,
              h: finalHeight - 2,
              alpha: focused ? 1 : 0.2,
              x: 1,
              y: 1,
            }}
            transition={{
              alpha: {
                duration: 500,
                easing: 'ease-in-out',
              },
            }}
          />
        ) : (
          <lng-text
            style={{
              fontSize: 12,
              color: focused ? 0x000000ff : finalColor,
              rotation: horizontal ? Math.PI / 2 : 0,
              mount: 0.5,
              x: (finalWidth - 2) / 2,
              y: (finalHeight - 2) / 2,
            }}
          >
            {children}
          </lng-text>
        )}
      </lng-view>
    );
  },
);

ScrollItem.displayName = 'ScrollItem';
