import type { NodeLoadedEventHandler, NodeRenderStateEventHandler } from '@lightningjs/renderer';

import type { LightningElement } from './Element';
import type { Rect } from './Geometry';
import type { RendererNode } from './LightningNode';
import type { LightningElementProps } from './Props';
import type { LightningElementStyle } from './Styles';

/**
 * Lifecycle calls an element makes ahead of the matching events, to observers
 * registered with `observe`. One observer object can serve every element (the
 * element comes first in each call), so a plugin that tracks all elements
 * needs no per-element listeners. An observer is called before any listener
 * of the same event, except `layout`, which runs after the layout listeners.
 */
export interface LightningElementObserver {
  destroy?(element: LightningElement): void;
  childAdded?(element: LightningElement, child: LightningElement, index: number): void;
  childRemoved?(element: LightningElement, child: LightningElement, index: number): void;
  childMoved?(
    element: LightningElement,
    child: LightningElement,
    fromIndex: number,
    toIndex: number,
  ): void;
  inViewport?(
    element: LightningElement,
    node: RendererNode<LightningElement>,
    renderState: Parameters<NodeRenderStateEventHandler>[1],
  ): void;
  textureLoaded?(
    element: LightningElement,
    node: RendererNode<LightningElement>,
    event: Parameters<NodeLoadedEventHandler>[1],
  ): void;
  stylesChanged?(element: LightningElement, styles: Partial<LightningElementStyle>): void;
  propsChanged?(element: LightningElement, props: Partial<LightningElementProps>): void;
  textChanged?(element: LightningElement): void;
  /** After the `layout` listeners, before the onLayout prop. */
  layout?(element: LightningElement, dimensions: Rect): void;
}
