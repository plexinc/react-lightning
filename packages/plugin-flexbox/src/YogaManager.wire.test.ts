import { describe, expect, it } from 'vitest';

import { SimpleDataView } from './util/SimpleDataView';
import { YogaManager } from './YogaManager';

function decode(buffer: ArrayBuffer) {
  const view = new SimpleDataView(buffer);
  const out: Record<number, { x: number; y: number; w: number; h: number }> = {};

  while (view.offset < buffer.byteLength) {
    const id = view.readUint32();
    const x = view.readInt32();
    const y = view.readInt32();
    const w = view.readInt32();
    const h = view.readInt32();

    out[id] = { x, y, w, h };
  }

  return out;
}

// The update buffer used int16 for x/y/w/h; a long virtualized list lays out
// well past 32767px and those positions wrapped negative (rows painted over
// the screen top, and viewport spans derived from them went haywire).
describe('YogaManager update wire format', () => {
  it('keeps positions past the int16 range intact', async () => {
    const m = new YogaManager();
    await m.init();

    m.addNode(1);
    m.applyStyle(1, { display: 'flex', flexDirection: 'column', w: 100 }, true);
    m.addIndependentRoot(1);

    m.addNode(2);
    m.applyStyle(2, { h: 40000, w: 100 }, true);
    m.addChildNode(1, 2, 0);

    m.addNode(3);
    m.applyStyle(3, { h: 100, w: 100 }, true);
    m.addChildNode(1, 3, 1);

    let layout: ReturnType<typeof decode> = {};

    m.on('render', (buf) => {
      layout = { ...layout, ...decode(buf) };
    });
    m.flushLayout();

    expect(layout[3]?.y).toBe(40000);
    expect(layout[1]?.h).toBe(40100);
  });
});
