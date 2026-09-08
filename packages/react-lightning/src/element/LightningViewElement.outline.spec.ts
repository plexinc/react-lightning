import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LightningViewElementProps, LightningViewElementStyle } from '../types';
import { LightningViewElement } from './LightningViewElement';
import { PARTIAL_STYLE } from './partialStyle';

type Shader = { type: string; props: Record<string, unknown> };

const created: Shader[] = [];

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
  createShader: (type: string, props: Record<string, unknown>) => {
    created.push({ type, props });

    return { props: { ...props } };
  },
  createTexture: () => ({}),
  destroyNode() {},
} as unknown as RendererMain;

function createElement(style: Partial<LightningViewElementStyle>) {
  return new LightningViewElement(
    { style } as LightningViewElementProps<LightningViewElementStyle>,
    renderer,
    [],
    {} as Fiber,
  );
}

// setProps stages the update and flushes on a microtask.
const flush = () => Promise.resolve();

describe('outline', () => {
  beforeEach(() => {
    created.length = 0;
  });

  it('draws it with the border shader, outside the node', () => {
    createElement({ w: 100, h: 50, outlineWidth: 4, outlineColor: 0xff0000ff, outlineOffset: 2 });

    expect(created).toEqual([
      {
        type: 'Border',
        props: { w: 4, color: 0xff0000ff, align: 'outside', gap: 2 },
      },
    ]);
  });

  it('keeps the corners rounded with a border radius', () => {
    createElement({ w: 100, h: 50, borderRadius: 8, outlineWidth: 4, outlineColor: 0xff0000ff });

    expect(created).toEqual([
      {
        type: 'RoundedWithBorder',
        props: {
          radius: 8,
          'border-w': 4,
          'border-color': 0xff0000ff,
          'border-align': 'outside',
          'border-gap': 0,
        },
      },
    ]);
  });

  it('lets a border win, since they share the one shader', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createElement({ w: 100, h: 50, border: { w: 2, color: 0x00ff00ff }, outlineWidth: 4 });

    expect(created).toEqual([{ type: 'Border', props: { w: 2, color: 0x00ff00ff } }]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('keeps the outline width when only the color is pushed', async () => {
    const el = createElement({ w: 100, h: 50, outlineWidth: 4, outlineColor: 0x00000000 });

    el.setProps({
      style: { outlineColor: 0xff0000ff, [PARTIAL_STYLE]: true },
    } as unknown as Partial<LightningViewElementProps<LightningViewElementStyle>>);

    await flush();

    // Same shader type, so the live props are updated in place.
    expect(el.node.shader.props).toMatchObject({ w: 4, color: 0xff0000ff, align: 'outside' });
  });
});
