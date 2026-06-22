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
