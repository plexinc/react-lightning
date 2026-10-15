import { createRoot, LightningViewElement } from '@plextv/react-lightning';

import { onFocus, waitForDrawingFrame } from './harness';
import { Home } from './scene';

async function main() {
  const root = await createRoot(document.getElementById('app') as HTMLElement, {
    fonts: [
      {
        type: 'sdf',
        fontFamily: 'Ubuntu',
        atlasUrl: '/msdf/Ubuntu-Regular.msdf.png',
        atlasDataUrl: '/msdf/Ubuntu-Regular.msdf.json',
      },
    ],
    shaders: ['Border', 'Rounded', 'RoundedWithBorder'],
    numImageWorkers: 2,
    clearColor: 0x000000ff,
  });

  function countNodes(n: { children: unknown[] }): number {
    let c = 1;

    for (const ch of n.children as { children: unknown[] }[]) {
      c += countNodes(ch);
    }

    return c;
  }

  window.__bench = {
    name: 'current',
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
      const stage = root.renderer.stage as unknown as { txMemManager: { memUsed: number } };

      return {
        sceneNodes: countNodes(root.renderer.root as unknown as { children: unknown[] }),
        elements: Object.keys(LightningViewElement.allElements).length,
        textureBytes: stage.txMemManager.memUsed,
      };
    },
  };
  window.__benchReady = true;
}

main();
