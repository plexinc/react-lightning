import { describe, expect, it } from 'vitest';

import {
  type LightningElement,
  LightningTextElement,
  LightningViewElement,
  type LightningViewElementProps,
  type Plugin,
} from '@plextv/react-lightning';

import { plugin } from './index';
import { getFlexboxManager } from './manager';

function createMockNode(props: Record<string, unknown> = {}) {
  return {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    alpha: 1,
    color: 0,
    text: '',
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
  const flexPlugin = plugin() as Plugin<LightningElement>;

  await flexPlugin.init?.(renderer, null as never);

  const plugins = [flexPlugin];
  const view = (style: Record<string, unknown>) =>
    new LightningViewElement({ style } as LightningViewElementProps, renderer, plugins, fiber);
  const manager = getFlexboxManager();

  if (!manager) {
    throw new Error('no flexbox manager');
  }

  const yoga = (manager as unknown as { _yogaManager: { flushLayout(): void } })._yogaManager;
  const layout = async () => {
    await Promise.resolve();
    yoga.flushLayout();
  };

  return { manager, view, plugins, layout };
}

describe('LightningManager with real elements', () => {
  it('lays out, reorders and removes children through the element observer', async () => {
    const { manager, view, layout } = await setup();
    const root = view({ w: 100, h: 10, flexDirection: 'row' });
    const [a, b, c] = [view({ w: 10, h: 10 }), view({ w: 20, h: 10 }), view({ w: 30, h: 10 })];

    root.insertChild(a);
    root.insertChild(b);
    root.insertChild(c);
    manager.markFlexRoot(root);
    await layout();

    expect([a.node.x, b.node.x, c.node.x]).toEqual([0, 10, 30]);

    root.insertChild(c, a);
    await layout();

    expect([c.node.x, a.node.x, b.node.x]).toEqual([0, 30, 40]);

    root.removeChild(a);
    await layout();

    expect([c.node.x, b.node.x]).toEqual([0, 30]);
  });

  it('applies style changes and forgets an element once it is destroyed', async () => {
    const { manager, view, layout } = await setup();
    const root = view({ w: 100, h: 10, flexDirection: 'row' });
    const a = view({ w: 10, h: 10 });
    const b = view({ w: 10, h: 10 });

    root.insertChild(a);
    root.insertChild(b);
    manager.markFlexRoot(root);
    await layout();

    a.setProps({ style: { w: 25, h: 10 } });
    await layout();

    expect(b.node.x).toBe(25);

    const elements = (manager as unknown as { _elements: Map<number, LightningElement> })._elements;

    expect(elements.has(a.id)).toBe(true);

    root.removeChild(a);
    a.destroy();

    expect(elements.has(a.id)).toBe(false);

    // A queued update landing after destroy must not reach the manager.
    a.setProps({ style: { w: 50 } });
    await layout();

    expect(elements.has(a.id)).toBe(false);
  });

  it('keeps text measurement in sync with text changes', async () => {
    const { manager, plugins } = await setup();
    const text = new LightningTextElement(
      { text: 'a', style: { fontFamily: 'Unknown' } } as never,
      renderer,
      plugins,
      fiber,
    );
    const calls: string[] = [];
    const original = (manager as unknown as { _syncTextMeasure(e: LightningElement): void })
      ._syncTextMeasure;

    (manager as unknown as { _syncTextMeasure(e: LightningElement): void })._syncTextMeasure =
      function (this: unknown, element: LightningElement) {
        calls.push((element as LightningTextElement).text);
        original.call(this, element);
      };

    text.text = 'b';
    text.setProps({ style: { fontSize: 30 } });
    await Promise.resolve();

    // textChanged, then stylesChanged and propsChanged from the update.
    expect(calls).toEqual(['b', 'b', 'b']);
  });
});
