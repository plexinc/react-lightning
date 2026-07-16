import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, expect, it } from 'vitest';

import { LightningViewElement } from '../element/LightningViewElement';
import type { LightningElement, LightningElementProps } from '../types';
import { createHostConfig } from './createHostConfig';
import type { Plugin } from './Plugin';

// Element updates flush in a microtask; two ticks covers the nested schedule.
const flush = () =>
  new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(() => resolve())));

function createElement(styleLog: Array<Record<string, unknown>>) {
  const makeNode = (props: Record<string, unknown>) => ({
    ...props,
    on: () => {},
    off: () => {},
    emit: () => {},
  });
  const renderer = {
    createNode: makeNode,
    createTextNode: makeNode,
  } as unknown as RendererMain;

  // Mimics the flexbox plugin: handles layout props so updates take the
  // slow path, and records every style payload it is handed.
  const plugin: Plugin<LightningElement> = {
    handledStyleProps: new Set(['display', 'alpha', 'w']),
    transformProps(_instance, props) {
      const style = (props as { style?: Record<string, unknown> }).style;

      if (style) {
        styleLog.push({ ...style });
      }

      return props;
    },
  };

  return new LightningViewElement({ style: {} } as LightningElementProps, renderer, [plugin], {
    _debugInfo: {},
  } as unknown as Fiber);
}

describe('hideInstance / unhideInstance', () => {
  it('removes a hidden instance from layout, not just from paint', async () => {
    const styleLog: Array<Record<string, unknown>> = [];
    const element = createElement(styleLog);
    const hostConfig = createHostConfig();

    styleLog.length = 0;
    hostConfig.hideInstance?.(element);
    await flush();

    const style = styleLog.at(-1);
    expect(style).toMatchObject({ display: 'none', alpha: 0 });
  });

  it('keeps a hidden instance hidden across later style updates', async () => {
    const styleLog: Array<Record<string, unknown>> = [];
    const element = createElement(styleLog);
    const hostConfig = createHostConfig();

    hostConfig.hideInstance?.(element);
    await flush();

    // A React commit inside the hidden tree pushes a full style; the
    // flexbox plugin resets keys missing from it, so display must be
    // re-stamped or the tree pops back into layout.
    styleLog.length = 0;
    element.setProps({ style: { w: 100 } } as Partial<LightningElementProps>);
    await flush();

    const style = styleLog.at(-1);
    expect(style).toMatchObject({ display: 'none', alpha: 0, w: 100 });
  });

  it('restores display and opacity from props on unhide', async () => {
    const styleLog: Array<Record<string, unknown>> = [];
    const element = createElement(styleLog);
    const hostConfig = createHostConfig();

    hostConfig.hideInstance?.(element);
    await flush();

    styleLog.length = 0;
    hostConfig.unhideInstance?.(element, {
      style: { opacity: 0.5 },
    } as LightningElementProps);
    await flush();

    const style = styleLog.at(-1);
    expect(style).toMatchObject({ display: 'flex', alpha: 0.5 });
  });
});
