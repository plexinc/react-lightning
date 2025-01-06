import { type FC, useCallback, useMemo, useState } from 'react';
import { useExtensionMessaging } from '../communication/useExtensionMessaging';
import { PanelWithToolbar } from '../components/PanelWithToolbar';
import { useTheme } from '../hooks/useTheme';
import { Fps } from './Fps';

export const ElementPreview: FC = () => {
  const [src, setSrc] = useState<string | null>(null);

  useExtensionMessaging(
    'setPreviewImage',
    useCallback(({ data }) => {
      setSrc(data ? data : null);
    }, []),
  );

  const previewImage = useMemo(
    () =>
      src ? (
        <img
          src={src}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
          }}
        />
      ) : (
        <center>
          <h3>Element not visible</h3>
          <p>
            This could be because the element is off-screen, or there was an
            issue grabbing a screenshot from the Lightning app.
          </p>
        </center>
      ),
    [src],
  );

  return (
    <PanelWithToolbar
      toolbar={
        <div style={{ textAlign: 'right' }}>
          <Fps />
        </div>
      }
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '8px',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {previewImage}
      </div>
    </PanelWithToolbar>
  );
};
