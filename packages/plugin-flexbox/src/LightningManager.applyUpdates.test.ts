import { describe, expect, it } from 'vitest';

import type { LightningElement } from '@plextv/react-lightning';

import { LightningManager } from './LightningManager';

type FakeStyle = Record<string, unknown>;

function fakeElement(id: number, style: FakeStyle, rawStyle: FakeStyle, parentStyle: FakeStyle) {
  return {
    id,
    isTextElement: false,
    hasLayout: true,
    style,
    rawProps: { style: rawStyle },
    parent: { style: parentStyle },
    node: { x: -1, y: -1, w: 0, h: 0 } as Record<string, number>,
    setNodeProp(key: string, value: number) {
      if (this.node[key] === value) {
        return false;
      }

      this.node[key] = value;

      return true;
    },
    emit() {},
    emitLayoutEvent() {},
  };
}

function applyLayout(elements: ReturnType<typeof fakeElement>[], x: number, y: number) {
  const manager = new LightningManager();
  const map = (manager as unknown as { _elements: Map<number, unknown> })._elements;
  const buffer = new ArrayBuffer(20 * elements.length);
  const view = new DataView(buffer);

  elements.forEach((el, i) => {
    map.set(el.id, el as unknown as LightningElement);
    view.setUint32(i * 20, el.id, true);
    view.setInt32(i * 20 + 4, x, true);
    view.setInt32(i * 20 + 8, y, true);
    view.setInt32(i * 20 + 12, 10, true);
    view.setInt32(i * 20 + 16, 10, true);
  });

  (manager as unknown as { _applyUpdates(buffer: ArrayBuffer): void })._applyUpdates(buffer);
}

describe('LightningManager layout readback', () => {
  it('keeps an explicitly positioned axis outside a flex parent', () => {
    const el = fakeElement(1, { x: 5 }, { x: 5 }, {});

    applyLayout([el], 40, 50);

    expect(el.node.x).toBe(-1);
    expect(el.node.y).toBe(50);
  });

  it('writes the layout position inside a flex parent, under a translate, or without a raw position', () => {
    const inFlex = fakeElement(1, { x: 5 }, { x: 5 }, { display: 'flex' });
    const translated = fakeElement(2, { y: 5, transform: { translateY: 3 } }, { y: 5 }, {});
    const styleOnly = fakeElement(3, { x: 5, y: 5 }, {}, {});

    applyLayout([inFlex, translated, styleOnly], 40, 50);

    expect([inFlex.node.x, inFlex.node.y]).toEqual([40, 50]);
    expect([translated.node.x, translated.node.y]).toEqual([40, 50]);
    expect([styleOnly.node.x, styleOnly.node.y]).toEqual([40, 50]);
  });

  it('skips the style reads entirely when the raw style has no position', () => {
    const reads: PropertyKey[] = [];
    const watched = (target: FakeStyle) =>
      new Proxy(target, {
        get(t, key) {
          reads.push(key);

          return t[key as string];
        },
      });
    const el = fakeElement(1, watched({ x: 5 }), {}, watched({ display: 'none' }));

    applyLayout([el], 1, 2);

    expect(reads).toEqual([]);
    expect([el.node.x, el.node.y]).toEqual([1, 2]);
  });
});
