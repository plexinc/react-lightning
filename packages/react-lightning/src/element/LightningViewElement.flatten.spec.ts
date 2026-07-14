import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LightningViewElementProps, LightningViewElementStyle } from '../types';
import { LightningViewElement } from './LightningViewElement';

function createMockNode(props: Record<string, unknown> = {}) {
  return {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    alpha: 1,
    color: 0,
    clipRadius: 0,
    shader: { props: {} },
    parent: null,
    on() {},
    off() {},
    animate() {
      let stopped: ((controller: unknown) => void) | null = null;
      const controller = {
        once(event: string, cb: (controller: unknown) => void) {
          if (event === 'stopped') {
            stopped = cb;
          }
          return controller;
        },
        start() {
          stopped?.(controller);
          return controller;
        },
      };
      return controller;
    },
    destroy() {},
    ...props,
  };
}

const destroyNode = vi.fn();

const renderer = {
  createNode: (props: Record<string, unknown>) => createMockNode(props),
  createTextNode: (props: Record<string, unknown>) => createMockNode(props),
  createShader: () => ({ props: {} }),
  createTexture: () => ({}),
  destroyNode,
} as unknown as RendererMain;

function createElement(
  style: Partial<LightningViewElementStyle>,
  extraProps: Record<string, unknown> = {},
) {
  const props = {
    style,
    ...extraProps,
  } as LightningViewElementProps<LightningViewElementStyle>;

  return new LightningViewElement(props, renderer, [], {} as Fiber);
}

// setProps stages the update and flushes on a microtask.
const flush = () => Promise.resolve();

describe('flattenLayoutViews', () => {
  beforeEach(() => {
    LightningViewElement.flattenLayoutViewsEnabled = true;
    destroyNode.mockClear();
  });

  afterEach(() => {
    LightningViewElement.flattenLayoutViewsEnabled = false;
  });

  it('creates a real node while the option is off (default)', () => {
    LightningViewElement.flattenLayoutViewsEnabled = false;

    const el = createElement({ w: 100, h: 50 });

    expect(el.isFlattened).toBe(false);
  });

  it('flattens a layout-only view', () => {
    const el = createElement({ w: 100, h: 50 });

    expect(el.isFlattened).toBe(true);
    expect((el.node as unknown as { isFlattenedNode?: boolean }).isFlattenedNode).toBe(true);
    expect(el.node.w).toBe(100);
    expect(el.node.h).toBe(50);
  });

  it('does not flatten a view with a visual prop', () => {
    const el = createElement({ w: 100, h: 50, color: 0xff0000ff });

    expect(el.isFlattened).toBe(false);
  });

  it('flattens despite inert element props (handlers, testID)', () => {
    const el = createElement(
      { w: 100, h: 50 },
      {
        onLayout: () => {},
        onFocus: () => {},
        testID: 'wrapper',
        focusable: true,
      },
    );

    expect(el.isFlattened).toBe(true);
  });

  it('flattens neutral visual values (color 0, alpha 1, scale 1)', () => {
    const el = createElement({ w: 100, h: 50, color: 0, alpha: 1, scale: 1 });

    expect(el.isFlattened).toBe(true);
  });

  it('materialized nodes are stamped transparent, not renderer-default white', () => {
    const el = createElement({ w: 100, h: 50 });

    el.setNodeProp('alpha', 0.5, false);

    expect(el.isFlattened).toBe(false);
    expect(el.node.color).toBe(0);
  });

  it('does not flatten a view with a transition', () => {
    const el = createElement({ w: 100, h: 50 }, { transition: { x: { duration: 100 } } });

    expect(el.isFlattened).toBe(false);
  });

  it('parents a real child through a flattened chain to the nearest real node', () => {
    const root = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const wrapperA = createElement({ w: 500, h: 500 });
    const wrapperB = createElement({ w: 400, h: 400 });
    const leaf = createElement({ w: 100, h: 100, color: 0xffffffff });

    root.insertChild(wrapperA);
    wrapperA.insertChild(wrapperB);
    wrapperB.insertChild(leaf);

    expect(wrapperA.isFlattened).toBe(true);
    expect(wrapperB.isFlattened).toBe(true);
    expect(leaf.isFlattened).toBe(false);
    expect(leaf.node.parent).toBe(root.node);
  });

  it('folds flattened ancestors offsets into descendant node positions', () => {
    const root = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const wrapperA = createElement({ w: 500, h: 500 });
    const wrapperB = createElement({ w: 400, h: 400 });
    const leaf = createElement({ w: 100, h: 100, color: 0xffffffff });

    root.insertChild(wrapperA);
    wrapperA.insertChild(wrapperB);
    wrapperB.insertChild(leaf);

    wrapperA.setNodeProp('x', 10, false);
    wrapperA.setNodeProp('y', 20, false);
    wrapperB.setNodeProp('x', 100, false);
    wrapperB.setNodeProp('y', 200, false);
    leaf.setNodeProp('x', 5, false);
    leaf.setNodeProp('y', 6, false);

    expect(leaf.node.x).toBe(115);
    expect(leaf.node.y).toBe(226);
    // The phantom keeps parent-relative coordinates.
    expect(wrapperB.node.x).toBe(100);
  });

  it('re-derives descendant positions when a flattened ancestor moves', () => {
    const root = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const wrapper = createElement({ w: 500, h: 500 });
    const leaf = createElement({ w: 100, h: 100, color: 0xffffffff });

    root.insertChild(wrapper);
    wrapper.insertChild(leaf);

    leaf.setNodeProp('x', 5, false);
    wrapper.setNodeProp('x', 50, false);

    expect(leaf.node.x).toBe(55);

    wrapper.setNodeProp('x', 80, false);

    expect(leaf.node.x).toBe(85);
  });

  it('materializes on a visual style write and relinks children', async () => {
    const root = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const wrapper = createElement({ w: 500, h: 500 });
    const leaf = createElement({ w: 100, h: 100, color: 0xffffffff });

    root.insertChild(wrapper);
    wrapper.insertChild(leaf);

    wrapper.setNodeProp('x', 50, false);
    leaf.setNodeProp('x', 5, false);

    expect(leaf.node.x).toBe(55);

    wrapper.setProps({ style: { color: 0x123456ff } } as never);
    await flush();

    expect(wrapper.isFlattened).toBe(false);
    expect((wrapper.node as unknown as { isFlattenedNode?: boolean }).isFlattenedNode).toBeUndefined();
    // The real node lands at the accumulated position...
    expect(wrapper.node.x).toBe(50);
    // ...and the child rebases to be relative to it.
    expect(leaf.node.parent).toBe(wrapper.node);
    expect(leaf.node.x).toBe(5);
  });

  it('materializes via setNodeProp with a non-layout key', () => {
    const el = createElement({ w: 100, h: 50 });

    expect(el.isFlattened).toBe(true);

    el.setNodeProp('alpha', 0.5, false);

    expect(el.isFlattened).toBe(false);
    expect(el.node.alpha).toBe(0.5);
  });

  it('getRelativePosition does not double-count flattened ancestors', () => {
    const root = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const wrapper = createElement({ w: 500, h: 500 });
    const leaf = createElement({ w: 100, h: 100, color: 0xffffffff });

    root.insertChild(wrapper);
    wrapper.insertChild(leaf);

    wrapper.setNodeProp('x', 50, false);
    leaf.setNodeProp('x', 5, false);

    expect(leaf.getRelativePosition(root).x).toBe(55);
    // Relative to the flattened wrapper itself: just the leaf's own offset.
    expect(leaf.getRelativePosition(wrapper).x).toBe(5);
  });

  it('reparenting a flattened subtree relinks the real frontier', () => {
    const rootA = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const rootB = createElement({ w: 1920, h: 1080, color: 0x111111ff });
    const wrapper = createElement({ w: 500, h: 500 });
    const leaf = createElement({ w: 100, h: 100, color: 0xffffffff });

    rootA.insertChild(wrapper);
    wrapper.insertChild(leaf);
    wrapper.setNodeProp('x', 50, false);

    expect(leaf.node.parent).toBe(rootA.node);

    rootA.removeChild(wrapper);
    rootB.insertChild(wrapper);

    expect(leaf.node.parent).toBe(rootB.node);
    expect(leaf.node.x).toBe(50);
  });

  it('destroying a flattened element never hits the renderer', () => {
    const el = createElement({ w: 100, h: 50 });

    el.destroy();

    expect(destroyNode).not.toHaveBeenCalled();
  });

  it('does not rewrite positions of direct node.x writers on plain reparent', () => {
    const rootA = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const rootB = createElement({ w: 1920, h: 1080, color: 0x111111ff });
    const scroller = createElement({ w: 500, h: 500, color: 0x222222ff });

    rootA.insertChild(scroller);
    // A scroll handler writes to the node directly, bypassing setNodeProp.
    scroller.node.x = -640;

    rootA.removeChild(scroller);
    rootB.insertChild(scroller);

    expect(scroller.node.x).toBe(-640);
  });

  it('folds a direct node.x/y write on a flattened content node to its children', () => {
    const root = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    // A layout-only content container (what a VirtualList scrolls) flattens.
    const content = createElement({ w: 5000, h: 500 });
    const tileA = createElement({ w: 100, h: 100, color: 0xffffffff });
    const tileB = createElement({ w: 100, h: 100, color: 0xffffffff });

    root.insertChild(content);
    content.insertChild(tileA);
    content.insertChild(tileB);

    tileA.setNodeProp('x', 0, false);
    tileB.setNodeProp('x', 272, false);

    expect(content.isFlattened).toBe(true);
    expect(tileA.node.x).toBe(0);
    expect(tileB.node.x).toBe(272);

    // The scroll handler translates the content node directly, bypassing
    // setProps. The placeholder can't paint, so the children must follow.
    content.node.x = -300;

    expect(tileA.node.x).toBe(-300);
    expect(tileB.node.x).toBe(-28);

    // A vertical write folds on its own axis.
    content.node.y = -50;

    expect(tileA.node.y).toBe(-50);
    expect(tileB.node.y).toBe(-50);
    // The placeholder keeps the raw scroll offset it was handed.
    expect(content.node.x).toBe(-300);
  });
  it('materializes a flattened element when a deferred removal handler is attached', () => {
    const root = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const wrapper = createElement({ w: 500, h: 500 });

    root.insertChild(wrapper);

    expect(wrapper.isFlattened).toBe(true);

    // Reanimated sets this on unmount to fade the node out before destroying it.
    // A placeholder can neither run nor finish an animation, so it has to become
    // a real node first.
    wrapper.deferNodeRemoval = () => {};

    expect(wrapper.isFlattened).toBe(false);
    expect(
      (wrapper.node as unknown as { isFlattenedNode?: boolean }).isFlattenedNode,
    ).toBeUndefined();
  });

  it('tears down a flattened exit-animated subtree once its animation finishes', () => {
    // parent(real) -> wrapper(layout-only, exit-animated) -> leaf(real image)
    const root = createElement({ w: 1920, h: 1080, color: 0x000000ff });
    const wrapper = createElement({ w: 500, h: 500 });
    const leaf = createElement({ w: 100, h: 100, color: 0xffffffff });

    root.insertChild(wrapper);
    wrapper.insertChild(leaf);

    const leafNode = leaf.node;

    // Mirror createAnimatedComponent's exit path: run the animation, then
    // destroy once it reports finished.
    wrapper.deferNodeRemoval = (destroy) => {
      wrapper.once('animationFinished', destroy);
      wrapper.animateStyle('alpha', 0);
    };

    destroyNode.mockClear();
    wrapper.destroy();

    // Without a real node the animation never finishes, the deferred destroy
    // never runs, and the leaf leaks on the scene. It must be released.
    expect(destroyNode).toHaveBeenCalledWith(leafNode);
  });
  describe('zIndex stacking scope', () => {
    it('materializes a flattened parent when a zIndex child attaches', () => {
      const root = createElement({ w: 1920, h: 1080, color: 0xff });
      const wrapper = createElement({ w: 1920, h: 1080 });
      const nav = createElement({ w: 1920, h: 160, zIndex: 2 });

      root.insertChild(wrapper);
      wrapper.insertChild(nav);

      // zIndex sorts among real siblings, so the parent must own a real node or the child
      // competes at the hoist target against unrelated subtrees (nav bar outranking a modal).
      expect(wrapper.isFlattened).toBe(false);
      expect(nav.node.parent).toBe(wrapper.node);
    });

    it('materializes the flattened parent when zIndex arrives after attach', () => {
      const root = createElement({ w: 1920, h: 1080, color: 0xff });
      const wrapper = createElement({ w: 1920, h: 1080 });
      const nav = createElement({ w: 1920, h: 160, color: 0xff000000 });

      root.insertChild(wrapper);
      wrapper.insertChild(nav);

      expect(wrapper.isFlattened).toBe(true);

      nav.setNodeProp('zIndex', 2);

      expect(wrapper.isFlattened).toBe(false);
      expect(nav.node.parent).toBe(wrapper.node);
    });

    it('zIndex 0 does not materialize the parent', () => {
      const root = createElement({ w: 1920, h: 1080, color: 0xff });
      const wrapper = createElement({ w: 1920, h: 1080 });
      const child = createElement({ w: 100, h: 100, color: 0xff000000 });

      root.insertChild(wrapper);
      wrapper.insertChild(child);
      child.setNodeProp('zIndex', 0);

      expect(wrapper.isFlattened).toBe(true);
    });

    it('materializes the flattened parent on a fast-path zIndex style write', async () => {
      const root = createElement({ w: 1920, h: 1080, color: 0xff });
      const wrapper = createElement({ w: 1920, h: 1080 });
      const nav = createElement({ w: 1920, h: 160, color: 0xff000000 });

      root.insertChild(wrapper);
      wrapper.insertChild(nav);

      nav.setProps({ style: { zIndex: 2 } } as never);
      await flush();

      expect(wrapper.isFlattened).toBe(false);
      expect(nav.node.parent).toBe(wrapper.node);
    });
  });
});

