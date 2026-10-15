import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, expect, it } from 'vitest';

import type { LightningViewElementProps, LightningViewElementStyle } from '../types';
import { LightningViewElement } from './LightningViewElement';

// Like the renderer's CoreNode: alpha and clipping setters always dirty the
// node, so every write counts.
class CountingNode {
  public x = 0;
  public y = 0;
  public w = 0;
  public h = 0;
  public color = 0;
  public shader = { props: {} };
  public parent: unknown = null;
  public writes: string[] = [];
  private _alpha = 1;
  private _clipping = false;

  public constructor(props: Record<string, unknown>) {
    Object.assign(this, props);
    this.writes.length = 0;
  }

  public get alpha() {
    return this._alpha;
  }

  public set alpha(value: number) {
    this.writes.push(`alpha=${value}`);
    this._alpha = value;
  }

  public get clipping() {
    return this._clipping;
  }

  public set clipping(value: boolean) {
    this.writes.push(`clipping=${value}`);
    this._clipping = value;
  }

  public on() {}
  public off() {}
  public animate() {
    return { once() {}, start() {} };
  }
  public destroy() {}
}

const renderer = {
  createNode: (props: Record<string, unknown>) => new CountingNode(props),
  createTextNode: (props: Record<string, unknown>) => new CountingNode(props),
  createShader: () => ({ props: {} }),
  createTexture: () => ({}),
  destroyNode() {},
} as unknown as RendererMain;

function createElement(props: Record<string, unknown>) {
  return new LightningViewElement(
    props as unknown as LightningViewElementProps<LightningViewElementStyle>,
    renderer,
    [],
    {} as Fiber,
  );
}

const flush = () => Promise.resolve();
const writes = (el: LightningViewElement) => (el.node as unknown as CountingNode).writes;

describe('LightningViewElement unguarded node props', () => {
  it('does not rewrite an unchanged alpha or clipping on a full update', async () => {
    const el = createElement({ testID: 'a', style: { alpha: 0.5, clipping: true, w: 10 } });

    el.setProps({ testID: 'b' });
    await flush();

    expect(writes(el)).toEqual([]);
    expect(el.node.alpha).toBe(0.5);
    expect(el.node.clipping).toBe(true);
  });

  it('still writes them when they change, on the full and the style-only path', async () => {
    const el = createElement({ testID: 'a', style: { alpha: 0.5, clipping: true, w: 10 } });

    el.setProps({ testID: 'b', style: { alpha: 1, clipping: false, w: 10 } });
    await flush();
    expect(writes(el)).toEqual(['alpha=1', 'clipping=false']);

    el.setProps({ style: { alpha: 1, clipping: true } });
    await flush();
    expect(writes(el)).toEqual(['alpha=1', 'clipping=false', 'clipping=true']);
    expect(el.node.alpha).toBe(1);
  });
});
