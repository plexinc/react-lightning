import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import type { Plugin } from '../render/Plugin';
import {
  type LightningElement,
  LightningElementType,
  type LightningImageElementProps,
  type LightningTextElementProps,
  type LightningViewElementProps,
} from '../types';
import { LightningImageElement } from './LightningImageElement';
import { LightningTextElement } from './LightningTextElement';
import { LightningViewElement } from './LightningViewElement';

interface TypeToPropMap {
  [LightningElementType.View]: LightningViewElementProps;
  [LightningElementType.Text]: LightningTextElementProps;
  [LightningElementType.Image]: LightningImageElementProps;
}

export function createLightningElement<T extends LightningElementType>(
  type: T,
  initialProps: TypeToPropMap[T],
  renderer: RendererMain,
  plugins: Plugin<LightningElement>[],
  fiber: Fiber,
): LightningElement {
  switch (type) {
    case LightningElementType.Image:
      return new LightningImageElement(
        initialProps as LightningImageElementProps,
        renderer,
        plugins,
        fiber,
      );
    case LightningElementType.Text:
      return new LightningTextElement(
        initialProps as LightningTextElementProps,
        renderer,
        plugins,
        fiber,
      );
    default:
      return new LightningViewElement(initialProps, renderer, plugins, fiber);
  }
}
