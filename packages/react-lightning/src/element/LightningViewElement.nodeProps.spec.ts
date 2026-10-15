import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, expect, it } from 'vitest';

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

function createRenderer(created: Record<string, unknown>[]) {
  return {
    createNode: (props: Record<string, unknown>) => {
      created.push(props);

      return createMockNode(props);
    },
    createTextNode: (props: Record<string, unknown>) => createMockNode(props),
    createShader: () => ({ props: {} }),
    createTexture: () => ({}),
    destroyNode() {},
  } as unknown as RendererMain;
}

function createElement(props: Record<string, unknown>, created: Record<string, unknown>[] = []) {
  return new LightningViewElement(
    props as unknown as LightningViewElementProps<LightningViewElementStyle>,
    createRenderer(created),
    [],
    {} as Fiber,
  );
}

describe('LightningViewElement node props', () => {
  it('merges style keys after the top-level props, style winning in place', () => {
    const el = createElement({
      alpha: 0.5,
      testID: 'tile',
      style: { color: 3, alpha: 0.25, w: 10 },
    });
    const props = el._toLightningNodeProps(el.props, true);

    expect(Object.keys(props)).toEqual(['alpha', 'testID', 'color', 'w']);
    expect(props).toEqual({ alpha: 0.25, testID: 'tile', color: 3, w: 10 });
  });

  it('drops id, data, style, shader and texture from the top level', () => {
    const el = createElement({ id: 'x', data: { a: 1 }, focusable: true, style: { w: 1 } });
    const props = el._toLightningNodeProps(el.props, true) as Record<string, unknown>;

    expect(props).toEqual({ focusable: true, w: 1, color: 0 });
  });

  it('keeps a top-level value when the style value is null', () => {
    const el = createElement({ x: 4, style: { x: null } });

    expect(el._toLightningNodeProps(el.props, true)).toMatchObject({ x: 4 });
  });

  it('never hands the renderer a data prop', () => {
    const created: Record<string, unknown>[] = [];

    createElement({ data: { a: 1 }, style: { data: { b: 2 }, w: 5 } }, created);
    createElement({ style: { w: 6 } }, created);

    expect(created).toHaveLength(2);
    expect('data' in (created[0] as object)).toBe(false);
    expect(created[0]).toMatchObject({ w: 5 });
    expect(created[1]).toMatchObject({ w: 6 });
  });
});
