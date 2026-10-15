import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber, Reconciler } from 'react-reconciler';
import type { SetOptional } from 'type-fest';

import type { LightningTextElement } from '../element/LightningTextElement';
import type { LightningElement } from '../types';
import type { ReconcilerContainer } from './createHostConfig';

export type Plugin<T extends LightningElement = LightningElement> = {
  /**
   * Fires while application is initializing the Lightning renderer
   */
  init?(
    renderer: RendererMain,
    reconciler: Reconciler<ReconcilerContainer, T, LightningTextElement, null, null, T>,
  ): Promise<void>;

  /**
   * Fires when an element is created, before it's set up and initialized. Props
   * passed in are the raw props before any prop transforms are run.
   */
  onCreateInstance?(instance: SetOptional<T, 'node'>, initialProps: T['props'], fiber: Fiber): void;

  /**
   * Transforms the payload that is used to update the LightningElement. Return
   * the value to be used in the update, or null to not update. Note that if you
   * return null, other plugins that may transform the props will be skipped.
   */
  transformProps?(instance: SetOptional<T, 'node'>, props: T['props']): object | null;

  /**
   * Declares which style properties this plugin's transformProps handles.
   * When set, transformProps is only called if the style update includes at
   * least one property in this set. When not set, transformProps is always
   * called. This enables a fast path for style-only updates that no plugin
   * needs to process.
   */
  handledStyleProps?: ReadonlySet<string>;

  /**
   * Instance-aware alternative to handledStyleProps for style-only updates.
   * Return false when transformProps would leave this update unchanged for
   * this instance, so it can take the fast path; true sends it through the
   * full transform pipeline. When set, it replaces the handledStyleProps check
   * for this plugin.
   */
  needsTransform?(instance: SetOptional<T, 'node'>, props: T['props']): boolean;

  /**
   * Converts the style of a style-only update that touches handledStyleProps,
   * so it can still take the fast path. Must return the style transformProps
   * would produce for that update, or null when the update needs the full
   * transform pipeline.
   */
  transformStyle?(instance: SetOptional<T, 'node'>, style: object): object | null;
};
