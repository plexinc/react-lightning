import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, expect, it } from 'vitest';

import type { LightningViewElementProps, LightningViewElementStyle } from '../types';
import { LightningViewElement } from './LightningViewElement';

// A minimal stand-in for a renderer CoreNode: just the props the element
// reads/writes plus no-op event/animation hooks.
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

describe('LightningViewElement paint withholding', () => {
  it('hides a definite-sized node until its first layout resolves', () => {
    const el = createElement({ w: 100, h: 50, alpha: 1 });

    el.withholdPaintUntilLayout();

    expect(el.paintWithheld).toBe(true);
    expect(el.node.alpha).toBe(0);
    expect(el.visible).toBe(false);

    el.emitLayoutEvent();

    expect(el.paintWithheld).toBe(false);
    expect(el.hasLayout).toBe(true);
    expect(el.node.alpha).toBe(1);
    expect(el.visible).toBe(true);
  });

  it('restores the originally styled alpha (not 1) on reveal', () => {
    const el = createElement({ w: 100, h: 50, alpha: 0.5 });

    el.withholdPaintUntilLayout();
    expect(el.node.alpha).toBe(0);

    el.emitLayoutEvent();
    expect(el.node.alpha).toBe(0.5);
  });

  it('is a no-op for a zero-sized node (nothing to flash)', () => {
    const el = createElement({ alpha: 1 });

    el.withholdPaintUntilLayout();

    expect(el.paintWithheld).toBe(false);
    expect(el.node.alpha).toBe(1);
  });

  it('is a no-op for an already-invisible node', () => {
    const el = createElement({ w: 100, h: 50, alpha: 0 });

    el.withholdPaintUntilLayout();

    expect(el.paintWithheld).toBe(false);
    expect(el.node.alpha).toBe(0);
  });

  it('is a no-op once a layout has already resolved', () => {
    const el = createElement({ w: 100, h: 50, alpha: 1 });

    el.emitLayoutEvent();
    el.withholdPaintUntilLayout();

    expect(el.paintWithheld).toBe(false);
    expect(el.node.alpha).toBe(1);
  });

  it('keeps the node hidden but records a styled alpha change made while withheld', async () => {
    const el = createElement({ w: 100, h: 50, alpha: 1 });

    el.withholdPaintUntilLayout();
    expect(el.node.alpha).toBe(0);

    // App changes alpha before the first layout arrives — the node must stay
    // hidden, but reveal at the new value.
    el.setProps({ style: { alpha: 0.25 } });
    await flush();

    expect(el.node.alpha).toBe(0);
    expect(el.paintWithheld).toBe(true);

    el.emitLayoutEvent();
    expect(el.node.alpha).toBe(0.25);
  });

  it('reveals immediately when released before a layout (e.g. detached by a boundary)', () => {
    const el = createElement({ w: 100, h: 50, alpha: 1 });

    el.withholdPaintUntilLayout();
    expect(el.node.alpha).toBe(0);

    el.releaseWithheldPaint();

    expect(el.paintWithheld).toBe(false);
    expect(el.node.alpha).toBe(1);
    // Released without a layout — still not laid out.
    expect(el.hasLayout).toBe(false);
  });
});

describe('LightningViewElement border shader', () => {
  // A renderer whose createShader returns a tagged shader so we can assert the
  // node actually received it.
  const borderShader = { props: {}, type: 'Border' };
  const shaderRenderer = {
    createNode: (props: Record<string, unknown>) => createMockNode(props),
    createTextNode: (props: Record<string, unknown>) => createMockNode(props),
    createShader: () => borderShader,
    createTexture: () => ({}),
    destroyNode() {},
  } as unknown as RendererMain;

  function createShaderElement(style: Partial<LightningViewElementStyle>) {
    const props = {
      style,
    } as LightningViewElementProps<LightningViewElementStyle>;

    return new LightningViewElement(props, shaderRenderer, [], {} as Fiber);
  }

  it('paints a border shader when one is added to an already-mounted node, then clears it on removal', async () => {
    // Starts with no border — the focus-ring case toggles it on later.
    const el = createShaderElement({ w: 100, h: 50 });

    // Add a border (e.g. a focus ring). Without `border` forcing the slow path
    // this would silently fast-path and never create a shader.
    el.setProps({
      style: { w: 100, h: 50, border: { w: 4, color: 0xffffffff } },
    });
    await flush();
    expect(el.node.shader).toBe(borderShader);

    // Remove the border (blur). The shader must be cleared, not left painting.
    el.setProps({ style: { w: 100, h: 50 } });
    await flush();
    expect(el.node.shader).toBeNull();
  });
});

describe('LightningViewElement no-op animation skip', () => {
  function createSpyElement(style: Partial<LightningViewElementStyle>) {
    let animateCalls = 0;
    const node = createMockNode({
      animate() {
        animateCalls++;

        return { once() {}, start() {} };
      },
    });
    const spyRenderer = {
      createNode: () => node,
      createTextNode: () => node,
      createShader: () => ({ props: {} }),
      createTexture: () => ({}),
      destroyNode() {},
    } as unknown as RendererMain;
    const el = new LightningViewElement(
      { style } as LightningViewElementProps<LightningViewElementStyle>,
      spyRenderer,
      [],
      {} as Fiber,
    );

    return { el, node, calls: () => animateCalls };
  }

  it('skips animating a prop to its current value', () => {
    const { el, node, calls } = createSpyElement({ alpha: 1 });

    node.alpha = 1;
    el.animateStyle('alpha', 1);

    expect(calls()).toBe(0);
    expect(node.alpha).toBe(1);
  });

  it('still animates a real value change', () => {
    const { el, node, calls } = createSpyElement({ alpha: 1 });

    node.alpha = 1;
    el.animateStyle('alpha', 0.4);

    expect(calls()).toBe(1);
  });

  it('does not skip when an in-flight animation targets a different value', () => {
    const { el, node, calls } = createSpyElement({ alpha: 1 });

    // In-flight: alpha animating toward 0.
    el.animateStyle('alpha', 0);
    expect(calls()).toBe(1);

    // Node happens to sit at 0.5 mid-animation; a request for 0.5 must still
    // start a new animation (otherwise the old one keeps running to 0).
    (node as { alpha: number }).alpha = 0.5;
    el.animateStyle('alpha', 0.5);
    expect(calls()).toBe(2);
  });

  it('skips a repeat of the same in-flight target once the value arrived', () => {
    const { el, node, calls } = createSpyElement({ alpha: 1 });

    el.animateStyle('alpha', 0);
    expect(calls()).toBe(1);

    (node as { alpha: number }).alpha = 0;
    el.animateStyle('alpha', 0);
    expect(calls()).toBe(1);
  });
});
