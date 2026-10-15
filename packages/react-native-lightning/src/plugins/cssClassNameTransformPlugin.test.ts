import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  type LightningElement,
  type LightningViewElementProps,
  LightningViewElement,
  type Plugin,
} from '@plextv/react-lightning';
import { plugin as cssPlugin } from '@plextv/react-lightning-plugin-css-transform';

import { cssClassNameTransformPlugin } from './cssClassNameTransformPlugin';

type TestProps = { className?: string; style: Record<string, string> };

// transformProps is typed against the element prop union; the plugin only
// reads className/style, so the test payloads cast through.
const transform = (plugin: Plugin<LightningElement>, instance: object, props: TestProps) =>
  plugin.transformProps?.(instance as never, props as never) as TestProps | null | undefined;

const fakeDocument = {
  styleSheets: [
    {
      ownerNode: { id: 'react-native-stylesheet' },
      cssRules: [
        {
          selectorText: '.r-col',
          style: { cssText: 'flex-direction: column; align-items: stretch' },
        },
        {
          selectorText: '.r-row',
          style: { cssText: 'flex-direction: row' },
        },
      ],
    },
  ],
};

beforeAll(() => {
  vi.stubGlobal('document', fakeDocument);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('cssClassNameTransformPlugin', () => {
  it('resolves className rules into the style object', () => {
    const plugin = cssClassNameTransformPlugin();
    const instance = {};

    const out = transform(plugin, instance, {
      className: 'r-col',
      style: { display: 'flex' },
    });

    expect(out?.style).toMatchObject({
      flexDirection: 'column',
      alignItems: 'stretch',
      display: 'flex',
    });
  });

  it('keeps class-derived styles on updates that omit className', () => {
    const plugin = cssClassNameTransformPlugin();
    const instance = {};

    transform(plugin, instance, {
      className: 'r-col',
      style: { display: 'flex' },
    });

    // className is unchanged so the update payload omits it; the resolved class
    // styles must still ride along or downstream consumers see them as removed.
    const out = transform(plugin, instance, {
      style: { display: 'none' },
    });

    expect(out?.style).toMatchObject({
      flexDirection: 'column',
      alignItems: 'stretch',
      display: 'none',
    });
  });

  it('re-resolves when className changes', () => {
    const plugin = cssClassNameTransformPlugin();
    const instance = {};

    transform(plugin, instance, { className: 'r-col', style: {} });
    const out = transform(plugin, instance, { className: 'r-row', style: {} });

    expect(out?.style).toMatchObject({ flexDirection: 'row' });
  });

  it('passes through instances that never had a className', () => {
    const plugin = cssClassNameTransformPlugin();
    const instance = {};

    const props: TestProps = { style: { display: 'none' } };
    const out = transform(plugin, instance, props);

    expect(out).toBe(props);
  });
});

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

// Records the styles that reach the transform pipeline. Claims no style keys
// itself, so a style-only update only goes slow when another plugin asks.
function recorder() {
  const styles: Array<Record<string, unknown>> = [];
  const plugin: Plugin<LightningElement> = {
    handledStyleProps: new Set(),
    transformProps(_instance, props) {
      const style = (props as { style?: Record<string, unknown> }).style;

      if (style) {
        styles.push({ ...style });
      }

      return props;
    },
  };

  return { plugin, styles };
}

function createElement(props: Record<string, unknown>, plugins: Plugin<LightningElement>[]) {
  return new LightningViewElement(
    props as unknown as LightningViewElementProps,
    renderer,
    plugins,
    {} as Fiber,
  );
}

const flush = () => Promise.resolve();

describe('cssClassNameTransformPlugin style fast path', () => {
  it('lets style-only updates skip the pipeline when the element has no className', async () => {
    const rec = recorder();
    const el = createElement({ style: { w: 10 } }, [cssClassNameTransformPlugin(), rec.plugin]);

    rec.styles.length = 0;
    el.setProps({ style: { alpha: 0.5 } });
    await flush();

    expect(rec.styles).toEqual([]);
    expect(el.node.alpha).toBe(0.5);
  });

  it('keeps merging remembered class styles into style-only updates', async () => {
    const rec = recorder();
    const el = createElement({ className: 'r-col', style: { w: 10 } }, [
      cssClassNameTransformPlugin(),
      rec.plugin,
    ]);

    rec.styles.length = 0;
    el.setProps({ style: { alpha: 0.5 } });
    await flush();

    expect(rec.styles).toEqual([{ flexDirection: 'column', alignItems: 'stretch', alpha: 0.5 }]);
    expect(el.props.style).toMatchObject({ flexDirection: 'column', alpha: 0.5 });
  });

  it('starts merging once a className is added later', async () => {
    const rec = recorder();
    const el = createElement({ style: { w: 10 } }, [cssClassNameTransformPlugin(), rec.plugin]);

    el.setProps({ className: 'r-row' } as never);
    await flush();

    rec.styles.length = 0;
    el.setProps({ style: { alpha: 0.5 } });
    await flush();

    expect(rec.styles).toEqual([{ flexDirection: 'row', alpha: 0.5 }]);
  });

  it('goes back to the fast path once the className resolves to nothing', async () => {
    const rec = recorder();
    const el = createElement({ className: 'r-col', style: { w: 10 } }, [
      cssClassNameTransformPlugin(),
      rec.plugin,
    ]);

    el.setProps({ className: '' } as never);
    await flush();

    rec.styles.length = 0;
    el.setProps({ style: { alpha: 0.5 } });
    await flush();

    expect(rec.styles).toEqual([]);
    expect(el.node.alpha).toBe(0.5);
  });

  it('runs the pipeline for an update that carries className and style together', async () => {
    const rec = recorder();
    const el = createElement({ style: { w: 10 } }, [cssClassNameTransformPlugin(), rec.plugin]);

    rec.styles.length = 0;
    el.setProps({ className: 'r-row', style: { alpha: 0.5 } } as never);
    await flush();

    expect(rec.styles).toEqual([{ flexDirection: 'row', alpha: 0.5 }]);
  });

  it('leaves css-transform keys on the slow path', async () => {
    const rec = recorder();
    const el = createElement({ style: { w: 10 } }, [
      cssClassNameTransformPlugin(),
      cssPlugin(),
      rec.plugin,
    ]);

    rec.styles.length = 0;
    el.setProps({ style: { alpha: 0.5 } });
    await flush();
    expect(rec.styles).toEqual([]);

    el.setProps({ style: { opacity: 0.25 } } as never);
    await flush();
    expect(rec.styles).toHaveLength(1);
    expect(el.node.alpha).toBe(0.25);
  });
});
