import {
  LightningRootContext,
  type LightningTextElementStyle,
} from '@plextv/react-lightning';
import { useCallback, useContext, useEffect, useState } from 'react';

export interface FPSMonitorProps {
  prefix?: string;
  style?: LightningTextElementStyle;
  highColor?: number;
  mediumColor?: number;
  lowColor?: number;
  mediumCutoff?: number;
  lowCutoff?: number;
}

const FPSMonitor = ({
  style,
  prefix = 'FPS:',
  highColor = 0x00ff00ff,
  mediumColor = 0xffff00ff,
  mediumCutoff = 30,
  lowColor = 0xff0000ff,
  lowCutoff = 15,
}: FPSMonitorProps) => {
  const lngContext = useContext(LightningRootContext);
  const [fps, setFps] = useState(0);
  const [color, setColor] = useState(0);

  const updateFps = useCallback(
    (_: unknown, { fps: value }: { fps: number }) => {
      setFps(value);

      if (value > mediumCutoff) {
        setColor(highColor);
      } else if (value > lowCutoff) {
        setColor(mediumColor);
      } else {
        setColor(lowColor);
      }
    },
    [highColor, mediumColor, mediumCutoff, lowColor, lowCutoff],
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
        fontSize: 20,
        position: 'absolute',
        zIndex: 9999,
        ...style,
      }}
    >
      {prefix} {fps}
    </lng-text>
  );
};

FPSMonitor.displayName = 'FPSMonitor';

export default FPSMonitor;
