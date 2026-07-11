import { describe, expect, it, vi } from 'vitest';

import { YogaManager } from './YogaManager';

// A minimal independent root with one child so a layout pass has real work.
async function setup() {
  const manager = new YogaManager();
  await manager.init();

  manager.addNode(1);
  manager.applyStyle(1, { w: 300, h: 200, display: 'flex' }, true);
  manager.addIndependentRoot(1);

  manager.addNode(2);
  manager.applyStyle(2, { w: 100, h: 50 }, true);
  manager.addChildNode(1, 2);

  return manager;
}

describe('YogaManager.flushLayout', () => {
  it('runs layout synchronously (render fires before the call returns)', async () => {
    const manager = await setup();
    let rendered = false;
    manager.on('render', () => {
      rendered = true;
    });

    manager.flushLayout();

    expect(rendered).toBe(true);
  });

  it('emits settled once, after the last pass, when nothing re-dirties', async () => {
    const manager = await setup();
    const order: string[] = [];
    manager.on('render', () => order.push('render'));
    manager.on('settled', () => order.push('settled'));

    manager.flushLayout();

    expect(order.filter((e) => e === 'settled')).toHaveLength(1);
    expect(order[order.length - 1]).toBe('settled');
  });

  it('loops to a fixpoint: keeps laying out while a listener re-dirties', async () => {
    const manager = await setup();
    let renders = 0;
    let settled = 0;
    manager.on('settled', () => settled++);
    // Simulate the grow-only text re-dirty: request another pass twice, then stop.
    manager.on('render', () => {
      renders++;
      if (renders < 3) {
        manager.queueRender(1);
      }
    });

    manager.flushLayout();

    expect(renders).toBe(3);
    expect(settled).toBe(1);
  });

  it('stops at the pass cap and warns if layout never settles', async () => {
    const manager = await setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let settled = 0;
    manager.on('settled', () => settled++);
    // Never converges: always asks for another pass.
    manager.on('render', () => manager.queueRender(1));

    manager.flushLayout();

    expect(warn).toHaveBeenCalledOnce();
    expect(settled).toBe(1);
    warn.mockRestore();
  });
});

describe('YogaManager async render path', () => {
  it('emits settled after the microtask flush converges', async () => {
    const manager = await setup();
    const settled = vi.fn();
    manager.on('settled', settled);

    manager.queueRender(1);
    expect(settled).not.toHaveBeenCalled(); // deferred to a microtask

    await Promise.resolve();

    expect(settled).toHaveBeenCalledOnce();
  });

  it('keeps one layout pass per microtask (async timing unchanged)', async () => {
    const manager = await setup();
    let renders = 0;
    manager.on('render', () => {
      renders++;
      if (renders < 2) {
        manager.queueRender(1);
      }
    });

    manager.queueRender(1);
    await Promise.resolve();
    expect(renders).toBe(1); // first pass only; re-dirty scheduled a second microtask

    await Promise.resolve();
    expect(renders).toBe(2);
  });
});
