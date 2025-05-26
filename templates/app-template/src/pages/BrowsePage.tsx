import { FocusGroup, useFocus } from '@plextv/react-lightning';
import { useMemo } from 'react';

const WIDTH = 200;
const HEIGHT = 300;

type ImageProps = {
  x?: number;
  y?: number;
  autoFocus?: boolean;
};

const Image = ({ x, y, autoFocus }: ImageProps) => {
  const src = useMemo(
    () => `https://picsum.photos/${WIDTH}/${HEIGHT}?random=${Math.random()}`,
    [],
  );
  const { focused, ref } = useFocus({ autoFocus });

  return (
    <lng-image
      ref={ref}
      src={src}
      style={{
        x,
        y,
        border: focused
          ? { width: 2, color: 0xffffffff }
          : { width: 0, color: 0 },
        scale: focused ? 1.1 : 1,
      }}
      transition={{
        scale: { duration: 200 },
      }}
    />
  );
};

export const BrowsePage = () => {
  return (
    <FocusGroup style={{ x: 110, y: 400 }}>
      <Image x={0} />
      <Image x={250} />
      <Image x={500} />
      <Image x={750} />
      <Image x={1000} />
      <Image x={1250} />
      <Image x={1500} />
    </FocusGroup>
  );
};
