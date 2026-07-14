import type {
  AnimationSettings,
  CoreShaderNode,
  IAnimationController,
  INode,
  INodeAnimateProps,
  INodeProps,
  NodeFailedEventHandler,
  NodeLoadedEventHandler,
  NodeLoadedPayload,
  NodeRenderStateEventHandler,
  RendererMain,
  Texture,
} from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { EventEmitter, type IEventEmitter } from 'tseep';
import { PARTIAL_STYLE } from './partialStyle';

import {
  getNodeResizeObserver,
  type NodeResizeObserver,
} from '../observer/NodeResizeObserver';
import type { Plugin } from '../render/Plugin';
import {
  type Focusable,
  type LightningElement,
  type LightningElementEvents,
  type LightningElementStyle,
  LightningElementType,
  type LightningViewElementProps,
  type LightningViewElementStyle,
  type Rect,
  type RendererNode,
  type ShaderDef,
  type TextureDef,
} from '../types';
import { AllStyleProps } from './AllStyleProps';
import { createFlattenedNode } from './FlattenedRendererNode';

const __bannedProps: Record<string, boolean> = {};
let __bannedPropsInitialized = false;

/**
 * In dev mode, warn when we override any CoreNode props, since those are set internally by Lightning
 */
function __getBannedProps(node: INode) {
  const descriptor = Object.getOwnPropertyDescriptors(node);

  for (const prop in descriptor) {
    if (descriptor[prop]?.value) {
      __bannedProps[prop] = false;
    }
  }

  __bannedPropsInitialized = true;
}

function __checkProps(props: string[]) {
  for (const prop of props) {
    if (prop in __bannedProps && __bannedProps[prop] === false) {
      console.error(
        `Warning: ${prop} is a reserved property on Lightning elements. Setting this prop will override the internal value. This may cause unexpected behavior.`,
      );

      __bannedProps[prop] = true;
    }
  }
}

function createTexture(
  renderer: RendererMain,
  textureDef: TextureDef,
): Texture {
  return renderer.createTexture(textureDef.type, textureDef.props);
}

let idCounter = 0;

// Returned when a requested animation is a proven no-op; satisfies the
// controller contract without registering anything with the renderer.
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
} as unknown as IAnimationController;

export class LightningViewElement<
  TStyleProps extends LightningViewElementStyle = LightningViewElementStyle,
  TProps extends
    LightningViewElementProps<TStyleProps> = LightningViewElementProps<TStyleProps>,
> implements Focusable
{
  public static allElements: Record<number, LightningElement> = {};

  public readonly id: number;

  public node: RendererNode<LightningElement>;
  public children: LightningElement[] = [];
  public isFocusGroup = false;
  public readonly rawProps: TProps;
  public readonly props: TProps;

  protected readonly _renderer: RendererMain;

  protected _parent: LightningElement | null = null;
  protected _plugins: Plugin<LightningElement>[] = [];
  protected _stagedUpdates: Partial<TProps> = {};

  private _styleProxy: Partial<TStyleProps>;
  private _isUpdateQueued = false;
  private _shaderDef?: ShaderDef;
  private _textureDef?: TextureDef;
  private _focused = false;
  private _focusable = false;
  private _visible = true;
  private _recycled = false;
  private _hasStagedUpdates = false;
  private _hasLayout = false;
  /** Last requested animation target per style key, for the no-op-skip guard. */
  private _animTargets = new Map<PropertyKey, unknown>();
  private _paintWithheld = false;
  private _withheldAlpha = 1;
  private _eventEmitter = new EventEmitter<LightningElementEvents>();
  private _deferTarget: LightningElement | null = null;
  private _deferNodeRemovalHandler: ((destroy: () => void) => void) | null =
    null;
  private _resizeObserver: NodeResizeObserver | null = null;
  /** Rounded clipping (borderRadius + clipping -> clipRadius) opt-in; set by createRoot. */
  public static roundedClippingEnabled = false;

  /**
   * When true (set from RenderOptions.flattenLayoutViews), layout-only Views
   * skip renderer node creation entirely: the element keeps a placeholder
   * node, descendants attach to the nearest materialized ancestor, and layout
   * positions accumulate across the flattened chain.
   */
  public static flattenLayoutViewsEnabled = false;

  // Node props with render semantics. Anything else that lands on the node
  // (RN-layer junk like handlers, testID, fsTagName) is inert and a flattened
  // placeholder can carry it just as well.
  private static readonly _visualNodeProps = new Set([
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

  // A visual prop at its neutral value still needs no node (color 0 is
  // stamped on every mount, reanimated pushes alpha 1 constantly).
  private static _needsRealNode(key: string, value: unknown): boolean {
    if (!LightningViewElement._visualNodeProps.has(key) || value == null) {
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

  private static _isLayoutOnlyNodeProps(props: Record<string, unknown>): boolean {
    for (const key in props) {
      if (LightningViewElement._needsRealNode(key, props[key])) {
        return false;
      }
    }

    return true;
  }

  private _flattened = false;
  // Parent-relative layout position (what layout/styles asked for); node.x/y
  // may differ by the accumulated offsets of flattened ancestors.
  public _layoutX = 0;
  public _layoutY = 0;
  public _flatOffsetX = 0;
  public _flatOffsetY = 0;
  private _isObservingResize = false;

  public get visible(): boolean {
    return this._visible;
  }

  public get focusable(): boolean {
    return this._focusable && this.visible;
  }

  /**
   * Returns the raw focusable flag without visibility checks.
   * Used by focus navigation when `allowOffscreen` is enabled to allow
   * focusing elements that are clipped or not yet visible (e.g. in virtualized lists).
   */
  public get focusableIntent(): boolean {
    return this._focusable;
  }

  /**
   * Whether this element is a recycled cell from a virtualized list.
   * Used by devtools to display a ♻ indicator in the focus graph and elements tree.
   */
  public get recycled(): boolean {
    return this._recycled;
  }

  public set recycled(value: boolean) {
    this._recycled = value;
  }

  public get isFlattened(): boolean {
    return this._flattened;
  }

  /** The renderer node this element's real descendants attach to. */
  public _hostNode(): RendererNode<LightningElement> | null {
    if (!this._flattened) {
      return this.node as RendererNode<LightningElement>;
    }

    return this._parent ? this._parent._hostNode() : null;
  }

  /**
   * (Re)link this element below a (possibly flattened) parent: absorb the
   * accumulated offsets of the flattened chain above and attach the real node
   * to `host`. Recurses through flattened elements to the real-node frontier.
   * `force` relinks the host even when offsets are unchanged (reparent,
   * materialize); positions are only rewritten when offsets changed, so
   * direct node.x writers (scroll) are left alone.
   */
  public _applyFlattenedLink(
    offsetX: number,
    offsetY: number,
    host: RendererNode<LightningElement> | null,
    force: boolean,
  ): void {
    const offsetsChanged =
      this._flatOffsetX !== offsetX || this._flatOffsetY !== offsetY;

    if (!force && !offsetsChanged) {
      return;
    }

    this._flatOffsetX = offsetX;
    this._flatOffsetY = offsetY;

    if (this._flattened) {
      this._refreshFlattenedChildren(force);

      return;
    }

    if (this.node.parent !== host) {
      this.node.parent = host;
    }

    if (offsetsChanged) {
      this.node.x = this._layoutX + offsetX;
      this.node.y = this._layoutY + offsetY;
    }
  }

  // Push this flattened element's fold (own offsets + own layout position)
  // down to its children.
  private _refreshFlattenedChildren(force: boolean): void {
    const offsetX = this._flatOffsetX + this._layoutX;
    const offsetY = this._flatOffsetY + this._layoutY;
    const host = this._hostNode();

    for (let i = 0; i < this.children.length; i++) {
      this.children[i]?._applyFlattenedLink(offsetX, offsetY, host, force);
    }
  }

  /** Write a layout axis, folding flattened-ancestor offsets into the node. */
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

      this.node[key] = value;
      this._refreshFlattenedChildren(false);

      return true;
    }

    const applied =
      value + (key === 'x' ? this._flatOffsetX : this._flatOffsetY);

    if (this.node[key] === applied) {
      return false;
    }

    this.node[key] = applied;

    return true;
  }

  /**
   * A direct write to a flattened placeholder's x/y (a scroll handler moving
   * the content node straight through node.x, bypassing setProps) has to fold
   * through to the hoisted children. The placeholder forwards the write here.
   */
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

  /**
   * Swap the flattened placeholder for a real renderer node. Triggered by the
   * first prop that needs one (a background, border, alpha, interaction
   * visual). Sticky: once materialized an element never re-flattens, so a
   * style that toggles per focus doesn't churn nodes.
   */
  public _materialize(): void {
    if (!this._flattened) {
      return;
    }

    this._flattened = false;

    const placeholder = this.node;
    const node = this._createNode({
      x: this._layoutX + this._flatOffsetX,
      y: this._layoutY + this._flatOffsetY,
      w: placeholder.w,
      h: placeholder.h,
      alpha: placeholder.alpha,
      // The renderer's default node color is white; mount stamps 0 on every
      // element and so must we.
      color: 0,
    });

    if (import.meta.env.DEV) {
      node.__reactNode = this;
    }

    node.__reactFiber = placeholder.__reactFiber;
    node.parent = this._parent ? this._parent._hostNode() : null;
    node.on('inViewport', this._onInViewport);
    node.on('loaded', this._onTextureLoaded);
    node.on('failed', this._onTextureFailed);

    this.node = node;

    for (let i = 0; i < this.children.length; i++) {
      this.children[i]?._applyFlattenedLink(0, 0, node, true);
    }

    this.recalculateVisibility();
  }

  /**
   * zIndex sorts among a node's real siblings, so materialize a flattened parent before a
   * stacking index lands or the hoist lets it outrank unrelated subtrees (nav bar over a modal).
   */
  private _containStackingIndex(key: string, value: unknown): void {
    if (
      (key === 'zIndex' || key === 'zIndexLocked') &&
      LightningViewElement._needsRealNode(key, value) &&
      this._parent?.isFlattened
    ) {
      this._parent._materialize();
    }
  }

  public set focusable(value: boolean) {
    if (this._focusable === value) {
      return;
    }

    this._focusable = value;

    // Need to blur if we're already focused and became un-focusable
    if (this.focused && !this._focusable) {
      this.blur();
    }

    this._eventEmitter.emit('focusableChanged', this, this._focusable);
  }

  public get focused(): boolean {
    return this._focused;
  }

  public get type(): LightningElementType {
    return LightningElementType.View;
  }

  public get shader(): INode['shader'] {
    return this.node.shader;
  }

  public set shader(shader: INode['shader'] | null) {
    // A null shader resets the node to the stage's default shader (CoreNode
    // handles the null case), letting callers clear a previously-set shader.
    this.node.shader = shader as INode['shader'];
  }

  public get parent(): LightningElement | null {
    return this._parent;
  }

  public set parent(parent) {
    if (
      parent &&
      this._parent === parent &&
      this._parent.node === parent.node
    ) {
      return;
    }

    this._parent = parent;

    if (LightningViewElement.flattenLayoutViewsEnabled) {
      if (!this._flattened) {
        const node = this.node as unknown as Record<string, unknown>;

        this._containStackingIndex('zIndex', node.zIndex);
        this._containStackingIndex('zIndexLocked', node.zIndexLocked);
      }

      const host = parent ? parent._hostNode() : null;
      const offsetX = parent?.isFlattened
        ? parent._flatOffsetX + parent._layoutX
        : 0;
      const offsetY = parent?.isFlattened
        ? parent._flatOffsetY + parent._layoutY
        : 0;

      this._applyFlattenedLink(offsetX, offsetY, host, true);
    } else {
      this.node.parent = parent?.node ?? null;
    }

    this.recalculateVisibility();
  }

  public get style(): TStyleProps {
    return this._styleProxy as TStyleProps;
  }

  // Setting the style prop directly shouldn't occur. It should either set
  // properties on the style prop, or set the style prop through the setProps
  // method (or through JSX). If we do end up setting the style prop, this
  // actually causes strange behavior on HTML elements (like losing reactivity
  // on setting the style props). We'll simulate the same behavior here, but
  // it's not ideal.
  public set style(_style: TStyleProps) {
    // If you set the style prop, it creates a new CSSStyleDeclaration object.
    // We'll create a new proxy and reset the styles.
    this._styleProxy = new Proxy({}, this._styleProxyHandler);

    this.setProps({
      style: {},
    } as TProps);
  }

  /**
   * If a handler here is set, the lightning node will not be immediately
   * removed. The destroy function passed to the handler must be called to
   * complete cleanup. This is to allow for things like animations to complete
   * before the node is removed.
   */
  public set deferNodeRemoval(handler: ((destroy: () => void) => void) | null) {
    // A deferred handler animates the node out then destroys it; a placeholder
    // can't animate or signal done, so materialize or the subtree leaks.
    if (handler && this._flattened) {
      this._materialize();
    }

    this._deferNodeRemovalHandler = handler;

    this.deferTarget = handler ? this : null;
  }

  public set deferTarget(value: LightningElement | null) {
    this._deferTarget?.off('deferredDestroyComplete', this._destroyFinalize);
    this._deferTarget = value;
    this._deferTarget?.once('deferredDestroyComplete', this._destroyFinalize);

    // Optimize child iteration
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      if (child) {
        child.deferTarget = value;
      }
    }
  }

  public get isTextElement() {
    return false;
  }

  public get isImageElement() {
    return false;
  }

  public get hasChildren(): boolean {
    return this.children.length > 0;
  }

  public get rootElement(): LightningElement {
    // oxlint-disable-next-line typescript/no-this-alias - Required for loop optimization
    let root: LightningElement = this;

    while (root.parent) {
      root = root.parent;
    }

    return root;
  }

  public get isRoot(): boolean {
    return this.node.id === 1;
  }

  public get hasLayout(): boolean {
    return this._hasLayout;
  }

  public get paintWithheld(): boolean {
    return this._paintWithheld;
  }

  /**
   * Hide this node (force rendered alpha to 0) until its first layout resolves,
   * then restore the styled alpha. Flex layout is computed asynchronously (in a
   * worker), so without this a node with a definite size mounts and paints at
   * its pre-layout origin (0,0) for one or more frames before the layout result
   * moves it — the "async-flex origin flash". Withholding paint until
   * {@link _onLayout} fires removes that flash regardless of how long the
   * layout round-trip takes.
   *
   * No-op once laid out, and a no-op for nodes that can't flash anyway (already
   * invisible, or zero-sized — those paint nothing at their origin), so the
   * common 0x0 mass-mount path is untouched.
   */
  public withholdPaintUntilLayout(): void {
    if (this._hasLayout || this._paintWithheld) {
      return;
    }

    const node = this.node;

    if (node.alpha <= 0 || node.w <= 0 || node.h <= 0) {
      return;
    }

    this._paintWithheld = true;
    this._withheldAlpha = node.alpha;
    node.alpha = 0;
    this.recalculateVisibility();
  }

  /**
   * Restore a withheld node's alpha immediately, without waiting for a layout.
   * Used when a node leaves flex layout before its first layout resolves (e.g.
   * its subtree is detached by a boundary) and so would otherwise never be
   * revealed.
   */
  public releaseWithheldPaint(): void {
    if (!this._paintWithheld) {
      return;
    }

    this._paintWithheld = false;

    if (this.node.alpha !== this._withheldAlpha) {
      this.node.alpha = this._withheldAlpha;
      this.recalculateVisibility();
    }
  }

  public constructor(
    initialProps: TProps,
    renderer: RendererMain,
    plugins: Plugin<LightningElement>[],
    fiber: Fiber,
  ) {
    this._renderer = renderer;
    this._plugins = plugins ?? [];

    if (import.meta.env.DEV) {
      if (!fiber._debugInfo) {
        fiber._debugInfo = {};
      }

      fiber._debugInfo.isLngNode = true;

      if (!__bannedPropsInitialized) {
        __getBannedProps(renderer.createNode({}));
      }
    }

    this.id = ++idCounter;

    if (plugins) {
      for (const plugin of plugins) {
        plugin.onCreateInstance?.(this, initialProps, fiber);
      }
    }

    this.rawProps = initialProps;
    this.props = this._transformProps(initialProps) ?? ({} as TProps);

    const lngProps = this._toLightningNodeProps(this.props, true);

    this._styleProxy = new Proxy(
      this.props.style ?? {},
      this._styleProxyHandler,
    );

    if (import.meta.env.DEV) {
      __checkProps(Object.keys(lngProps));
    }

    if (
      LightningViewElement.flattenLayoutViewsEnabled &&
      !this.isTextElement &&
      !this.isImageElement &&
      this.props.transition === undefined &&
      LightningViewElement._isLayoutOnlyNodeProps(
        lngProps as Record<string, unknown>,
      )
    ) {
      this._flattened = true;
      this.node = createFlattenedNode<this>(
        lngProps as Record<string, unknown>,
      );
      (this.node as unknown as { owner: LightningViewElement }).owner = this;
    } else {
      this.node = this._createNode(lngProps);
    }

    if (LightningViewElement.flattenLayoutViewsEnabled) {
      this._layoutX = typeof lngProps.x === 'number' ? lngProps.x : 0;
      this._layoutY = typeof lngProps.y === 'number' ? lngProps.y : 0;
    }

    if (import.meta.env.DEV) {
      this.node.__reactNode = this;
    }

    this.node.__reactFiber = fiber;
    this.node.on('inViewport', this._onInViewport);
    this.node.on('loaded', this._onTextureLoaded);
    this.node.on('failed', this._onTextureFailed);

    LightningViewElement.allElements[this.id] = this;

    if (this.props.onResize) {
      this._reconcileResizeObserving();
    }

    this._eventEmitter.emit('initialized');
  }

  public destroy(): void {
    if (this._isObservingResize && this._resizeObserver) {
      this._resizeObserver.unobserve(this);
      this._isObservingResize = false;
    }

    this.node.off('inViewport', this._onInViewport);
    this.node.off('loaded', this._onTextureLoaded);
    this.node.off('failed', this._onTextureFailed);

    for (let i = this.children.length - 1; i >= 0; i--) {
      this.children[i]?.destroy();
    }

    this.parent?.removeChild(this);
    this.children.length = 0; // More efficient than reassigning

    if (this._deferNodeRemovalHandler) {
      this._deferNodeRemovalHandler(() => {
        this.emit('deferredDestroyComplete');
      });
    } else if (!this._deferTarget && !this._flattened) {
      this._renderer.destroyNode(this.node);
    }

    delete LightningViewElement.allElements[this.id];

    this._eventEmitter.emit('destroy');
  }

  public on = (
    ...args: Parameters<IEventEmitter<LightningElementEvents>['on']>
  ): (() => void) => {
    this._eventEmitter.on(...args);

    if (args[0] === 'resized') {
      this._reconcileResizeObserving();
    }

    return () => this.off(...args);
  };
  public once = (
    ...args: Parameters<IEventEmitter<LightningElementEvents>['once']>
  ): (() => void) => {
    this._eventEmitter.once(...args);

    if (args[0] === 'resized') {
      this._reconcileResizeObserving();
    }

    return () => this.off(...args);
  };

  public off: IEventEmitter<LightningElementEvents>['off'] = (...args) => {
    const result = this._eventEmitter.off(...args);

    if (args[0] === 'resized') {
      this._reconcileResizeObserving();
    }

    return result;
  };
  public emit: IEventEmitter<LightningElementEvents>['emit'] = (...args) =>
    this._eventEmitter.emit(...args);

  public setLightningNode(node: RendererNode<LightningElement>): void {
    const oldNode = this.node;

    oldNode.off('inViewport', this._onInViewport);
    oldNode.off('loaded', this._onTextureLoaded);
    oldNode.off('failed', this._onTextureFailed);

    node.on('inViewport', this._onInViewport);
    node.on('loaded', this._onTextureLoaded);
    node.on('failed', this._onTextureFailed);

    this.node = node;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      if (!child) {
        continue;
      }

      if (LightningViewElement.flattenLayoutViewsEnabled) {
        child._applyFlattenedLink(0, 0, node, true);
      } else {
        child.node.parent = node;
      }
    }

    oldNode.destroy();

    this.recalculateVisibility();
  }

  public insertChild(
    child: LightningElement,
    beforeChild?: LightningElement | null,
  ): void {
    if (child.parent === this && child.parent.node === this.node) {
      // Already ours: a same-parent reorder, not a real (re)parent. Reshuffle
      // children[] only, keep the node/Yoga subtree alive.
      this._moveChild(child, beforeChild);

      return;
    }

    const index = beforeChild
      ? this.children.indexOf(beforeChild)
      : this.children.length;

    if (beforeChild) {
      this.children.splice(index, 0, child);
    } else {
      this.children.push(child);
    }

    child.parent = this;

    if (this._deferTarget) {
      child.deferTarget = this._deferTarget;
    }

    this._eventEmitter.emit('childAdded', child, index);
  }

  private _moveChild(
    child: LightningElement,
    beforeChild?: LightningElement | null,
  ): void {
    if (child === beforeChild) {
      return;
    }

    const fromIndex = this.children.indexOf(child);

    if (fromIndex < 0) {
      return;
    }

    this.children.splice(fromIndex, 1);

    // Look up beforeChild after removing child, so its index already is the
    // destination position in the shortened array.
    const toIndex = beforeChild
      ? this.children.indexOf(beforeChild)
      : this.children.length;

    this.children.splice(toIndex, 0, child);

    if (toIndex !== fromIndex) {
      this._eventEmitter.emit('childMoved', child, fromIndex, toIndex);
    }
  }

  public removeChild(child: LightningElement): void {
    const index = this.children.indexOf(child);

    // Idempotent — React's reconciler hits this path twice per unmount:
    // first via the host-config `removeChild`, then again from inside
    // `destroy()` (`this.parent?.removeChild(this)`). The second call is
    // a no-op for `this.children` but used to re-emit `childRemoved`,
    // doubling downstream worker traffic in plugin-flexbox (each emit
    // fires `removeNode` + `queueRender` etc.).
    if (index < 0) {
      return;
    }

    this.children.splice(index, 1);

    if (!child._deferTarget) {
      child.node.parent = null;
    }

    this._eventEmitter.emit('childRemoved', child, index);
  }

  public focus(): void {
    if (!this._focused) {
      this.props.onFocusCapture?.(this);
      this._focused = true;
      this._eventEmitter.emit('focusChanged', this, true);
      this.props.onFocus?.(this);
    }
  }

  public blur(): void {
    if (this._focused) {
      this._focused = false;
      this._eventEmitter.emit('focusChanged', this, false);
      this.props.onBlur?.(this);
    }
  }

  /** Deliver a focus/blur event bubbling up from a focused descendant. */
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

  public getRelativePosition(ancestor?: LightningElement | null): {
    x: number;
    y: number;
  } {
    let totalX = 0;
    let totalY = 0;

    // oxlint-disable-next-line typescript/no-this-alias - Required for loop optimization
    let curr: LightningElement | null = this;

    while (curr && curr !== ancestor) {
      totalX += curr.node.x;
      totalY += curr.node.y;

      let next: LightningElement | null = curr.parent;

      // A real node's x already folds in its flattened ancestors' offsets;
      // skip those so they don't double-count. If the requested ancestor IS
      // one of them, back its own fold out of the running total.
      if (LightningViewElement.flattenLayoutViewsEnabled && !curr.isFlattened) {
        while (next && next.isFlattened) {
          if (next === ancestor) {
            totalX -= next._flatOffsetX + next._layoutX;
            totalY -= next._flatOffsetY + next._layoutY;
            next = null;
            break;
          }

          next = next.parent;
        }
      }

      curr = next;
    }

    return {
      x: totalX,
      y: totalY,
    };
  }

  public getBoundingClientRect(ancestor?: LightningElement | null): {
    x: number;
    y: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    // TODO: Include padding + border in size
    w: number;
    h: number;
    width: number;
    height: number;
  } {
    const { x, y } = this.getRelativePosition(ancestor);

    return {
      x: x,
      y: y,
      left: x,
      top: y,
      right: x + this.node.w,
      bottom: y + this.node.h,
      // TODO: Include padding + border in size
      w: this.node.w,
      h: this.node.h,
      width: this.node.w,
      height: this.node.h,
    };
  }

  /**
   * Updates existing props with the payload, keeping other unspecified props
   * unchanged.
   */
  public setProps(payload: Partial<TProps>): void {
    const { style, transition, ...otherProps } = payload;

    Object.assign(this._stagedUpdates, otherProps);
    this._hasStagedUpdates = true;

    // Transitions can be applied to props immediately instead of staging it.
    // This allows us to also know if a prop needs to be animated or not.
    if (transition) {
      if (!this.props.transition) {
        this.props.transition = transition;
      } else {
        Object.assign(this.props.transition, transition);
      }
    }

    if (style) {
      if (!this._stagedUpdates.style) {
        this._stagedUpdates.style = style;
      } else {
        Object.assign(this._stagedUpdates.style, style);
      }

      this._hasStagedUpdates = true;
    }

    this._scheduleUpdate();
  }

  /**
   * Set a value on the lightning node directly. Animate if the `animate` flag
   * is true, and a transition is defined for the prop. Returns true if value was set
   */
  public setNodeProp<K extends keyof RendererNode<LightningElement>>(
    key: K,
    value: RendererNode<LightningElement>[K],
    animate = true,
  ): boolean {
    if (import.meta.env.DEV) {
      __checkProps([key]);
    }

    if (LightningViewElement.flattenLayoutViewsEnabled) {
      if (
        this._flattened &&
        LightningViewElement._needsRealNode(key as string, value)
      ) {
        this._materialize();
      }

      this._containStackingIndex(key as string, value);

      if (
        (key === 'x' || key === 'y') &&
        typeof value === 'number' &&
        !(animate && this.props.transition?.[key as keyof TStyleProps])
      ) {
        return this._writeAxis(key as 'x' | 'y', value);
      }
    }

    if (this.node[key] === value) {
      return false;
    }

    if (animate && this.props.transition?.[key as keyof TStyleProps]) {
      this.animateStyle(
        key as keyof TStyleProps,
        value as unknown as TStyleProps[keyof TStyleProps],
      );
      // Map width and height to w and h. Even though typings only allow w/h,
      // it's possible some weird combination of JSX props might enable the
      // width/height props to be set, so this ensures they still work.
    } else if ((key as string) === 'width' && value != null) {
      this.node.w = value as number;
    } else if ((key as string) === 'height' && value != null) {
      this.node.h = value as number;
    } else {
      this.node[key] = value;
    }

    return true;
  }

  public emitLayoutEvent(): void {
    // onLayout stays parent-relative; node.x may fold in flattened-ancestor
    // offsets.
    const flag = LightningViewElement.flattenLayoutViewsEnabled;
    const dimensions = {
      x: flag ? this._layoutX : this.node.x,
      y: flag ? this._layoutY : this.node.y,
      h: this.node.h,
      w: this.node.w,
    };

    this.emit('layout', dimensions);
    this._onLayout(dimensions);
  }

  /**
   * Invoked by {@link NodeResizeObserver} at the start of each frame when
   * the observed node's width or height has changed since the prior frame.
   *
   * Not intended to be called by application code.
   */
  public _emitResize(dimensions: { w: number; h: number }): void {
    this._eventEmitter.emit('resized', this, dimensions);
    this.props.onResize?.(dimensions);
  }

  public recalculateVisibility = (): void => {
    const prevFocusable = this.focusable;
    const prevVisible = this._visible;

    this._visible =
      this.node.alpha > 0 && (!this.parent || this.parent.visible);

    if (this._visible !== prevVisible) {
      this._eventEmitter.emit('visibilityChanged', this._visible);

      // Optimize child iteration - use traditional for loop for better performance
      for (let i = 0; i < this.children.length; i++) {
        this.children[i]?.recalculateVisibility();
      }
    }

    const currentFocusable = this.focusable;

    if (currentFocusable !== prevFocusable) {
      this._eventEmitter.emit('focusableChanged', this, currentFocusable);
    }
  };

  public animateStyle<K extends keyof TStyleProps>(
    key: K,
    value: TStyleProps[K],
  ): IAnimationController {
    // Skip no-op animations (target equals the node's current value, and no
    // in-flight animation is heading somewhere else). A no-op still counts as
    // an active animation for delay+duration, keeping the scene hot and
    // full-redrawing every frame; focus moves fire several (e.g. a popover's
    // delayed alpha 1 -> 1) and stall low-end devices for their whole window.
    const inFlight = this._animTargets.get(key);

    if (
      (this.node as unknown as Record<PropertyKey, unknown>)[key] === value &&
      (inFlight === undefined || inFlight === value)
    ) {
      return noopAnimationController;
    }

    this._animTargets.set(key, value);

    let target = value;

    if (
      LightningViewElement.flattenLayoutViewsEnabled &&
      (key === 'x' || key === 'y') &&
      typeof value === 'number'
    ) {
      if (key === 'x') {
        this._layoutX = value;
        target = (value + this._flatOffsetX) as TStyleProps[K];
      } else {
        this._layoutY = value;
        target = (value + this._flatOffsetY) as TStyleProps[K];
      }
    }

    return this._createAnimation(
      {
        [key]: target,
      },
      this.props.transition?.[key],
    ).start();
  }

  public animateShader(
    props: Partial<CoreShaderNode['props']>,
  ): IAnimationController {
    return this._createAnimation(
      {
        shaderProps: props,
      },
      this.props.transition?.shaderProps,
    ).start();
  }

  public toString(expanded?: boolean) {
    return `${this._recycled ? '\u267B ' : ''}${this.constructor.name} id=${this.id}${this.focusable ? ' focusable' : ''}${this.visible ? ' visible' : ''}${expanded ? ` props=${JSON.stringify(this.props)}` : ''}`;
  }

  private _destroyFinalize = () => {
    this._deferTarget?.off('deferredDestroyComplete', this._destroyFinalize);
    this.node.parent = null;

    if (!this._flattened) {
      this._renderer.destroyNode(this.node);
    }
  };

  private _reconcileResizeObserving(): void {
    const shouldObserve =
      this.props.onResize != null || this._eventEmitter.hasListeners('resized');

    if (shouldObserve === this._isObservingResize) {
      return;
    }

    if (shouldObserve) {
      if (this._resizeObserver === null) {
        this._resizeObserver = getNodeResizeObserver(this._renderer);
      }

      this._resizeObserver.observe(this);
      this._isObservingResize = true;
    } else if (this._resizeObserver) {
      this._resizeObserver.unobserve(this);
      this._isObservingResize = false;
    }
  }

  // Don't pass down the `data` prop to the lightning node.
  private _createNode({
    data: _data,
    ...props
  }: Partial<INodeProps>): RendererNode<this> {
    const node = this.isTextElement
      ? this._renderer.createTextNode(props)
      : this._renderer.createNode(props);

    return node as RendererNode<this>;
  }

  private _scheduleUpdate() {
    if (this._isUpdateQueued || !this._hasStagedUpdates) {
      return;
    }

    this._isUpdateQueued = true;

    queueMicrotask(() => {
      const changed = this._doUpdate();

      if (changed) {
        this._eventEmitter.emit('propsChanged', this.props);
      }
    });
  }

  protected _doUpdate(): boolean {
    const payload = this._stagedUpdates;

    this._stagedUpdates = {};
    this._hasStagedUpdates = false;

    // Fast path: style-only updates where no plugin handles the changed properties
    if (this._canFastPathStyle(payload)) {
      return this._applyStyleFastPath(payload);
    }

    const transformedProps = this._transformProps(payload) ?? ({} as TProps);
    const previousOpacity = this.node.alpha;
    const previousOnResize = this.props.onResize;

    let changed = false;

    for (const key in transformedProps) {
      if (this.props[key] !== transformedProps[key]) {
        this.props[key] = transformedProps[key];
        changed = true;
      }
    }

    if (previousOnResize !== this.props.onResize) {
      this._reconcileResizeObserving();
    }

    const lngProps = this._toLightningNodeProps({
      ...this.props,
      ...transformedProps,
    });

    if (import.meta.env.DEV) {
      __checkProps(Object.keys(lngProps));
      Object.assign(this.rawProps, payload);
    }

    // Prevent non-numeric width and height values from being set on the
    // lightning node, as this can cause it to disappear. Instead, we'll set
    // them on the style proxy so they can be applied once they're valid. This
    // allows for things like setting width/height to '100%' in JSX without
    // breaking the node, even though it's not a valid value for the lightning
    // node itself. Once the layout system calculates the actual pixel values,
    // it will update the lightning node and remove the string values from the
    // style proxy.
    if (typeof lngProps.w !== 'number') {
      delete lngProps.w;
    }

    if (typeof lngProps.h !== 'number') {
      delete lngProps.h;
    }

    // While paint is withheld, a styled alpha change must update the alpha we
    // restore on first layout, not the node's (which stays 0 so the node keeps
    // hiding). See {@link withholdPaintUntilLayout}.
    if (this._paintWithheld && lngProps.alpha !== undefined) {
      this._withheldAlpha = lngProps.alpha;
      delete lngProps.alpha;
    }

    let flattenedMoved = false;

    if (LightningViewElement.flattenLayoutViewsEnabled) {
      if (
        this._flattened &&
        (this.props.transition !== undefined ||
          !LightningViewElement._isLayoutOnlyNodeProps(
            lngProps as Record<string, unknown>,
          ))
      ) {
        this._materialize();
      }

      const staged = lngProps as Record<string, unknown>;

      this._containStackingIndex('zIndex', staged.zIndex);
      this._containStackingIndex('zIndexLocked', staged.zIndexLocked);

      if (typeof lngProps.x === 'number') {
        flattenedMoved = this._flattened && this._layoutX !== lngProps.x;
        this._layoutX = lngProps.x;

        if (!this._flattened) {
          lngProps.x += this._flatOffsetX;
        }
      }

      if (typeof lngProps.y === 'number') {
        flattenedMoved =
          flattenedMoved || (this._flattened && this._layoutY !== lngProps.y);
        this._layoutY = lngProps.y;

        if (!this._flattened) {
          lngProps.y += this._flatOffsetY;
        }
      }
    }

    Object.assign(this.node, lngProps);

    if (flattenedMoved) {
      this._refreshFlattenedChildren(false);
    }

    // oxlint-disable-next-line typescript/no-explicit-any -- Required for accessing AllStyleProps symbol
    Object.assign((this.style as any)[AllStyleProps], this.props.style);

    if (previousOpacity !== this.node.alpha) {
      this.recalculateVisibility();
    }

    // Check for style changes without allocating an array
    let hasStyleChanges = false;

    if (payload.style) {
      for (const _ in payload.style) {
        hasStyleChanges = true;
        break;
      }
    }

    if (hasStyleChanges) {
      this._eventEmitter.emit(
        'stylesChanged',
        this.props.style as Partial<LightningElementStyle>,
      );
    }

    this._isUpdateQueued = false;

    return changed;
  }

  /** Style properties that may trigger shader creation — must use the slow path. */
  private static readonly _shaderStyleProps = new Set([
    'border',
    'borderColor',
    'borderRadius',
    'borderTop',
    'borderLeft',
    'borderRight',
    'borderBottom',
    'linearGradient',
  ]);

  /**
   * Checks whether a staged update can skip the plugin transform pipeline.
   * Returns true when the payload only contains style properties that no
   * plugin declares as handled and that don't require shader creation.
   */
  private _canFastPathStyle(payload: Partial<TProps>): boolean {
    if (!('style' in payload) || !payload.style) {
      return false;
    }

    // A node that currently has a shader must take the slow path: the update
    // may remove the border/radius that produced it, and only the slow path
    // recomputes (or clears) the shader. The fast path assigns style keys to
    // the node verbatim and would leave a stale shader painting.
    if (this._shaderDef) {
      return false;
    }

    for (const key in payload) {
      if (key !== 'style') {
        return false;
      }
    }

    const style = payload.style;

    for (const key in style) {
      if (LightningViewElement._shaderStyleProps.has(key)) {
        return false;
      }

      for (const plugin of this._plugins) {
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

  /**
   * Applies a style-only update directly to the Lightning node, bypassing
   * the plugin transform pipeline and full props-merge iteration.
   */
  private _applyStyleFastPath(payload: Partial<TProps>): boolean {
    const style = payload.style as Partial<TStyleProps>;

    if (LightningViewElement.flattenLayoutViewsEnabled && this._flattened) {
      for (const key in style) {
        if (
          LightningViewElement._needsRealNode(
            key,
            style[key as keyof TStyleProps],
          )
        ) {
          this._materialize();
          break;
        }
      }
    }

    if (LightningViewElement.flattenLayoutViewsEnabled) {
      const s = style as Record<string, unknown>;

      this._containStackingIndex('zIndex', s.zIndex);
      this._containStackingIndex('zIndexLocked', s.zIndexLocked);
    }

    const previousOpacity = this.node.alpha;
    let changed = false;

    if (this.props.style !== style) {
      // oxlint-disable-next-line typescript/no-explicit-any -- matching slow-path behaviour
      (this.props as any).style = style;
      changed = true;
    }

    if (import.meta.env.DEV) {
      Object.assign(this.rawProps, payload);
    }

    const transition = this.props.transition;

    for (const key in style) {
      const typedKey = key as string & keyof TStyleProps;
      const value = style[typedKey];

      if (value == null) {
        continue;
      }

      if ((key === 'w' || key === 'h') && typeof value !== 'number') {
        continue;
      }

      // While paint is withheld, capture a styled alpha change for restore on
      // first layout instead of un-hiding the node. See
      // {@link withholdPaintUntilLayout}.
      if (key === 'alpha' && this._paintWithheld) {
        this._withheldAlpha = value as number;
        continue;
      }

      if (transition?.[typedKey]) {
        this.animateStyle(typedKey, value as TStyleProps[typeof typedKey]);
      } else if (
        LightningViewElement.flattenLayoutViewsEnabled &&
        (key === 'x' || key === 'y') &&
        typeof value === 'number'
      ) {
        this._writeAxis(key as 'x' | 'y', value);
      } else {
        // oxlint-disable-next-line typescript/no-explicit-any -- direct node property assignment
        (this.node as any)[key] = value;
      }
    }

    // oxlint-disable-next-line typescript/no-explicit-any -- Required for accessing AllStyleProps symbol
    Object.assign((this.style as any)[AllStyleProps], style);

    // A direct `clipping` change must keep rounded clipping in sync. Shader
    // props force the slow path, so the shader is stable here.
    if (LightningViewElement.roundedClippingEnabled && 'clipping' in style) {
      const shaderType = this._shaderDef?.type;
      const radius =
        style.clipping === true &&
        (shaderType === 'Rounded' || shaderType === 'RoundedWithBorder')
          ? this._shaderDef?.props?.radius
          : 0;
      const clipRadius =
        (Array.isArray(radius) ? Math.max(...radius) : (radius as number)) ||
        0;

      if ((this.node.clipRadius ?? 0) !== clipRadius) {
        this.node.clipRadius = clipRadius;
      }
    }

    if (previousOpacity !== this.node.alpha) {
      this.recalculateVisibility();
    }

    this._eventEmitter.emit(
      'stylesChanged',
      this.props.style as Partial<LightningElementStyle>,
    );

    this._isUpdateQueued = false;

    return changed;
  }

  /**
   * This method is intended to handle changes that are important before
   * the loaded event is emitted to plugins and external channels.
   */
  protected _handleTextureLoaded(_event: NodeLoadedPayload): void {
    // override as necessary
  }

  private _onInViewport: NodeRenderStateEventHandler = (node, renderState) => {
    this._eventEmitter.emit('inViewport', node, renderState);
  };

  private _onTextureLoaded: NodeLoadedEventHandler = (node, event) => {
    this._handleTextureLoaded(event);
    this._eventEmitter.emit('textureLoaded', node, event);
    this.props.onTextureReady?.(event.dimensions);
  };

  private _onTextureFailed: NodeFailedEventHandler = (...args) => {
    this._eventEmitter.emit('textureFailed', ...args);
  };

  private _onLayout = (dimensions: Rect) => {
    this._hasLayout = true;

    // First layout resolved — reveal a withheld node at its now-correct
    // geometry. See {@link withholdPaintUntilLayout}.
    if (this._paintWithheld) {
      this._paintWithheld = false;

      if (this.node.alpha !== this._withheldAlpha) {
        this.node.alpha = this._withheldAlpha;
        this.recalculateVisibility();
      }
    }

    this.props.onLayout?.(dimensions);
  };

  private _createAnimation(
    props: Partial<INodeAnimateProps>,
    animationSettings?: Partial<AnimationSettings>,
  ) {
    const animation = this.node.animate(props, animationSettings || {});

    animation.once('stopped', (controller) => {
      this._eventEmitter.emit('animationFinished', controller);
    });

    return animation;
  }

  private _getShaderFromStyle(
    style: TStyleProps | undefined | null,
  ): ShaderDef | undefined {
    if (!style) {
      return;
    }

    const props: ShaderDef['props'] = {};
    let type: ShaderDef['type'] | undefined;
    let hasRounded = false;

    const {
      border,
      borderColor,
      borderTop,
      borderLeft,
      borderRight,
      borderBottom,
      borderRadius,
      linearGradient,
    } = style;

    if (borderRadius) {
      type = 'Rounded';
      props.radius = borderRadius;
      hasRounded = true;
    }

    if (
      border ||
      borderColor ||
      borderTop ||
      borderLeft ||
      borderRight ||
      borderBottom
    ) {
      if (type && type === 'Rounded') {
        type = 'RoundedWithBorder';
      } else {
        type = 'Border';
      }
    }

    if (border) {
      if (typeof border === 'number') {
        props[hasRounded ? 'border-w' : 'w'] = border;
      } else if (typeof border === 'object') {
        props[hasRounded ? 'border-w' : 'w'] = border.w;
        props[hasRounded ? 'border-color' : 'color'] = border.color;
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

    if (type) {
      if (linearGradient) {
        // Radius-only node: fold the radius into the gradient so it rounds its
        // own corners (a node carries one shader, so a separate Rounded shader
        // would drop the gradient). A real border still can't combine and wins.
        if (type === 'Rounded') {
          return {
            type: 'LinearGradient',
            props: { ...linearGradient, radius: props.radius },
          };
        }

        if (import.meta.env.DEV) {
          console.warn(
            `Warning: element ${this.id} sets both a background gradient and a border. A node can only carry one shader, so the border wins and the gradient is dropped.`,
          );
        }
      }

      return { type, props };
    }

    if (linearGradient) {
      return { type: 'LinearGradient', props: linearGradient };
    }

    return undefined;
  }

  public _toLightningNodeProps(
    // oxlint-disable-next-line typescript/no-explicit-any -- TODO
    props: TProps & Record<string, any>,
    initial = false,
  ): Partial<INodeProps> {
    // There is no style object in the lightning node, all the style props are on the
    // node itself, so we need to destructure the style object into props.
    const {
      // These props are ignored as they conflict with lightning nodes
      id: _id,
      data: _data,
      // These props require processing and mapping to lightning node props
      style,
      shader,
      texture,
      ...otherProps
    } = props;

    const finalStyle: Partial<INodeProps> = {};

    if (style !== undefined && style !== null) {
      const transition = !initial ? this.props.transition : undefined;
      const isText = this.isTextElement;

      for (const key in style) {
        // Lightning doesn't allow setting w/h on text nodes
        if (isText && (key === 'w' || key === 'h')) {
          continue;
        }

        const value = style[key as keyof TStyleProps];

        if (value == null) {
          continue;
        }

        if (transition?.[key as keyof TStyleProps]) {
          this.animateStyle(key as keyof TStyleProps, value);
        } else if (initial && key === 'initialDimensions') {
          const rect = value as NonNullable<TStyleProps['initialDimensions']>;

          if (!style.w) {
            finalStyle.w = rect.w;
          }

          if (!style.h) {
            finalStyle.h = rect.h;
          }

          if (!style.x) {
            finalStyle.x = rect.x;
          }

          if (!style.y) {
            finalStyle.y = rect.y;
          }
        } else {
          // oxlint-disable-next-line typescript/no-explicit-any -- TODO
          (finalStyle as any)[key] = value;
        }
      }
    }

    const styleShader = this._getShaderFromStyle(style);

    // If the style also requires a shader, then warn. We can only apply one shader per node.
    if (shader && styleShader && import.meta.env.DEV) {
      console.warn(
        `Warning: The styles on element ${this.id} requires a shader (${styleShader.type}). Only one shader can be applied to a node. Move the 'shader' prop or the styles to a parent element.`,
      );
    }

    // Reanimated and imperative style.set pushes are marked partial: they carry
    // only the changed keys, so keep the current shader unless the update itself
    // names one. A full restyle (reconciler snapshot) isn't marked, so a dropped
    // border falls through and clears the stale shader.
    const isPartialStyle =
      style != null &&
      (style as Record<PropertyKey, unknown>)[PARTIAL_STYLE] === true;
    const oldShader = this._shaderDef;
    this._shaderDef =
      shader === undefined && isPartialStyle && !styleShader && oldShader
        ? oldShader
        : shader || styleShader;

    if (this._shaderDef?.props) {
      // if the shader is the same as the previous one, we don't need to recreate it
      // Animate it if there's a shaderProps transition
      if (
        this._shaderDef.type === oldShader?.type &&
        initial === false &&
        this.props.transition?.shaderProps &&
        this._shaderDef.props
      ) {
        this.animateShader(this._shaderDef.props);
      } else if (
        this._shaderDef.type === oldShader?.type &&
        this.shader.props
      ) {
        for (const [key, value] of Object.entries(this._shaderDef.props)) {
          // Gate on key existence, not truthiness: a prop whose current value
          // is falsy (e.g. a transparent `border-color` of 0) must still be
          // updatable — otherwise toggling a focus-ring border from
          // transparent to a visible color on an already-mounted node is
          // silently dropped and the ring never appears.
          if (key in this.shader.props) {
            this.shader.props[key] = value;
          }
        }
      } else {
        finalStyle.shader = this._renderer.createShader(
          this._shaderDef.type,
          this._shaderDef.props,
        );
      }
    } else if (oldShader) {
      // The node had a style/explicit shader (e.g. a focus-ring border) and now
      // has none — clear it so the previous shader stops painting. Setting the
      // node's shader to null resets it to the stage's default shader. Without
      // this a removed border would linger on an already-mounted node.
      (finalStyle as { shader: INode['shader'] | null }).shader = null;
    }

    if (texture && texture !== this._textureDef) {
      this._textureDef = texture;
      finalStyle.texture = createTexture(this._renderer, texture);
    }

    // borderRadius + clipping (overflow: hidden) = rounded clipping, like the
    // other RN platforms: the renderer stencil-clips children to clipRadius.
    if (LightningViewElement.roundedClippingEnabled) {
      const shaderType = this._shaderDef?.type;
      // At mount the style proxy doesn't exist yet; the passed style is full.
      const effectiveClipping = initial
        ? style?.clipping
        : (style?.clipping ?? this.style.clipping);
      const radius =
        effectiveClipping === true &&
        (shaderType === 'Rounded' || shaderType === 'RoundedWithBorder')
          ? this._shaderDef?.props?.radius
          : 0;
      // The stencil takes one radius; a per-corner array clips to the largest.
      const clipRadius =
        (Array.isArray(radius) ? Math.max(...radius) : (radius as number)) ||
        0;

      if (
        initial ? clipRadius > 0 : (this.node.clipRadius ?? 0) !== clipRadius
      ) {
        finalStyle.clipRadius = clipRadius;
      }
    }

    const finalProps = Object.assign(otherProps, finalStyle);

    if (
      initial === true &&
      this.isImageElement === false &&
      this.isTextElement === false &&
      finalProps.color === undefined
    ) {
      // Default color 0 for views (renderer default is white). Text and image pick their
      // own defaults; stamping 0 here would make a colorless Text mount transparent.
      finalProps.color = 0;
    }

    return finalProps;
  }

  // Setting any styling applied to the style attribute on an element
  private _styleProxyHandler: ProxyHandler<Partial<TStyleProps>> = {
    get: (target, prop) => {
      if (prop === AllStyleProps) {
        return target;
      }

      return (
        this._stagedUpdates?.style?.[prop as keyof LightningViewElementStyle] ??
        target[prop as keyof TStyleProps]
      );
    },
    set: (target, prop, value) => {
      const key = prop as keyof TStyleProps;

      if (this.style[key] === value) {
        return true;
      }

      target[key] = value;

      // Single-key imperative set: mark it partial so shader/flex processors
      // keep the props this push omits.
      const style = { [key]: value } as Partial<TStyleProps>;
      (style as Record<PropertyKey, unknown>)[PARTIAL_STYLE] = true;

      this.setProps({ style } as Partial<TProps>);

      return true;
    },
  };

  private _transformProps(props: Partial<TProps>) {
    let transformedProps = props;

    for (const plugin of this._plugins) {
      if (plugin.transformProps) {
        const result = plugin.transformProps(this, transformedProps);

        if (result == null) {
          return null;
        }

        transformedProps = result;
      }
    }

    return transformedProps as TProps;
  }
}
