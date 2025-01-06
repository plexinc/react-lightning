import type {
  AnimationSettings,
  BaseShaderController,
  EffectDescUnion,
  INode,
  INodeAnimateProps,
  INodeProps,
  NodeFailedEventHandler,
  NodeLoadedEventHandler,
  NodeLoadedPayload,
  RendererMain,
  Texture,
} from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import type { UnionToIntersection } from 'type-fest';
import type { Plugin } from '../render/Plugin';
import {
  type EffectsMap,
  type EffectsTypes,
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
import { EventEmitter } from '../utils/EventEmitter';
import { areArraysEqual } from '../utils/areArraysEqual';
import { AllStyleProps } from './AllStyleProps';

type LightningElementProp = keyof UnionToIntersection<LightningElement>;

// These props exist on the lightning element, and needs to be set when the
// corresponding prop is set so that the element can update.
const ELEMENT_PROPS: LightningElementProp[] = ['text', 'src', 'shader'];

function getEffectName(type: string | number, id: number) {
  return `${type}_${id}`;
}

function createEffectsShader(
  renderer: RendererMain,
  effects: EffectsMap,
  id: LightningElement['id'],
): BaseShaderController {
  return renderer.createShader('DynamicShader', {
    effects: Object.entries(effects).map(([name, effect]) => ({
      name: getEffectName(name, id),
      ...effect,
    })),
  });
}

function createShader(
  renderer: RendererMain,
  shaderDef: ShaderDef,
): BaseShaderController {
  return renderer.createShader(shaderDef.type, shaderDef.props);
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
> implements
    Focusable,
    Pick<EventEmitter<LightningElementEvents>, 'on' | 'off' | 'emit'>
{
  public static allElements: Record<number, LightningElement> = {};

  public readonly id: number;

  public node: RendererNode<LightningElement>;
  public children: LightningElement[] = [];
  public isFocusGroup = false;
  public readonly rawProps: TProps;
  public readonly props: TProps;

  protected readonly _emitter = new EventEmitter<LightningElementEvents>();
  protected readonly _renderer: RendererMain;

  protected _parent: LightningElement | null = null;
  protected _plugins: Plugin<LightningElement>[] = [];

  private _styleProxy: Partial<TStyleProps>;
  private _stagedUpdates: Partial<TProps> = {};
  private _isUpdateQueued = false;
  private _effects: EffectsMap = {};
  private _shaderDef?: ShaderDef;
  private _textureDef?: TextureDef;
  private _focused = false;
  private _focusable = true;
  private _visible = true;

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

    this.emit('focusableChanged', this._focusable);
  }

  public get focused() {
    return this._focused;
  }

  public get type() {
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

  public get parent() {
    return this._parent;
  }

  public set parent(parent) {
    if (this._parent) {
      this._parent.off('visibilityChanged', this._checkVisibility);
    }

    this._parent = parent;
    this.node.parent = parent?.node ?? null;
    if (this._parent) {
      this._parent.on('visibilityChanged', this._checkVisibility);
    }
    this._checkVisibility();
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
    this._styleProxy = new Proxy({}, this._createStyleProxyHandler());

    this.setProps({
      style: {},
    } as TProps);
  }

  public get isTextElement() {
    return false;
  }

  public get isImageElement() {
    return false;
  }

  public get hasChildren() {
    return this.children.length > 0;
  }

  public get rootElement(): LightningElement {
    let root: LightningElement = this;

    while (root.parent) {
      root = root.parent;
    }

    return root;
  }

  public get isRoot() {
    return this.node.id === 1;
  }

  public on = this._emitter.on.bind(this._emitter);
  public off = this._emitter.off.bind(this._emitter);
  public emit = this._emitter.emit.bind(this._emitter);

  public constructor(
    initialProps: TProps,
    renderer: RendererMain,
    plugins: Plugin<LightningElement>[],
    fiber: Fiber,
  ) {
    this._renderer = renderer;
    this._plugins = plugins ?? [];

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
      this._createStyleProxyHandler(),
    );

    this.node = this._createNode(lngProps);
    this.node.container = this;
    this.node.on('loaded', this._onTextureLoaded);
    this.node.on('failed', this._onTextureFailed);
    this.on('layout', this._onLayout);

    LightningViewElement.allElements[this.id] = this;

    this._emitter.emit('initialized');
  }

  public destroy() {
    this.node.off('loaded', this._onTextureLoaded);
    this.node.off('failed', this._onTextureFailed);

    for (const child of this.children) {
      child.destroy();
    }

    this.parent = null;
    this.children = [];

    this._renderer.destroyNode(this.node);

    delete LightningViewElement.allElements[this.id];

    this._emitter.emit('destroy');
  }

  public insertChild(
    child: LightningElement,
    beforeChild?: LightningElement | null,
  ) {
    const index = beforeChild
      ? this.children.indexOf(beforeChild)
      : this.children.length;

    if (beforeChild) {
      this.children.splice(index, 0, child);
    } else {
      this.children.push(child);
    }

    child.parent = this;

    this._emitter.emit('childAdded', child, index);
  }

  public removeChild(child: LightningElement) {
    const index = this.children.indexOf(child);

    if (index >= 0) {
      this.children.splice(index, 1);
    }

    child.node.parent = null;

    this._emitter.emit('childRemoved', child, index);
  }

  public focus(): void {
    if (!this._focused) {
      this._focused = true;
      this._emitter.emit('focusChanged', true);
      this.props.onFocus?.(this);
    }
  }

  public blur(): void {
    if (this._focused) {
      this._focused = false;
      this._emitter.emit('focusChanged', false);
      this.props.onBlur?.(this);
    }
  }

  public render(): void {
    this._scheduleUpdate();
  }

  public getRelativePosition(ancestor?: LightningElement | null) {
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

  public getBoundingClientRect(ancestor?: LightningElement | null) {
    const { x, y } = this.getRelativePosition(ancestor);

    return {
      x: x,
      y: y,
      left: x,
      top: y,
      right: x + this.node.width,
      bottom: y + this.node.height,
      // TODO: Include padding + border in size
      width: this.node.width,
      height: this.node.height,
    };
  }

  /**
   * Updates existing props with the payload, keeping other unspecified props
   * unchanged.
   */
  public setProps(payload: Partial<TProps>) {
    const { style, transition, ...otherProps } = payload;

    Object.assign(this._stagedUpdates, otherProps);

    if (transition) {
      if (!this._stagedUpdates.transition) {
        this._stagedUpdates.transition = transition;
      } else {
        Object.assign(this._stagedUpdates.transition, transition);
      }
    }

    if (style) {
      if (!this._stagedUpdates.style) {
        this._stagedUpdates.style = {} as TStyleProps;
      }

      if (Array.isArray(style)) {
        Object.assign(
          this._stagedUpdates.style,
          ...style.flat(Number.POSITIVE_INFINITY),
        );
      } else {
        Object.assign(this._stagedUpdates.style, style);
      }
    }

    this._scheduleUpdate();
  }

  /**
   * Set a value on the lightning node directly. Animate if the `animate` flag
   * is true, and a transition is defined for the prop.
   */
  public setNodeProp<K extends keyof RendererNode<LightningElement>>(
    key: K,
    value: RendererNode<LightningElement>[K],
    animate = true,
  ) {
    if (this.node[key] === value) {
      return;
    }

    if (animate && this.props.transition?.[key as keyof TStyleProps]) {
      this.animateStyle(
        key as keyof TStyleProps,
        value as unknown as TStyleProps[keyof TStyleProps],
      );
    } else {
      this.node[key] = value;
    }
  }

  public animateStyle<K extends keyof TStyleProps>(
    key: K,
    value: TStyleProps[K],
  ) {
    return this._createAnimation(
      {
        [key]: value,
      },
      this.props.transition?.[key],
    ).start();
  }

  public animateEffect<K extends keyof EffectsMap>(
    key: K,
    props: Partial<EffectsMap[K]>,
  ) {
    return this._createAnimation(
      {
        shaderProps: {
          [getEffectName(key, this.id)]: props,
        },
      },
      this.props.transition?.[key],
    ).start();
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

  private _checkVisibility = () => {
    const prevFocusable = this.focusable;
    const prevVisible = this._visible;

    this._visible =
      this.node.alpha > 0 && (!this.parent || this.parent.visible);

    if (this._visible !== prevVisible) {
      this.emit('visibilityChanged', this._visible);
    }

    if (this.focusable !== prevFocusable) {
      this.emit('focusableChanged', this.focusable);
    }
  };

  private _scheduleUpdate() {
    if (this._isUpdateQueued) {
      return;
    }

    this._isUpdateQueued = true;

    requestAnimationFrame(this._doUpdate);
  }

  private _doUpdate = () => {
    if (Object.keys(this._stagedUpdates).length === 0) {
      return;
    }

    const payload = this._stagedUpdates;

    this._stagedUpdates = {};

    const transformedProps = this._transformProps(payload) ?? ({} as TProps);

    // don't pass in some props to node, as they conflict with the node props
    const fullProps = Object.assign({}, this.props, transformedProps);
    const lngProps = this._toLightningNodeProps(fullProps);

    Object.assign(this.rawProps, payload);
    Object.assign(this.props, transformedProps);
    Object.assign(this.node, lngProps);

    // biome-ignore lint/suspicious/noExplicitAny: TODO
    Object.assign((this.style as any)[AllStyleProps], this.props.style);

    if (this.props.style?.alpha != null) {
      this._checkVisibility();
    }

    for (const prop of ELEMENT_PROPS) {
      if (prop in this.props) {
        // biome-ignore lint/suspicious/noExplicitAny: TODO
        (this as any)[prop] = this.props[prop as keyof TProps];
      }
    }

    if (payload.style && Object.keys(payload.style).length) {
      this._emitter.emit(
        'stylesChanged',
        this.props.style as Partial<LightningElementStyle>,
      );
    }

    this.emit('propsChanged', this.props);

    this._isUpdateQueued = false;
  };

  /**
   * This method is intended to handle changes that are important before
   * the loaded event is emitted to plugins and external channels.
   */
  protected _handleTextureLoaded(_event: NodeLoadedPayload): void {
    // override as necessary
  }

  private _onTextureLoaded: NodeLoadedEventHandler = (node, event) => {
    this._handleTextureLoaded(event);
    this._emitter.emit('textureLoaded', node, event);
    this.props.onTextureLoaded?.(event.dimensions);
  };

  private _onTextureFailed: NodeFailedEventHandler = (...args) => {
    this._emitter.emit('textureFailed', ...args);
  };

  private _onLayout = (dimensions: Rect) => {
    this.props.onLayout?.(dimensions);
  };

  private _createAnimation(
    props: Partial<INodeAnimateProps>,
    animationSettings?: Partial<AnimationSettings>,
  ) {
    const animation = this.node.animate(props, animationSettings || {});

    animation.once('stopped', (controller) => {
      this._emitter.emit('animationFinished', controller);
    });

    return animation;
  }

  private _getEffectFromStyle<K extends keyof TStyleProps>(
    prop: K,
    value: TStyleProps[K],
  ): EffectDescUnion | null {
    if (prop === 'borderRadius') {
      return {
        type: 'radius',
        props: {
          radius: value as number,
        },
      };
    }
    if (
      prop === 'border' ||
      prop === 'borderTop' ||
      prop === 'borderLeft' ||
      prop === 'borderRight' ||
      prop === 'borderBottom'
    ) {
      return {
        type: prop,
        props: value as NonNullable<EffectsTypes['border']>,
      };
    }

    return null;
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
      transition,
      effects,
      shader,
      texture,
      ...otherProps
    } = props;

    const finalStyle: Partial<INodeProps> = {};
    let effectsChanged = false;
    const newEffects: EffectsMap = {};

    if (effects) {
      Object.assign(newEffects, effects);
      effectsChanged = true;
    }

    if (style !== undefined && style !== null) {
      for (const prop in style) {
        const key = prop as keyof TStyleProps;
        const value = style[key];

        if (value == null) {
          continue;
        }

        const effect = this._getEffectFromStyle(key, value);

        if (effect) {
          // Cache busting the shader cache in lightning
          newEffects[effect.type] = effect;
          effectsChanged = true;
        } else if (!initial && this.props.transition?.[key]) {
          this.animateStyle(key, value);
        } else {
          // biome-ignore lint/suspicious/noExplicitAny: TODO
          (finalStyle as any)[key] = value;
        }
      }
    }

    if (shader && this._shaderDef !== shader) {
      this._shaderDef = shader;
      finalStyle.shader = createShader(this._renderer, shader);
    } else if (effectsChanged) {
      if (
        !initial &&
        transition &&
        this.node?.shader?.type === 'DynamicShader'
      ) {
        const oldEffectsNames = Object.keys(this._effects);
        const newEffectsNames = Object.keys(newEffects);

        if (!areArraysEqual(oldEffectsNames, newEffectsNames)) {
          this._shaderDef = undefined;
          finalStyle.shader = createEffectsShader(
            this._renderer,
            this._effects,
            this.id,
          );
        } else {
          for (const effectName in newEffects) {
            const effectProps =
              this.node.shader.props[getEffectName(effectName, this.id)];
            if (transition[effectName] && newEffects[effectName]) {
              const animatableProps: Record<string, number> = {};
              const nonAnimatableProps: Record<string, unknown> = {};

              const {
                name: _name,
                type: _type,
                ...props
              } = newEffects[effectName].props;

              for (const key of Object.keys(props)) {
                if (typeof props[key] === 'number') {
                  animatableProps[key] = props[key];
                } else {
                  nonAnimatableProps[key] = props[key];
                }
              }

              Object.assign(effectProps, nonAnimatableProps);
              this.animateEffect(effectName, animatableProps);
            } else {
              Object.assign(effectProps, newEffects[effectName]?.props);
            }
          }
        }
      } else {
        this._shaderDef = undefined;
        finalStyle.shader = createEffectsShader(
          this._renderer,
          newEffects,
          this.id,
        );
      }
      this._effects = newEffects;
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
  private _createStyleProxyHandler = (): ProxyHandler<Partial<TStyleProps>> => {
    return {
      get: (target, prop) => {
        if (prop === AllStyleProps) {
          return target;
        }

        return (
          this._stagedUpdates?.style?.[
            prop as keyof LightningViewElementStyle
          ] ?? target[prop as keyof TStyleProps]
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
