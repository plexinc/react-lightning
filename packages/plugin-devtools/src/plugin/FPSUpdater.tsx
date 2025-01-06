import type { RendererMain } from '@lightningjs/renderer';
import { type FC, useCallback, useEffect } from 'react';
import { sendMessage } from 'webext-bridge/window';

type Props = {
  renderer: RendererMain;
};

/** Sends FPS updates to devtools for display */
export const FPSUpdater: FC<Props> = ({ renderer }) => {
  const updateFps = useCallback(
    (_: unknown, { fps: value }: { fps: number }) => {
      sendMessage('updateFps', value, 'devtools');
    },
    [],
  );

  useEffect(() => {
    renderer.on('fpsUpdate', updateFps);

    return () => renderer.off('fpsUpdate', updateFps);
  });

  return null;
};
