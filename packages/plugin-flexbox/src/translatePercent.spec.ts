import { describe, expect, it } from 'vitest';

import { YogaManager } from './YogaManager';

// Parse the 12-byte-per-node render buffer (id, x, y, w, h; little-endian).
function readNode(buffer: ArrayBuffer | undefined, id: number) {
  if (!buffer) {
    return undefined;
  }

  const view = new DataView(buffer);

  for (let o = 0; o + 12 <= buffer.byteLength; o += 12) {
    if (view.getUint32(o, true) === id) {
      return {
        x: view.getInt16(o + 4, true),
        y: view.getInt16(o + 6, true),
        w: view.getInt16(o + 8, true),
        h: view.getInt16(o + 10, true),
      };
    }
  }

  return undefined;
}

async function setup() {
  const manager = new YogaManager();

  await manager.init();
  manager.addNode(1);
  manager.applyStyle(1, { w: 1000, h: 500, display: 'flex' }, true);
  manager.addIndependentRoot(1);
  manager.addNode(2);
  manager.applyStyle(2, { w: 400, h: 80 }, true);
  manager.addChildNode(1, 2);

  let last: ArrayBuffer | undefined;

  manager.on('render', (b) => {
    if (b.byteLength > 0) {
      last = b;
    }
  });

  return {
    manager,
    flush: () => {
      last = undefined;
      manager.flushLayout();

      return last;
    },
  };
}

describe('percentage translate (own-size, RN semantics)', () => {
  it('resolves translateX percent against the node own width', async () => {
    const { manager, flush } = await setup();

    manager.applyStyle(2, { transform: { translateX: '50%' } }, true);

    expect(readNode(flush(), 2)?.x).toBe(200);
  });

  it('resolves translateY percent against the node own height', async () => {
    const { manager, flush } = await setup();

    manager.applyStyle(2, { transform: { translateY: '50%' } }, true);

    expect(readNode(flush(), 2)?.y).toBe(40);
  });

  it('resolves a percent that arrives AFTER layout has settled', async () => {
    // The reanimated path: mount layout runs (and is marked seen) before the
    // animated style lands. A percent-only change never dirties yoga, so the
    // readback must still visit and emit the node.
    const { manager, flush } = await setup();

    flush();
    manager.applyStyle(2, { transform: { translateX: '50%' } }, true);

    expect(readNode(flush(), 2)?.x).toBe(200);
  });

  it('re-resolves when the percentage changes', async () => {
    const { manager, flush } = await setup();

    manager.applyStyle(2, { transform: { translateX: '50%' } }, true);
    flush();
    manager.applyStyle(2, { transform: { translateX: '75%' } }, true);

    expect(readNode(flush(), 2)?.x).toBe(300);
  });

  it('does not re-emit a settled percent node on unrelated passes', async () => {
    const { manager, flush } = await setup();

    manager.applyStyle(2, { transform: { translateX: '50%' } }, true);
    flush();

    // Nothing changed: the node must not spam updates (resized events).
    expect(readNode(flush(), 2)).toBeUndefined();
  });

  it('ignores a NaN percentage instead of moving the node', async () => {
    const { manager, flush } = await setup();

    flush();
    manager.applyStyle(2, { transform: { translateX: 'NaN%' } }, true);

    expect(readNode(flush(), 2)).toBeUndefined();
  });

  it('leaves pixel translate unchanged', async () => {
    const { manager, flush } = await setup();

    manager.applyStyle(2, { transform: { translateX: 50 } }, true);

    expect(readNode(flush(), 2)?.x).toBe(50);
  });
});
