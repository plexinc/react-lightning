import type { RendererMain } from '@lightningjs/renderer';
import { createElement, type ReactNode } from 'react';
import createReconciler from 'react-reconciler';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LightningViewElement } from '../element/LightningViewElement';
import { type LightningElement, LightningElementType } from '../types';
import { createHostConfig } from './createHostConfig';

const destroyedNodes: number[] = [];
let nodeId = 100;

const makeNode = (props: Record<string, unknown>) => {
  const node = {
    ...props,
    id: nodeId++,
    alpha: 1,
    w: 0,
    h: 0,
    parent: null,
    on: () => {},
    off: () => {},
    emit: () => {},
    destroy: () => destroyedNodes.push(node.id),
  };

  return node;
};

const renderer = {
  createNode: makeNode,
  createTextNode: makeNode,
  destroyNode: (node: { destroy: () => void }) => node.destroy(),
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

  return (element: ReactNode) => {
    reconciler.updateContainerSync(element, container, null, null);
    reconciler.flushSyncWork();
    reconciler.flushPassiveEffects();
  };
}

const view = (props: Record<string, unknown>, ...children: ReactNode[]) =>
  createElement(LightningElementType.View, props, ...children);

const elementsById = () => ({ ...LightningViewElement.allElements });

afterEach(() => {
  destroyedNodes.length = 0;
  vi.restoreAllMocks();
});

describe('deleting a subtree', () => {
  const tree = (showList: boolean, color: number) =>
    view(
      { style: { color } },
      showList
        ? view(
            { key: 'list', style: { color } },
            view({ key: 'a', style: { color } }, view({ style: { color } })),
            view({ key: 'b', style: { color } }),
            createElement(LightningElementType.Text, { key: 't', style: { color } }, 'hi'),
          )
        : null,
    );

  it('destroys every node once and only tells the surviving parent', () => {
    const render = setup();

    render(tree(true, 1));
    // An update gives every fiber an alternate, which is what makes React call
    // detachDeletedInstance twice per instance.
    render(tree(true, 2));

    const before = elementsById();
    const root = Object.values(before).find((el) => el.children.length === 1 && !el.parent?.parent);
    const list = root?.children[0] as LightningElement;
    const dying = [list];

    for (let i = 0; i < dying.length; i++) {
      dying.push(...(dying[i] as LightningElement).children);
    }

    const destroy = vi.spyOn(LightningViewElement.prototype, 'destroy');
    const removed: Array<[number, number]> = [];

    for (const el of [root, ...dying] as LightningElement[]) {
      el.on('childRemoved', (child) => removed.push([el.id, child.id]));
    }

    render(tree(false, 2));

    expect(removed).toEqual([[root?.id, list.id]]);
    expect(root?.children).toEqual([]);
    expect(new Set(destroyedNodes).size).toBe(destroyedNodes.length);
    expect(destroyedNodes.sort()).toEqual(dying.map((el) => el.node.id).sort());
    expect(destroy.mock.calls.length).toBeGreaterThanOrEqual(dying.length);

    for (const el of dying) {
      expect(LightningViewElement.allElements[el.id]).toBeUndefined();
      expect(el.children).toEqual([]);
    }
  });
});

describe('destroying outside a React deletion', () => {
  const make = () =>
    new LightningViewElement({ style: {} }, renderer, [], { _debugInfo: {} } as never);

  it('still detaches a live element from its parent', () => {
    const parent = make();
    const child = make();
    const removed = vi.fn();

    parent.insertChild(child);
    parent.on('childRemoved', removed);
    child.destroy();

    expect(parent.children).toEqual([]);
    expect(removed).toHaveBeenCalledOnce();
  });

  it('runs once when called again', () => {
    const parent = make();
    const child = make();
    const destroyed = vi.fn();

    parent.insertChild(child);
    child.on('destroy', destroyed);
    parent.destroy();
    child.destroy();
    parent.destroy();

    expect(destroyed).toHaveBeenCalledOnce();
    expect(new Set(destroyedNodes).size).toBe(2);
    expect(destroyedNodes).toHaveLength(2);
  });
});
