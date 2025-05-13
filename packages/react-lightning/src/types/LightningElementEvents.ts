import type {
  IAnimationController,
  NodeFailedEventHandler,
  NodeLoadedEventHandler,
} from '@lightningjs/renderer';
import type { LightningElement } from './Element';
import type { FocusEvents } from './Focusable';
import type { Rect } from './Geometry';
import type { LightningElementProps } from './Props';
import type { LightningElementStyle } from './Styles';

export interface LightningElementEvents extends FocusEvents<LightningElement> {
  initialized: () => void;
  destroy: () => void;
  childAdded: (child: LightningElement, index: number) => void;
  childRemoved: (child: LightningElement, index: number) => void;
  beforeRender: () => void;
  layout: (dimensions: Rect) => void;
  textureLoaded: NodeLoadedEventHandler;
  textureFailed: NodeFailedEventHandler;
  textLoaded: NodeLoadedEventHandler;
  textFailed: NodeFailedEventHandler;
  stylesChanged: (styles: Partial<LightningElementStyle>) => void;
  propsChanged: (newProps: Partial<LightningElementProps>) => void;
  animationFinished: (animationName: IAnimationController) => void;

  // biome-ignore lint/suspicious/noExplicitAny: TODO
  [k: string]: (...args: any[]) => void;
}
