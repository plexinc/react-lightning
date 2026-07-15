import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { cssClassNameTransformPlugin } from './cssClassNameTransformPlugin';

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
    const instance = {} as never;

    const out = plugin.transformProps?.(instance, {
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
    const instance = {} as never;

    plugin.transformProps?.(instance, {
      className: 'r-col',
      style: { display: 'flex' },
    });

    // className is unchanged so the update payload omits it; the resolved class
    // styles must still ride along or downstream consumers see them as removed.
    const out = plugin.transformProps?.(instance, {
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
    const instance = {} as never;

    plugin.transformProps?.(instance, { className: 'r-col', style: {} });
    const out = plugin.transformProps?.(instance, { className: 'r-row', style: {} });

    expect(out?.style).toMatchObject({ flexDirection: 'row' });
  });

  it('passes through instances that never had a className', () => {
    const plugin = cssClassNameTransformPlugin();
    const instance = {} as never;

    const props = { style: { display: 'none' } };
    const out = plugin.transformProps?.(instance, props);

    expect(out).toBe(props);
  });
});
