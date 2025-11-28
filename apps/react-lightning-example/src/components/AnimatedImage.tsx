import type { LightningImageElement } from '@plextv/react-lightning';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';

function randomInt(max: number): number {
  return Math.round(Math.random() * max);
}

const AnimatedImage: FC = () => {
  const duration = useMemo(() => randomInt(2000) + 500, []);
  const ref = useRef<LightningImageElement>(null);
  const [x, setX] = useState(randomInt(1670));
  const [y, setY] = useState(randomInt(1080));
  const seed = useMemo(() => randomInt(1000), []);

  useEffect(() => {
    const timeout = setInterval(() => {
      setX(randomInt(1670 - (ref.current?.style.w ?? 0)));
      setY(randomInt(1080 - (ref.current?.style.h ?? 0)));
    }, duration);

    return () => clearInterval(timeout);
  }, [duration]);

  return (
    <lng-view
      style={{
        position: 'absolute',
        w: 300,
        h: 300,
        x,
        y,
      }}
      transition={{
        x: { duration },
        y: { duration },
      }}
    >
      <lng-image
        ref={ref}
        src={`https://picsum.photos/200/300?seed=${seed}`}
        style={{ w: 200, h: 300, borderRadius: 8 }}
      />

      <lng-text style={{ y: 300 }}>Hello Darkness My Old Frnd</lng-text>
    </lng-view>
  );
};

export default AnimatedImage;
