import type { INodeProps } from '@lightningjs/renderer';
import {
  LightningElementType,
  type LightningTextElementProps,
  type LightningTextElementStyle,
  type LightningViewElementProps,
  type TextRendererNode,
} from '../types';
import { LightningViewElement } from './LightningViewElement';

export class LightningTextElement extends LightningViewElement<
  LightningTextElementStyle,
  LightningTextElementProps
> {
  public override get type() {
    return LightningElementType.Text;
  }

  public declare node: TextRendererNode<LightningTextElement>;

  public override get isTextElement() {
    return true;
  }

  public get text(): string {
    return this.node.text;
  }

  public set text(v) {
    this.node.text = v;
  }

  public override _toLightningNodeProps(
    props: LightningViewElementProps<LightningTextElementStyle> & {
      text?: string;
    } & Record<string, unknown>,
    initial?: boolean,
  ): Partial<INodeProps> {
    const finalProps = super._toLightningNodeProps(props, initial);

    // We use the node's size if it's available,
    // because text nodes always use `autoSize`,
    // and if we keep resetting the sizes, then the alignment gets messed up.
    // NOTE: we don't need to account for the text prop changing,
    // because autosize will update the node size properties automatically.

    // For height, we can generally ignore changes to it,
    // because lightning uses maxLines instead.
    finalProps.height = this.node?.height || finalProps.height;

    // For width, we want to make sure it wasn't deliberately changed first,
    // because we need to respond to intended changes
    const widthChanged =
      props.style?.width && this.props.style?.width !== props.style?.width;
    if (!widthChanged) {
      finalProps.width = this.node?.width || finalProps.width;
    }

    if (!finalProps.color) {
      // Todo: Make this configurable
      finalProps.color = 0xffffffff;
    }

    return finalProps;
  }
}
