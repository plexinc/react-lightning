import { createRoot } from '@plextv/react-lightning-renderer/react';

import { onFocus, waitForDrawingFrame } from './harness';
import { Home } from './scene';

async function main() {
  const canvas = document.createElement('canvas');

  document.body.appendChild(canvas);

  try {
    await document.fonts.load('24px Ubuntu');
  } catch {}

  const root = createRoot(canvas, { width: 1920, height: 1080, clearColor: 0x000000ff });

  type N = { children: N[]; kind: number };

  function countNodes(n: N): number {
    let c = 1;

    for (const ch of n.children) {
      c += countNodes(ch);
    }

    return c;
  }

  window.__bench = {
    name: 'mvp',
    mount() {
      return new Promise((resolve) => {
        const t0 = performance.now();

        root.render(<Home onFocus={onFocus} />, () => {
          const tCommit = performance.now();

          waitForDrawingFrame(tCommit).then((tFrame) =>
            resolve({ commitMs: tCommit - t0, firstFrameMs: tFrame - t0 }),
          );
        });
      });
    },
    info() {
      const n = countNodes(root.stage.root as unknown as N);

      return {
        sceneNodes: n,
        elements: n - 1,
        textureBytes: root.stage.textures.memoryUsed,
        drawCalls: root.stage.stats.drawCalls,
        quads: root.stage.stats.quads,
        textRasterized: root.stage.text.rasterized,
        firstLoadAt: root.stage.textures.firstLoadAt,
        lastUploadAt: root.stage.textures.lastUploadAt,
      };
    },
  };
  window.__benchReady = true;
}

main();
