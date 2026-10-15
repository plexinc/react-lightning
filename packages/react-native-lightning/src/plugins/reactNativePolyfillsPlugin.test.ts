import { describe, expect, it } from 'vitest';

import { LightningViewElement, type LightningViewElementProps } from '@plextv/react-lightning';

import { reactNativePolyfillsPlugin } from './reactNativePolyfillsPlugin';

type LoadedElement = LightningViewElement & {
  __loaded?: boolean;
  measure(callback: (...args: number[]) => void): void;
};

function createMockNode(props: Record<string, unknown> = {}) {
  return {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    alpha: 1,
    color: 0,
    shader: { props: {} },
    parent: null as unknown,
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
} as unknown as ConstructorParameters<typeof LightningViewElement>[1];
const fiber = {} as ConstructorParameters<typeof LightningViewElement>[3];

async function setup() {
  const plugin = reactNativePolyfillsPlugin();

  await plugin.init?.(renderer, null as never);

  return (style: Record<string, unknown>) =>
    new LightningViewElement(
      { style } as LightningViewElementProps,
      renderer,
      [plugin],
      fiber,
    ) as LoadedElement;
}

describe('reactNativePolyfillsPlugin load tracking', () => {
  it('marks an element loaded on its first layout, after the layout listeners', async () => {
    const create = await setup();
    const el = create({ w: 10, h: 10 });
    const seen: (boolean | undefined)[] = [];

    el.on('layout', () => seen.push(el.__loaded));
    expect(el.__loaded).toBeUndefined();

    el.emitLayoutEvent();
    el.emitLayoutEvent();

    expect(seen).toEqual([undefined, true]);
    expect(el.__loaded).toBe(true);
  });

  it('answers a measure made before the first layout once it lands', async () => {
    const create = await setup();
    const el = create({ w: 10, h: 20 });
    const calls: number[][] = [];

    el.measure((...args) => calls.push(args));
    await Promise.resolve();
    expect(calls).toEqual([]);

    el.emitLayoutEvent();
    await Promise.resolve();
    await Promise.resolve();

    expect(calls).toHaveLength(1);
  });

  it('falls back to a layout listener for elements without observers', async () => {
    const plugin = reactNativePolyfillsPlugin();
    const listeners: (() => void)[] = [];
    const fake = {
      once: (_event: string, listener: () => void) => listeners.push(listener),
    } as unknown as { __loaded?: boolean };

    plugin.onCreateInstance?.(fake as never, {} as never, fiber);
    listeners.forEach((listener) => listener());

    expect(fake.__loaded).toBe(true);
  });
});
