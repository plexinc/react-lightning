import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber, Reconciler } from 'react-reconciler';
import type { SetOptional } from 'type-fest';
import type { LightningTextElement } from '../element/LightningTextElement';
import type { LightningElement } from '../types';

export type Plugin<T extends LightningElement = LightningElement> = {
  /**
   * Fires while application is initializing the Lightning renderer
   */
  init?(
    renderer: RendererMain,
    reconciler: Reconciler<RendererMain, T, LightningTextElement, null, T>,
  ): Promise<void>;

  /**
   * Fires when an element is created, before it's set up and initialized. Props
   * passed in are the raw props before any prop transforms are run.
   */
  onCreateInstance?(
    instance: SetOptional<T, 'node'>,
    initialProps: T['props'],
    fiber: Fiber,
  ): void;

  /**
   * Transforms the payload that is used to update the LightningElement. Return
   * the value to be used in the update, or null to not update. Note that if you
   * return null, other plugins that may transform the props will be skipped.
   */
  transformProps?(
    instance: SetOptional<T, 'node'>,
    props: T['props'],
  ): object | null;
};
