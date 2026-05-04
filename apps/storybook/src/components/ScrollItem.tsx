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

const ScrollItem = focusable<ScrollItemProps>(
  ({ color, altColor, index, focused, horizontal, width = 200, height = 75, children }, ref) => {
    const isImage = useRef(Math.random() > 0.5).current;
    const finalColor = index % 3 === 0 ? altColor : color;
    const finalWidth = Math.round(horizontal ? width : width);
    const finalHeight = Math.round(horizontal ? height : height);
    const imageUrl = isImage
      ? `https://picsum.photos/${finalWidth}/${finalHeight}?seed=${index}`
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
              alpha: focused ? 1 : 0.25,
              w: finalWidth - 2,
              h: finalHeight - 2,
              x: 1,
              y: 1,
            }}
            transition={{
              alpha: {
                duration: 250,
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

export default ScrollItem;
