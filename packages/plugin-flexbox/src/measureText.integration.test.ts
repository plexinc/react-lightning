import { describe, expect, it } from 'vitest';

import type { AtlasData } from './text/FontMetricsStore';
import { YogaManager } from './YogaManager';

// Same synthetic atlas as layoutText.test.ts: at fontSize 20, "aa" = 40px wide,
// a space = 10px, line height = 20px.
const atlas: AtlasData = {
  info: { size: 10, face: 'Test' },
  common: { lineHeight: 12, base: 8 },
  lightningMetrics: {
    ascender: 800,
    descender: -200,
    lineGap: 0,
    unitsPerEm: 1000,
  },
  chars: [
    { id: 97, xadvance: 10, xoffset: 0, yoffset: 0, width: 8, height: 8 },
    { id: 32, xadvance: 5, xoffset: 0, yoffset: 0, width: 0, height: 0 },
  ],
  kernings: [],
};

const textProps = {
  text: 'aa aa',
  fontSize: 20,
  letterSpacing: 0,
  lineHeight: 1,
  maxLines: 0,
  maxHeight: 0,
  wordBreak: 'break-word' as const,
  overflowSuffix: '...',
};

type Computed = Map<number, { x: number; y: number; w: number; h: number }>;

function nextRender(manager: YogaManager): Promise<Computed> {
  return new Promise((resolve) => {
    const handler = (buffer: ArrayBuffer) => {
      manager.off('render', handler);

      const view = new DataView(buffer);
      const out: Computed = new Map();

      for (let offset = 0; offset + 12 <= buffer.byteLength; offset += 12) {
        out.set(view.getUint32(offset, true), {
          x: view.getInt16(offset + 4, true),
          y: view.getInt16(offset + 6, true),
          w: view.getUint16(offset + 8, true),
          h: view.getUint16(offset + 10, true),
        });
      }

      resolve(out);
    };

    manager.on('render', handler);
    manager.queueRender(1, true);
  });
}

async function setup(rootStyle: Record<string, unknown>) {
  const manager = new YogaManager();
  await manager.init();
  // Inject the synthetic font synchronously (skip the async URL fetch).
  (
    manager as unknown as {
      _fontStore: { register: (f: string, d: AtlasData) => void };
    }
  )._fontStore.register('Test', atlas);

  manager.addNode(1);
  manager.applyStyle(1, rootStyle, true);
  manager.addIndependentRoot(1);

  manager.addNode(2);
  manager.addChildNode(1, 2);
  manager.setTextMeasure(2, 'Test', textProps);

  return manager;
}

describe('Yoga text measurement (real yoga)', () => {
  it('wraps a stretched text child to the container width', async () => {
    // 60px-wide column, child stretches to fill width (align-items: stretch) →
    // the measure func gets Exactly(60) and wraps "aa aa" to 60px.
    const manager = await setup({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      w: 60,
      h: 200,
    });

    const computed = await nextRender(manager);
    const text = computed.get(2);

    expect(text?.w).toBe(60); // stretched to container
    expect(text?.h).toBe(40); // "aa" / "aa" → 2 lines × 20px
  });

  it('shrinks an unstretched text child to its content width', async () => {
    // align-items flex-start → child sized to measured content, unconstrained.
    const manager = await setup({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      w: 300,
      h: 200,
    });

    const computed = await nextRender(manager);
    const text = computed.get(2);

    expect(text?.w).toBe(90); // "aa aa" single line = 45 design × 2
    expect(text?.h).toBe(20); // 1 line
  });

  it('ignores children of a measured text leaf (stays a leaf)', async () => {
    const manager = await setup({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      w: 60,
      h: 200,
    });

    // A text fragment child must not become a Yoga child (Yoga forbids
    // children on a measure-func node) — this must not throw or change size.
    manager.addNode(3);
    expect(() => manager.addChildNode(2, 3)).not.toThrow();

    const computed = await nextRender(manager);
    expect(computed.get(2)?.h).toBe(40); // still measured as 2 lines
  });

  it('awaits font metrics during init so the first layout measures text', async () => {
    // If init resolves before the atlas JSON is registered, the first layout
    // measures text 0x0 and the font-arrival re-measure reflows the whole
    // tree while it is already visible (the boot-time position jump).
    const originalFetch = globalThis.fetch;
    // Resolve on a macrotask, like a real network fetch — a same-tick stub
    // would land before the first layout microtask and mask the race.
    globalThis.fetch = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));

      return { json: async () => atlas };
    }) as unknown as typeof fetch;

    try {
      const manager = new YogaManager();
      await manager.init({
        fonts: [{ fontFamily: 'Test', atlasDataUrl: 'test://atlas.json' }],
      });

      manager.addNode(1);
      manager.applyStyle(1, { display: 'flex', w: 100, h: 100 }, true);
      manager.addIndependentRoot(1);

      manager.addNode(2);
      manager.addChildNode(1, 2);
      manager.setTextMeasure(2, 'Test', textProps);

      const computed = await nextRender(manager);

      // "aa aa" at fontSize 20 with the synthetic atlas is 90px wide unwrapped.
      expect(computed.get(2)?.w).toBeGreaterThan(0);
      expect(computed.get(2)?.h).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
