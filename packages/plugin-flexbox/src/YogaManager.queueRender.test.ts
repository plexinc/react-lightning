import { describe, expect, it } from 'vitest';

import type { AtlasData } from './text/FontMetricsStore';
import { YogaManager } from './YogaManager';

const atlas: AtlasData = {
  info: { size: 10, face: 'Test' },
  common: { lineHeight: 12, base: 8 },
  lightningMetrics: { ascender: 800, descender: -200, lineGap: 0, unitsPerEm: 1000 },
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

async function setup() {
  const manager = new YogaManager();
  await manager.init();
  (
    manager as unknown as { _fontStore: { register: (f: string, d: AtlasData) => void } }
  )._fontStore.register('Test', atlas);

  manager.addNode(1);
  manager.applyStyle(1, { w: 300, h: 200, display: 'flex', flexDirection: 'column' }, true);
  manager.addIndependentRoot(1);

  manager.addNode(2);
  manager.applyStyle(2, { w: 100, h: 50 }, true);
  manager.addChildNode(1, 2);

  manager.addNode(3);
  manager.addChildNode(1, 3);
  manager.setTextMeasure(3, 'Test', textProps);

  manager.queueRender(1);
  await Promise.resolve();

  let renders = 0;
  manager.on('render', () => renders++);

  return {
    manager,
    renders: async () => {
      await Promise.resolve();

      const count = renders;
      renders = 0;

      return count;
    },
  };
}

describe('YogaManager only lays out when a layout input changed', () => {
  it('skips the pass for a style that changes nothing yoga reads', async () => {
    const { manager, renders } = await setup();

    manager.applyStyle(2, { w: 100, h: 50, scaleX: 1.1, color: 0xff0000ff } as never);

    expect(await renders()).toBe(0);
  });

  it('lays out when a flex prop changes', async () => {
    const { manager, renders } = await setup();

    manager.applyStyle(2, { w: 120, h: 50 });

    expect(await renders()).toBe(1);
  });

  it('lays out when an earlier skipRender write left the node dirty', async () => {
    const { manager, renders } = await setup();

    // transformProps writes flex props with skipRender, then stylesChanged
    // re-applies the remaining style without them.
    manager.applyStyle(2, { w: 100, h: 50, marginTop: 10 }, true);
    manager.applyStyle(2, { w: 100, h: 50 });

    expect(await renders()).toBe(1);
  });

  it('lays out after a tree op even when the re-applied style is unchanged', async () => {
    const { manager, renders } = await setup();

    manager.addNode(4);
    manager.applyStyle(4, { w: 10, h: 10 }, true);
    manager.addChildNode(1, 4);
    manager.applyStyle(1, { w: 300, h: 200, display: 'flex', flexDirection: 'column' });

    expect(await renders()).toBe(1);
  });

  it('lays out for a percent translate push, which never dirties yoga', async () => {
    const { manager, renders } = await setup();

    manager.applyStyle(2, { transform: { translateX: '-50%' } } as never);
    expect(await renders()).toBe(1);

    // Clearing it has to repaint too.
    manager.applyStyle(2, { transform: {} } as never);
    expect(await renders()).toBe(1);

    manager.applyStyle(2, { transform: {} } as never);
    expect(await renders()).toBe(0);
  });

  it('skips re-measuring text whose measure props are unchanged', async () => {
    const { manager, renders } = await setup();

    manager.setTextMeasure(3, 'Test', { ...textProps });
    expect(await renders()).toBe(0);

    manager.setTextMeasure(3, 'Test', { ...textProps, text: 'aa' });
    expect(await renders()).toBe(1);
  });

  it('still re-measures unchanged text when forced', async () => {
    const { manager, renders } = await setup();

    manager.setTextMeasure(3, 'Test', { ...textProps }, true);

    expect(await renders()).toBe(1);
  });
});
