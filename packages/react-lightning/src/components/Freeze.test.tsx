import type { RendererMain } from '@lightningjs/renderer';
import { createElement, useState } from 'react';
import createReconciler from 'react-reconciler';
import { describe, expect, it, vi } from 'vitest';

import { LightningViewElement } from '../element/LightningViewElement';
import { createHostConfig } from '../render/createHostConfig';
import { LightningElementType } from '../types';
import { Freeze } from './Freeze';

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

function setup() {
  const reconciler = createReconciler(createHostConfig());
  const container = reconciler.createContainer(
    { renderer, plugins: [] },
    0,
    null,
    false,
    null,
    '',
    () => {},
    () => {},
    () => {},
    () => {},
  );

  const render = (element: Parameters<typeof reconciler.updateContainerSync>[0]) => {
    reconciler.updateContainerSync(element, container, null, null);
    reconciler.flushSyncWork();
  };

  return { render };
}

describe('Freeze', () => {
  it('hides the subtree while frozen and keeps its state', () => {
    const hidden = vi.spyOn(LightningViewElement.prototype, 'setReactHidden');
    const renders = vi.fn();
    let setCount: (n: number) => void = () => {};

    const Counter = () => {
      const [count, set] = useState(0);
      setCount = set;
      renders(count);

      return createElement(LightningElementType.View, { style: {} });
    };

    const { render } = setup();
    const tree = (frozen: boolean) => createElement(Freeze, { frozen }, createElement(Counter));

    render(tree(false));
    setCount(1);
    render(tree(false));
    expect(renders).toHaveBeenLastCalledWith(1);
    expect(hidden).not.toHaveBeenCalled();

    render(tree(true));
    expect(hidden).toHaveBeenLastCalledWith(true);

    renders.mockClear();
    setCount(2);
    render(tree(true));
    expect(renders).not.toHaveBeenCalled();

    renders.mockClear();
    render(tree(false));
    expect(hidden.mock.calls.at(-1)?.[0]).toBe(false);
    expect(renders).toHaveBeenLastCalledWith(2);

    hidden.mockRestore();
  });
});
