import type {
  INode,
  INodeProps,
  NodeLoadedPayload,
  RendererMain,
} from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import type { Plugin } from '../render/Plugin';
import {
  type LightningElement,
  LightningElementType,
  type LightningImageElementProps,
  type LightningImageElementStyle,
  type RendererNode,
} from '../types';
import { LightningViewElement } from './LightningViewElement';

function getImageType(src?: string | null): INode['imageType'] {
  if (!src) {
    return null;
  }

  const srcLower = src.toLowerCase();
  const isSvg =
    srcLower.endsWith('.svg') || srcLower.startsWith('data:image/svg+xml,');

  return isSvg ? 'svg' : null;
}

export class LightningImageElement<
  TStyleProps extends LightningImageElementStyle = LightningImageElementStyle,
  TProps extends
    LightningImageElementProps<TStyleProps> = LightningImageElementProps<TStyleProps>,
> extends LightningViewElement<TStyleProps, TProps> {
  public override get type() {
    return LightningElementType.Image;
  }

  public declare node: RendererNode<LightningImageElement>;

  public get isImageElement() {
    return true;
  }

  public get src(): string | null {
    return this.node.src;
  }

  public set src(v) {
    this.node.src = v;

    if (!this.node.imageType) {
      this.node.imageType = getImageType(v);
    }
  }

  public constructor(
    initialProps: TProps,
    renderer: RendererMain,
    plugins: Plugin<LightningElement>[],
    fiber: Fiber,
  ) {
    if (!initialProps.imageType) {
      initialProps.imageType = getImageType(initialProps.src);
    }

    super(initialProps, renderer, plugins, fiber);
  }

  protected override _handleTextureLoaded(event: NodeLoadedPayload): void {
    const { width, height } = event.dimensions;
    const originalWidth = this.props.style?.width;
    const originalHeight = this.props.style?.height;

    if (originalWidth == null && originalHeight == null) {
      this.node.width = width;
      this.node.height = height;
    } else if (originalWidth == null && originalHeight != null) {
      this.node.width = (originalHeight / height) * width;
    } else if (originalWidth != null && originalHeight == null) {
      this.node.height = (originalWidth / width) * height;
    }
  }

  public override _toLightningNodeProps(
    props: TProps & {
      text?: string;
    } & Record<string, unknown>,
    initial?: boolean,
  ): Partial<INodeProps> {
    const finalProps = super._toLightningNodeProps(props, initial);

    if (!finalProps.color) {
      // Todo: Make this configurable
      finalProps.color = 0xffffffff;
    }

    return finalProps;
  }

  protected override _doUpdate() {
    const payload = this._stagedUpdates;
    let changed = super._doUpdate();

    if (payload.src) {
      this.src = payload.src;

      changed = true;
    }

    return changed;
  }
}
