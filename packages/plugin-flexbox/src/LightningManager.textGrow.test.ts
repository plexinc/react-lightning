import { describe, expect, it, vi } from 'vitest';

import type { LightningElement } from '@plextv/react-lightning';

import { LightningManager } from './LightningManager';
import type { AtlasData } from './text/FontMetricsStore';
import type { YogaManager } from './YogaManager';

// Every glyph 10 units wide at size 10: at fontSize 20 a character is 20px and
// a line is 20px tall.
const atlas: AtlasData = {
  info: { size: 10, face: 'Test' },
  common: { lineHeight: 12, base: 8 },
  lightningMetrics: { ascender: 800, descender: -200, lineGap: 0, unitsPerEm: 1000 },
  chars: Array.from({ length: 95 }, (_, i) => ({
    id: 32 + i,
    xadvance: 10,
    xoffset: 0,
    yoffset: 0,
    width: 8,
    height: 8,
  })),
  kernings: [],
};

const atlasDataUrl = `data:application/json;base64,${Buffer.from(JSON.stringify(atlas)).toString('base64')}`;

type Handler = (...args: unknown[]) => void;

class FakeElement {
  public parent: FakeElement | null = null;
  public children: FakeElement[] = [];
  public isTextElement = false;
  public isImageElement = false;
  public text?: string;
  public props: { style: Record<string, unknown> };
  public rawProps: { style: Record<string, unknown> };
  public node: Record<string, unknown> = {};
  public hasLayout = false;

  private _handlers = new Map<string, Set<Handler>>();

  constructor(
    public id: number,
    public style: Record<string, unknown>,
    text?: string,
  ) {
    this.props = { style };
    this.rawProps = { style };

    if (text !== undefined) {
      this.isTextElement = true;
      this.text = text;
    }
  }

  public on(event: string, handler: Handler): () => void {
    let set = this._handlers.get(event);

    if (!set) {
      set = new Set();
      this._handlers.set(event, set);
    }

    set.add(handler);

    return () => set.delete(handler);
  }

  public emit(event: string, ...args: unknown[]): void {
    for (const handler of this._handlers.get(event) ?? []) {
      handler(...args);
    }
  }

  public withholdPaintUntilLayout(): void {}

  public releaseWithheldPaint(): void {}

  public setNodeProp(key: string, value: unknown): boolean {
    if (this.node[key] === value) {
      return false;
    }

    this.node[key] = value;

    return true;
  }

  public emitLayoutEvent(): void {
    this.hasLayout = true;
  }
}

const asElement = (fake: FakeElement) => fake as unknown as LightningElement;
const textStyle = { fontFamily: 'Test', fontSize: 20, maxLines: 0 };

// A hero block: a 1000px column holding a title container whose width starts
// narrow and resolves wider later (the collapsed-then-expanded hero title).
async function setup(containerStyle: Record<string, unknown>, extra?: FakeElement) {
  const manager = new LightningManager();
  await manager.init({ fonts: [{ fontFamily: 'Test', atlasDataUrl }] });

  const yoga = (manager as unknown as { _yogaManager: YogaManager })._yogaManager;
  const setTextMeasure = vi.spyOn(yoga, 'setTextMeasure');
  let passes = 0;
  let settles = 0;

  yoga.on('render', () => passes++);
  yoga.on('settled', () => settles++);

  const root = new FakeElement(1, {
    w: 1000,
    h: 600,
    flexDirection: 'column',
    alignItems: 'flex-start',
  });
  const container = new FakeElement(2, containerStyle);
  const title = new FakeElement(3, textStyle, 'aaaa aaaa aaaa aaaa');
  const tree: [FakeElement, FakeElement][] = [
    [root, container],
    [container, title],
  ];

  if (extra) {
    tree.push([container, extra]);
  }

  for (const el of [root, container, title, extra]) {
    if (el) {
      manager.trackElement(asElement(el));
      manager.applyStyle(el.id, el.style, true);
    }
  }

  for (const [parent, child] of tree) {
    child.parent = parent;
    parent.children.push(child);
    parent.emit('childAdded', child, parent.children.length - 1);
  }

  manager.markFlexRoot(asElement(root));

  const settle = async () => {
    passes = 0;
    settles = 0;
    setTextMeasure.mockClear();

    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }

    return { passes, settles, forced: setTextMeasure.mock.calls.filter((call) => call[3]).length };
  };

  const resize = (el: FakeElement, style: Record<string, unknown>) => {
    el.style = style;
    el.props.style = style;
    el.rawProps.style = style;
    manager.applyStyle(el.id, style, false, true);
  };

  return { manager, container, title, settle, resize, mount: await settle() };
}

describe('LightningManager grow-only text re-measure', () => {
  it('lays a new text node out once on mount', async () => {
    const { title, mount } = await setup({ w: 200, flexDirection: 'column' });

    expect(mount).toEqual({ passes: 1, settles: 1, forced: 0 });
    // "aaaa aaaa" fits 200px: two lines of 180px.
    expect(title.node.h).toBe(40);
  });

  it('re-measures the text when its container grows past the width it was measured at', async () => {
    const { container, title, settle, resize } = await setup({ w: 200, flexDirection: 'column' });

    resize(container, { w: 400, flexDirection: 'column' });

    expect((await settle()).forced).toBe(1);
    expect(title.node.h).toBe(20);
    expect(title.node.w).toBe(400 + 2);
  });

  it('does not re-measure when the container shrinks, or regrows to a width it already had', async () => {
    const { container, settle, resize } = await setup({ w: 400, flexDirection: 'column' });

    resize(container, { w: 200, flexDirection: 'column' });
    expect((await settle()).forced).toBe(0);

    resize(container, { w: 400, flexDirection: 'column' });
    expect((await settle()).forced).toBe(0);
  });

  it('converges when the container width is derived from the text and a sibling', async () => {
    const warn = vi.spyOn(console, 'warn');
    const logo = new FakeElement(4, { w: 120, h: 40 });
    const { settle, resize } = await setup({ flexDirection: 'row', alignSelf: 'flex-start' }, logo);

    for (const w of [500, 120, 700, 60]) {
      resize(logo, { w, h: 40 });

      const { settles } = await settle();

      expect(settles).toBe(1);
    }

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
