import type { LightningElement } from '@plex/react-lightning';
import { type FC, useContext, useEffect, useRef } from 'react';
import { sendMessage } from 'webext-bridge/window';
import { LightningCanvasContext } from '../LightningCanvasContext';
import { isEmptyImage } from '../utils/isEmptyImage';

interface Props {
  element: LightningElement | null;
}

/**
 * Only generates the preview image so it can be sent to devtools for rendering
 */
export const ElementPreviewGenerator: FC<Props> = ({ element }) => {
  const canvas = useContext(LightningCanvasContext);
  const offscreenCanvas = useRef<OffscreenCanvas>(
    new OffscreenCanvas(1920, 1080),
  );

  useEffect(() => {
    if (canvas && element) {
      const ctx = offscreenCanvas.current.getContext('2d');
      const { x, y, width, height } = element.getBoundingClientRect();

      if (!ctx || width === 0 || height === 0) {
        return;
      }

      offscreenCanvas.current.width = width;
      offscreenCanvas.current.height = height;

      ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height).data;

      if (isEmptyImage(imageData)) {
        sendMessage('setPreviewImage', '', 'devtools');
      } else {
        offscreenCanvas.current
          .convertToBlob()
          .then((blob) => {
            const url = URL.createObjectURL(blob);

            sendMessage('setPreviewImage', url, 'devtools');
          })
          .catch((error) => {
            console.error('Error generating preview:', error);
          });
      }
    }
  }, [element, canvas]);

  return null;
};
