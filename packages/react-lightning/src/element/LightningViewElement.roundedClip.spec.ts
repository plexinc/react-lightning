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
    clipRadius: 0,
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

const renderer = {
  createNode: (props: Record<string, unknown>) => createMockNode(props),
  createTextNode: (props: Record<string, unknown>) => createMockNode(props),
  createShader: () => ({ props: {} }),
  createTexture: () => ({}),
  destroyNode() {},
} as unknown as RendererMain;

function createElement(style: Partial<LightningViewElementStyle>) {
  const props = {
    style,
  } as LightningViewElementProps<LightningViewElementStyle>;

  return new LightningViewElement(props, renderer, [], {} as Fiber);
}

// setProps stages the update and flushes on a microtask.
const flush = () => Promise.resolve();

describe('rounded clipping (borderRadius + clipping -> clipRadius)', () => {
  beforeEach(() => {
    LightningViewElement.roundedClippingEnabled = true;
  });

  afterEach(() => {
    LightningViewElement.roundedClippingEnabled = false;
  });

  it('does nothing while the roundedClipping option is off (default)', () => {
    LightningViewElement.roundedClippingEnabled = false;

    const el = createElement({ w: 100, h: 50, clipping: true, borderRadius: 16 });

    expect(el.node.clipRadius || 0).toBe(0);
  });

  it('sets clipRadius when clipping and borderRadius are both set at mount', () => {
    const el = createElement({ w: 100, h: 50, clipping: true, borderRadius: 16 });

    expect(el.node.clipRadius).toBe(16);
  });

  it('does not clip for borderRadius alone', () => {
    const el = createElement({ w: 100, h: 50, borderRadius: 16 });

    expect(el.node.clipRadius || 0).toBe(0);
  });

  it('does not clip for clipping alone', () => {
    const el = createElement({ w: 100, h: 50, clipping: true });

    expect(el.node.clipRadius || 0).toBe(0);
  });

  it('sets clipRadius when clipping arrives after mount (fast path)', async () => {
    const el = createElement({ w: 100, h: 50, borderRadius: 16 });

    // Imperative toggle: a marked-partial push, so the Rounded shader is kept
    // and its radius drives clipRadius.
    el.style.clipping = true;
    await flush();

    expect(el.node.clipRadius).toBe(16);
  });

  it('clears clipRadius when the borderRadius is removed', async () => {
    const el = createElement({ w: 100, h: 50, clipping: true, borderRadius: 16 });

    el.setProps({ style: { borderRadius: 0 } });
    await flush();

    expect(el.node.clipRadius).toBe(0);
  });

  it('keeps clipping with a rounded border (RoundedWithBorder shader)', () => {
    const el = createElement({
      w: 100,
      h: 50,
      clipping: true,
      borderRadius: 16,
      border: { w: 2, color: 0xffffffff },
    });

    expect(el.node.clipRadius).toBe(16);
  });

  it('clips a per-corner radius array to the largest corner', () => {
    const el = createElement({
      w: 100,
      h: 50,
      clipping: true,
      borderRadius: [4, 8, 24, 12] as unknown as number,
    });

    expect(el.node.clipRadius).toBe(24);
  });

  it('leaves the node color alone (stencil clip, no tint games)', () => {
    const el = createElement({
      w: 100,
      h: 50,
      clipping: true,
      borderRadius: 16,
      color: 0x1c1f26ff,
    });

    expect(el.node.color).toBe(0x1c1f26ff);
  });
});
