import type { Texture } from '../TextureManager';
import { Animation, type AnimationSettings } from './Animation';
import type { CompatStage } from './CompatStage';
import { EventEmitter } from './EventEmitter';
import type { CompatShader } from './Shaders';
import type { TextLayoutResult, TextProps } from './TextLayout';

export const DIRTY_TRANSFORM = 1;
export const DIRTY_ALPHA = 2;
export const DIRTY_ORDER = 4;
export const DIRTY_TEXT = 8;
export const DIRTY_TEXTURE = 16;

export enum CoreNodeRenderState {
  Init = 0,
  OutOfBounds = 2,
  InBounds = 4,
  InViewport = 8,
}

export type TextureOptions = {
  resizeMode?: { type: 'cover'; clipX?: number; clipY?: number } | { type: 'contain' };
  preload?: boolean;
  flipX?: boolean;
  flipY?: boolean;
};

/** What `node.texture` looks like to callers (state + dimensions), backed by a shared GL texture. */
export class CompatTexture extends EventEmitter {
  public type: string;
  public props: Record<string, unknown>;
  public state: 'initial' | 'loading' | 'loaded' | 'failed' | 'freed' = 'initial';
  public dimensions: { w: number; h: number } | null = null;
  public gl: Texture | null = null;
  public color = 0;

  public constructor(type: string, props: Record<string, unknown>) {
    super();
    this.type = type;
    this.props = props;
    this.color = type === 'ColorTexture' ? ((props.color as number) ?? 0xffffffff) : 0;
  }

  public get src(): string | null {
    return (this.props.src as string) ?? null;
  }
}

let nextId = 1;

/**
 * Stands in for Lightning's CoreNode: same public prop names and events,
 * plain fields underneath that the compat stage reads directly. Public
 * props are accessors on the prototype so react-lightning's dev-mode
 * "reserved prop" check only sees the underscored internals.
 */
export class CoreNode extends EventEmitter {
  public readonly stage: CompatStage;
  public readonly isTextNode: boolean = false;
  public children: CoreNode[] = [];
  public destroyed = false;
  public renderState: CoreNodeRenderState = CoreNodeRenderState.Init;
  public data: Record<string, unknown> | undefined = undefined;
  public interactive = false;
  public updateShaderUniforms = true;

  public _id: number;
  public _parent: CoreNode | null = null;
  public _x = 0;
  public _y = 0;
  public _w = 0;
  public _h = 0;
  public _scaleX = 1;
  public _scaleY = 1;
  public _rotation = 0;
  public _pivotX = 0.5;
  public _pivotY = 0.5;
  public _mountX = 0;
  public _mountY = 0;
  public _alpha = 1;
  public _color = 0;
  public _zIndex = 0;
  // undefined like Lightning 3.1.1; react-lightning materializes a flattened parent for any non-null value.
  public _zIndexLocked: number | undefined = undefined;
  public _clipping = false;
  public _clipRadius = 0;
  public _boundsMargin: number | number[] | null = null;
  public _shader: CompatShader | null = null;
  public _texture: CompatTexture | null = null;
  public _textureOptions: TextureOptions | null = null;
  public _imageType: string | null = null;
  public _autosize = false;
  public _rtt = false;

  public _flags = DIRTY_TRANSFORM | DIRTY_ALPHA | DIRTY_ORDER;
  public _wa = 1;
  public _wb = 0;
  public _wc = 0;
  public _wd = 1;
  public _wx = 0;
  public _wy = 0;
  public _worldAlpha = 1;
  public _drawOrder: CoreNode[] | null = null;

  // Text only, kept here so every node has the same shape.
  public _tp: TextProps | null = null;
  public _layout: TextLayoutResult | null = null;
  public _textTex: Texture | null = null;
  public _textKey = '';
  public _waitingFont = false;

  public constructor(stage: CompatStage) {
    super();
    this.stage = stage;
    this._id = nextId++;
  }

  public get id(): number {
    return this._id;
  }

  public _mark(flag: number): void {
    this._flags |= flag;

    if (flag & DIRTY_ORDER && this._parent) {
      this._parent._flags |= DIRTY_ORDER;
    }

    this.stage.requestRender();
  }

  get x(): number {
    return this._x;
  }
  set x(v: number) {
    if (this._x !== v) {
      this._x = v;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get y(): number {
    return this._y;
  }
  set y(v: number) {
    if (this._y !== v) {
      this._y = v;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get w(): number {
    return this._w;
  }
  set w(v: number) {
    if (this._w !== v) {
      this._w = v;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get h(): number {
    return this._h;
  }
  set h(v: number) {
    if (this._h !== v) {
      this._h = v;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get width(): number {
    return this.w;
  }
  set width(v: number) {
    this.w = v;
  }
  get height(): number {
    return this.h;
  }
  set height(v: number) {
    this.h = v;
  }
  get scale(): number {
    return this._scaleX;
  }
  set scale(v: number) {
    const s = v ?? 1;

    if (this._scaleX !== s || this._scaleY !== s) {
      this._scaleX = s;
      this._scaleY = s;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get scaleX(): number {
    return this._scaleX;
  }
  set scaleX(v: number) {
    if (this._scaleX !== v) {
      this._scaleX = v ?? 1;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get scaleY(): number {
    return this._scaleY;
  }
  set scaleY(v: number) {
    if (this._scaleY !== v) {
      this._scaleY = v ?? 1;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get rotation(): number {
    return this._rotation;
  }
  set rotation(v: number) {
    if (this._rotation !== v) {
      this._rotation = v ?? 0;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get pivot(): number {
    return this._pivotX;
  }
  set pivot(v: number) {
    this._pivotX = v;
    this._pivotY = v;
    this._mark(DIRTY_TRANSFORM);
  }
  get pivotX(): number {
    return this._pivotX;
  }
  set pivotX(v: number) {
    this._pivotX = v;
    this._mark(DIRTY_TRANSFORM);
  }
  get pivotY(): number {
    return this._pivotY;
  }
  set pivotY(v: number) {
    this._pivotY = v;
    this._mark(DIRTY_TRANSFORM);
  }
  get mount(): number {
    return this._mountX;
  }
  set mount(v: number) {
    this._mountX = v;
    this._mountY = v;
    this._mark(DIRTY_TRANSFORM);
  }
  get mountX(): number {
    return this._mountX;
  }
  set mountX(v: number) {
    if (this._mountX !== v) {
      this._mountX = v ?? 0;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get mountY(): number {
    return this._mountY;
  }
  set mountY(v: number) {
    if (this._mountY !== v) {
      this._mountY = v ?? 0;
      this._mark(DIRTY_TRANSFORM);
    }
  }
  get alpha(): number {
    return this._alpha;
  }
  set alpha(v: number) {
    if (this._alpha !== v) {
      this._alpha = v ?? 1;
      this._mark(DIRTY_ALPHA);
    }
  }
  get color(): number {
    return this._color;
  }
  set color(v: number) {
    if (this._color !== v) {
      this._color = v >>> 0;
      this.stage.requestRender();
    }
  }
  get zIndex(): number {
    return this._zIndex;
  }
  set zIndex(v: number) {
    if (this._zIndex !== v) {
      this._zIndex = v ?? 0;
      this._mark(DIRTY_ORDER);
    }
  }
  get zIndexLocked(): number | undefined {
    return this._zIndexLocked;
  }
  set zIndexLocked(v: number | undefined) {
    this._zIndexLocked = v;
  }
  get clipping(): boolean {
    return this._clipping;
  }
  set clipping(v: boolean) {
    if (this._clipping !== !!v) {
      this._clipping = !!v;
      this.stage.requestRender();
    }
  }
  get clipRadius(): number {
    return this._clipRadius;
  }
  set clipRadius(v: number) {
    if (v && !this._clipRadius) {
      this.stage.warnOnce('clipRadius', 'rounded clipping is approximated: innermost clip only, and only on quads without their own radius');
    }

    this._clipRadius = v;
  }
  get boundsMargin(): number | number[] | null {
    return this._boundsMargin;
  }
  set boundsMargin(v: number | number[] | null) {
    this._boundsMargin = v;
  }
  get rtt(): boolean {
    return this._rtt;
  }
  set rtt(v: boolean) {
    if (v) {
      this.stage.warnOnce('rtt', 'rtt is not implemented');
    }

    this._rtt = v;
  }
  get autosize(): boolean {
    return this._autosize;
  }
  set autosize(v: boolean) {
    this._autosize = v;
  }
  get imageType(): string | null {
    return this._imageType;
  }
  set imageType(v: string | null) {
    this._imageType = v;
  }
  get textureOptions(): TextureOptions | null {
    return this._textureOptions;
  }
  set textureOptions(v: TextureOptions | null) {
    this._textureOptions = v;
    this.stage.requestRender();
  }

  get parent(): CoreNode | null {
    return this._parent;
  }
  set parent(p: CoreNode | null) {
    const old = this._parent;

    if (old === p) {
      return;
    }

    if (old) {
      const idx = old.children.indexOf(this);

      if (idx >= 0) {
        old.children.splice(idx, 1);
      }

      old._flags |= DIRTY_ORDER;
    }

    this._parent = p;

    if (p) {
      p.children.push(this);
      p._flags |= DIRTY_ORDER;
    }

    this._flags |= DIRTY_TRANSFORM | DIRTY_ALPHA;
    this.stage.requestRender();
  }

  get shader(): CompatShader | null {
    return this._shader;
  }
  set shader(s: CompatShader | null) {
    this._shader = s ?? null;
    this.stage.requestRender();
  }

  get texture(): CompatTexture | null {
    return this._texture;
  }
  set texture(t: CompatTexture | null) {
    if (this._texture === t) {
      return;
    }

    this.stage.releaseTexture(this);
    this._texture = t ?? null;
    this._mark(DIRTY_TEXTURE);
  }

  get src(): string | null {
    return this._texture?.type === 'ImageTexture' ? this._texture.src : null;
  }
  set src(v: string | null) {
    if (!v) {
      if (this._texture) {
        this.texture = null;
      }

      return;
    }

    if (this._texture && this._texture.src === v) {
      return;
    }

    this.texture = new CompatTexture('ImageTexture', { src: v });
  }

  get absX(): number {
    return this._wx;
  }
  get absY(): number {
    return this._wy;
  }
  get worldAlpha(): number {
    return this._worldAlpha;
  }

  public removeChild(child: CoreNode): void {
    if (child._parent === this) {
      child.parent = null;
    }
  }

  public sortChildren(): void {
    this._flags |= DIRTY_ORDER;
    this.stage.requestRender();
  }

  public animate(props: Record<string, unknown>, settings: AnimationSettings): Animation {
    return new Animation(
      this as unknown as Record<string, unknown> & CoreNode,
      props,
      settings ?? {},
      this.stage.animations,
    );
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.removeAllListeners();
    this.destroyed = true;

    while (this.children.length > 0) {
      this.children[0].destroy();
    }

    if (this._parent) {
      this.parent = null;
    }

    this.stage.releaseTexture(this);
    this.stage.releaseText(this);
    this._texture = null;
    this.stage.requestRender();
  }

  public setUpdateType(): void {}
}

export class CoreTextNode extends CoreNode {
  public override readonly isTextNode = true;
  public declare _tp: TextProps;

  public constructor(stage: CompatStage, tp: TextProps) {
    super(stage);
    this._tp = tp;
    this._color = 0xffffffff;
    this._flags |= DIRTY_TEXT;
  }

  private _setText(key: keyof TextProps, v: unknown): void {
    const tp = this._tp as unknown as Record<string, unknown>;

    if (tp[key] !== v) {
      tp[key] = v;
      this._mark(DIRTY_TEXT);
    }
  }

  override get w(): number {
    return this._w;
  }
  override set w(v: number) {
    this._setText('maxWidth', v || 0);
  }
  override get h(): number {
    return this._h;
  }
  override set h(v: number) {
    this._setText('maxHeight', v || 0);
  }
  get text(): string {
    return this._tp.text;
  }
  set text(v: string) {
    this._setText('text', v == null ? '' : String(v));
  }
  get fontFamily(): string {
    return this._tp.fontFamily;
  }
  set fontFamily(v: string) {
    this._setText('fontFamily', v || 'sans-serif');
  }
  get fontSize(): number {
    return this._tp.fontSize;
  }
  set fontSize(v: number) {
    this._setText('fontSize', v || 16);
  }
  get fontStyle(): string {
    return this._tp.fontStyle;
  }
  set fontStyle(v: string) {
    this._setText('fontStyle', v || 'normal');
  }
  get textAlign(): string {
    return this._tp.textAlign;
  }
  set textAlign(v: string) {
    this._setText('textAlign', v || 'left');
  }
  get verticalAlign(): string {
    return this._tp.verticalAlign;
  }
  set verticalAlign(v: string) {
    this._setText('verticalAlign', v || 'top');
  }
  get letterSpacing(): number {
    return this._tp.letterSpacing;
  }
  set letterSpacing(v: number) {
    this._setText('letterSpacing', v || 0);
  }
  get lineHeight(): number {
    return this._tp.lineHeight;
  }
  set lineHeight(v: number) {
    this._setText('lineHeight', v || 1.2);
  }
  get maxLines(): number {
    return this._tp.maxLines;
  }
  set maxLines(v: number) {
    this._setText('maxLines', v || 0);
  }
  get maxWidth(): number {
    return this._tp.maxWidth;
  }
  set maxWidth(v: number) {
    this._setText('maxWidth', v || 0);
  }
  get maxHeight(): number {
    return this._tp.maxHeight;
  }
  set maxHeight(v: number) {
    this._setText('maxHeight', v || 0);
  }
  get contain(): string {
    return this._tp.contain;
  }
  set contain(v: string) {
    this._setText('contain', v || 'none');
  }
  get overflowSuffix(): string {
    return this._tp.overflowSuffix;
  }
  set overflowSuffix(v: string) {
    this._setText('overflowSuffix', v ?? '...');
  }
  get wordBreak(): string {
    return this._tp.wordBreak;
  }
  set wordBreak(v: string) {
    this._setText('wordBreak', v || 'break-word');
  }
  get offsetY(): number {
    return this._tp.offsetY;
  }
  set offsetY(v: number) {
    this._setText('offsetY', v || 0);
  }
}
