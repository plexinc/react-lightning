import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LightningViewElementProps, LightningViewElementStyle } from '../types';
import { LightningViewElement } from './LightningViewElement';

type MockNode = Record<string, unknown> & {
  parent: MockNode | null;
  children: MockNode[];
};

const requestRender = vi.fn();

function createMockNode(props: Record<string, unknown> = {}): MockNode {
  let parent: MockNode | null = null;
  const node = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    alpha: 1,
    color: 0,
    clipRadius: 0,
    shader: { props: {} },
    children: [] as MockNode[],
    stage: { requestRender },
    sortChildren() {},
    get parent() {
      return parent;
    },
    set parent(next: MockNode | null) {
      if (parent === next) {
        return;
      }

      if (parent) {
        parent.children.splice(parent.children.indexOf(node), 1);
      }

      parent = next;
      next?.children.push(node);
    },
    on() {},
    off() {},
    destroy() {},
    ...props,
  } as MockNode;

  return node;
}

const renderer = {
  createNode: (props: Record<string, unknown>) => createMockNode(props),
  createTextNode: (props: Record<string, unknown>) => createMockNode(props),
  createShader: () => ({ props: {} }),
  createTexture: () => ({}),
  destroyNode: vi.fn(),
} as unknown as RendererMain;

function createElement(style: Partial<LightningViewElementStyle>) {
  return new LightningViewElement(
    { style } as LightningViewElementProps<LightningViewElementStyle>,
    renderer,
    [],
    {} as Fiber,
  );
}

const real = () => createElement({ w: 10, h: 10, color: 0xffffffff });
const layout = () => createElement({ w: 10, h: 10 });
const flush = () => Promise.resolve();

const hostOrder = (host: LightningViewElement, ...elements: LightningViewElement[]) =>
  (host.node as unknown as MockNode).children.map((node) =>
    elements.findIndex((element) => (element.node as unknown) === node),
  );

describe.each([false, true])('paint order (flattenLayoutViews %s)', (flatten) => {
  beforeEach(() => {
    LightningViewElement.flattenLayoutViewsEnabled = flatten;
    requestRender.mockClear();
  });

  afterEach(() => {
    LightningViewElement.flattenLayoutViewsEnabled = false;
  });

  it('honours insertBefore', () => {
    const root = real();
    const a = real();
    const b = real();
    const c = real();

    root.insertChild(a);
    root.insertChild(c);
    root.insertChild(b, c);

    expect(hostOrder(root, a, b, c)).toEqual([0, 1, 2]);
  });

  it('follows a same-parent move', () => {
    const root = real();
    const a = real();
    const b = real();
    const c = real();

    root.insertChild(a);
    root.insertChild(b);
    root.insertChild(c);
    root.insertChild(c, a);

    expect(hostOrder(root, a, b, c)).toEqual([2, 0, 1]);
  });
});

describe('paint order with flattened views', () => {
  beforeEach(() => {
    LightningViewElement.flattenLayoutViewsEnabled = true;
  });

  afterEach(() => {
    LightningViewElement.flattenLayoutViewsEnabled = false;
  });

  it('keeps a child appended to a flattened wrapper below later siblings', () => {
    const root = real();
    const wrapper = layout();
    const first = real();
    const rail = real();
    const tile = real();

    root.insertChild(wrapper);
    root.insertChild(rail);
    wrapper.insertChild(first);
    wrapper.insertChild(tile);

    expect(hostOrder(root, first, tile, rail)).toEqual([0, 1, 2]);
  });

  it('keeps a materialized wrapper below later siblings', async () => {
    const root = real();
    const wrapper = layout();
    const content = real();
    const rail = real();

    root.insertChild(wrapper);
    wrapper.insertChild(content);
    root.insertChild(rail);

    wrapper.setProps({ style: { alpha: 0.5 } } as never);
    await flush();

    expect(wrapper.isFlattened).toBe(false);
    expect(hostOrder(root, wrapper, rail)).toEqual([0, 1]);
    expect((content.node as unknown as MockNode).parent).toBe(wrapper.node);
  });

  it('inserts a flattened subtree before the next real node', () => {
    const root = real();
    const before = real();
    const after = real();
    const wrapper = layout();
    const inner = layout();
    const x = real();
    const y = real();

    root.insertChild(before);
    root.insertChild(after);
    inner.insertChild(x);
    inner.insertChild(y);
    wrapper.insertChild(inner);
    root.insertChild(wrapper, after);

    expect(hostOrder(root, before, x, y, after)).toEqual([0, 1, 2, 3]);
  });
});
