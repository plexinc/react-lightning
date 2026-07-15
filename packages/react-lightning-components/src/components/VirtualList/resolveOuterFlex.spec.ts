import { describe, expect, it } from 'vitest';

// Not exported from the plugin's package root; test-only deep imports.
import { SimpleDataView } from '../../../../plugin-flexbox/src/util/SimpleDataView';
import { YogaManager } from '../../../../plugin-flexbox/src/YogaManager';
import { resolveOuterFlex } from './resolveOuterFlex';

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

// The guide screen's shape: definite root, grow-only ancestor, list outer element, content
// plane with an explicit height. Without flexBasis 0 the whole chain lays out at ~25000px.
describe('resolveOuterFlex', () => {
  it('keeps a content-sized vertical list from inflating grow-only ancestors', async () => {
    const m = new YogaManager();
    await m.init();

    m.addNode(1);
    m.applyStyle(1, { display: 'flex', flexDirection: 'column', w: 1920, h: 1080 }, true);
    m.addIndependentRoot(1);

    // Grow-only ancestor (the app's FocusGuide with style={{ flexGrow: 1 }}).
    m.addNode(2);
    m.applyStyle(2, { display: 'flex', flexDirection: 'column', flexGrow: 1 }, true);
    m.addChildNode(1, 2, 0);

    // The list's outer element.
    m.addNode(3);
    m.applyStyle(3, { display: 'flex', flexDirection: 'column', ...resolveOuterFlex(false) }, true);
    m.addChildNode(2, 3, 0);

    // The list's content plane, explicitly sized to the full content span.
    m.addNode(4);
    m.applyStyle(4, { w: 1920, h: 25000 }, true);
    m.addChildNode(3, 4, 0);

    let layout: ReturnType<typeof decode> = {};

    m.on('render', (buf) => {
      layout = { ...layout, ...decode(buf) };
    });
    m.flushLayout();

    expect(layout[2]?.h).toBe(1080);
    expect(layout[3]?.h).toBe(1080);
  });

  it('leaves the main axis of horizontal rows content-driven', () => {
    expect(resolveOuterFlex(true)).toEqual({});
  });
});
