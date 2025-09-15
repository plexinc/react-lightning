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

    if (finalProps.color == null) {
      // Todo: Make this configurable
      finalProps.color = 0xffffffff;
    }

    return finalProps;
  }

  protected override _doUpdate() {
    const payload = this._stagedUpdates;
    let changed = super._doUpdate();

    if (payload.text) {
      this.text = payload.text;

      changed = true;
    }

    return changed;
  }
}
