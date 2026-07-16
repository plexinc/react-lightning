import type { LightningElement, Plugin } from '@plextv/react-lightning';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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
