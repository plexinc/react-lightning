import { describe, expect, it } from 'vitest';

import { YogaManager } from './YogaManager';

type Entry = { x: number; y: number; w: number; h: number };

function decode(buffer: ArrayBuffer): Map<number, Entry> {
  const view = new DataView(buffer);
  const out = new Map<number, Entry>();

  for (let offset = 0; offset + 20 <= buffer.byteLength; offset += 20) {
    out.set(view.getUint32(offset, true), {
      x: view.getInt32(offset + 4, true),
      y: view.getInt32(offset + 8, true),
      w: view.getInt32(offset + 12, true),
      h: view.getInt32(offset + 16, true),
    });
  }

  return out;
}

// Two independent roots: 1 > (2 > 3, 4) and 10 > 11.
async function setup() {
  const manager = new YogaManager();
  await manager.init();

  const node = (id: number, style: Record<string, unknown>, parent?: number) => {
    manager.addNode(id);
    manager.applyStyle(id, style, true);

    if (parent !== undefined) {
      manager.addChildNode(parent, id);
    }
  };

  node(1, { w: 300, h: 200, flexDirection: 'column' });
  node(2, { h: 50, flexDirection: 'row' }, 1);
  node(3, { w: 40, h: 20 }, 2);
  node(4, { h: 30 }, 1);
  node(10, { w: 100, h: 100 });
  node(11, { w: 10, h: 10 }, 10);
  manager.addIndependentRoot(1);
  manager.addIndependentRoot(10);

  const passes: Map<number, Entry>[] = [];
  manager.on('render', (buffer) => passes.push(decode(buffer)));

  // Runs the queued pass and returns its entries (a pass flushes once here).
  const pass = async () => {
    passes.length = 0;
    await Promise.resolve();
    expect(passes).toHaveLength(1);

    return passes[0] ?? new Map<number, Entry>();
  };

  manager.queueRender(1);
  await pass();

  return { manager, pass };
}

describe('YogaManager readback', () => {
  it('reads only the root that changed', async () => {
    const { manager, pass } = await setup();

    manager.applyStyle(11, { w: 20, h: 10 });

    const entries = await pass();

    expect([...entries.keys()].sort((a, b) => a - b)).toEqual([10, 11]);
    expect(entries.get(11)).toEqual({ x: 0, y: 0, w: 20, h: 10 });
  });

  it('stops at subtrees yoga did not lay out again', async () => {
    const { manager, pass } = await setup();

    manager.applyStyle(4, { h: 40 });

    const entries = await pass();

    // 2 is re-placed by its parent but keeps its cached layout, so its child 3
    // is never visited.
    expect(entries.has(3)).toBe(false);
    expect(entries.get(4)).toEqual({ x: 0, y: 50, w: 300, h: 40 });
  });

  it('still emits render for a pass with nothing to lay out', async () => {
    const { manager, pass } = await setup();

    manager.queueRender(1);

    expect((await pass()).size).toBe(0);
  });

  it('resolves a percent translate under a clean, pruned subtree', async () => {
    const { manager, pass } = await setup();

    manager.applyStyle(3, { transform: { translateX: '-50%' } } as never);

    const entries = await pass();

    expect(entries.get(3)).toEqual({ x: -20, y: 0, w: 40, h: 20 });

    // Unchanged on the next pass: deduped, not re-emitted.
    manager.applyStyle(11, { w: 30, h: 10 });
    expect((await pass()).has(3)).toBe(false);

    // Moves again when the node's own size changes.
    manager.applyStyle(3, { w: 80, h: 20 }, true);
    manager.applyStyle(3, { transform: { translateX: '-50%' } } as never);
    expect((await pass()).get(3)).toEqual({ x: -40, y: 0, w: 80, h: 20 });
  });

  it('lays out a node once when it becomes a root, even if it is clean', async () => {
    const { manager, pass } = await setup();

    manager.detachChildNode(1, 2);
    manager.addIndependentRoot(2);
    manager.queueRender(2);

    const entries = await pass();

    expect(entries.get(2)).toEqual({ x: 0, y: 0, w: 40, h: 50 });
  });
});
