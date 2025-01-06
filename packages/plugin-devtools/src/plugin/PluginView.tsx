import type { RendererMain } from '@lightningjs/renderer';
import type { FC } from 'react';
import { onMessage } from 'webext-bridge/window';
import { LightningCanvasContext } from '../LightningCanvasContext';
import { MessagingProvider } from '../communication/MessagingProvider';
import { DevToolConnectionHandler } from './DevToolConnectionHandler';
import { DevToolElements } from './DevToolElements';
import { ElementHighlighter } from './ElementHighlighter';
import { ElementPreviewGenerator } from './ElementPreviewGenerator';
import type { ElementTracker } from './ElementTracker';
import { FPSUpdater } from './FPSUpdater';

type Props = {
  renderer: RendererMain;
  elementTracker: ElementTracker;
};

export const PluginView: FC<Props> = ({ renderer, elementTracker }) => {
  return (
    <LightningCanvasContext.Provider value={renderer.canvas}>
      <MessagingProvider onMessage={onMessage}>
        <DevToolConnectionHandler elementTracker={elementTracker}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              overflow: 'none',
              pointerEvents: 'none',
            }}
          >
            <DevToolElements>
              {({ selectedElement, hoveredElement }) => (
                <>
                  <ElementHighlighter
                    selectedElement={selectedElement}
                    hoveredElement={hoveredElement}
                  />
                  <FPSUpdater renderer={renderer} />
                  <ElementPreviewGenerator element={hoveredElement} />
                </>
              )}
            </DevToolElements>
          </div>
        </DevToolConnectionHandler>
      </MessagingProvider>
    </LightningCanvasContext.Provider>
  );
};
