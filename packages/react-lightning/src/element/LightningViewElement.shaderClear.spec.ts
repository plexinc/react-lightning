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
    updateShaderUniforms: false,
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

const flush = () => Promise.resolve();

describe('clearing a shader', () => {
  it('drops a pending shader uniform update', async () => {
    const props = {
      style: { w: 100, h: 50, borderRadius: 16 },
    } as LightningViewElementProps<LightningViewElementStyle>;
    const el = new LightningViewElement(props, renderer, [], {} as Fiber);
    const node = el.node as unknown as { shader: unknown; updateShaderUniforms: boolean };

    node.updateShaderUniforms = true;
    el.setProps({ style: { w: 100, h: 50 } });
    await flush();

    expect(node.shader).toBeNull();
    expect(node.updateShaderUniforms).toBe(false);
  });
});
