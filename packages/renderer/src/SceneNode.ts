import type { Stage } from './Stage';
import type { Texture } from './TextureManager';

export const DIRTY_TRANSFORM = 1;
export const DIRTY_ALPHA = 2;
export const DIRTY_ORDER = 4;
export const DIRTY_TEXT = 8;
export const DIRTY_SRC = 16;

export const KIND_VIEW = 0;
export const KIND_TEXT = 1;
export const KIND_IMAGE = 2;
export const KIND_RAW_TEXT = 3;

export type Transition = { duration: number; delay?: number; easing?: string };

/**
 * The one object per element: React holds it as the host instance, the stage
 * draws it. Props are plain fields; writers call `invalidate()` with the flag
 * that matters so the frame loop only recomputes what changed.
 */
export class SceneNode {
  public readonly kind: number;
  public stage: Stage | null = null;
  public parent: SceneNode | null = null;
  public children: SceneNode[] = [];

  public x = 0;
  public y = 0;
  public w = 0;
  public h = 0;
  public scaleX = 1;
  public scaleY = 1;
  public rotation = 0;
  public pivotX = 0.5;
  public pivotY = 0.5;
  public alpha = 1;
  public zIndex = 0;
  public clipping = false;
  public visible = true;

  /** 0xRRGGBBAA. Views default to transparent, text/image to white (tint). */
  public color: number;
  public radius = 0;
  public borderWidth = 0;
  public borderColor = 0;

  public src: string | null = null;
  public texture: Texture | null = null;

  public text = '';
  public fontFamily = 'sans-serif';
  public fontWeight = 'normal';
  public fontSize = 16;
  public lineHeight = 0;
  public maxWidth = 0;
  public maxLines = 0;
  public textAlign: 'left' | 'center' | 'right' = 'left';

  public transition: Record<string, Transition> | null = null;
  public onLoad: ((w: number, h: number) => void) | null = null;

  public flags = DIRTY_TRANSFORM | DIRTY_ALPHA | DIRTY_ORDER;

  // World transform (2x3) and alpha, valid after the stage's update pass.
  public wa = 1;
  public wb = 0;
  public wc = 0;
  public wd = 1;
  public wx = 0;
  public wy = 0;
  public worldAlpha = 1;

  // Draw order: children sorted by zIndex when any child has one.
  public drawOrder: SceneNode[] | null = null;
  public hasZChildren = false;

  public constructor(kind: number) {
    this.kind = kind;
    this.color = kind === KIND_VIEW ? 0 : 0xffffffff;
  }

  public invalidate(flag: number): void {
    this.flags |= flag;
    if (flag & DIRTY_ORDER && this.parent) {
      this.parent.flags |= DIRTY_ORDER;
    }
    this.stage?.requestRender();
  }

  public insertBefore(child: SceneNode, before: SceneNode | null): void {
    if (child.parent) {
      child.parent.removeChild(child);
    }

    child.parent = this;

    const idx = before ? this.children.indexOf(before) : -1;

    if (idx >= 0) {
      this.children.splice(idx, 0, child);
    } else {
      this.children.push(child);
    }

    if (this.stage) {
      attachStage(child, this.stage);
    }

    child.flags |= DIRTY_TRANSFORM | DIRTY_ALPHA;
    this.flags |= DIRTY_ORDER;
    this.stage?.requestRender();
  }

  public removeChild(child: SceneNode): void {
    const idx = this.children.indexOf(child);

    if (idx >= 0) {
      this.children.splice(idx, 1);
    }

    child.parent = null;
    this.flags |= DIRTY_ORDER;
    this.stage?.requestRender();
  }

  public destroy(): void {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].destroy();
    }

    if (this.texture && this.stage) {
      this.stage.textures.release(this.texture);
    }

    this.texture = null;
    this.stage?.animator.cancelAll(this);
    this.stage = null;
  }
}

function attachStage(node: SceneNode, stage: Stage): void {
  if (node.stage === stage) {
    return;
  }

  node.stage = stage;

  for (let i = 0; i < node.children.length; i++) {
    attachStage(node.children[i], stage);
  }
}
