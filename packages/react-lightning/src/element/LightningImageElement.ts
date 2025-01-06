import type { INodeProps, NodeLoadedPayload } from '@lightningjs/renderer';
import {
  LightningElementType,
  type LightningImageElementProps,
  type LightningImageElementStyle,
  type LightningTextElementStyle,
  type LightningViewElementProps,
  type RendererNode,
} from '../types';
import { LightningViewElement } from './LightningViewElement';

export class LightningImageElement extends LightningViewElement<
  LightningImageElementStyle,
  LightningImageElementProps<LightningImageElementStyle>
> {
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
    props: LightningViewElementProps<LightningTextElementStyle> & {
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
}
