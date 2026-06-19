import type { INodeProps } from '@lightningjs/renderer';

import {
  type LightningElement,
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
  public override get type(): LightningElementType {
    return LightningElementType.Text;
  }

  declare public node: TextRendererNode<LightningTextElement>;

  public override get isTextElement() {
    return true;
  }

  // Set once this element renders its text from child fragments rather than
  // from its own `text` prop (see `shouldSetTextContent`). Once true we always
  // derive `node.text` from the children so removing them clears it.
  private _aggregatesChildText = false;

  public get text(): string {
    return this.node.text;
  }

  public set text(v) {
    this.node.text = v;
  }

  /**
   * Children that resolve to plain text (e.g. the string a `<FormattedMessage>`
   * rendered to) are appended as their own text instances rather than handed to
   * us as a `text` prop. We keep them in the reconciler's child list for
   * ordering/cleanup but fold their text into this node and detach them from
   * the render tree so only this element draws.
   */
  public override insertChild(
    child: LightningElement,
    beforeChild?: LightningElement | null,
  ): void {
    super.insertChild(child, beforeChild);

    if (child.isTextElement) {
      // Keep it out of the visual tree; its text lives in our node instead.
      child.node.parent = null;
      this._aggregatesChildText = true;
      this.recomputeChildText();
    }
  }

  public override removeChild(child: LightningElement): void {
    super.removeChild(child);

    if (this._aggregatesChildText) {
      this.recomputeChildText();
    }
  }

  /**
   * Recompute `node.text` from the ordered text of child text fragments.
   * Called when fragments are added/removed and when one's text updates.
   */
  public recomputeChildText(): void {
    let text = '';

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      if (child?.isTextElement) {
        text += (child as LightningTextElement).text;
      }
    }

    this.text = text;
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

  protected override _doUpdate(): boolean {
    const payload = this._stagedUpdates;
    let changed = super._doUpdate();

    if (payload.text) {
      this.text = payload.text;

      changed = true;
    }

    return changed;
  }
}
