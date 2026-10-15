import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createLightningElement,
  type LightningElement,
  LightningElementType,
  LightningViewElement,
  PARTIAL_STYLE,
  type Plugin,
} from '@plextv/react-lightning';
import { plugin as cssTransformPlugin } from '@plextv/react-lightning-plugin-css-transform';

import { SceneElement } from './SceneElement';
import { sceneElementFactory } from './sceneElementFactory';
import { createTestRenderer, snapshotScene } from './testRenderer';

type AnyRecord = Record<string, unknown>;
type Flags = { flattenLayoutViews: boolean; roundedClipping: boolean };

type Impl = {
  name: string;
  create(
    type: LightningElementType,
    props: AnyRecord,
    renderer: RendererMain,
    plugins: Plugin<LightningElement>[],
  ): LightningElement;
  configure(flags: Flags): void;
};

const fiber = () => ({}) as Fiber;

const stock: Impl = {
  name: 'LightningViewElement',
  create: (type, props, renderer, plugins) =>
    createLightningElement(type, props as never, renderer, plugins, fiber()),
  configure(flags) {
    LightningViewElement.flattenLayoutViewsEnabled = flags.flattenLayoutViews;
    LightningViewElement.roundedClippingEnabled = flags.roundedClipping;
  },
};

const direct: Impl = {
  name: 'SceneElement',
  create: (type, props, renderer, plugins) =>
    sceneElementFactory.createElement(type, props as never, renderer, plugins, fiber()),
  configure(flags) {
    LightningViewElement.flattenLayoutViewsEnabled = flags.flattenLayoutViews;
    LightningViewElement.roundedClippingEnabled = flags.roundedClipping;
    sceneElementFactory.configure?.(flags);
  },
};

const EVENTS = [
  'childAdded',
  'childRemoved',
  'childMoved',
  'stylesChanged',
  'propsChanged',
  'focusChanged',
  'focusableChanged',
  'visibilityChanged',
  'textChanged',
  'layout',
  'resized',
  'textureLoaded',
  'textureFailed',
  'inViewport',
  'animationFinished',
  'destroy',
  'deferredDestroyComplete',
];

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
};

/** Builds elements through one implementation and records what the plugins and the stage would see. */
class Harness {
  public readonly renderer = createTestRenderer();
  public readonly log: unknown[] = [];
  public readonly els: LightningElement[] = [];
  private readonly _impl: Impl;
  private readonly _plugins: Plugin<LightningElement>[];

  public constructor(impl: Impl, plugins: Plugin<LightningElement>[] = []) {
    this._impl = impl;
    this._plugins = plugins;
  }

  public el(type: 'view' | 'text' | 'image', props: AnyRecord = {}): LightningElement {
    const t =
      type === 'text'
        ? LightningElementType.Text
        : type === 'image'
          ? LightningElementType.Image
          : LightningElementType.View;
    const el = this._impl.create(t, props, this.renderer, this._plugins);
    const idx = this.els.length;

    this.els.push(el);

    for (const name of EVENTS) {
      el.on(name, (...args: unknown[]) => {
        // tseep pads listener arguments with undefined up to a fixed arity.
        while (args.length > 0 && args[args.length - 1] === undefined) {
          args.pop();
        }

        this.log.push([idx, name, ...args.map((a) => this.norm(a))]);
      });
    }

    return el;
  }

  // CanvasRoot's FocusGroup view: clipping keeps it a real node.
  public root(
    props: AnyRecord = { style: { w: 1920, h: 1080, clipping: true } },
  ): LightningElement {
    return this.el('view', props);
  }

  /** appendChildToContainer: React mounts bottom-up, so the root joins the renderer last. */
  public mount(): void {
    this.els[0]?.setLightningNode(this.renderer.root as never);
  }

  public norm(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return typeof value === 'function' ? 'fn' : value;
    }

    const idx = this.els.findIndex((e) => e === value || e.node === value);

    if (idx >= 0) {
      return `#${idx}`;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.norm(v));
    }

    const out: AnyRecord = {};

    for (const key of Object.keys(value as AnyRecord).sort()) {
      const v = (value as AnyRecord)[key];

      if (key === 'children' || typeof v === 'function') {
        continue;
      }

      out[key] = v !== null && typeof v === 'object' && !Array.isArray(v) ? '{…}' : v;
    }

    return out;
  }

  public state(): unknown {
    return {
      scene: snapshotScene(this.renderer),
      elements: this.els.map((el) => ({
        flattened: el.isFlattened,
        visible: el.visible,
        focusable: el.focusable,
        focused: el.focused,
        hasLayout: el.hasLayout,
        paintWithheld: el.paintWithheld,
        node: {
          x: el.node.x,
          y: el.node.y,
          w: el.node.w,
          h: el.node.h,
          alpha: el.node.alpha,
          color: el.node.color,
        },
        rect: el.parent ? el.getBoundingClientRect(this.els[0]) : null,
        style: el.style ? { ...(el.style as AnyRecord) } : null,
        text: el.isTextElement ? (el as unknown as { text: string }).text : undefined,
      })),
      log: this.log,
    };
  }
}

async function both(
  flags: Flags,
  scenario: (h: Harness) => Promise<void> | void,
  plugins: () => Plugin<LightningElement>[] = () => [],
) {
  const results: unknown[] = [];

  for (const impl of [stock, direct]) {
    impl.configure(flags);

    const h = new Harness(impl, plugins());

    await scenario(h);
    await flush();
    results.push(h.state());
  }

  expect(firstDifference(results[0], results[1])).toBeNull();
  expect(results[1]).toEqual(results[0]);

  return results[0];
}

function firstDifference(a: unknown, b: unknown, path = ''): string | null {
  if (Object.is(a, b)) {
    return null;
  }

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return `${path || '<root>'}: stock ${JSON.stringify(a)} vs direct ${JSON.stringify(b)}`;
  }

  const keys = new Set([...Object.keys(a as AnyRecord), ...Object.keys(b as AnyRecord)]);

  for (const key of keys) {
    const diff = firstDifference((a as AnyRecord)[key], (b as AnyRecord)[key], `${path}.${key}`);

    if (diff) {
      return diff;
    }
  }

  return null;
}

const OFF: Flags = { flattenLayoutViews: false, roundedClipping: false };
const FLAT: Flags = { flattenLayoutViews: true, roundedClipping: true };

describe('SceneElement matches LightningViewElement', () => {
  afterEach(() => {
    stock.configure(OFF);
    direct.configure(OFF);
  });

  for (const flags of [OFF, FLAT]) {
    const label = flags.flattenLayoutViews ? 'flattened' : 'unflattened';

    it(`builds the same scene and events for a tree (${label})`, async () => {
      await both(flags, async (h) => {
        const root = h.root();
        const card = h.el('view', { style: { x: 10, y: 20, w: 300, h: 200, color: 0x112233ff } });
        const box = h.el('view', { style: { x: 5, y: 6, w: 50, h: 40 } });
        const label = h.el('text', { text: 'Hello', style: { fontSize: 24, x: 4 } });
        const poster = h.el('image', { src: 'a.jpg', style: { w: 100, h: 150 } });

        card.insertChild(box);
        card.insertChild(poster);
        card.insertChild(label, poster);
        root.insertChild(card);
        h.mount();
        await flush();

        card.setProps({ style: { x: 30, y: 20, w: 300, h: 200, color: 0x112233ff, alpha: 0.5 } });
        box.setProps({ style: { x: 7, y: 6, w: 50, h: 40, alpha: 0.8 } });
        await flush();

        expect(box.setNodeProp('x', 9)).toBe(true);
        expect(box.setNodeProp('x', 9)).toBe(false);
        box.setNodeProp('w', 60);

        card.removeChild(box);
        box.destroy();
        await flush();
      });
    });

    it(`folds flattened offsets and materializes on demand (${label})`, async () => {
      await both(flags, async (h) => {
        const root = h.root();
        const outer = h.el('view', { style: { x: 10, y: 20, w: 500, h: 500 } });
        const inner = h.el('view', { style: { x: 5, y: 7, w: 200, h: 200 } });
        const leaf = h.el('view', { style: { x: 1, y: 2, w: 10, h: 10, color: 0xff0000ff } });
        const sibling = h.el('view', { style: { x: 3, y: 3, w: 10, h: 10, color: 0x00ff00ff } });

        inner.insertChild(leaf);
        outer.insertChild(inner);
        root.insertChild(outer);
        h.mount();
        await flush();

        outer.setNodeProp('x', 40);
        inner.node.x = 15;
        inner.insertChild(sibling, leaf);
        await flush();

        inner.setProps({ style: { x: 15, y: 7, w: 200, h: 200, color: 0x333333ff } });
        await flush();

        leaf.setProps({ style: { x: 1, y: 2, w: 10, h: 10, color: 0xff0000ff, zIndex: 3 } });
        await flush();

        expect(leaf.getRelativePosition(outer)).toEqual(leaf.getRelativePosition(outer));
        h.log.push(['rel', leaf.getRelativePosition(outer), leaf.getRelativePosition(inner)]);
      });
    });

    it(`resolves shaders from styles the same way (${label})`, async () => {
      await both(flags, async (h) => {
        const root = h.root();
        const tile = h.el('view', { style: { w: 100, h: 100, borderRadius: 8, clipping: true } });
        const ring = h.el('view', {
          style: { w: 100, h: 100, outlineWidth: 4, outlineColor: 0xffffffff },
        });
        const grad = h.el('view', {
          style: {
            w: 100,
            h: 100,
            borderRadius: 6,
            linearGradient: { colors: [0x000000ff, 0xffffffff], stops: [0, 1], angle: 90 },
          },
        });

        root.insertChild(tile);
        root.insertChild(ring);
        root.insertChild(grad);
        h.mount();
        await flush();

        tile.setProps({
          style: {
            w: 100,
            h: 100,
            borderRadius: 8,
            clipping: true,
            border: { w: 2, color: 0xff0000ff },
          },
        });
        await flush();

        const partial: Record<PropertyKey, unknown> = { borderColor: 0x00ff00ff };
        partial[PARTIAL_STYLE] = true;
        tile.setProps({ style: partial });
        await flush();

        tile.setProps({ style: { w: 100, h: 100, borderRadius: 8, clipping: false } });
        ring.setProps({ style: { w: 100, h: 100 } });
        await flush();
      });
    });
  }

  it('keeps text, fragments and text sizing in step', async () => {
    await both(FLAT, async (h) => {
      const root = h.root();
      const title = h.el('text', { text: 'Title', style: { fontSize: 30, maxLines: 2 } });
      const para = h.el('text', { style: { fontSize: 20 } });
      const a = h.el('text', { text: 'One ' });
      const b = h.el('text', { text: 'two' });

      root.insertChild(title);
      root.insertChild(para);
      para.insertChild(a);
      para.insertChild(b);
      h.mount();
      await flush();

      (b as unknown as { text: string }).text = 'three';
      (para as unknown as { recomputeChildText(): void }).recomputeChildText();
      title.setNodeProp('w', 400);
      (title.node as unknown as { contain: string }).contain = 'width';
      title.setProps({ text: 'Other title', style: { fontSize: 30, maxLines: 2 } });
      await flush();

      para.removeChild(a);
      a.destroy();
      await flush();
    });
  });

  it('loads images and reports texture events the same way', async () => {
    await both(OFF, async (h) => {
      const root = h.root();
      const auto = h.el('image', { src: 'https://x/a.jpg', style: {} });
      const fixedW = h.el('image', { src: 'https://x/b.svg', style: { w: 200 } });
      const calls: unknown[] = [];

      root.insertChild(auto);
      root.insertChild(fixedW);
      fixedW.node.on('loaded', (node: unknown, data: unknown) => calls.push([h.norm(node), data]));
      h.mount();
      await flush();

      for (const el of [auto, fixedW]) {
        (el.node as unknown as { _emitRender(n: string, d: unknown): void })._emitRender('loaded', {
          type: 'texture',
          dimensions: { w: 400, h: 300 },
        });
      }

      (auto.node as unknown as { _emitRender(n: string, d: unknown): void })._emitRender(
        'inViewport',
        {
          previous: 0,
          current: 8,
        },
      );
      auto.setProps({ src: 'https://x/c.jpg' });
      await flush();
      h.log.push(['calls', calls, (fixedW.node as unknown as { imageType: string }).imageType]);
    });
  });

  it('runs transitions and reports their end', async () => {
    await both(OFF, async (h) => {
      const root = h.root();
      const ended: unknown[] = [];
      const el = h.el('view', {
        style: { w: 10, h: 10, alpha: 1, color: 0xffffffff },
        transition: { alpha: { duration: 100 }, x: { duration: 100 } },
        onTransitionEnd: (e: unknown) => ended.push(e),
      });

      root.insertChild(el);
      h.mount();
      await flush();

      el.setProps({ style: { w: 10, h: 10, alpha: 0.2, x: 50, color: 0xffffffff } });
      await flush();

      const animations = (
        h.renderer.stage as unknown as { animations: { update(dt: number): void } }
      ).animations;

      animations.update(16);
      animations.update(50);
      h.log.push(['mid', el.node.alpha, el.node.x]);
      animations.update(100);
      animations.update(16);
      h.log.push(['ended', ended]);
    });
  });

  it('tracks focus, visibility, hiding and withheld paint', async () => {
    await both(FLAT, async (h) => {
      const root = h.root();
      const group = h.el('view', { style: { w: 100, h: 100, color: 0x000000ff } });
      const button = h.el('view', { style: { w: 50, h: 20, color: 0xffffffff } });

      group.insertChild(button);
      root.insertChild(group);
      button.focusable = true;
      button.focus();
      h.mount();
      await flush();

      group.setProps({ style: { w: 100, h: 100, color: 0x000000ff, alpha: 0 } });
      await flush();
      button.blur();

      group.setProps({ style: { w: 100, h: 100, color: 0x000000ff, alpha: 1 } });
      await flush();

      button.withholdPaintUntilLayout();
      h.log.push(['withheld', button.node.alpha]);
      button.emitLayoutEvent();

      button.setReactHidden(true);
      await flush();
      button.setReactHidden(false, { style: { alpha: 1 } } as never);
      await flush();
    });
  });

  it('defers node removal until the handler finishes', async () => {
    await both(OFF, async (h) => {
      const root = h.root();
      const el = h.el('view', { style: { w: 10, h: 10, color: 0xff00ffff } });
      const child = h.el('view', { style: { w: 5, h: 5, color: 0x00ffffff } });
      let finish: (() => void) | null = null;

      el.insertChild(child);
      root.insertChild(el);
      el.deferNodeRemoval = (destroy) => {
        finish = destroy;
      };
      h.mount();
      await flush();

      root.removeChild(el);
      el.destroy();
      h.log.push(['deferred', snapshotScene(h.renderer)]);
      (finish as (() => void) | null)?.();
    });
  });

  it('routes style proxy reads and writes through setProps', async () => {
    await both(FLAT, async (h) => {
      const root = h.root();
      const el = h.el('view', { style: { w: 10, h: 10, x: 1 } });

      root.insertChild(el);
      h.mount();
      await flush();

      el.setProps({ style: { w: 10, h: 10, x: 2 } });
      h.log.push(['staged', (el.style as AnyRecord).x]);
      await flush();

      (el.style as AnyRecord).alpha = 0.3;
      (el.style as AnyRecord).color = 0x123456ff;
      await flush();
    });
  });

  it('agrees with the css-transform plugin in the pipeline', async () => {
    await both(
      FLAT,
      async (h) => {
        const root = h.root();
        const el = h.el('view', {
          style: {
            width: 200,
            height: 100,
            backgroundColor: '#ff0000',
            opacity: 0.5,
            transform: [{ scale: 1.5 }],
          },
        });
        const text = h.el('text', {
          text: 'css',
          style: { color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' },
        });

        root.insertChild(el);
        el.insertChild(text);
        h.mount();
        await flush();

        el.setProps({
          style: { width: 200, height: 100, backgroundColor: '#00ff00', borderRadius: 4 },
        } as never);
        await flush();
      },
      () => [cssTransformPlugin() as Plugin<LightningElement>],
    );
  });
});

describe('SceneElement', () => {
  it('is a LightningViewElement and one object with its node', () => {
    const renderer = createTestRenderer();
    const el = sceneElementFactory.createElement(
      LightningElementType.View,
      {},
      renderer,
      [],
      fiber(),
    );

    expect(el).toBeInstanceOf(LightningViewElement);
    expect(el.node).toBe(el);
    expect(el).toBeInstanceOf(SceneElement);
  });

  it('uses polyfills installed on LightningViewElement.prototype', () => {
    const renderer = createTestRenderer();
    const el = sceneElementFactory.createElement(
      LightningElementType.View,
      {},
      renderer,
      [],
      fiber(),
    );
    const marker = () => 'polyfilled';

    Object.defineProperty(LightningViewElement.prototype, '__testPolyfill', {
      value: marker,
      configurable: true,
    });

    expect((el as unknown as { __testPolyfill: () => string }).__testPolyfill()).toBe('polyfilled');
    delete (LightningViewElement.prototype as unknown as AnyRecord).__testPolyfill;
  });

  it('calls listeners added during an emit only on the next one, and removes once listeners', () => {
    const renderer = createTestRenderer();
    const el = sceneElementFactory.createElement(
      LightningElementType.View,
      {},
      renderer,
      [],
      fiber(),
    );
    const calls: string[] = [];
    const late = () => calls.push('late');

    let added = false;

    el.on('ping', () => {
      calls.push('a');

      if (!added) {
        added = true;
        el.on('ping', late);
      }
    });
    el.once('ping', (x: unknown) => calls.push(`once:${String(x)}`));
    el.emit('ping', 1);
    el.emit('ping', 2);
    el.off('ping', late);
    el.emit('ping', 3);

    expect(calls).toEqual(['a', 'once:1', 'a', 'late', 'a']);
  });

  it('drops props that were inert on a Lightning node', async () => {
    const renderer = createTestRenderer();
    const el = sceneElementFactory.createElement(
      LightningElementType.View,
      { focusable: true, testID: 'x', style: { w: 1 } } as never,
      renderer,
      [],
      fiber(),
    );

    expect(el.focusable).toBe(false);
    expect((el as unknown as AnyRecord).testID).toBeUndefined();
  });
});
