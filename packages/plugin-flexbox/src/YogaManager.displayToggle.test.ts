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

// Mimics the navigator Screen: a container with no explicit flexDirection
// (yoga node default = column) holding a header and a flex:1 content view.
async function setup() {
  const m = new YogaManager();
  await m.init();

  m.addNode(1);
  m.applyStyle(1, { display: 'flex', w: 800, h: 1000 }, true);
  m.addIndependentRoot(1);

  const screenStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flex: 1,
  } as const;

  m.addNode(2);
  m.applyStyle(2, { ...screenStyle }, true, true);
  m.addChildNode(1, 2);

  m.addNode(3);
  m.applyStyle(3, { h: 112 }, true, true);
  m.addChildNode(2, 3);

  m.addNode(4);
  m.applyStyle(4, { flex: 1 }, true, true);
  m.addChildNode(2, 4);

  let layout: ReturnType<typeof decode> = {};
  m.on('render', (buf) => {
    layout = { ...layout, ...decode(buf) };
  });

  return { m, screenStyle, layout: () => layout };
}

// A drawer parked off-screen by a translate, then hidden once it has finished
// closing — the position must survive the hide.
async function setupTranslatedOffscreen() {
  const m = new YogaManager();
  await m.init();

  m.addNode(1);
  m.applyStyle(1, { display: 'flex', w: 800, h: 1000 }, true);
  m.addIndependentRoot(1);

  const drawerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    w: 452,
    h: 1000,
    display: 'flex',
    transform: { translateX: -452 },
  } as const;

  m.addNode(2);
  m.applyStyle(2, { ...drawerStyle }, true, true);
  m.addChildNode(1, 2);

  let layout: ReturnType<typeof decode> = {};
  m.on('render', (buf) => {
    layout = { ...layout, ...decode(buf) };
  });

  return { m, drawerStyle, layout: () => layout };
}

describe('display none -> flex round trip', () => {
  it('keeps default column direction after toggling display', async () => {
    const { m, screenStyle, layout } = await setup();

    m.flushLayout();
    expect(layout()[4]).toMatchObject({ x: 0, y: 112 });

    m.applyStyle(2, { ...screenStyle, display: 'none' }, true, true);
    m.flushLayout();

    m.applyStyle(2, { ...screenStyle, display: 'flex' }, true, true);
    m.flushLayout();

    expect(layout()[4]).toMatchObject({ x: 0, y: 112 });
  });

  it('resets a dropped flexDirection back to column (RN default)', async () => {
    const { m, screenStyle, layout } = await setup();

    m.applyStyle(2, { ...screenStyle, flexDirection: 'column' }, true, true);
    m.flushLayout();
    expect(layout()[4]).toMatchObject({ x: 0, y: 112 });

    // Full-style apply without flexDirection: reset should restore the RN
    // default (column), not yoga's web default (row).
    m.applyStyle(2, { ...screenStyle }, true, true);
    m.flushLayout();

    expect(layout()[4]).toMatchObject({ x: 0, y: 112 });
  });

  it('leaves a hidden node where it was laid out', async () => {
    const { m, drawerStyle, layout } = await setupTranslatedOffscreen();

    m.flushLayout();
    expect(layout()[2]).toMatchObject({ x: -452, y: 0 });

    // Yoga zeroes the computed box of a display:none node. Emitting that would
    // drag the hidden subtree back to the origin, where anything reading the
    // scene graph sees it as on screen.
    m.applyStyle(2, { ...drawerStyle, display: 'none' }, true, true);
    m.flushLayout();

    expect(layout()[2]).toMatchObject({ x: -452, y: 0 });
  });

  it('lays a hidden node back out when it is shown again', async () => {
    const { m, drawerStyle, layout } = await setupTranslatedOffscreen();

    m.applyStyle(2, { ...drawerStyle, display: 'none' }, true, true);
    m.flushLayout();

    m.applyStyle(2, { ...drawerStyle, display: 'flex', transform: { translateX: 0 } }, true, true);
    m.flushLayout();

    expect(layout()[2]).toMatchObject({ x: 0, y: 0, w: 452 });
  });
});
