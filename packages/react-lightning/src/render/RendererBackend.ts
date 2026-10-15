import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';

import type { LightningElement, LightningElementProps, LightningElementType } from '../types';
import type { Plugin } from './Plugin';

export type ElementFactoryOptions = {
  roundedClipping: boolean;
  flattenLayoutViews: boolean;
};

/**
 * Creates the host instances React holds. The default makes the classes in
 * `element/`; a renderer can supply its own as long as they implement the
 * `LightningElement` API the plugins and the focus system use.
 */
export type ElementFactory = {
  createElement(
    type: LightningElementType,
    props: LightningElementProps,
    renderer: RendererMain,
    plugins: Plugin<LightningElement>[],
    fiber: Fiber,
  ): LightningElement;
  configure?(options: ElementFactoryOptions): void;
};

export type RendererBackendSettings = Record<string, unknown> & {
  useCanvas?: boolean;
  includeCanvasFontRenderer?: boolean;
};

/**
 * What createRoot needs from a renderer: build it (engines and shader types
 * registered) and optionally the element classes to use with it.
 */
export type RendererBackend = {
  createRenderer(
    settings: RendererBackendSettings,
    target: string | HTMLElement,
  ): Promise<{
    renderer: RendererMain;
    shaders: Record<string, unknown>;
  }>;
  elementFactory?: ElementFactory;
};
