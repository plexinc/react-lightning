import {
  AllStyleProps,
  getNodeResizeObserver,
  isTranslateSettled,
  type LightningElement,
  type LightningElementStyle,
  LightningElementType,
  type LightningViewElementProps,
  type LightningViewElementStyle,
  LightningViewElement,
  MAX_UNSETTLED_LAYOUTS,
  type NodeResizeObserver,
  PARTIAL_STYLE,
  type Plugin,
  type Rect,
  type ShaderDef,
  type TextureDef,
} from '@plextv/react-lightning';
import {
  Animation,
  type AnimationSettings,
  type CompatShader,
  type CompatStage,
  CompatTexture,
  type CoreNode,
  CoreNodeRenderState,
  DIRTY_ALPHA,
  DIRTY_ORDER,
  DIRTY_TEXT,
  DIRTY_TEXTURE,
  DIRTY_TRANSFORM,
  type RendererMain,
  type TextLayoutResult,
  type TextProps,
  type TextureOptions,
} from '@plextv/react-lightning-renderer/compat/scene';
import type { Fiber } from 'react-reconciler';

export const KIND_VIEW = 0;
export const KIND_TEXT = 1;
export const KIND_IMAGE = 2;

type Props = LightningViewElementProps<LightningViewElementStyle> & Record<string, unknown>;
type Style = LightningViewElementStyle & Record<string, unknown>;
type AnyRecord = Record<string, unknown>;
type Listener = (...args: never[]) => unknown;
type RenderParent = SceneElement | CoreNode;

const EMPTY: never[] = Object.freeze([]) as unknown as never[];

let idCounter = 0;

const noopAnimationController = {
  state: 'stopped',
  start() {
    return this;
  },
  stop() {
    return this;
  },
  pause() {
    return this;
  },
  restore() {
    return this;
  },
  waitUntilStopped() {
    return Promise.resolve();
  },
  on() {
    return this;
  },
  once() {
    return this;
  },
  off() {
    return this;
  },
  emit() {
    return this;
  },
};

type AnimationController = Animation | typeof noopAnimationController;

const VISUAL_NODE_PROPS = new Set([
  'color',
  'colorTop',
  'colorBottom',
  'colorLeft',
  'colorRight',
  'colorTl',
  'colorTr',
  'colorBl',
  'colorBr',
  'alpha',
  'shader',
  'texture',
  'src',
  'text',
  'clipping',
  'clipRadius',
  'rtt',
  'zIndex',
  'zIndexLocked',
  'scale',
  'scaleX',
  'scaleY',
  'rotation',
  'pivot',
  'pivotX',
  'pivotY',
  'mount',
  'mountX',
  'mountY',
  'autosize',
  'imageType',
  'srcX',
  'srcY',
  'srcWidth',
  'srcHeight',
  'strictBounds',
  'boundsMargin',
]);

const SHADER_STYLE_PROPS = new Set([
  'border',
  'borderColor',
  'borderRadius',
  'borderTop',
  'borderLeft',
  'borderRight',
  'borderBottom',
  'outlineWidth',
  'outlineColor',
  'outlineOffset',
  'linearGradient',
]);

// A text node takes w/h from its initial props as-is and lays out over them anyway, like Lightning's.
const TEXT_INITIAL_SKIP = new Set([
  'w',
  'h',
  'width',
  'height',
  'text',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'textAlign',
  'verticalAlign',
  'letterSpacing',
  'lineHeight',
  'maxLines',
  'maxWidth',
  'maxHeight',
  'overflowSuffix',
  'wordBreak',
  'contain',
  'offsetY',
]);

const ROOT_FIELDS = [
  '_x',
  '_y',
  '_w',
  '_h',
  '_scaleX',
  '_scaleY',
  '_rotation',
  '_pivotX',
  '_pivotY',
  '_mountX',
  '_mountY',
  '_alpha',
  '_color',
  '_zIndex',
  '_zIndexLocked',
  '_clipping',
  '_clipRadius',
  '_boundsMargin',
  '_shader',
  '_texture',
  '_textureOptions',
];

function needsRealNode(key: string, value: unknown): boolean {
  if (value == null || !VISUAL_NODE_PROPS.has(key)) {
    return false;
  }

  switch (key) {
    case 'color':
    case 'rotation':
    case 'clipRadius':
    case 'zIndex':
      return value !== 0;
    case 'alpha':
    case 'scale':
    case 'scaleX':
    case 'scaleY':
      return value !== 1;
    case 'clipping':
    case 'rtt':
    case 'zIndexLocked':
      return value !== false;
    default:
      return true;
  }
}

function isLayoutOnlyNodeProps(props: AnyRecord): boolean {
  for (const key in props) {
    if (needsRealNode(key, props[key])) {
      return false;
    }
  }

  return true;
}

function getImageType(src?: string | null): string | null {
  if (!src) {
    return null;
  }

  const lower = src.toLowerCase();

  return lower.endsWith('.svg') || lower.startsWith('data:image/svg+xml,') ? 'svg' : null;
}

function createTextProps(props: AnyRecord): TextProps {
  return {
    text: (props.text as string) || '',
    fontFamily: (props.fontFamily as string) || 'sans-serif',
    fontSize: (props.fontSize as number) || 16,
    fontStyle: (props.fontStyle as string) || 'normal',
    textAlign: (props.textAlign as string) || 'left',
    verticalAlign: (props.verticalAlign as string) || 'top',
    letterSpacing: (props.letterSpacing as number) || 0,
    lineHeight: (props.lineHeight as number) || 1.2,
    maxLines: (props.maxLines as number) || 0,
    maxWidth: (props.maxWidth as number) || 0,
    maxHeight: (props.maxHeight as number) || 0,
    overflowSuffix: (props.overflowSuffix as string) ?? '...',
    wordBreak: (props.wordBreak as string) || 'break-word',
    contain: (props.contain as string) || 'none',
    offsetY: (props.offsetY as number) || 0,
  };
}

/** One Proxy handler class instead of a pair of closures per element. */
class StyleHandler implements ProxyHandler<AnyRecord> {
  private readonly _el: SceneElement;

  public constructor(el: SceneElement) {
    this._el = el;
  }

  public get(target: AnyRecord, prop: PropertyKey): unknown {
    if (prop === AllStyleProps) {
      return target;
    }

    const staged = (this._el._stagedUpdates as Props).style as AnyRecord | undefined;
    const value = staged?.[prop as string];

    return value ?? target[prop as string];
  }

  public set(target: AnyRecord, prop: PropertyKey, value: unknown): boolean {
    const el = this._el;

    if (el.style[prop as string] === value) {
      return true;
    }

    target[prop as string] = value;

    const style: AnyRecord = { [prop]: value };
    (style as Record<PropertyKey, unknown>)[PARTIAL_STYLE] = true;

    el.setProps({ style } as Partial<Props>);

    return true;
  }
}

/**
 * A react-lightning element that is also the scene node CompatStage draws:
 * one object per React element, with Lightning's CoreNode props as accessors
 * over the fields the stage reads (`_x`, `_flags`, `_kids`, ...). The element
 * API matches LightningViewElement/TextElement/ImageElement, and the
 * prototype chain goes through LightningViewElement.prototype so instanceof
 * checks and the react-native-lightning polyfills keep working.
 *
 * Element parent and children are `parent`/`children` (via `_lparent`), the
 * render tree is `_parent`/`_kids`; they differ for flattened views.
 */
export class SceneElement {
  public static roundedClippingEnabled = false;
  public static flattenLayoutViewsEnabled = false;

  // Element state.
  public readonly id: number;
  public children: LightningElement[];
  public isFocusGroup: boolean;
  public readonly rawProps: Props;
  public readonly props: Props;
  public _stagedUpdates: Partial<Props>;
  public _deferTarget: SceneElement | null;
  public _layoutX: number;
  public _layoutY: number;
  public _flatOffsetX: number;
  public _flatOffsetY: number;
  public __reactFiber: Fiber;
  public data: AnyRecord | undefined;
  public interactive: boolean;
  public updateShaderUniforms: boolean;
  // Set by react-native-lightning's polyfills; declared so every element keeps one shape.
  public __loaded: boolean | undefined;
  public __loadPromise: Promise<void> | undefined;
  public __resolveLoad: (() => void) | undefined;
  public __scrollLeft: number;
  public __scrollTop: number;

  protected readonly _renderer: RendererMain;
  protected _plugins: Plugin<LightningElement>[];

  private readonly _kind: number;
  private _lparent: SceneElement | null;
  private _styleTarget: AnyRecord;
  private _styleProxy: AnyRecord | null;
  private _isUpdateQueued: boolean;
  private _hasStagedUpdates: boolean;
  private _shaderDef: ShaderDef | undefined;
  private _textureDef: TextureDef | undefined;
  private _focused: boolean;
  private _focusable: boolean;
  private _visible: boolean;
  private _recycled: boolean;
  private _hasLayout: boolean;
  private _animTargets: Map<PropertyKey, unknown> | null;
  private _paintWithheld: boolean;
  private _unsettledLayouts: number;
  private _reactHidden: boolean;
  private _withheldAlpha: number;
  private _ev: unknown[] | null;
  private _deferNodeRemovalHandler: ((destroy: () => void) => void) | null;
  private _finalizeFn: (() => void) | null;
  private _resizeObserver: NodeResizeObserver | null;
  private _isObservingResize: boolean;
  private _flattened: boolean;
  private _isRoot: boolean;
  private _aggregatesChildText: boolean;
  private _lastEmittedText: string | undefined;

  // Scene node state, read by CompatStage. Same names as compat's CoreNode.
  public readonly stage: CompatStage;
  public readonly isTextNode: boolean;
  public destroyed: boolean;
  public renderState: CoreNodeRenderState;
  public _parent: RenderParent | null;
  public _kids: SceneElement[];
  public _x: number;
  public _y: number;
  public _w: number;
  public _h: number;
  public _scaleX: number;
  public _scaleY: number;
  public _rotation: number;
  public _pivotX: number;
  public _pivotY: number;
  public _mountX: number;
  public _mountY: number;
  public _alpha: number;
  public _color: number;
  public _zIndex: number;
  public _zIndexLocked: number | undefined;
  public _clipping: boolean;
  public _clipRadius: number;
  public _boundsMargin: number | number[] | null;
  public _shader: CompatShader | null;
  public _texture: CompatTexture | null;
  public _textureOptions: TextureOptions | null;
  public _imageType: string | null;
  public _autosize: boolean;
  public _rtt: boolean;
  public _flags: number;
  public _wa: number;
  public _wb: number;
  public _wc: number;
  public _wd: number;
  public _wx: number;
  public _wy: number;
  public _worldAlpha: number;
  public _drawOrder: SceneElement[] | null;
  public _tp: TextProps | null;
  public _layout: TextLayoutResult | null;
  public _textTex: unknown;
  public _textKey: string;
  public _waitingFont: boolean;

  public constructor(
    kind: number,
    initialProps: Props,
    renderer: RendererMain,
    plugins: Plugin<LightningElement>[],
    fiber: Fiber,
  ) {
    this.id = ++idCounter;
    this.children = [];
    this.isFocusGroup = false;
    this._stagedUpdates = {};
    this._deferTarget = null;
    this._layoutX = 0;
    this._layoutY = 0;
    this._flatOffsetX = 0;
    this._flatOffsetY = 0;
    this.__reactFiber = fiber;
    this.data = undefined;
    this.interactive = false;
    this.updateShaderUniforms = true;
    this.__loaded = undefined;
    this.__loadPromise = undefined;
    this.__resolveLoad = undefined;
    this.__scrollLeft = 0;
    this.__scrollTop = 0;
    this._renderer = renderer;
    this._plugins = plugins ?? [];
    this._kind = kind;
    this._lparent = null;
    this._styleTarget = EMPTY as unknown as AnyRecord;
    this._styleProxy = null;
    this._isUpdateQueued = false;
    this._hasStagedUpdates = false;
    this._shaderDef = undefined;
    this._textureDef = undefined;
    this._focused = false;
    this._focusable = false;
    this._visible = true;
    this._recycled = false;
    this._hasLayout = false;
    this._animTargets = null;
    this._paintWithheld = false;
    this._unsettledLayouts = 0;
    this._reactHidden = false;
    this._withheldAlpha = 1;
    this._ev = null;
    this._deferNodeRemovalHandler = null;
    this._finalizeFn = null;
    this._resizeObserver = null;
    this._isObservingResize = false;
    this._flattened = false;
    this._isRoot = false;
    this._aggregatesChildText = false;
    this._lastEmittedText = undefined;

    this.stage = renderer.stage;
    this.isTextNode = kind === KIND_TEXT;
    this.destroyed = false;
    this.renderState = CoreNodeRenderState.Init;
    this._parent = null;
    this._kids = EMPTY;
    this._x = 0;
    this._y = 0;
    this._w = 0;
    this._h = 0;
    this._scaleX = 1;
    this._scaleY = 1;
    this._rotation = 0;
    this._pivotX = 0.5;
    this._pivotY = 0.5;
    this._mountX = 0;
    this._mountY = 0;
    this._alpha = 1;
    this._color = kind === KIND_TEXT ? 0xffffffff : 0;
    this._zIndex = 0;
    this._zIndexLocked = undefined;
    this._clipping = false;
    this._clipRadius = 0;
    this._boundsMargin = null;
    this._shader = null;
    this._texture = null;
    this._textureOptions = null;
    this._imageType = null;
    this._autosize = false;
    this._rtt = false;
    this._flags = DIRTY_TRANSFORM | DIRTY_ALPHA | DIRTY_ORDER | (kind === KIND_TEXT ? DIRTY_TEXT : 0);
    this._wa = 1;
    this._wb = 0;
    this._wc = 0;
    this._wd = 1;
    this._wx = 0;
    this._wy = 0;
    this._worldAlpha = 1;
    this._drawOrder = null;
    this._tp = null;
    this._layout = null;
    this._textTex = null;
    this._textKey = '';
    this._waitingFont = false;

    if (import.meta.env.DEV) {
      fiber._debugInfo ??= {};
      fiber._debugInfo.isLngNode = true;
    }

    if (kind === KIND_IMAGE && !initialProps.imageType) {
      initialProps.imageType = getImageType(initialProps.src as string | undefined);
    }

    for (let i = 0; i < this._plugins.length; i++) {
      this._plugins[i]?.onCreateInstance?.(this as unknown as LightningElement, initialProps, fiber);
    }

    this.rawProps = initialProps;
    this.props = (this._transformProps(initialProps) ?? {}) as Props;

    const lngProps = this._toNodeProps(this.props, true);

    this._styleTarget = (this.props.style ?? {}) as AnyRecord;

    if (
      SceneElement.flattenLayoutViewsEnabled &&
      kind === KIND_VIEW &&
      this.props.transition === undefined &&
      isLayoutOnlyNodeProps(lngProps)
    ) {
      this._flattened = true;
    }

    if (kind === KIND_TEXT) {
      this._tp = createTextProps(lngProps);

      for (const key in lngProps) {
        const value = lngProps[key];

        if (value !== undefined && !TEXT_INITIAL_SKIP.has(key)) {
          this._setNodeKey(key, value);
        }
      }
    } else {
      for (const key in lngProps) {
        const value = lngProps[key];

        if (value !== undefined) {
          this._setNodeKey(key, value);
        }
      }
    }

    if (SceneElement.flattenLayoutViewsEnabled) {
      this._layoutX = typeof lngProps.x === 'number' ? lngProps.x : 0;
      this._layoutY = typeof lngProps.y === 'number' ? lngProps.y : 0;
    }

    (LightningViewElement.allElements as Record<number, unknown>)[this.id] = this;

    if (this.props.onResize) {
      this._reconcileResizeObserving();
    }

    this.emit('initialized');
  }

  // ---------------------------------------------------------------- element API

  public get node(): this {
    return this;
  }

  public get __reactNode(): this {
    return this;
  }

  public get type(): LightningElementType {
    return this._kind === KIND_TEXT
      ? LightningElementType.Text
      : this._kind === KIND_IMAGE
        ? LightningElementType.Image
        : LightningElementType.View;
  }

  public get isTextElement(): boolean {
    return this._kind === KIND_TEXT;
  }

  public get isImageElement(): boolean {
    return this._kind === KIND_IMAGE;
  }

  public get visible(): boolean {
    return this._visible;
  }

  public get focusable(): boolean {
    return this._focusable && this._visible;
  }

  public set focusable(value: boolean) {
    if (this._focusable === value) {
      return;
    }

    this._focusable = value;

    if (this._focused && !this._focusable) {
      this.blur();
    }

    this.emit('focusableChanged', this, this._focusable);
  }

  public get focusableIntent(): boolean {
    return this._focusable;
  }

  public get focused(): boolean {
    return this._focused;
  }

  public get recycled(): boolean {
    return this._recycled;
  }

  public set recycled(value: boolean) {
    this._recycled = value;
  }

  public get isFlattened(): boolean {
    return this._flattened;
  }

  public get hasChildren(): boolean {
    return this.children.length > 0;
  }

  public get rootElement(): LightningElement {
    let root: SceneElement = this;

    while (root._lparent) {
      root = root._lparent;
    }

    return root as unknown as LightningElement;
  }

  public get isRoot(): boolean {
    return this._isRoot;
  }

  public get hasLayout(): boolean {
    return this._hasLayout;
  }

  public get paintWithheld(): boolean {
    return this._paintWithheld;
  }

  public get parent(): LightningElement | null {
    return this._lparent as unknown as LightningElement | null;
  }

  public set parent(value: LightningElement | null) {
    const parent = value as unknown as SceneElement | null;

    if (parent && this._lparent === parent) {
      return;
    }

    this._lparent = parent;

    if (SceneElement.flattenLayoutViewsEnabled) {
      if (!this._flattened) {
        this._containStackingIndex('zIndex', this._zIndex);
        this._containStackingIndex('zIndexLocked', this._zIndexLocked);
      }

      const host = parent ? parent._hostNode() : null;
      const offsetX = parent?._flattened ? parent._flatOffsetX + parent._layoutX : 0;
      const offsetY = parent?._flattened ? parent._flatOffsetY + parent._layoutY : 0;

      this._applyFlattenedLink(offsetX, offsetY, host, true);
    } else {
      this._setRenderParent(parent);
    }

    this.recalculateVisibility();
  }

  public get style(): AnyRecord {
    // Undefined until the constructor has the props, as on LightningViewElement (plugins read it early).
    if (this._styleTarget === (EMPTY as unknown as AnyRecord)) {
      return undefined as unknown as AnyRecord;
    }

    return (this._styleProxy ??= new Proxy(this._styleTarget, new StyleHandler(this)));
  }

  public set style(_style: AnyRecord) {
    this._styleTarget = {};
    this._styleProxy = null;

    this.setProps({ style: {} } as Partial<Props>);
  }

  public set deferNodeRemoval(handler: ((destroy: () => void) => void) | null) {
    if (handler && this._flattened) {
      this._materialize();
    }

    this._deferNodeRemovalHandler = handler;
    this.deferTarget = (handler ? this : null) as unknown as LightningElement | null;
  }

  public set deferTarget(value: LightningElement | null) {
    const target = value as unknown as SceneElement | null;
    const finalize = (this._finalizeFn ??= () => this._destroyFinalize());

    this._deferTarget?.off('deferredDestroyComplete', finalize);
    this._deferTarget = target;
    this._deferTarget?.once('deferredDestroyComplete', finalize);

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      if (child) {
        child.deferTarget = value;
      }
    }
  }

  public withholdPaintUntilLayout(): void {
    if (this._hasLayout || this._paintWithheld) {
      return;
    }

    if (this._alpha <= 0 || this._w <= 0 || this._h <= 0) {
      return;
    }

    this._paintWithheld = true;
    this._unsettledLayouts = 0;
    this._withheldAlpha = this._alpha;
    this.alpha = 0;
    this.recalculateVisibility();
  }

  public releaseWithheldPaint(): void {
    if (!this._paintWithheld) {
      return;
    }

    this._paintWithheld = false;

    if (this._alpha !== this._withheldAlpha) {
      this.alpha = this._withheldAlpha;
      this.recalculateVisibility();
    }
  }

  public destroy(): void {
    if (this._isObservingResize && this._resizeObserver) {
      this._resizeObserver.unobserve(this as unknown as LightningElement);
      this._isObservingResize = false;
    }

    for (let i = this.children.length - 1; i >= 0; i--) {
      this.children[i]?.destroy();
    }

    this._lparent?.removeChild(this as unknown as LightningElement);
    this.children.length = 0;

    if (this._deferNodeRemovalHandler) {
      this._deferNodeRemovalHandler(() => {
        this.emit('deferredDestroyComplete');
      });
    } else if (!this._deferTarget && !this._flattened) {
      this._destroyRender();
    }

    delete (LightningViewElement.allElements as Record<number, unknown>)[this.id];

    this.emit('destroy');
  }

  // Events: one flat [event, listener, once] list, created on the first listener.

  public on(event: string, listener: Listener): () => void {
    (this._ev ??= []).push(event, listener, false);

    if (event === 'resized') {
      this._reconcileResizeObserving();
    }

    return () => this.off(event, listener);
  }

  public once(event: string, listener: Listener): () => void {
    (this._ev ??= []).push(event, listener, true);

    if (event === 'resized') {
      this._reconcileResizeObserving();
    }

    return () => this.off(event, listener);
  }

  public off(event: string, listener?: Listener): this {
    const ev = this._ev;

    if (ev !== null) {
      let next: unknown[] | null = null;

      for (let i = 0; i < ev.length; i += 3) {
        if (ev[i] === event && (listener === undefined || ev[i + 1] === listener)) {
          if (next === null) {
            next = ev.slice(0, i);
          }

          if (listener !== undefined) {
            for (let j = i + 3; j < ev.length; j++) {
              next.push(ev[j]);
            }

            break;
          }
        } else if (next !== null) {
          next.push(ev[i], ev[i + 1], ev[i + 2]);
        }
      }

      if (next !== null) {
        this._ev = next;
      }
    }

    if (event === 'resized') {
      this._reconcileResizeObserving();
    }

    return this;
  }

  public emit(event: string, a?: unknown, b?: unknown, c?: unknown): boolean {
    const ev = this._ev;

    if (ev === null) {
      return false;
    }

    const argc = arguments.length;
    const n = ev.length;
    let called = false;

    for (let i = 0; i < n; i += 3) {
      if (ev[i] !== event) {
        continue;
      }

      const fn = ev[i + 1] as (...args: unknown[]) => unknown;

      if (ev[i + 2] === true) {
        this.off(event, fn as Listener);
      }

      called = true;

      if (argc <= 1) {
        fn();
      } else if (argc === 2) {
        fn(a);
      } else if (argc === 3) {
        fn(a, b);
      } else if (argc === 4) {
        fn(a, b, c);
      } else {
        fn(...Array.prototype.slice.call(arguments, 1));
      }
    }

    return called;
  }

  public hasListeners(event: string): boolean {
    const ev = this._ev;

    if (ev !== null) {
      for (let i = 0; i < ev.length; i += 3) {
        if (ev[i] === event) {
          return true;
        }
      }
    }

    return false;
  }

  /** Stage events arrive here, with Lightning's (node, payload) listener convention. */
  public _emitRender(name: string, data: unknown): void {
    if (name === 'loaded') {
      this._handleTextureLoaded(data as { dimensions: { w: number; h: number } });
      this.emit('textureLoaded', this, data);
      this.props.onTextureReady?.((data as { dimensions: { w: number; h: number } }).dimensions);
    } else if (name === 'failed') {
      this.emit('textureFailed', this, data);
    }

    this.emit(name, this, data);
  }

  public setLightningNode(_root: unknown): void {
    // The container root: the stock elements swap their node for renderer.root, here the
    // element joins it as its only child and stays the node every later write lands on.
    const root = this._renderer.root as unknown as CoreNode;

    this._isRoot = true;

    if (this._flattened) {
      this._flattened = false;

      for (let i = 0; i < this.children.length; i++) {
        this.children[i]?._applyFlattenedLink(0, 0, this as unknown as never, true);
      }
    }

    // What the stock element's node becomes: renderer.root's own values, its earlier props dropped.
    for (let i = 0; i < ROOT_FIELDS.length; i++) {
      const key = ROOT_FIELDS[i] as string;

      (this as unknown as AnyRecord)[key] = (root as unknown as AnyRecord)[key];
    }

    this._setRenderParent(root);
    this.recalculateVisibility();
  }

  public insertChild(value: LightningElement, beforeValue?: LightningElement | null): void {
    const child = value as unknown as SceneElement;
    const beforeChild = beforeValue as unknown as SceneElement | null | undefined;

    if (child._lparent === this) {
      this._moveChild(child, beforeChild);

      return;
    }

    const index = beforeChild ? this.children.indexOf(beforeValue as LightningElement) : this.children.length;

    if (beforeChild) {
      this.children.splice(index, 0, value);
    } else {
      this.children.push(value);
    }

    child.parent = this as unknown as LightningElement;

    if (beforeChild || this._flattened || child._flattened) {
      child._placeInHost();
    }

    if (this._deferTarget) {
      child.deferTarget = this._deferTarget as unknown as LightningElement;
    }

    this.emit('childAdded', value, index);

    if (this._kind === KIND_TEXT && child._kind === KIND_TEXT) {
      // Text fragments fold into this node; keep them out of the visual tree.
      child._setRenderParent(null);
      this._aggregatesChildText = true;
      this.recomputeChildText();
    }
  }

  private _moveChild(child: SceneElement, beforeChild?: SceneElement | null): void {
    if (child === beforeChild) {
      return;
    }

    const children = this.children as unknown as SceneElement[];
    const fromIndex = children.indexOf(child);

    if (fromIndex < 0) {
      return;
    }

    children.splice(fromIndex, 1);

    const toIndex = beforeChild ? children.indexOf(beforeChild) : children.length;

    children.splice(toIndex, 0, child);
    child._placeInHost();

    if (toIndex !== fromIndex) {
      this.emit('childMoved', child, fromIndex, toIndex);
    }

    if (this._kind === KIND_TEXT && child._kind === KIND_TEXT) {
      // Stock text elements route a reorder through insertChild too.
      child._setRenderParent(null);
      this._aggregatesChildText = true;
      this.recomputeChildText();
    }
  }

  public removeChild(value: LightningElement): void {
    const child = value as unknown as SceneElement;
    const index = this.children.indexOf(value);

    if (index < 0) {
      if (this._aggregatesChildText) {
        this.recomputeChildText();
      }

      return;
    }

    this.children.splice(index, 1);

    if (!child._deferTarget) {
      child._setRenderParent(null);
    }

    this.emit('childRemoved', value, index);

    if (this._aggregatesChildText) {
      this.recomputeChildText();
    }
  }

  public focus(): void {
    if (!this._focused) {
      this.props.onFocusCapture?.(this as unknown as LightningElement);
      this._focused = true;
      this.emit('focusChanged', this, true);
      this.props.onFocus?.(this as unknown as LightningElement);
    }
  }

  public blur(): void {
    if (this._focused) {
      this._focused = false;
      this.emit('focusChanged', this, false);
      this.props.onBlur?.(this as unknown as LightningElement);
    }
  }

  public bubbleFocusEvent(type: 'focus' | 'blur', target: LightningElement): void {
    if (type === 'focus') {
      this.props.onFocus?.(target);
    } else {
      this.props.onBlur?.(target);
    }
  }

  public render(): void {
    this._scheduleUpdate();
  }

  public getRelativePosition(ancestor?: LightningElement | null): { x: number; y: number } {
    const flatten = SceneElement.flattenLayoutViewsEnabled;
    const stop = ancestor as unknown as SceneElement | null | undefined;
    let totalX = 0;
    let totalY = 0;
    let curr: SceneElement | null = this;

    while (curr && curr !== stop) {
      totalX += curr._x;
      totalY += curr._y;

      let next: SceneElement | null = curr._lparent;

      if (flatten && !curr._flattened) {
        while (next && next._flattened) {
          if (next === stop) {
            totalX -= next._flatOffsetX + next._layoutX;
            totalY -= next._flatOffsetY + next._layoutY;
            next = null;
            break;
          }

          next = next._lparent;
        }
      }

      curr = next;
    }

    return { x: totalX, y: totalY };
  }

  public getBoundingClientRect(ancestor?: LightningElement | null) {
    const { x, y } = this.getRelativePosition(ancestor);
    const w = this.w;
    const h = this.h;

    return {
      x,
      y,
      left: x,
      top: y,
      right: x + w,
      bottom: y + h,
      w,
      h,
      width: w,
      height: h,
    };
  }

  public setReactHidden(hidden: boolean, props?: Partial<Props>): void {
    if (this._reactHidden === hidden) {
      return;
    }

    this._reactHidden = hidden;

    const propStyle = (props?.style ?? {}) as AnyRecord;
    const style: Record<PropertyKey, unknown> = hidden
      ? { display: 'none', alpha: 0 }
      : {
          display: propStyle.display ?? 'flex',
          alpha: propStyle.alpha ?? propStyle.opacity ?? 1,
        };

    style[PARTIAL_STYLE] = true;
    this.setProps({ style } as unknown as Partial<Props>);
  }

  // setProps is inherited from LightningViewElement.prototype on purpose: react-native-lightning
  // wraps that one (style arrays), and it only touches _stagedUpdates and _scheduleUpdate.
  declare public setProps: (payload: Partial<Props>) => void;

  public setNodeProp(key: string, value: unknown, animate = true): boolean {
    if (SceneElement.flattenLayoutViewsEnabled) {
      if (this._flattened && needsRealNode(key, value)) {
        this._materialize();
      }

      this._containStackingIndex(key, value);

      if (
        (key === 'x' || key === 'y') &&
        typeof value === 'number' &&
        !(animate && (this.props.transition as AnyRecord | undefined)?.[key])
      ) {
        return this._writeAxis(key, value);
      }
    }

    if ((this as unknown as AnyRecord)[key] === value) {
      return false;
    }

    if (animate && (this.props.transition as AnyRecord | undefined)?.[key]) {
      this.animateStyle(key, value);
    } else if (key === 'width' && value != null) {
      this.w = value as number;
    } else if (key === 'height' && value != null) {
      this.h = value as number;
    } else {
      this._setNodeKey(key, value);
    }

    return true;
  }

  /** Lightning's Object.assign(node, props), restricted to scene node props. */
  public setNativeProps(props: AnyRecord): void {
    for (const key in props) {
      this._setNodeKey(key, props[key]);
    }
  }

  public emitLayoutEvent(): void {
    const flag = SceneElement.flattenLayoutViewsEnabled;
    const dimensions = {
      x: flag ? this._layoutX : this._x,
      y: flag ? this._layoutY : this._y,
      h: this.h,
      w: this.w,
    };

    this.emit('layout', dimensions);
    this._onLayout(dimensions);
  }

  public _emitResize(dimensions: { w: number; h: number }): void {
    this.emit('resized', this, dimensions);
    this.props.onResize?.(dimensions);
  }

  public recalculateVisibility(): void {
    const prevFocusable = this._focusable && this._visible;
    const prevVisible = this._visible;
    const parent = this._lparent;

    this._visible = this._alpha > 0 && (!parent || parent._visible);

    if (this._visible !== prevVisible) {
      this.emit('visibilityChanged', this._visible);

      for (let i = 0; i < this.children.length; i++) {
        this.children[i]?.recalculateVisibility();
      }
    }

    const currentFocusable = this._focusable && this._visible;

    if (currentFocusable !== prevFocusable) {
      this.emit('focusableChanged', this, currentFocusable);
    }
  }

  public animateStyle(key: PropertyKey, value: unknown): AnimationController {
    const inFlight = this._animTargets?.get(key);

    if (
      (this as unknown as Record<PropertyKey, unknown>)[key] === value &&
      (inFlight === undefined || inFlight === value)
    ) {
      return noopAnimationController;
    }

    (this._animTargets ??= new Map()).set(key, value);

    let target = value;

    if (SceneElement.flattenLayoutViewsEnabled && (key === 'x' || key === 'y') && typeof value === 'number') {
      if (key === 'x') {
        this._layoutX = value;
        target = value + this._flatOffsetX;
      } else {
        this._layoutY = value;
        target = value + this._flatOffsetY;
      }
    }

    return this._createAnimation(
      { [key]: target },
      (this.props.transition as AnyRecord | undefined)?.[key as string] as AnimationSettings | undefined,
      key as string,
      value,
    ).start();
  }

  public animateShader(props: AnyRecord): AnimationController {
    return this._createAnimation(
      { shaderProps: props },
      (this.props.transition as AnyRecord | undefined)?.shaderProps as AnimationSettings | undefined,
    ).start();
  }

  public toString(expanded?: boolean): string {
    const name = this._kind === KIND_TEXT ? 'SceneTextElement' : this._kind === KIND_IMAGE ? 'SceneImageElement' : 'SceneViewElement';

    return `${this._recycled ? '♻ ' : ''}${name} id=${this.id}${this.focusable ? ' focusable' : ''}${this.visible ? ' visible' : ''}${expanded ? ` props=${JSON.stringify(this.props)}` : ''}`;
  }

  // ------------------------------------------------------------- text and image

  public get text(): string {
    return this._tp ? this._tp.text : '';
  }

  public set text(v: string) {
    this._setText('text', v == null ? '' : String(v));

    if (this._kind !== KIND_TEXT) {
      return;
    }

    if (v !== this._lastEmittedText) {
      this._lastEmittedText = v;
      this.emit('textChanged', this);

      const parent = this._lparent;

      if (parent?._kind === KIND_TEXT) {
        parent.recomputeChildText();
      }
    }
  }

  public recomputeChildText(): void {
    let text = '';
    const children = this.children as unknown as SceneElement[];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if (child?._kind === KIND_TEXT) {
        text += child.text;
      }
    }

    this.text = text;
  }

  public get src(): string | null {
    return this._texture?.type === 'ImageTexture' ? this._texture.src : null;
  }

  public set src(v: string | null) {
    this._setSrc(v);

    if (this._kind === KIND_IMAGE && !this._imageType) {
      this._imageType = getImageType(v);
    }
  }

  protected _handleTextureLoaded(event: { dimensions: { w: number; h: number } }): void {
    if (this._kind !== KIND_IMAGE) {
      return;
    }

    const { w, h } = event.dimensions;
    const style = this.props.style as Style | undefined;
    const originalWidth = style?.w;
    const originalHeight = style?.h;

    if (originalWidth == null && originalHeight == null) {
      this.w = w;
      this.h = h;
    } else if (originalWidth == null && originalHeight != null) {
      this.w = ((originalHeight as number) / h) * w;
    } else if (originalWidth != null && originalHeight == null) {
      this.h = ((originalWidth as number) / w) * h;
    }
  }

  // ------------------------------------------------------------------ flattening

  public _hostNode(): SceneElement | null {
    if (!this._flattened) {
      return this;
    }

    return this._lparent ? this._lparent._hostNode() : null;
  }

  public _applyFlattenedLink(offsetX: number, offsetY: number, host: SceneElement | null, force: boolean): void {
    const offsetsChanged = this._flatOffsetX !== offsetX || this._flatOffsetY !== offsetY;

    if (!force && !offsetsChanged) {
      return;
    }

    this._flatOffsetX = offsetX;
    this._flatOffsetY = offsetY;

    if (this._flattened) {
      this._refreshFlattenedChildren(force);

      return;
    }

    if (this._parent !== host) {
      this._setRenderParent(host);
    }

    if (offsetsChanged) {
      this.x = this._layoutX + offsetX;
      this.y = this._layoutY + offsetY;
    }
  }

  private _refreshFlattenedChildren(force: boolean): void {
    const offsetX = this._flatOffsetX + this._layoutX;
    const offsetY = this._flatOffsetY + this._layoutY;
    const host = this._hostNode();
    const children = this.children as unknown as SceneElement[];

    for (let i = 0; i < children.length; i++) {
      children[i]?._applyFlattenedLink(offsetX, offsetY, host, force);
    }
  }

  public _firstRealNode(): SceneElement | null {
    if (!this._flattened) {
      return this;
    }

    const children = this.children as unknown as SceneElement[];

    for (let i = 0; i < children.length; i++) {
      const node = children[i]?._firstRealNode();

      if (node) {
        return node;
      }
    }

    return null;
  }

  public _placeInHost(): void {
    const host = this._lparent?._hostNode();

    if (!host) {
      return;
    }

    const anchor = this._nextHostNode(host);

    if (this._moveFrontierBefore(host, host._kids, anchor)) {
      host.sortChildren();
    }
  }

  private _nextHostNode(host: SceneElement): SceneElement | null {
    let element: SceneElement | null = null;
    let parent = this._lparent;

    while (parent) {
      const siblings = parent.children as unknown as SceneElement[];

      for (let i = siblings.indexOf(element ?? this) + 1; i < siblings.length; i++) {
        const node = siblings[i]?._firstRealNode();

        if (node && node._parent === host) {
          return node;
        }
      }

      if (!parent._flattened) {
        return null;
      }

      element = parent;
      parent = parent._lparent;
    }

    return null;
  }

  private _moveFrontierBefore(host: SceneElement, hostChildren: SceneElement[], anchor: SceneElement | null): boolean {
    if (!this._flattened) {
      if (this._parent !== host) {
        return false;
      }

      const from = hostChildren.indexOf(this);
      const anchorIndex = anchor ? hostChildren.indexOf(anchor) : hostChildren.length;

      if (from < 0 || anchorIndex < 0 || from === anchorIndex - 1) {
        return false;
      }

      hostChildren.splice(from, 1);
      hostChildren.splice(from < anchorIndex ? anchorIndex - 1 : anchorIndex, 0, this);

      return true;
    }

    let moved = false;
    const children = this.children as unknown as SceneElement[];

    for (let i = 0; i < children.length; i++) {
      if (children[i]?._moveFrontierBefore(host, hostChildren, anchor)) {
        moved = true;
      }
    }

    return moved;
  }

  private _writeAxis(key: 'x' | 'y', value: number): boolean {
    const previous = key === 'x' ? this._layoutX : this._layoutY;

    if (key === 'x') {
      this._layoutX = value;
    } else {
      this._layoutY = value;
    }

    if (this._flattened) {
      if (previous === value) {
        return false;
      }

      if (key === 'x') {
        this._x = value;
      } else {
        this._y = value;
      }

      this._refreshFlattenedChildren(false);

      return true;
    }

    const applied = value + (key === 'x' ? this._flatOffsetX : this._flatOffsetY);

    if (key === 'x') {
      if (this._x === applied) {
        return false;
      }

      this._x = applied;
    } else {
      if (this._y === applied) {
        return false;
      }

      this._y = applied;
    }

    this._mark(DIRTY_TRANSFORM);

    return true;
  }

  public onFlattenedAxisWrite(axis: 'x' | 'y', value: number): void {
    if (axis === 'x') {
      if (this._layoutX === value) {
        return;
      }

      this._layoutX = value;
    } else {
      if (this._layoutY === value) {
        return;
      }

      this._layoutY = value;
    }

    this._refreshFlattenedChildren(false);
  }

  public _materialize(): void {
    if (!this._flattened) {
      return;
    }

    this._flattened = false;
    this._x = this._layoutX + this._flatOffsetX;
    this._y = this._layoutY + this._flatOffsetY;
    // The renderer's default color is white; mount stamps 0 on every element and so must we.
    this._color = 0;
    this._flags |= DIRTY_TRANSFORM | DIRTY_ALPHA | DIRTY_ORDER;
    this._setRenderParent(this._lparent ? this._lparent._hostNode() : null);

    const children = this.children as unknown as SceneElement[];

    for (let i = 0; i < children.length; i++) {
      children[i]?._applyFlattenedLink(0, 0, this, true);
    }

    this._placeInHost();
    this.recalculateVisibility();
  }

  private _containStackingIndex(key: string, value: unknown): void {
    if (
      (key === 'zIndex' || key === 'zIndexLocked') &&
      needsRealNode(key, value) &&
      this._lparent?._flattened
    ) {
      this._lparent._materialize();
    }
  }

  // ------------------------------------------------------------------ updates

  private _reconcileResizeObserving(): void {
    const shouldObserve = this.props?.onResize != null || this.hasListeners('resized');

    if (shouldObserve === this._isObservingResize) {
      return;
    }

    if (shouldObserve) {
      this._resizeObserver ??= getNodeResizeObserver(this._renderer as never);
      this._resizeObserver.observe(this as unknown as LightningElement);
      this._isObservingResize = true;
    } else if (this._resizeObserver) {
      this._resizeObserver.unobserve(this as unknown as LightningElement);
      this._isObservingResize = false;
    }
  }

  public _scheduleUpdate(): void {
    if (this._isUpdateQueued || !this._hasStagedUpdates) {
      return;
    }

    this._isUpdateQueued = true;

    queueMicrotask(() => {
      if (this._doUpdate()) {
        this.emit('propsChanged', this.props);
      }
    });
  }

  protected _doUpdate(): boolean {
    const payload = this._stagedUpdates;

    this._stagedUpdates = {};
    this._hasStagedUpdates = false;

    if (this._reactHidden && payload.style) {
      payload.style = { ...payload.style, display: 'none', alpha: 0 } as typeof payload.style;
    }

    let changed: boolean;

    if (this._canFastPathStyle(payload)) {
      changed = this._applyStyleFastPath(payload);
    } else {
      changed = this._applySlowPath(payload);
    }

    if (this._kind === KIND_TEXT && payload.text) {
      this.text = payload.text as string;
      changed = true;
    } else if (this._kind === KIND_IMAGE && payload.src) {
      this.src = payload.src as string;
      changed = true;
    }

    return changed;
  }

  private _applySlowPath(payload: Partial<Props>): boolean {
    const props = this.props as AnyRecord;
    const transformedProps = (this._transformProps(payload) ?? {}) as AnyRecord;
    const previousOpacity = this._alpha;
    const previousOnResize = props.onResize;

    let changed = false;

    for (const key in transformedProps) {
      if (props[key] !== transformedProps[key]) {
        props[key] = transformedProps[key];
        changed = true;
      }
    }

    if (previousOnResize !== props.onResize) {
      this._reconcileResizeObserving();
    }

    const lngProps = this._toNodeProps(this.props, false);

    if (import.meta.env.DEV) {
      Object.assign(this.rawProps, payload);
    }

    if (typeof lngProps.w !== 'number') {
      delete lngProps.w;
    }

    if (typeof lngProps.h !== 'number') {
      delete lngProps.h;
    }

    if (this._paintWithheld && lngProps.alpha !== undefined) {
      this._withheldAlpha = lngProps.alpha as number;
      delete lngProps.alpha;
    }

    let flattenedMoved = false;

    if (SceneElement.flattenLayoutViewsEnabled) {
      if (this._flattened && (this.props.transition !== undefined || !isLayoutOnlyNodeProps(lngProps))) {
        this._materialize();
      }

      this._containStackingIndex('zIndex', lngProps.zIndex);
      this._containStackingIndex('zIndexLocked', lngProps.zIndexLocked);

      if (typeof lngProps.x === 'number') {
        flattenedMoved = this._flattened && this._layoutX !== lngProps.x;
        this._layoutX = lngProps.x;

        if (!this._flattened) {
          lngProps.x += this._flatOffsetX;
        }
      }

      if (typeof lngProps.y === 'number') {
        flattenedMoved = flattenedMoved || (this._flattened && this._layoutY !== lngProps.y);
        this._layoutY = lngProps.y;

        if (!this._flattened) {
          lngProps.y += this._flatOffsetY;
        }
      }
    }

    for (const key in lngProps) {
      this._setNodeKey(key, lngProps[key]);
    }

    if (flattenedMoved) {
      this._refreshFlattenedChildren(false);
    }

    Object.assign(this._styleTarget, this.props.style);

    if (previousOpacity !== this._alpha) {
      this.recalculateVisibility();
    }

    let hasStyleChanges = false;

    if (payload.style) {
      for (const _ in payload.style) {
        hasStyleChanges = true;
        break;
      }
    }

    if (hasStyleChanges) {
      this.emit('stylesChanged', this.props.style as Partial<LightningElementStyle>);
    }

    this._isUpdateQueued = false;

    return changed;
  }

  private _canFastPathStyle(payload: Partial<Props>): boolean {
    if (!('style' in payload) || !payload.style) {
      return false;
    }

    if (this._shaderDef) {
      return false;
    }

    for (const key in payload) {
      if (key !== 'style') {
        return false;
      }
    }

    const style = payload.style as AnyRecord;
    const plugins = this._plugins;

    for (const key in style) {
      if (SHADER_STYLE_PROPS.has(key)) {
        return false;
      }

      for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i] as Plugin<LightningElement>;

        if (!plugin.transformProps) {
          continue;
        }

        const handled = plugin.handledStyleProps;

        if (!handled || handled.has(key)) {
          return false;
        }
      }
    }

    return true;
  }

  private _applyStyleFastPath(payload: Partial<Props>): boolean {
    const style = payload.style as AnyRecord;
    const flatten = SceneElement.flattenLayoutViewsEnabled;

    if (flatten && this._flattened) {
      for (const key in style) {
        if (needsRealNode(key, style[key])) {
          this._materialize();
          break;
        }
      }
    }

    if (flatten) {
      this._containStackingIndex('zIndex', style.zIndex);
      this._containStackingIndex('zIndexLocked', style.zIndexLocked);
    }

    const previousOpacity = this._alpha;
    let changed = false;

    if (this.props.style !== style) {
      (this.props as AnyRecord).style = style;
      changed = true;
    }

    if (import.meta.env.DEV) {
      Object.assign(this.rawProps, payload);
    }

    const transition = this.props.transition as AnyRecord | undefined;

    for (const key in style) {
      const value = style[key];

      if (value == null) {
        continue;
      }

      if ((key === 'w' || key === 'h') && typeof value !== 'number') {
        continue;
      }

      if (key === 'alpha' && this._paintWithheld) {
        this._withheldAlpha = value as number;
        continue;
      }

      if (transition?.[key]) {
        this.animateStyle(key, value);
      } else if (flatten && (key === 'x' || key === 'y') && typeof value === 'number') {
        this._writeAxis(key, value);
      } else {
        this._setNodeKey(key, value);
      }
    }

    Object.assign(this._styleTarget, style);

    if (SceneElement.roundedClippingEnabled && 'clipping' in style) {
      const shaderType = this._shaderDef?.type;
      const radius =
        style.clipping === true && (shaderType === 'Rounded' || shaderType === 'RoundedWithBorder')
          ? (this._shaderDef?.props as AnyRecord | undefined)?.radius
          : 0;
      const clipRadius = (Array.isArray(radius) ? Math.max(...radius) : (radius as number)) || 0;

      if (this._clipRadius !== clipRadius) {
        this.clipRadius = clipRadius;
      }
    }

    if (previousOpacity !== this._alpha) {
      this.recalculateVisibility();
    }

    this.emit('stylesChanged', this.props.style as Partial<LightningElementStyle>);

    this._isUpdateQueued = false;

    return changed;
  }

  private _onLayout(dimensions: Rect): void {
    this._hasLayout = true;

    if (this._paintWithheld) {
      const settled =
        this._unsettledLayouts >= MAX_UNSETTLED_LAYOUTS ||
        isTranslateSettled(this.props.style as never, this._x, this._y);

      if (settled) {
        this._paintWithheld = false;

        if (this._alpha !== this._withheldAlpha) {
          this.alpha = this._withheldAlpha;
          this.recalculateVisibility();
        }
      } else {
        this._unsettledLayouts++;
      }
    }

    this.props.onLayout?.(dimensions);
  }

  private _createAnimation(
    props: AnyRecord,
    settings?: AnimationSettings,
    styleKey?: string,
    styleTarget?: unknown,
  ): AnimationController {
    const animation = this.animate(props, settings || {});

    animation.once('stopped', (controller: unknown) => {
      this.emit('animationFinished', controller);

      if (styleKey !== undefined) {
        this.props.onTransitionEnd?.({
          propertyName: styleKey,
          finished: this._animTargets?.get(styleKey) === styleTarget,
        });
      }
    });

    return animation;
  }

  private _getShaderFromStyle(style: Style | undefined | null): ShaderDef | undefined {
    if (!style) {
      return;
    }

    const props: AnyRecord = {};
    let type: string | undefined;
    let hasRounded = false;

    const {
      border,
      borderColor,
      borderTop,
      borderLeft,
      borderRight,
      borderBottom,
      borderRadius,
      outlineWidth,
      outlineColor,
      outlineOffset,
      linearGradient,
    } = style as AnyRecord;

    const hasBorder = !!(border || borderColor || borderTop || borderLeft || borderRight || borderBottom);

    if (borderRadius) {
      type = 'Rounded';
      props.radius = borderRadius;
      hasRounded = true;
    }

    if (hasBorder || outlineWidth) {
      type = type === 'Rounded' ? 'RoundedWithBorder' : 'Border';
    }

    if (border) {
      if (typeof border === 'number') {
        props[hasRounded ? 'border-w' : 'w'] = border;
      } else if (typeof border === 'object') {
        props[hasRounded ? 'border-w' : 'w'] = (border as AnyRecord).w;
        props[hasRounded ? 'border-color' : 'color'] = (border as AnyRecord).color;
      }
    }

    if (borderTop) {
      props[hasRounded ? 'border-top' : 'top'] = borderTop;
    }

    if (borderLeft) {
      props[hasRounded ? 'border-left' : 'left'] = borderLeft;
    }

    if (borderRight) {
      props[hasRounded ? 'border-right' : 'right'] = borderRight;
    }

    if (borderBottom) {
      props[hasRounded ? 'border-bottom' : 'bottom'] = borderBottom;
    }

    if (borderColor) {
      props[hasRounded ? 'border-color' : 'color'] = borderColor;
    }

    if (outlineWidth) {
      if (hasBorder) {
        if (import.meta.env.DEV) {
          console.warn(
            `Warning: element ${this.id} sets both a border and an outline. They share one shader, so the border wins and the outline is dropped.`,
          );
        }
      } else {
        const prefix = hasRounded ? 'border-' : '';

        props[`${prefix}w`] = outlineWidth;
        props[`${prefix}color`] = outlineColor ?? 0;
        props[`${prefix}align`] = 'outside';
        props[`${prefix}gap`] = outlineOffset ?? 0;
      }
    }

    if (type) {
      if (linearGradient) {
        if (type === 'Rounded') {
          return {
            type: 'LinearGradient',
            props: { ...(linearGradient as AnyRecord), radius: props.radius },
          } as ShaderDef;
        }

        if (import.meta.env.DEV) {
          console.warn(
            `Warning: element ${this.id} sets both a background gradient and a border. A node can only carry one shader, so the border wins and the gradient is dropped.`,
          );
        }
      }

      return { type, props } as ShaderDef;
    }

    if (linearGradient) {
      return { type: 'LinearGradient', props: linearGradient } as ShaderDef;
    }

    return undefined;
  }

  public _toLightningNodeProps(props: AnyRecord, initial = false): AnyRecord {
    return this._toNodeProps(props, initial);
  }

  /** LightningViewElement._toLightningNodeProps, building one object instead of three. */
  public _toNodeProps(props: AnyRecord, initial: boolean): AnyRecord {
    const out: AnyRecord = {};

    for (const key in props) {
      if (key !== 'id' && key !== 'data' && key !== 'style' && key !== 'shader' && key !== 'texture') {
        out[key] = props[key];
      }
    }

    const style = props.style as Style | null | undefined;
    const shader = props.shader as ShaderDef | undefined;
    const texture = props.texture as TextureDef | undefined;

    if (style !== undefined && style !== null) {
      const transition = !initial ? (this.props.transition as AnyRecord | undefined) : undefined;
      const isText = this._kind === KIND_TEXT;

      for (const key in style) {
        if (isText && (key === 'w' || key === 'h')) {
          continue;
        }

        const value = style[key];

        if (value == null) {
          continue;
        }

        if (transition?.[key]) {
          this.animateStyle(key, value);
        } else if (initial && key === 'initialDimensions') {
          const rect = value as Rect;

          if (!style.w) {
            out.w = rect.w;
          }

          if (!style.h) {
            out.h = rect.h;
          }

          if (!style.x) {
            out.x = rect.x;
          }

          if (!style.y) {
            out.y = rect.y;
          }
        } else {
          out[key] = value;
        }
      }
    }

    const isPartialStyle = style != null && (style as Record<PropertyKey, unknown>)[PARTIAL_STYLE] === true;
    const shaderStyle = isPartialStyle ? ({ ...this._styleTarget, ...style } as Style) : style;
    const styleShader = this._getShaderFromStyle(shaderStyle);

    if (shader && styleShader && import.meta.env.DEV) {
      console.warn(
        `Warning: The styles on element ${this.id} requires a shader (${styleShader.type}). Only one shader can be applied to a node. Move the 'shader' prop or the styles to a parent element.`,
      );
    }

    const oldShader = this._shaderDef;

    this._shaderDef =
      shader === undefined && isPartialStyle && !styleShader && oldShader ? oldShader : shader || styleShader;

    if (this._shaderDef?.props) {
      const current = this._shader;

      if (
        this._shaderDef.type === oldShader?.type &&
        initial === false &&
        (this.props.transition as AnyRecord | undefined)?.shaderProps &&
        this._shaderDef.props
      ) {
        this.animateShader(this._shaderDef.props as AnyRecord);
      } else if (this._shaderDef.type === oldShader?.type && current?.props) {
        const shaderProps = this._shaderDef.props as AnyRecord;

        for (const key in shaderProps) {
          if (key in current.props) {
            current.props[key] = shaderProps[key];
          }
        }
      } else {
        out.shader = this._renderer.createShader(this._shaderDef.type as string, this._shaderDef.props as AnyRecord);
      }
    } else if (oldShader) {
      out.shader = null;
    }

    if (texture && texture !== this._textureDef) {
      this._textureDef = texture;
      out.texture = this._renderer.createTexture(texture.type as string, texture.props as AnyRecord);
    }

    if (SceneElement.roundedClippingEnabled) {
      const shaderType = this._shaderDef?.type;
      const effectiveClipping = initial ? style?.clipping : (style?.clipping ?? this._styleTarget.clipping);
      const radius =
        effectiveClipping === true && (shaderType === 'Rounded' || shaderType === 'RoundedWithBorder')
          ? (this._shaderDef?.props as AnyRecord | undefined)?.radius
          : 0;
      const clipRadius = (Array.isArray(radius) ? Math.max(...radius) : (radius as number)) || 0;

      if (initial ? clipRadius > 0 : this._clipRadius !== clipRadius) {
        out.clipRadius = clipRadius;
      }
    }

    if (this._kind === KIND_TEXT) {
      if (out.color == null) {
        out.color = 0xffffffff;
      }
    } else if (this._kind === KIND_IMAGE) {
      if (!out.color) {
        out.color = 0xffffffff;
      }
    } else if (initial && out.color === undefined) {
      out.color = 0;
    }

    return out;
  }

  private _transformProps(props: Partial<Props>): Partial<Props> | null {
    let transformed = props;
    const plugins = this._plugins;

    for (let i = 0; i < plugins.length; i++) {
      const plugin = plugins[i] as Plugin<LightningElement>;

      if (plugin.transformProps) {
        const result = plugin.transformProps(this as unknown as LightningElement, transformed as never);

        if (result == null) {
          return null;
        }

        transformed = result as Partial<Props>;
      }
    }

    return transformed;
  }

  private _destroyFinalize(): void {
    this._deferTarget?.off('deferredDestroyComplete', this._finalizeFn as Listener);
    this._setRenderParent(null);

    if (!this._flattened) {
      this._destroyRender();
    }
  }

  // ------------------------------------------------------------- scene node API

  /** Writes one Lightning node prop; anything that isn't one is dropped (it was inert on CoreNode). */
  public _setNodeKey(key: string, value: unknown): void {
    switch (key) {
      case 'x':
        this.x = value as number;
        return;
      case 'y':
        this.y = value as number;
        return;
      case 'w':
        this.w = value as number;
        return;
      case 'h':
        this.h = value as number;
        return;
      case 'alpha':
        this.alpha = value as number;
        return;
      case 'color':
        this.color = value as number;
        return;
      case 'width':
        this.w = value as number;
        return;
      case 'height':
        this.h = value as number;
        return;
      case 'scale':
        this.scale = value as number;
        return;
      case 'scaleX':
        this.scaleX = value as number;
        return;
      case 'scaleY':
        this.scaleY = value as number;
        return;
      case 'rotation':
        this.rotation = value as number;
        return;
      case 'pivot':
        this.pivot = value as number;
        return;
      case 'pivotX':
        this.pivotX = value as number;
        return;
      case 'pivotY':
        this.pivotY = value as number;
        return;
      case 'mount':
        this.mount = value as number;
        return;
      case 'mountX':
        this.mountX = value as number;
        return;
      case 'mountY':
        this.mountY = value as number;
        return;
      case 'zIndex':
        this.zIndex = value as number;
        return;
      case 'zIndexLocked':
        this._zIndexLocked = value as number | undefined;
        return;
      case 'clipping':
        this.clipping = value as boolean;
        return;
      case 'clipRadius':
        this.clipRadius = value as number;
        return;
      case 'boundsMargin':
        this._boundsMargin = value as number | number[] | null;
        return;
      case 'shader':
        this.shader = value as CompatShader | null;
        return;
      case 'texture':
        this.texture = value as CompatTexture | null;
        return;
      case 'src':
        this._setSrc(value as string | null);
        return;
      case 'textureOptions':
        this.textureOptions = value as TextureOptions | null;
        return;
      case 'imageType':
        this._imageType = value as string | null;
        return;
      case 'autosize':
        this._autosize = value as boolean;
        return;
      case 'rtt':
        this.rtt = value as boolean;
        return;
      case 'data':
        this.data = value as AnyRecord | undefined;
        return;
      case 'interactive':
        this.interactive = value as boolean;
        return;
      case 'text':
        this._setText('text', value == null ? '' : String(value));
        return;
      case 'fontFamily':
        this._setText('fontFamily', value || 'sans-serif');
        return;
      case 'fontSize':
        this._setText('fontSize', value || 16);
        return;
      case 'fontStyle':
        this._setText('fontStyle', value || 'normal');
        return;
      case 'textAlign':
        this._setText('textAlign', value || 'left');
        return;
      case 'verticalAlign':
        this._setText('verticalAlign', value || 'top');
        return;
      case 'letterSpacing':
        this._setText('letterSpacing', value || 0);
        return;
      case 'lineHeight':
        this._setText('lineHeight', value || 1.2);
        return;
      case 'maxLines':
        this._setText('maxLines', value || 0);
        return;
      case 'maxWidth':
        this._setText('maxWidth', value || 0);
        return;
      case 'maxHeight':
        this._setText('maxHeight', value || 0);
        return;
      case 'contain':
        this._setText('contain', value || 'none');
        return;
      case 'overflowSuffix':
        this._setText('overflowSuffix', value ?? '...');
        return;
      case 'wordBreak':
        this._setText('wordBreak', value || 'break-word');
        return;
      case 'offsetY':
        this._setText('offsetY', value || 0);
        return;
      default:
        return;
    }
  }

  public _mark(flag: number): void {
    if (this._flattened) {
      return;
    }

    this._flags |= flag;

    const parent = this._parent;

    if (flag & DIRTY_ORDER && parent) {
      parent._flags |= DIRTY_ORDER;
    }

    this.stage.requestRender();
  }

  public _setRenderParent(p: RenderParent | null): void {
    const old = this._parent;

    if (old === p) {
      return;
    }

    if (old) {
      const kids = old._kids as RenderParent[];
      const idx = kids.indexOf(this);

      if (idx >= 0) {
        kids.splice(idx, 1);
      }

      old._flags |= DIRTY_ORDER;
    }

    this._parent = p;

    if (p) {
      if (p._kids === EMPTY) {
        p._kids = [];
      }

      (p._kids as RenderParent[]).push(this);
      p._flags |= DIRTY_ORDER;
    }

    this._flags |= DIRTY_TRANSFORM | DIRTY_ALPHA;
    this.stage.requestRender();
  }

  private _destroyRender(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    const kids = this._kids;

    if (kids.length > 0) {
      const copy = kids.slice();

      for (let i = 0; i < copy.length; i++) {
        copy[i]?._destroyRender();
      }
    }

    this._setRenderParent(null);
    this.stage.releaseTexture(this as unknown as CoreNode);
    this.stage.releaseText(this as unknown as CoreNode);
    this._texture = null;
    this.stage.requestRender();
  }

  private _setText(key: keyof TextProps, v: unknown): void {
    const tp = this._tp as unknown as AnyRecord | null;

    if (tp !== null && tp[key] !== v) {
      tp[key] = v;
      this._mark(DIRTY_TEXT);
    }
  }

  private _setSrc(v: string | null): void {
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

  public sortChildren(): void {
    this._flags |= DIRTY_ORDER;
    this.stage.requestRender();
  }

  public removeAllListeners(): void {
    this._ev = null;
  }

  public animate(props: AnyRecord, settings: AnimationSettings): AnimationController {
    if (this._flattened) {
      return noopAnimationController;
    }

    return new Animation(this as never, props, settings ?? {}, this.stage.animations);
  }

  public setUpdateType(): void {}

  public get x(): number {
    return this._x;
  }

  public set x(v: number) {
    if (this._x === v) {
      return;
    }

    this._x = v;

    if (this._flattened) {
      this.onFlattenedAxisWrite('x', v);
    } else {
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get y(): number {
    return this._y;
  }

  public set y(v: number) {
    if (this._y === v) {
      return;
    }

    this._y = v;

    if (this._flattened) {
      this.onFlattenedAxisWrite('y', v);
    } else {
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get w(): number {
    return this._w;
  }

  public set w(v: number) {
    if (this._kind === KIND_TEXT) {
      this._setText('maxWidth', v || 0);
    } else if (this._w !== v) {
      this._w = v;
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get h(): number {
    return this._h;
  }

  public set h(v: number) {
    if (this._kind === KIND_TEXT) {
      this._setText('maxHeight', v || 0);
    } else if (this._h !== v) {
      this._h = v;
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get width(): number {
    return this.w;
  }

  public set width(v: number) {
    this.w = v;
  }

  public get height(): number {
    return this.h;
  }

  public set height(v: number) {
    this.h = v;
  }

  public get scale(): number {
    return this._scaleX;
  }

  public set scale(v: number) {
    const s = v ?? 1;

    if (this._scaleX !== s || this._scaleY !== s) {
      this._scaleX = s;
      this._scaleY = s;
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get scaleX(): number {
    return this._scaleX;
  }

  public set scaleX(v: number) {
    if (this._scaleX !== v) {
      this._scaleX = v ?? 1;
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get scaleY(): number {
    return this._scaleY;
  }

  public set scaleY(v: number) {
    if (this._scaleY !== v) {
      this._scaleY = v ?? 1;
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get rotation(): number {
    return this._rotation;
  }

  public set rotation(v: number) {
    if (this._rotation !== v) {
      this._rotation = v ?? 0;
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get pivot(): number {
    return this._pivotX;
  }

  public set pivot(v: number) {
    this._pivotX = v;
    this._pivotY = v;
    this._mark(DIRTY_TRANSFORM);
  }

  public get pivotX(): number {
    return this._pivotX;
  }

  public set pivotX(v: number) {
    this._pivotX = v;
    this._mark(DIRTY_TRANSFORM);
  }

  public get pivotY(): number {
    return this._pivotY;
  }

  public set pivotY(v: number) {
    this._pivotY = v;
    this._mark(DIRTY_TRANSFORM);
  }

  public get mount(): number {
    return this._mountX;
  }

  public set mount(v: number) {
    this._mountX = v;
    this._mountY = v;
    this._mark(DIRTY_TRANSFORM);
  }

  public get mountX(): number {
    return this._mountX;
  }

  public set mountX(v: number) {
    if (this._mountX !== v) {
      this._mountX = v ?? 0;
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get mountY(): number {
    return this._mountY;
  }

  public set mountY(v: number) {
    if (this._mountY !== v) {
      this._mountY = v ?? 0;
      this._mark(DIRTY_TRANSFORM);
    }
  }

  public get alpha(): number {
    return this._alpha;
  }

  public set alpha(v: number) {
    if (this._alpha !== v) {
      this._alpha = v ?? 1;
      this._mark(DIRTY_ALPHA);
    }
  }

  public get color(): number {
    return this._color;
  }

  public set color(v: number) {
    if (this._color !== v) {
      this._color = v >>> 0;

      if (!this._flattened) {
        this.stage.requestRender();
      }
    }
  }

  public get zIndex(): number {
    return this._zIndex;
  }

  public set zIndex(v: number) {
    if (this._zIndex !== v) {
      this._zIndex = v ?? 0;
      this._mark(DIRTY_ORDER);
    }
  }

  public get zIndexLocked(): number | undefined {
    return this._zIndexLocked;
  }

  public set zIndexLocked(v: number | undefined) {
    this._zIndexLocked = v;
  }

  public get clipping(): boolean {
    return this._clipping;
  }

  public set clipping(v: boolean) {
    if (this._clipping !== !!v) {
      this._clipping = !!v;

      if (!this._flattened) {
        this.stage.requestRender();
      }
    }
  }

  public get clipRadius(): number {
    return this._clipRadius;
  }

  public set clipRadius(v: number) {
    if (v && !this._clipRadius) {
      this.stage.warnOnce(
        'clipRadius',
        'rounded clipping is approximated: innermost clip only, and only on quads without their own radius',
      );
    }

    this._clipRadius = v;
  }

  public get boundsMargin(): number | number[] | null {
    return this._boundsMargin;
  }

  public set boundsMargin(v: number | number[] | null) {
    this._boundsMargin = v;
  }

  public get rtt(): boolean {
    return this._rtt;
  }

  public set rtt(v: boolean) {
    if (v) {
      this.stage.warnOnce('rtt', 'rtt is not implemented');
    }

    this._rtt = v;
  }

  public get autosize(): boolean {
    return this._autosize;
  }

  public set autosize(v: boolean) {
    this._autosize = v;
  }

  public get imageType(): string | null {
    return this._imageType;
  }

  public set imageType(v: string | null) {
    this._imageType = v;
  }

  public get textureOptions(): TextureOptions | null {
    return this._textureOptions;
  }

  public set textureOptions(v: TextureOptions | null) {
    this._textureOptions = v;
    this.stage.requestRender();
  }

  public get shader(): CompatShader | null {
    return this._shader;
  }

  public set shader(s: CompatShader | null) {
    this._shader = s ?? null;
    this.stage.requestRender();
  }

  public get texture(): CompatTexture | null {
    return this._texture;
  }

  public set texture(t: CompatTexture | null) {
    if (this._texture === t) {
      return;
    }

    this.stage.releaseTexture(this as unknown as CoreNode);
    this._texture = t ?? null;
    this._mark(DIRTY_TEXTURE);
  }

  public get absX(): number {
    return this._wx;
  }

  public get absY(): number {
    return this._wy;
  }

  public get worldAlpha(): number {
    return this._worldAlpha;
  }

  public get fontFamily(): string | undefined {
    return this._tp?.fontFamily;
  }

  public set fontFamily(v: string) {
    this._setNodeKey('fontFamily', v);
  }

  public get fontSize(): number | undefined {
    return this._tp?.fontSize;
  }

  public set fontSize(v: number) {
    this._setNodeKey('fontSize', v);
  }

  public get fontStyle(): string | undefined {
    return this._tp?.fontStyle;
  }

  public set fontStyle(v: string) {
    this._setNodeKey('fontStyle', v);
  }

  public get textAlign(): string | undefined {
    return this._tp?.textAlign;
  }

  public set textAlign(v: string) {
    this._setNodeKey('textAlign', v);
  }

  public get verticalAlign(): string | undefined {
    return this._tp?.verticalAlign;
  }

  public set verticalAlign(v: string) {
    this._setNodeKey('verticalAlign', v);
  }

  public get letterSpacing(): number | undefined {
    return this._tp?.letterSpacing;
  }

  public set letterSpacing(v: number) {
    this._setNodeKey('letterSpacing', v);
  }

  public get lineHeight(): number | undefined {
    return this._tp?.lineHeight;
  }

  public set lineHeight(v: number) {
    this._setNodeKey('lineHeight', v);
  }

  public get maxLines(): number | undefined {
    return this._tp?.maxLines;
  }

  public set maxLines(v: number) {
    this._setNodeKey('maxLines', v);
  }

  public get maxWidth(): number | undefined {
    return this._tp?.maxWidth;
  }

  public set maxWidth(v: number) {
    this._setNodeKey('maxWidth', v);
  }

  public get maxHeight(): number | undefined {
    return this._tp?.maxHeight;
  }

  public set maxHeight(v: number) {
    this._setNodeKey('maxHeight', v);
  }

  public get contain(): string | undefined {
    return this._tp?.contain;
  }

  public set contain(v: string) {
    this._setNodeKey('contain', v);
  }

  public get overflowSuffix(): string | undefined {
    return this._tp?.overflowSuffix;
  }

  public set overflowSuffix(v: string) {
    this._setNodeKey('overflowSuffix', v);
  }

  public get wordBreak(): string | undefined {
    return this._tp?.wordBreak;
  }

  public set wordBreak(v: string) {
    this._setNodeKey('wordBreak', v);
  }

  public get offsetY(): number | undefined {
    return this._tp?.offsetY;
  }

  public set offsetY(v: number) {
    this._setNodeKey('offsetY', v);
  }
}

// instanceof LightningViewElement, and the polyfills react-native-lightning installs on its
// prototype (setProps wrapper, measure, DOM accessors), without running its constructor.
Object.setPrototypeOf(SceneElement.prototype, LightningViewElement.prototype);
