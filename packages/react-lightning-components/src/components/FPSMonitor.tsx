import {
  LightningRootContext,
  type LightningTextElementStyle,
} from '@plex/react-lightning';
import { useCallback, useContext, useEffect, useState } from 'react';

interface Props {
  style?: LightningTextElementStyle;
}

const HIGH_COLOR = 0x00ff00ff;
const MEDIUM_COLOR = 0xffff00ff;
const MEDIUM_CUTOFF = 30;
const LOW_COLOR = 0xff0000ff;
const LOW_CUTOFF = 15;

const FPSMonitor = ({ style }: Props) => {
  const lngContext = useContext(LightningRootContext);
  const [fps, setFps] = useState(0);
  const [color, setColor] = useState(0);

  const updateFps = useCallback(
    (_: unknown, { fps: value }: { fps: number }) => {
      setFps(value);

      if (value > MEDIUM_CUTOFF) {
        setColor(HIGH_COLOR);
      } else if (value > LOW_CUTOFF) {
        setColor(MEDIUM_COLOR);
      } else {
        setColor(LOW_COLOR);
      }
    },
    [],
  );

  useEffect(() => {
    lngContext?.renderer.on('fpsUpdate', updateFps);

    return () => lngContext?.renderer.off('fpsUpdate', updateFps);
  }, [lngContext, updateFps]);

  return (
    <lng-text
      style={{
        color,
        display: 'flex',
        fontFamily: 'Ubuntu',
        fontSize: 20,
        mountX: 1,
        position: 'absolute',
        x: 1900,
        y: 20,
        zIndex: 9999,
        ...style,
      }}
    >
      FPS: {fps}
    </lng-text>
  );
};

export { FPSMonitor };
