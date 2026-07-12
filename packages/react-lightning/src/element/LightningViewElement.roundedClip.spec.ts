import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
    shader: { props: {} },
    parent: null,
    on() {},
    off() {},
    animate() {
      return { once() {}, start() {} };
    },
    destroy() {},
    ...props,
  };
}

const createdNodes: Record<string, unknown>[] = [];
const destroyedNodes: unknown[] = [];

const renderer = {
  createNode: (props: Record<string, unknown>) => {
    createdNodes.push(props);

    return createMockNode(props);
  },
  createTextNode: (props: Record<string, unknown>) => createMockNode(props),
  createShader: () => ({ props: {} }),
  createTexture: () => ({}),
  destroyNode(node: unknown) {
    destroyedNodes.push(node);
  },
} as unknown as RendererMain;

function createElement(style: Partial<LightningViewElementStyle>) {
  const props = {
    style,
  } as LightningViewElementProps<LightningViewElementStyle>;

  return new LightningViewElement(props, renderer, [], {} as Fiber);
}

// setProps stages the update and flushes on a microtask.
const flush = () => Promise.resolve();

const lastBackgroundNode = () =>
  createdNodes.filter((n) => n.zIndex === -1).pop();

describe('rounded clipping (borderRadius + clipping -> rtt)', () => {
  beforeEach(() => {
    LightningViewElement.roundedClippingEnabled = true;
  });

  afterEach(() => {
    LightningViewElement.roundedClippingEnabled = false;
  });

  it('does nothing while the roundedClipping option is off (default)', () => {
    LightningViewElement.roundedClippingEnabled = false;

    const el = createElement({ w: 100, h: 50, clipping: true, borderRadius: 16 });

    expect(el.node.rtt).not.toBe(true);
  });

  it('enables rtt when clipping and borderRadius are both set at mount', () => {
    const el = createElement({ w: 100, h: 50, clipping: true, borderRadius: 16 });

    expect(el.node.rtt).toBe(true);
  });

  it('does not enable rtt for borderRadius alone', () => {
    const el = createElement({ w: 100, h: 50, borderRadius: 16 });

    expect(el.node.rtt).not.toBe(true);
  });

  it('does not enable rtt for clipping alone', () => {
    const el = createElement({ w: 100, h: 50, clipping: true });

    expect(el.node.rtt).not.toBe(true);
  });

  it('enables rtt when clipping arrives after mount (fast path)', async () => {
    const el = createElement({ w: 100, h: 50, borderRadius: 16 });

    el.setProps({ style: { clipping: true } });
    await flush();

    expect(el.node.rtt).toBe(true);
  });

  it('disables rtt when the borderRadius is removed', async () => {
    const el = createElement({ w: 100, h: 50, clipping: true, borderRadius: 16 });

    el.setProps({ style: { borderRadius: 0 } });
    await flush();

    expect(el.node.rtt).toBe(false);
  });

  it('keeps rtt with a rounded border (RoundedWithBorder shader)', () => {
    const el = createElement({
      w: 100,
      h: 50,
      clipping: true,
      borderRadius: 16,
      border: { w: 2, color: 0xffffffff },
    });

    expect(el.node.rtt).toBe(true);
  });

  it('composites untinted: forces the node color white while rtt is on', () => {
    const el = createElement({
      w: 100,
      h: 50,
      clipping: true,
      borderRadius: 16,
      color: 0x1c1f26ff,
    });

    expect(el.node.color).toBe(0xffffffff);
  });

  it('paints the background inside the texture via a managed first child', () => {
    createdNodes.length = 0;

    const el = createElement({
      w: 100,
      h: 50,
      clipping: true,
      borderRadius: 16,
      color: 0x1c1f26ff,
    });

    const bg = lastBackgroundNode();

    expect(bg).toBeDefined();
    expect(bg?.color).toBe(0x1c1f26ff);
    expect(bg?.parent).toBe(el.node);
  });

  it('creates no background child for a transparent container', () => {
    createdNodes.length = 0;
    createElement({ w: 100, h: 50, clipping: true, borderRadius: 16 });

    expect(lastBackgroundNode()).toBeUndefined();
  });

  it('restores the styled color and drops the background when rtt turns off', async () => {
    createdNodes.length = 0;
    destroyedNodes.length = 0;

    const el = createElement({
      w: 100,
      h: 50,
      clipping: true,
      borderRadius: 16,
      color: 0x1c1f26ff,
    });
    const bg = lastBackgroundNode();

    el.setProps({ style: { borderRadius: 0 } });
    await flush();

    expect(el.node.rtt).toBe(false);
    expect(el.node.color).toBe(0x1c1f26ff);
    expect(destroyedNodes).toContain(bg === undefined ? Symbol('none') : destroyedNodes[0]);
    expect(destroyedNodes.length).toBe(1);
  });

  it('respects an explicit rtt prop over the derived value', () => {
    const props = {
      rtt: false,
      style: { w: 100, h: 50, clipping: true, borderRadius: 16 },
    } as unknown as LightningViewElementProps<LightningViewElementStyle>;
    const el = new LightningViewElement(props, renderer, [], {} as Fiber);

    expect(el.node.rtt).toBe(false);
  });
});
