import { useCallback, useState } from 'react';
import { useExtensionMessaging } from '../communication/useExtensionMessaging';
import { useTheme } from '../hooks/useTheme';

const MEDIUM_CUTOFF = 30;
const LOW_CUTOFF = 15;

export const Fps = () => {
  const [fps, setFps] = useState(0);
  const [color, setColor] = useState('#000000');
  const theme = useTheme();

  useExtensionMessaging(
    'updateFps',
    useCallback(
      ({ data }) => {
        if (data > MEDIUM_CUTOFF) {
          setColor(theme.green);
        } else if (data > LOW_CUTOFF) {
          setColor(theme.yellow);
        } else {
          setColor(theme.red);
        }

        setFps(data);
      },
      [theme],
    ),
  );

  return (
    <span>
      FPS: <span style={{ color }}>{fps}</span>
    </span>
  );
};
