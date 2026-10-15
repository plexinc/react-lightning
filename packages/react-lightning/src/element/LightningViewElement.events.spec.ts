import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, expect, it, vi } from 'vitest';

import type { LightningViewElementProps, LightningViewElementStyle } from '../types';
import { AllStyleProps } from './AllStyleProps';
import { LightningViewElement } from './LightningViewElement';
import { PARTIAL_STYLE } from './partialStyle';

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

const destroyNode = vi.fn();
const renderer = {
  createNode: (props: Record<string, unknown>) => createMockNode(props),
  createTextNode: (props: Record<string, unknown>) => createMockNode(props),
  createShader: () => ({ props: {} }),
  createTexture: () => ({}),
  destroyNode,
} as unknown as RendererMain;

function createElement(style: Partial<LightningViewElementStyle> = {}) {
  return new LightningViewElement(
    { style } as LightningViewElementProps<LightningViewElementStyle>,
    renderer,
    [],
    {} as Fiber,
  );
}

const flush = () => Promise.resolve();

describe('LightningViewElement events', () => {
  it('returns a disposer from on that removes the listener', () => {
    const el = createElement();
    const calls: unknown[] = [];
    const dispose = el.on('layout', (dimensions) => calls.push(dimensions));

    el.emit('layout', { x: 1, y: 2, w: 3, h: 4 });
    dispose();
    el.emit('layout', { x: 0, y: 0, w: 0, h: 0 });

    expect(calls).toEqual([{ x: 1, y: 2, w: 3, h: 4 }]);
  });

  it('fires a once listener a single time and its disposer is safe after', () => {
    const el = createElement();
    const listener = vi.fn();
    const dispose = el.once('textChanged', listener);

    el.emit('textChanged', el);
    el.emit('textChanged', el);
    dispose();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('works when the methods are called through the instance from other code', () => {
    const el = createElement();
    const listener = vi.fn();

    el.on('childAdded', listener);
    el.insertChild(createElement());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(el.emit('childAdded', el, 0)).toBe(true);
  });
});

describe('LightningViewElement deferred removal', () => {
  it('destroys the node once the deferred handler signals done', () => {
    destroyNode.mockClear();

    const parent = createElement({ w: 10, h: 10, color: 1 });
    const child = createElement({ w: 5, h: 5, color: 2 });
    let finish: (() => void) | undefined;

    parent.insertChild(child);
    parent.deferNodeRemoval = (done) => {
      finish = done;
    };

    parent.destroy();
    expect(destroyNode).not.toHaveBeenCalled();

    finish?.();
    expect(destroyNode).toHaveBeenCalledWith(parent.node);
    expect(destroyNode).toHaveBeenCalledWith(child.node);
  });

  it('stops listening to the old target when the target changes', () => {
    destroyNode.mockClear();

    const a = createElement({ w: 1, h: 1, color: 1 });
    const b = createElement({ w: 1, h: 1, color: 1 });
    const el = createElement({ w: 1, h: 1, color: 1 });

    el.deferTarget = a;
    el.deferTarget = b;
    a.emit('deferredDestroyComplete');

    expect(destroyNode).not.toHaveBeenCalled();

    b.emit('deferredDestroyComplete');
    expect(destroyNode).toHaveBeenCalledWith(el.node);
  });
});

describe('LightningViewElement style proxy', () => {
  it('stages an imperative set as a partial style push', async () => {
    const el = createElement({ w: 10 });
    const spy = vi.spyOn(el, 'setProps');

    el.style.color = 0xff;

    expect(spy).toHaveBeenCalledTimes(1);

    const pushed = spy.mock.calls[0]?.[0].style as Record<PropertyKey, unknown>;

    expect(pushed.color).toBe(0xff);
    expect(pushed[PARTIAL_STYLE]).toBe(true);
    expect(el.style.color).toBe(0xff);

    await flush();
    expect(el.node.color).toBe(0xff);
  });

  it('skips a set to the current value and reads staged values first', () => {
    const el = createElement({ w: 10 });
    const spy = vi.spyOn(el, 'setProps');

    el.style.w = 10;
    expect(spy).not.toHaveBeenCalled();

    el.setProps({ style: { w: 20 } });
    expect(el.style.w).toBe(20);
    expect((el.style as Record<PropertyKey, unknown>)[AllStyleProps]).toMatchObject({ w: 10 });
  });
});

describe('LightningViewElement style target', () => {
  it('merges updates into the target the style proxy reads', async () => {
    const el = createElement({ w: 10, color: 1 });

    el.setProps({ style: { w: 20 } });
    await flush();

    expect((el.style as Record<PropertyKey, unknown>)[AllStyleProps]).toMatchObject({
      w: 20,
      color: 1,
    });
  });

  it('starts a fresh target when the style prop is replaced', async () => {
    const el = createElement({ w: 10, color: 1 });

    el.style = {} as LightningViewElementStyle;
    el.setProps({ style: { h: 5 } });
    await flush();

    const target = (el.style as Record<PropertyKey, unknown>)[AllStyleProps];

    expect(target).toEqual({ h: 5 });
    expect(el.style.color).toBeUndefined();
  });
});

describe('LightningViewElement observers', () => {
  it('calls observers with the element ahead of the event listeners', () => {
    const parent = createElement();
    const child = createElement();
    const calls: string[] = [];

    parent.on('childAdded', () => calls.push('listener'));
    parent.observe({
      childAdded: (element, added, index) => {
        calls.push(`observer ${element === parent} ${added === child} ${index}`);
      },
    });

    parent.insertChild(child);

    expect(calls).toEqual(['observer true true 0', 'listener']);
  });

  it('reports child moves, removals and style changes', async () => {
    const parent = createElement();
    const [a, b] = [createElement(), createElement()];
    const calls: unknown[][] = [];

    parent.insertChild(a);
    parent.insertChild(b);
    parent.observe({
      childMoved: (_e, child, from, to) => calls.push(['moved', child === b, from, to]),
      childRemoved: (_e, child, index) => calls.push(['removed', child === a, index]),
      stylesChanged: (_e, styles) => calls.push(['styles', styles]),
      propsChanged: () => calls.push(['props']),
    });

    parent.insertChild(b, a);
    parent.removeChild(a);
    parent.setProps({ style: { w: 3 } });
    await flush();

    expect(calls).toEqual([
      ['moved', true, 1, 0],
      ['removed', true, 1],
      ['styles', { w: 3 }],
      ['props'],
    ]);
  });

  it('lets an observer unobserve while it is being notified', () => {
    const el = createElement();
    const calls: string[] = [];
    const first = {
      destroy: () => {
        calls.push('first');
        el.unobserve(first);
      },
    };
    const second = { destroy: () => calls.push('second') };

    el.observe(first);
    el.observe(second);
    el.destroy();

    expect(calls).toEqual(['first', 'second']);

    el.unobserve(second);
    el.observe(first);
    el.unobserve(first);
    el.insertChild(createElement());
    expect(calls).toEqual(['first', 'second']);
  });
});
