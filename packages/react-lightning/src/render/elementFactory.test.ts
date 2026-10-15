import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, expect, it, vi } from 'vitest';

import { LightningTextElement } from '../element/LightningTextElement';
import { LightningViewElement } from '../element/LightningViewElement';
import { type LightningElement, LightningElementType } from '../types';
import { createHostConfig, type ReconcilerContainer } from './createHostConfig';
import type { ElementFactory } from './RendererBackend';

const makeNode = (props: Record<string, unknown>) => ({
  ...props,
  on: () => {},
  off: () => {},
  emit: () => {},
});
const renderer = { createNode: makeNode, createTextNode: makeNode } as unknown as RendererMain;
const fiber = { _debugInfo: {} } as unknown as Fiber;

type HostConfigCalls = {
  createInstance(...args: unknown[]): LightningElement;
  createTextInstance(...args: unknown[]): LightningElement;
};

describe('element factory', () => {
  it('creates react-lightning elements when the container has no factory', () => {
    const hostConfig = createHostConfig() as unknown as HostConfigCalls;
    const container: ReconcilerContainer = { renderer, plugins: [] };

    const view = hostConfig.createInstance(
      LightningElementType.View,
      { style: {} },
      container,
      container,
      fiber,
    );
    const text = hostConfig.createTextInstance('hi', container, container, fiber);

    expect(view).toBeInstanceOf(LightningViewElement);
    expect(text).toBeInstanceOf(LightningTextElement);
  });

  it('routes instances and text instances through the factory', () => {
    const made = { isTextElement: false } as unknown as LightningElement;
    const createElement = vi.fn<ElementFactory['createElement']>(() => made);
    const hostConfig = createHostConfig() as unknown as HostConfigCalls;
    const container: ReconcilerContainer = { renderer, plugins: [], createElement };

    expect(
      hostConfig.createInstance(
        LightningElementType.Image,
        { src: 'a.png' },
        container,
        container,
        fiber,
      ),
    ).toBe(made);
    expect(hostConfig.createTextInstance('hi', container, container, fiber)).toBe(made);

    expect(createElement).toHaveBeenNthCalledWith(
      1,
      LightningElementType.Image,
      { src: 'a.png' },
      renderer,
      [],
      fiber,
    );
    expect(createElement).toHaveBeenNthCalledWith(
      2,
      LightningElementType.Text,
      { text: 'hi' },
      renderer,
      [],
      fiber,
    );
  });
});
