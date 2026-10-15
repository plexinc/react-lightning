import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, expect, it, vi } from 'vitest';

import type { Plugin } from '../render/Plugin';
import type {
  LightningElement,
  LightningViewElementProps,
  LightningViewElementStyle,
} from '../types';
import { LightningViewElement } from './LightningViewElement';

const makeNode = (props: Record<string, unknown>) => ({
  ...props,
  on() {},
  off() {},
  emit() {},
  animate: () => ({ once() {}, start() {} }),
  destroy() {},
});

const renderer = {
  createNode: makeNode,
  createTextNode: makeNode,
  createShader: () => ({ props: {} }),
  createTexture: () => ({}),
  destroyNode() {},
} as unknown as RendererMain;

function createElement(plugins: Plugin<LightningElement>[]) {
  return new LightningViewElement(
    { style: { w: 10, h: 10 } } as unknown as LightningViewElementProps<LightningViewElementStyle>,
    renderer,
    plugins,
    {} as Fiber,
  );
}

function spyPlugin(hooks: Partial<Plugin<LightningElement>>) {
  const transformProps = vi.fn((_instance: unknown, props: unknown) => props as object);

  return { plugin: { transformProps, ...hooks } as Plugin<LightningElement>, transformProps };
}

const flush = () => Promise.resolve();

describe('LightningViewElement style fast path', () => {
  it('takes the fast path when needsTransform declines the update', async () => {
    const needsTransform = vi.fn(() => false);
    const { plugin, transformProps } = spyPlugin({ needsTransform });
    const el = createElement([plugin]);

    transformProps.mockClear();
    el.setProps({ style: { alpha: 0.5 } });
    await flush();

    expect(needsTransform).toHaveBeenCalledTimes(1);
    expect(transformProps).not.toHaveBeenCalled();
    expect(el.node.alpha).toBe(0.5);
  });

  it('takes the slow path when needsTransform claims the update', async () => {
    const { plugin, transformProps } = spyPlugin({ needsTransform: () => true });
    const el = createElement([plugin]);

    transformProps.mockClear();
    el.setProps({ style: { alpha: 0.5 } });
    await flush();

    expect(transformProps).toHaveBeenCalledTimes(1);
    expect(el.node.alpha).toBe(0.5);
  });

  it('lets needsTransform replace the handledStyleProps check', async () => {
    const { plugin, transformProps } = spyPlugin({
      handledStyleProps: new Set(['alpha']),
      needsTransform: () => false,
    });
    const el = createElement([plugin]);

    transformProps.mockClear();
    el.setProps({ style: { alpha: 0.5 } });
    await flush();

    expect(transformProps).not.toHaveBeenCalled();
  });

  it('still forces the slow path for a plugin with neither hook', async () => {
    const declines = spyPlugin({ needsTransform: () => false });
    const legacy = spyPlugin({});
    const el = createElement([declines.plugin, legacy.plugin]);

    declines.transformProps.mockClear();
    legacy.transformProps.mockClear();
    el.setProps({ style: { alpha: 0.5 } });
    await flush();

    expect(declines.transformProps).toHaveBeenCalledTimes(1);
    expect(legacy.transformProps).toHaveBeenCalledTimes(1);
  });

  it('still honours handledStyleProps next to a needsTransform plugin', async () => {
    const declines = spyPlugin({ needsTransform: () => false });
    const keyed = spyPlugin({ handledStyleProps: new Set(['w']) });
    const el = createElement([declines.plugin, keyed.plugin]);

    keyed.transformProps.mockClear();
    el.setProps({ style: { alpha: 0.5 } });
    await flush();
    expect(keyed.transformProps).not.toHaveBeenCalled();

    el.setProps({ style: { w: 20 } });
    await flush();
    expect(keyed.transformProps).toHaveBeenCalledTimes(1);
  });

  it('keeps non-style updates on the slow path without asking needsTransform', async () => {
    const needsTransform = vi.fn(() => false);
    const { plugin, transformProps } = spyPlugin({ needsTransform });
    const el = createElement([plugin]);

    transformProps.mockClear();
    el.setProps({ style: { alpha: 0.5 }, testID: 'x' } as never);
    await flush();

    expect(needsTransform).not.toHaveBeenCalled();
    expect(transformProps).toHaveBeenCalledTimes(1);
  });

  it('keeps shader style keys on the slow path', async () => {
    const { plugin, transformProps } = spyPlugin({ needsTransform: () => false });
    const el = createElement([plugin]);

    transformProps.mockClear();
    el.setProps({ style: { borderRadius: 4 } } as never);
    await flush();

    expect(transformProps).toHaveBeenCalledTimes(1);
  });

  it('applies the style transformStyle converts without running transformProps', async () => {
    const transformStyle = vi.fn((_instance: unknown, style: object) => {
      const { opacity, ...rest } = style as { opacity?: number };

      return { ...rest, alpha: opacity };
    });
    const { plugin, transformProps } = spyPlugin({
      handledStyleProps: new Set(['opacity']),
      transformStyle,
    });
    const el = createElement([plugin]);

    transformProps.mockClear();
    el.setProps({ style: { opacity: 0.25 } } as never);
    await flush();

    expect(transformStyle).toHaveBeenCalledTimes(1);
    expect(transformProps).not.toHaveBeenCalled();
    expect(el.node.alpha).toBe(0.25);
  });

  it('falls back to transformProps when transformStyle declines', async () => {
    const { plugin, transformProps } = spyPlugin({
      handledStyleProps: new Set(['opacity']),
      transformStyle: () => null,
    });
    const el = createElement([plugin]);

    transformProps.mockClear();
    el.setProps({ style: { opacity: 0.25 } } as never);
    await flush();

    expect(transformProps).toHaveBeenCalledTimes(1);
  });

  it('checks later plugins against the converted style', async () => {
    const converts = spyPlugin({
      handledStyleProps: new Set(['width']),
      transformStyle: () => ({ w: 20 }),
    });
    const keyed = spyPlugin({ handledStyleProps: new Set(['w']) });
    const el = createElement([converts.plugin, keyed.plugin]);

    converts.transformProps.mockClear();
    keyed.transformProps.mockClear();
    el.setProps({ style: { width: 20 } } as never);
    await flush();

    expect(converts.transformProps).toHaveBeenCalledTimes(1);
    expect(keyed.transformProps).toHaveBeenCalledTimes(1);
  });

  it('keeps style arrays on the slow path', async () => {
    const { plugin, transformProps } = spyPlugin({ needsTransform: () => false });
    const el = createElement([plugin]);

    transformProps.mockClear();
    el.setProps({ style: [{ alpha: 0.5 }] } as never);
    await flush();

    expect(transformProps).toHaveBeenCalledTimes(1);
  });
});
