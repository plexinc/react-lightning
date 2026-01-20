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
  private _hasStagedUpdates = false;
  private _hasLayout = false;
  private _eventEmitter = new EventEmitter<LightningElementEvents>();
  private _deferTarget: LightningElement | null = null;
  private _deferNodeRemovalHandler: ((destroy: () => void) => void) | null =
    null;

  public get visible(): boolean {
    return this._visible;
  }

  public get focusable(): boolean {
    return this._focusable && this.visible;
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
    if (shader === null) {
      // TODO: Unset shader?
    } else {
      this.node.shader = shader;
    }
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
    this.node.parent = parent?.node ?? null;

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

  public constructor(
    initialProps: TProps,
    renderer: RendererMain,
    plugins: Plugin<LightningElement>[],
    fiber: Fiber,
  ) {
    this._renderer = renderer;
    this._plugins = plugins ?? [];

    if (import.meta.env.DEV) {
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

    this.node = this._createNode(lngProps);

    if (import.meta.env.DEV) {
      this.node.__reactNode = this;
    }

    this.node.__reactFiber = fiber;
    this.node.on('inViewport', this._onInViewport);
    this.node.on('loaded', this._onTextureLoaded);
    this.node.on('failed', this._onTextureFailed);

    LightningViewElement.allElements[this.id] = this;

    this._eventEmitter.emit('initialized');
  }

  public destroy(): void {
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
    } else if (!this._deferTarget) {
      this._renderer.destroyNode(this.node);
    }

    delete LightningViewElement.allElements[this.id];

    this._eventEmitter.emit('destroy');
  }

  public on = (
    ...args: Parameters<IEventEmitter<LightningElementEvents>['on']>
  ): (() => void) => {
    this._eventEmitter.on(...args);
    return () => this._eventEmitter.off(...args);
  };
  public once = (
    ...args: Parameters<IEventEmitter<LightningElementEvents>['once']>
  ): (() => void) => {
    this._eventEmitter.once(...args);
    return () => this._eventEmitter.off(...args);
  };

  public off: IEventEmitter<LightningElementEvents>['off'] = (...args) =>
    this._eventEmitter.off(...args);
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
      if (child) {
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

  public removeChild(child: LightningElement): void {
    const index = this.children.indexOf(child);

    if (index >= 0) {
      this.children.splice(index, 1);
    }

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

  public render(): void {
    this._scheduleUpdate();
  }

  public getRelativePosition(ancestor?: LightningElement | null): {
    x: number;
    y: number;
  } {
    let totalX = 0;
    let totalY = 0;

    let curr: LightningElement | null = this;

    while (curr && curr !== ancestor) {
      totalX += curr.node.x;
      totalY += curr.node.y;

      curr = curr.parent;
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
    const dimensions = {
      x: this.node.x,
      y: this.node.y,
      h: this.node.h,
      w: this.node.w,
    };

    this.emit('layout', dimensions);
    this._onLayout(dimensions);
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
    return this._createAnimation(
      {
        [key]: value,
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
    return `${this.constructor.name} id=${this.id}${this.focusable ? ' focusable' : ''}${this.visible ? ' visible' : ''}${expanded ? ` props=${JSON.stringify(this.props)}` : ''}`;
  }

  private _destroyFinalize = () => {
    this._deferTarget?.off('deferredDestroyComplete', this._destroyFinalize);
    this.node.parent = null;
    this._renderer.destroyNode(this.node);
  };

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

    const transformedProps = this._transformProps(payload) ?? ({} as TProps);
    const previousOpacity = this.node.alpha;

    let changed = false;

    for (const key in transformedProps) {
      if (this.props[key] !== transformedProps[key]) {
        this.props[key] = transformedProps[key];
        changed = true;
      }
    }

    const lngProps = this._toLightningNodeProps({
      ...this.props,
      ...transformedProps,
    });

    if (import.meta.env.DEV) {
      __checkProps(Object.keys(lngProps));
      Object.assign(this.rawProps, payload);
    }

    Object.assign(this.node, lngProps);

    // biome-ignore lint/suspicious/noExplicitAny: Required for accessing AllStyleProps symbol
    Object.assign((this.style as any)[AllStyleProps], this.props.style);

    if (previousOpacity !== this.node.alpha) {
      this.recalculateVisibility();
    }

    // Check for style changes before computing Object.keys()
    const hasStyleChanges =
      payload.style && Object.keys(payload.style).length > 0;

    if (hasStyleChanges) {
      this._eventEmitter.emit(
        'stylesChanged',
        this.props.style as Partial<LightningElementStyle>,
      );
    }

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

    return type ? { type, props } : undefined;
  }

  public _toLightningNodeProps(
    // biome-ignore lint/suspicious/noExplicitAny: TODO
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
      // Optimize by using for...in loop instead of Object.entries()
      for (const key in style) {
        // Lightning doesn't allow setting w/h on text nodes
        if (this.isTextElement && (key === 'w' || key === 'h')) {
          continue;
        }

        const value = style[key as keyof TStyleProps];

        if (value == null) {
          continue;
        }

        if (!initial && this.props.transition?.[key as keyof TStyleProps]) {
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
          // biome-ignore lint/suspicious/noExplicitAny: TODO
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

    const oldShader = this._shaderDef;
    this._shaderDef = shader || styleShader;

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
          if (this.shader.props[key]) {
            this.shader.props[key] = value;
          }
        }
      } else {
        finalStyle.shader = this._renderer.createShader(
          this._shaderDef.type,
          this._shaderDef.props,
        );
      }
    }

    if (texture && texture !== this._textureDef) {
      this._textureDef = texture;
      finalStyle.texture = createTexture(this._renderer, texture);
    }

    const finalProps = Object.assign(otherProps, finalStyle);

    if (
      initial === true &&
      this.isImageElement === false &&
      finalProps.color === undefined
    ) {
      // set default color to 0 for all elements except image elements
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

      this.setProps({
        style: {
          [key]: value,
        },
      } as Partial<TProps>);

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
