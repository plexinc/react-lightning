import { MODE_AVATAR, MODE_DITHER, MODE_QUAD, MODE_SPINNER, MODE_TEXT, QuadBatcher, type Rect as BaseRect } from '../QuadBatcher';

/** Screen-space clip; `r` > 0 when the innermost clipping node is rounded (screen px). */
type Rect = BaseRect & { r: number; rx0: number; ry0: number; rx1: number; ry1: number };
import { TEX_FAILED, TEX_READY, type Texture, TextureManager } from '../TextureManager';
import { AnimationManager } from './Animation';
import {
  CompatTexture,
  CoreNode,
  CoreNodeRenderState,
  CoreTextNode,
  DIRTY_ALPHA,
  DIRTY_ORDER,
  DIRTY_TEXT,
  DIRTY_TEXTURE,
  DIRTY_TRANSFORM,
} from './CoreNode';
import { EventEmitter } from './EventEmitter';
import { FontRegistry } from './Fonts';
import {
  CompatShader,
  KIND_BORDER,
  KIND_GRADIENT,
  KIND_NONE,
  KIND_ROUNDED,
  KIND_AVATAR,
  KIND_ROUNDED_BORDER,
  KIND_SPINNER,
  KIND_ULTRABLUR,
  KIND_UNSUPPORTED,
  type ShaderType,
  cornerRadii,
  resolveShaderProps,
} from './Shaders';
import { type TextProps, layoutText, rasterizeText, textKey } from './TextLayout';
import { mergeColorProgress } from './timing';

export type CompatStageOptions = {
  appWidth: number;
  appHeight: number;
  clearColor: number;
  boundsMargin: number;
  fpsUpdateInterval: number;
  deviceLogicalPixelRatio: number;
  devicePhysicalPixelRatio: number;
  textureMemoryCap?: number;
};

export type CompatStats = {
  frames: number;
  drawCalls: number;
  quads: number;
  nodesVisited: number;
  frameMs: number;
  textRasterized: number;
  textLayouts: number;
};

type PendingEvent = { node: CoreNode; name: string; data: unknown };

const STATE_EVENT: Record<number, string> = {
  [CoreNodeRenderState.Init]: 'init',
  [CoreNodeRenderState.OutOfBounds]: 'outOfBounds',
  [CoreNodeRenderState.InBounds]: 'inBounds',
  [CoreNodeRenderState.InViewport]: 'inViewport',
};

const raf: (cb: (t: number) => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number;

/**
 * The compat equivalent of Lightning's Stage: owns the GL context, frame loop,
 * root node, fonts, shader/texture registries and the per-frame traversal.
 */
export class CompatStage {
  public readonly canvas: HTMLCanvasElement;
  public readonly gl: WebGLRenderingContext;
  public readonly root: CoreNode;
  public readonly eventBus = new EventEmitter();
  public readonly animations: AnimationManager;
  public readonly fonts = new FontRegistry();
  public readonly textures: TextureManager;
  public readonly options: CompatStageOptions;
  public readonly stats: CompatStats = {
    frames: 0,
    drawCalls: 0,
    quads: 0,
    nodesVisited: 0,
    frameMs: 0,
    textRasterized: 0,
    textLayouts: 0,
  };
  public targetFrameTime = 0;
  public textGamma = 1;
  public boundsMargin: number[];
  public readonly shManager: {
    registerShaderType: (name: string, type: ShaderType) => void;
    shTypes: Record<string, ShaderType>;
  };
  public readonly txManager: {
    registerTextureType: (name: string, type: unknown) => void;
    createTexture: (type: string, props: Record<string, unknown>) => CompatTexture;
  };
  public readonly renderer: { reset: () => void; mode: string };

  /** Set by RendererMain so frameTick/fpsUpdate go out on the renderer, like Lightning. */
  public emitter: EventEmitter | null = null;

  private readonly _batcher: QuadBatcher;
  private readonly _w: number;
  private readonly _h: number;
  private _scheduled = false;
  private _active = false;
  private _lastFrame = 0;
  private readonly _clipStack: Rect[] = [];
  private readonly _radii = [0, 0, 0, 0];
  private readonly _outerRadii = [0, 0, 0, 0];
  private _clipDepth = 0;
  private _events: PendingEvent[] = [];
  private readonly _warned = new Set<string>();
  private _fpsFrames = 0;
  private _fpsStart = 0;

  public constructor(canvas: HTMLCanvasElement, options: CompatStageOptions) {
    this.canvas = canvas;
    this.options = options;
    this._w = options.appWidth;
    this._h = options.appHeight;
    this.boundsMargin = [options.boundsMargin, options.boundsMargin, options.boundsMargin, options.boundsMargin];

    const ratio = options.deviceLogicalPixelRatio * options.devicePhysicalPixelRatio;

    if (ratio !== 1) {
      this.warnOnce('dpr', `pixel ratio ${ratio} is drawn at 1x and scaled by CSS`);
    }

    canvas.width = this._w;
    canvas.height = this._h;
    canvas.style.width = `${Math.round(this._w * options.deviceLogicalPixelRatio)}px`;
    canvas.style.height = `${Math.round(this._h * options.deviceLogicalPixelRatio)}px`;

    const transparent = (options.clearColor & 255) < 255;
    const gl = canvas.getContext('webgl', {
      alpha: transparent,
      antialias: false,
      premultipliedAlpha: true,
      stencil: false,
      depth: false,
      powerPreference: 'high-performance',
    }) as WebGLRenderingContext | null;

    if (!gl) {
      throw new Error('WebGL unavailable');
    }

    this.gl = gl;
    this.textures = new TextureManager(gl, () => this.requestRender(), {
      memoryCap: options.textureMemoryCap ?? 96 * 1024 * 1024,
    });
    this._batcher = new QuadBatcher(gl);
    this.animations = new AnimationManager(() => this.requestRender());

    const shTypes: Record<string, ShaderType> = {};

    this.shManager = {
      shTypes,
      registerShaderType: (name, type) => {
        shTypes[name] = type;
      },
    };
    this.txManager = {
      registerTextureType: () => {},
      createTexture: (type, props) => this.createTexture(type, props),
    };
    this.renderer = { reset: () => {}, mode: 'webgl' };

    this.root = new CoreNode(this);
    this.root._w = this._w;
    this.root._h = this._h;
    this.requestRender();

    // Render-on-dirty: a resize or tab switch can drop the presented buffer, so draw again.
    const redraw = () => this.requestRender();

    window.addEventListener('resize', redraw);
    document.addEventListener('visibilitychange', redraw);
  }

  public warnOnce(key: string, msg: string): void {
    if (this._warned.has(key)) {
      return;
    }

    this._warned.add(key);
    console.warn(`[compat-renderer] ${msg}`);
  }

  public loadFont(type: string, opts: Record<string, unknown>): void {
    this.fonts.load(type, opts as Parameters<FontRegistry['load']>[1]);
  }

  public createShader(type: string, props?: Record<string, unknown>): CompatShader {
    const spec = this.shManager.shTypes[type];

    if (!spec) {
      this.warnOnce(`shader-${type}`, `shader ${type} is not registered`);
    }

    const shader = new CompatShader(type, resolveShaderProps(spec, props), () => this.requestRender());

    if (shader.kind === KIND_UNSUPPORTED) {
      this.warnOnce(`shader-draw-${type}`, `shader ${type} is not drawn (custom program)`);
    }

    return shader;
  }

  public createTexture(type: string, props: Record<string, unknown>): CompatTexture {
    if (type !== 'ImageTexture' && type !== 'ColorTexture') {
      this.warnOnce(`texture-${type}`, `texture type ${type} is not implemented`);
    }

    return new CompatTexture(type, props ?? {});
  }

  public setBoundsMargin(value: number | number[]): void {
    this.boundsMargin = Array.isArray(value) ? value : [value, value, value, value];
    this.requestRender();
  }

  public requestRender(): void {
    if (this._scheduled) {
      return;
    }

    this._scheduled = true;
    raf(this._frame);
  }

  public releaseTexture(node: CoreNode): void {
    const t = node._texture;

    if (t?.gl) {
      this.textures.release(t.gl);
      t.gl = null;

      if (t.state === 'loaded' || t.state === 'loading') {
        t.state = 'freed';
      }
    }
  }

  public releaseText(node: CoreNode): void {
    if (node._textTex) {
      this.textures.release(node._textTex);
      node._textTex = null;
      node._textKey = '';
    }
  }

  private readonly _frame = (now: number): void => {
    this._scheduled = false;

    if (this.targetFrameTime > 0 && now - this._lastFrame < this.targetFrameTime - 2) {
      this.requestRender();

      return;
    }

    const dt = this._lastFrame === 0 ? 16.7 : Math.min(250, now - this._lastFrame);

    this._lastFrame = now;

    if (!this._active) {
      this._active = true;
      this.eventBus.emit('active');
    }

    const t0 = performance.now();

    this.emitter?.emit('frameTick', { time: now, delta: dt });
    this.animations.update(dt);
    this.textures.processUploads();

    const batcher = this._batcher;
    const stats = this.stats;

    stats.nodesVisited = 0;
    batcher.begin(this._w, this._h, this.options.clearColor);
    this._clipDepth = 0;
    this._visit(this.root, false, false, null);
    batcher.end();

    stats.frames++;
    stats.drawCalls = batcher.drawCalls;
    stats.quads = batcher.quads;
    stats.frameMs = performance.now() - t0;

    this._fpsFrames++;

    if (now - this._fpsStart >= this.options.fpsUpdateInterval) {
      if (this._fpsStart > 0) {
        this.emitter?.emit('fpsUpdate', {
          fps: Math.round((this._fpsFrames * 1000) / (now - this._fpsStart)),
        });
      }

      this._fpsStart = now;
      this._fpsFrames = 0;
    }

    this._flushEvents();

    if (this.animations.active.size > 0 || this.textures.pendingUploads > 0) {
      this.requestRender();
    }

    if (!this._scheduled) {
      this._active = false;
      this.eventBus.emit('idle');
    }
  };

  private _queue(node: CoreNode, name: string, data: unknown): void {
    this._events.push({ node, name, data });
  }

  private _flushEvents(): void {
    if (this._events.length === 0) {
      return;
    }

    const events = this._events;

    this._events = [];

    for (let i = 0; i < events.length; i++) {
      const e = events[i];

      if (!e.node.destroyed) {
        e.node.emit(e.name, e.data);
      }
    }
  }

  private _visit(node: CoreNode, parentMoved: boolean, parentFaded: boolean, clip: Rect | null): void {
    if (node.isTextNode && node._flags & DIRTY_TEXT) {
      this._layoutText(node);
    }

    const flags = node._flags;
    const moved = parentMoved || (flags & DIRTY_TRANSFORM) !== 0;
    const faded = parentFaded || (flags & DIRTY_ALPHA) !== 0;

    this.stats.nodesVisited++;

    if (moved) {
      computeWorld(node);
    }

    if (faded) {
      node._worldAlpha = (node._parent ? node._parent._worldAlpha : 1) * node._alpha;
    }

    if (flags & DIRTY_ORDER) {
      updateDrawOrder(node);
    }

    node._flags = 0;

    if (node._worldAlpha <= 0.001) {
      node._flags = (moved ? DIRTY_TRANSFORM : 0) | (faded ? DIRTY_ALPHA : 0);

      return;
    }

    const w = node._w;
    const h = node._h;
    const axisAligned = node._wb === 0 && node._wc === 0;
    let minX: number;
    let minY: number;
    let maxX: number;
    let maxY: number;

    if (axisAligned) {
      const ax = node._wx;
      const ay = node._wy;
      const bx = ax + node._wa * w;
      const by = ay + node._wd * h;

      minX = ax < bx ? ax : bx;
      maxX = ax < bx ? bx : ax;
      minY = ay < by ? ay : by;
      maxY = ay < by ? by : ay;
    } else {
      const xs1 = node._wx + node._wa * w;
      const xs2 = node._wx + node._wc * h;
      const xs3 = xs1 + node._wc * h;
      const ys1 = node._wy + node._wb * w;
      const ys2 = node._wy + node._wd * h;
      const ys3 = ys1 + node._wd * h;

      minX = Math.min(node._wx, xs1, xs2, xs3);
      maxX = Math.max(node._wx, xs1, xs2, xs3);
      minY = Math.min(node._wy, ys1, ys2, ys3);
      maxY = Math.max(node._wy, ys1, ys2, ys3);
    }

    const bm = node._boundsMargin ?? this.boundsMargin;
    const mT = typeof bm === 'number' ? bm : bm[0];
    const mR = typeof bm === 'number' ? bm : bm[1];
    const mB = typeof bm === 'number' ? bm : bm[2];
    const mL = typeof bm === 'number' ? bm : bm[3];
    let vx0 = 0;
    let vy0 = 0;
    let vx1 = this._w;
    let vy1 = this._h;

    if (clip) {
      vx0 = clip.x0 > vx0 ? clip.x0 : vx0;
      vy0 = clip.y0 > vy0 ? clip.y0 : vy0;
      vx1 = clip.x1 < vx1 ? clip.x1 : vx1;
      vy1 = clip.y1 < vy1 ? clip.y1 : vy1;
    }

    const inView = maxX >= vx0 && minX <= vx1 && maxY >= vy0 && minY <= vy1;
    const inBounds =
      inView || (maxX >= vx0 - mL && minX <= vx1 + mR && maxY >= vy0 - mT && minY <= vy1 + mB);
    const state = inView
      ? CoreNodeRenderState.InViewport
      : inBounds
        ? CoreNodeRenderState.InBounds
        : CoreNodeRenderState.OutOfBounds;

    if (state !== node.renderState) {
      const previous = node.renderState;

      node.renderState = state;
      this._queue(node, STATE_EVENT[state], { previous, current: state });
    }

    const tex = node._texture;

    if (tex && inBounds && (flags & DIRTY_TEXTURE || !tex.gl) && tex.type === 'ImageTexture') {
      this._ensureImage(node, tex);
    }

    if (inView && w > 0 && h > 0) {
      if (node.isTextNode) {
        this._drawText(node, clip);
      } else {
        this._draw(node, clip);
      }
    }

    let childClip = clip;

    if (node._clipping) {
      if (!inView) {
        node._flags = (moved ? DIRTY_TRANSFORM : 0) | (faded ? DIRTY_ALPHA : 0);

        return;
      }

      childClip = this._pushClip(minX, minY, maxX, maxY, clip, node._clipRadius > 0 && axisAligned ? node._clipRadius * node._wa : 0);
    }

    const list = node._drawOrder ?? node.children;

    for (let i = 0; i < list.length; i++) {
      this._visit(list[i], moved, faded, childClip);
    }

    if (node._clipping) {
      this._clipDepth--;
    }
  }

  private _pushClip(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    parent: Rect | null,
    radius: number,
  ): Rect {
    let r = this._clipStack[this._clipDepth];

    if (!r) {
      r = { x0: 0, y0: 0, x1: 0, y1: 0, r: 0, rx0: 0, ry0: 0, rx1: 0, ry1: 0 };
      this._clipStack[this._clipDepth] = r;
    }

    this._clipDepth++;
    r.x0 = parent ? Math.max(parent.x0, x0) : x0;
    r.y0 = parent ? Math.max(parent.y0, y0) : y0;
    r.x1 = parent ? Math.min(parent.x1, x1) : x1;
    r.y1 = parent ? Math.min(parent.y1, y1) : y1;

    if (radius > 0) {
      r.r = radius;
      r.rx0 = x0;
      r.ry0 = y0;
      r.rx1 = x1;
      r.ry1 = y1;
    } else if (parent && parent.r > 0) {
      r.r = parent.r;
      r.rx0 = parent.rx0;
      r.ry0 = parent.ry0;
      r.rx1 = parent.rx1;
      r.ry1 = parent.ry1;
    } else {
      r.r = 0;
    }

    return r;
  }

  private _ensureImage(node: CoreNode, tex: CompatTexture): void {
    const src = tex.src;

    if (!src) {
      return;
    }

    if (tex.gl && tex.gl.key === src) {
      return;
    }

    const glTex = this.textures.acquireImage(src);

    tex.gl = glTex;

    if (glTex.state === TEX_READY) {
      tex.state = 'loaded';
      tex.dimensions = { w: glTex.w, h: glTex.h };
      this._queue(node, 'loaded', { type: 'texture', dimensions: tex.dimensions });

      return;
    }

    tex.state = 'loading';
    this.textures.whenReady(glTex, () => {
      if (tex.gl !== glTex || node.destroyed) {
        return;
      }

      if (glTex.state === TEX_FAILED) {
        tex.state = 'failed';
        node.emit('failed', { type: 'texture', error: new Error(`Failed to load ${src}`) });

        return;
      }

      tex.state = 'loaded';
      tex.dimensions = { w: glTex.w, h: glTex.h };
      this.requestRender();

      if (glTex.w > 1 && glTex.h > 1) {
        // Deferred like Lightning's (it emits from its own frame), so listeners can't mutate mid-traversal.
        this._queue(node, 'loaded', { type: 'texture', dimensions: tex.dimensions });
      }
    });
  }

  private _layoutText(node: CoreNode): void {
    const tp = node._tp as TextProps;

    if (!tp.text) {
      node._layout = null;
      this.releaseText(node);

      if (node._w !== 0 || node._h !== 0) {
        node._w = 0;
        node._h = 0;
      }

      return;
    }

    if (!this.fonts.whenLoaded(tp.fontFamily, () => node._mark(DIRTY_TEXT))) {
      return;
    }

    if (!this.fonts.get(tp.fontFamily)) {
      this.warnOnce(`font-${tp.fontFamily}`, `font ${tp.fontFamily} is not registered, using the browser's`);
    }

    const layout = layoutText(this.fonts, tp);

    this.stats.textLayouts++;
    node._layout = layout;

    const w = layout.width;
    const h = layout.height;

    if (node._w !== w || node._h !== h) {
      node._w = w;
      node._h = h;
      node._flags |= DIRTY_TRANSFORM;
    }

    this._queue(node, 'loaded', { type: 'text', dimensions: { w, h } });
  }

  private _drawText(node: CoreNode, clip: Rect | null): void {
    const layout = node._layout;
    const tp = node._tp as TextProps;

    if (!layout || (node._color & 255) === 0) {
      return;
    }

    const key = textKey(tp);

    if (node._textKey !== key || !node._textTex) {
      const old = node._textTex;
      const tex = this.textures.acquireCanvas(key, () => {
        this.stats.textRasterized++;

        return rasterizeText(layout, tp.letterSpacing);
      });

      if (old) {
        this.textures.release(old);
      }

      node._textTex = tex;
      node._textKey = key;
      this._batcher.resetBindings();
    }

    const tex = node._textTex;

    if (!tex || tex.state !== TEX_READY) {
      return;
    }

    let cx = 0;
    let cy = tp.offsetY;
    const contain = tp.contain;

    if ((contain === 'width' || contain === 'both') && tp.maxWidth > 0) {
      if (tp.textAlign === 'right') {
        cx = tp.maxWidth - node._w;
      } else if (tp.textAlign === 'center') {
        cx = (tp.maxWidth - node._w) * 0.5;
      }
    }

    if (contain === 'both' && tp.maxHeight > 0) {
      if (tp.verticalAlign === 'bottom') {
        cy += tp.maxHeight - node._h;
      } else if (tp.verticalAlign === 'middle') {
        cy += (tp.maxHeight - node._h) * 0.5;
      }
    }

    const tint = withAlpha(node._color, node._worldAlpha);

    this._quad(node, tex, cx, cy, cx + tex.w, cy + tex.h, 0, 0, 1, 1, tint, tint, tint, tint, cx, cy, tex.w, tex.h, 0, 0, 0, clip, null, MODE_TEXT, this.textGamma);
  }

  private _draw(node: CoreNode, clip: Rect | null): void {
    const w = node._w;
    const h = node._h;
    const a = node._worldAlpha;
    const shader = node._shader;
    const kind = shader ? shader.kind : KIND_NONE;
    const ct = node._texture;
    let tex: Texture = this.textures.white;
    let u0 = 0;
    let v0 = 0;
    let u1 = 1;
    let v1 = 1;
    let qx0 = 0;
    let qy0 = 0;
    let qx1 = w;
    let qy1 = h;
    let hasFill: boolean;

    if (ct && ct.type === 'ImageTexture') {
      const g = ct.gl;

      hasFill = !!g && g.state === TEX_READY && !!g.glTexture;

      if (hasFill && g) {
        tex = g;

        const mode = node._textureOptions?.resizeMode;

        if (mode && g.w > 0 && g.h > 0) {
          if (mode.type === 'cover') {
            const s = Math.max(w / g.w, h / g.h);
            const vw = w / s / g.w;
            const vh = h / s / g.h;
            const cxr = mode.clipX ?? 0.5;
            const cyr = mode.clipY ?? 0.5;

            u0 = (1 - vw) * cxr;
            v0 = (1 - vh) * cyr;
            u1 = u0 + vw;
            v1 = v0 + vh;
          } else if (mode.type === 'contain') {
            const s = Math.min(w / g.w, h / g.h);
            const dw = g.w * s;
            const dh = g.h * s;

            qx0 = (w - dw) * 0.5;
            qy0 = (h - dh) * 0.5;
            qx1 = qx0 + dw;
            qy1 = qy0 + dh;
          }
        }
      }
    } else if (ct && ct.type === 'ColorTexture') {
      hasFill = true;
    } else {
      hasFill = (node._color & 255) !== 0;
    }

    let radius = 0;
    let radii: number[] | null = null;
    let bw = 0;
    let bc = 0;
    let align = 0;
    let gap = 0;
    let sides: number[] | null = null;
    let props: Record<string, unknown> | null = null;

    if (shader) {
      props = shader.props;

      if (kind === KIND_ROUNDED || kind === KIND_ROUNDED_BORDER || kind === KIND_GRADIENT) {
        radius = cornerRadii(props, w, h, this._radii);

        if (radius < 0) {
          radii = this._radii;
          radius = Math.max(radii[0], radii[1], radii[2], radii[3]);
        }
      }

      if (kind === KIND_BORDER || kind === KIND_ROUNDED_BORDER) {
        const p = kind === KIND_BORDER ? '' : 'border-';
        const wv = props[`${p}w`];

        bw = typeof wv === 'number' ? wv : 0;
        bc = (props[`${p}color`] as number) ?? 0;
        const al = props[`${p}align`];

        align = typeof al === 'number' ? al : 0;
        gap = (props[`${p}gap`] as number) || 0;

        const t = (props[`${p}top`] as number) || 0;
        const r = (props[`${p}right`] as number) || 0;
        const b = (props[`${p}bottom`] as number) || 0;
        const l = (props[`${p}left`] as number) || 0;

        if (Array.isArray(wv)) {
          sides = [wv[0] ?? 0, wv[1] ?? 0, wv[2] ?? 0, wv[3] ?? 0];
        } else if (t || r || b || l) {
          sides = [t || bw, r || bw, b || bw, l || bw];
        }

        if (sides && sides[0] === sides[1] && sides[1] === sides[2] && sides[2] === sides[3]) {
          bw = sides[0];
          sides = null;
        }
      }

      if (kind === KIND_UNSUPPORTED) {
        // Custom programs (UltraBlur, SpinnerArc, avatar mask): draw the texture if there is one, skip plain fills.
        if (!(ct && ct.type === 'ImageTexture')) {
          return;
        }
      }
    }

    const tint = ct && ct.type === 'ColorTexture' ? withAlpha(ct.color, a) : withAlpha(node._color, a);
    const borderColor = withAlpha(bc, a);
    // Lightning's RoundedWithBorder evaluates fill and border 1px inside the quad.
    const ins = kind === KIND_ROUNDED_BORDER ? 1 : 0;

    if ((borderColor & 255) === 0) {
      bw = 0;
      sides = null;
    }

    const iw = w - 2 * ins;
    const ih = h - 2 * ins;

    if (kind === KIND_ULTRABLUR && props) {
      this._drawUltraBlur(node, props, clip);

      return;
    }

    if (kind === KIND_SPINNER && props) {
      const arc = withAlpha(typeof props.color === 'number' ? props.color >>> 0 : 0xffffffff, a);
      const thickness = typeof props.thickness === 'number' ? props.thickness : 0.1;
      const sweep = typeof props.sweep === 'number' ? props.sweep : 0.75;

      if ((arc & 255) !== 0) {
        this._quad(node, this.textures.white, 0, 0, w, h, 0, 0, 1, 1, arc, arc, arc, arc, 0, 0, w, h, 0, 0, 0, clip, null, MODE_SPINNER, thickness, sweep);
      }

      return;
    }

    if (kind === KIND_AVATAR && props) {
      if (hasFill) {
        const bite = typeof props.bite === 'number' ? props.bite : 0;

        this._quad(node, tex, qx0, qy0, qx1, qy1, u0, v0, u1, v1, tint, tint, tint, tint, 0, 0, w, h, 0, 0, 0, clip, null, MODE_AVATAR, bite);
      }

      return;
    }

    if (kind === KIND_GRADIENT && props) {
      this._drawGradient(node, props, radius, radii, clip);

      return;
    }

    if (sides) {
      if (hasFill) {
        this._quad(node, tex, qx0, qy0, qx1, qy1, u0, v0, u1, v1, tint, tint, tint, tint, 0, 0, w, h, radius, 0, 0, clip, radii);
      }

      const white = this.textures.white;
      const [t, r, b, l] = sides;

      if (t > 0) this._quad(node, white, 0, 0, w, t, 0, 0, 1, 1, borderColor, borderColor, borderColor, borderColor, 0, 0, w, t, 0, 0, 0, clip);
      if (b > 0) this._quad(node, white, 0, h - b, w, h, 0, 0, 1, 1, borderColor, borderColor, borderColor, borderColor, 0, h - b, w, b, 0, 0, 0, clip);
      if (l > 0) this._quad(node, white, 0, t, l, h - b, 0, 0, 1, 1, borderColor, borderColor, borderColor, borderColor, 0, t, l, h - b - t, 0, 0, 0, clip);
      if (r > 0) this._quad(node, white, w - r, t, w, h - b, 0, 0, 1, 1, borderColor, borderColor, borderColor, borderColor, w - r, t, r, h - b - t, 0, 0, 0, clip);

      return;
    }

    if (bw > 0 && (align > 0 || gap > 0)) {
      if (hasFill && (tint & 255) !== 0) {
        this._quad(node, tex, qx0, qy0, qx1, qy1, u0, v0, u1, v1, tint, tint, tint, tint, ins, ins, iw, ih, radius, 0, 0, clip, radii);
      }

      if ((borderColor & 255) === 0) {
        return;
      }

      // Lightning grows the border quad by gap + width * align and draws the band inward from that edge.
      const e = gap + bw * align;
      const er = radius > 0 ? radius + e : 0;
      const white = this.textures.white;
      let outer: number[] | null = null;

      if (radii) {
        outer = this._outerRadii;
        outer[0] = radii[0] + e;
        outer[1] = radii[1] + e;
        outer[2] = radii[2] + e;
        outer[3] = radii[3] + e;
      }

      this._quad(node, white, -e, -e, w + e, h + e, 0, 0, 1, 1, 0, 0, 0, 0, ins - e, ins - e, iw + 2 * e, ih + 2 * e, er, bw, borderColor, clip, outer);

      return;
    }

    if (hasFill && (tint & 255) === 0) {
      hasFill = false;
    }

    if (!hasFill && bw <= 0) {
      return;
    }

    if (!hasFill) {
      this._quad(node, this.textures.white, 0, 0, w, h, 0, 0, 1, 1, 0, 0, 0, 0, ins, ins, iw, ih, radius, bw, borderColor, clip, radii);

      return;
    }

    this._quad(node, tex, qx0, qy0, qx1, qy1, u0, v0, u1, v1, tint, tint, tint, tint, ins, ins, iw, ih, radius, bw, borderColor, clip, radii);
  }

  private _drawGradient(
    node: CoreNode,
    props: Record<string, unknown>,
    radius: number,
    radii: number[] | null,
    clip: Rect | null,
  ): void {
    const w = node._w;
    const h = node._h;
    const a = node._worldAlpha * ((node._color & 255) === 0 ? 1 : (node._color & 255) / 255);
    const colors = (props.colors as number[]) ?? [];
    const stops = (props.stops as number[]) ?? [];

    if (colors.length === 0) {
      return;
    }

    const ang = ((props.angle as number) ?? 0) - Math.PI / 2;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const lineDist = Math.abs(w * cos) + Math.abs(h * sin);
    const fx = (lineDist / 2) * cos + w / 2;
    const fy = (lineDist / 2) * sin + h / 2;
    const gx = -lineDist * cos;
    const gy = -lineDist * sin;
    const gl2 = gx * gx + gy * gy || 1;
    const distAt = (x: number, y: number) => ((x - fx) * gx + (y - fy) * gy) / gl2;
    const colorAt = (d: number) => withAlpha(gradientColor(colors, stops, d), a);
    const white = this.textures.white;
    const horizontal = Math.abs(sin) < 1e-4;
    const vertical = Math.abs(cos) < 1e-4;

    if (!horizontal && !vertical) {
      const c0 = colorAt(distAt(0, 0));
      const c1 = colorAt(distAt(w, 0));
      const c2 = colorAt(distAt(0, h));
      const c3 = colorAt(distAt(w, h));

      this._quad(node, white, 0, 0, w, h, 0, 0, 1, 1, c0, c1, c2, c3, 0, 0, w, h, radius, 0, 0, clip, radii);

      return;
    }

    // Axis-aligned: strips at each stop with a few sub-steps so smoothstep reads as a curve.
    const len = vertical ? h : w;
    const d0 = vertical ? distAt(0, 0) : distAt(0, 0);
    const d1 = vertical ? distAt(0, h) : distAt(w, 0);
    const SUB = 4;
    const cuts: number[] = [0, 1];

    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      // position along the axis (0..1 of len) where dist === s
      const t = (s - d0) / (d1 - d0 || 1);

      if (t > 0 && t < 1) {
        cuts.push(t);
      }

      if (i < stops.length - 1) {
        for (let k = 1; k < SUB; k++) {
          const sk = s + ((stops[i + 1] - s) * k) / SUB;
          const tk = (sk - d0) / (d1 - d0 || 1);

          if (tk > 0 && tk < 1) {
            cuts.push(tk);
          }
        }
      }
    }

    cuts.sort((x, y) => x - y);

    for (let i = 0; i < cuts.length - 1; i++) {
      const ta = cuts[i];
      const tb = cuts[i + 1];

      if (tb - ta < 1e-5) {
        continue;
      }

      const ca = colorAt(d0 + (d1 - d0) * ta);
      const cb = colorAt(d0 + (d1 - d0) * tb);

      if (vertical) {
        this._quad(node, white, 0, ta * len, w, tb * len, 0, 0, 1, 1, ca, ca, cb, cb, 0, 0, w, h, radius, 0, 0, clip, radii);
      } else {
        this._quad(node, white, ta * len, 0, tb * len, h, 0, 0, 1, 1, ca, cb, ca, cb, 0, 0, w, h, radius, 0, 0, clip, radii);
      }
    }
  }

  /**
   * Chroma's UltraBlur evaluated on a coarse grid with per-corner colors, so it
   * batches like everything else. Smooth enough at 1080p; the noise is dropped.
   */
  private _drawUltraBlur(node: CoreNode, props: Record<string, unknown>, clip: Rect | null): void {
    const w = node._w;
    const h = node._h;
    const a = node._worldAlpha;
    const bg = rgba((props.background_color as number) ?? 0x000000ff);
    const tl = rgba((props.tl_color as number) ?? (props.background_color as number) ?? 0);
    const tr = rgba((props.tr_color as number) ?? (props.background_color as number) ?? 0);
    const br = rgba((props.br_color as number) ?? (props.background_color as number) ?? 0);
    const bl = rgba((props.bl_color as number) ?? (props.background_color as number) ?? 0);
    const mask = (props.edge_mask as number) ?? 0;
    const N = 8;
    const grid: number[] = [];
    const out = [0, 0, 0, 0];
    const dist = (cx: number, cy: number, px: number, py: number) =>
      Math.hypot((px - cx) / (w * 0.95), (py - cy) / (h * 0.95));
    const mix = (t: number, c: number[]) => {
      const k = t < 0 ? 0 : t > 1 ? 1 : t;

      out[0] += (c[0] - out[0]) * k;
      out[1] += (c[1] - out[1]) * k;
      out[2] += (c[2] - out[2]) * k;
      out[3] += (c[3] - out[3]) * k;
    };

    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const px = (i / N) * w;
        const py = h - (j / N) * h;

        out[0] = bg[0];
        out[1] = bg[1];
        out[2] = bg[2];
        out[3] = bg[3];
        mix(1 - dist(w, 0, px, py), br);
        mix(1 - dist(0, 0, px, py), bl);
        mix(1 - dist(w, h, px, py), tr);
        mix(1 - dist(0, h, px, py), tl);

        let alpha = a;

        if (mask > 0) {
          const u = i / N;
          const v = j / N;
          const nx = (1 - u) / 0.67;
          const ny = v / 0.65;
          const m = Math.max(nx, ny);
          const len = Math.sqrt(nx * nx + ny * ny);
          const d = len + (m - len) * smoothstep(0.3, 1, m);
          const t = Math.min(1, Math.max(0, (1 - smoothstep(0, 1, d)) * 1.2));

          alpha *= 1 + (1 - t - 1) * mask;
        }

        grid.push(
          ((Math.round(out[0] * 255) << 24) |
            (Math.round(out[1] * 255) << 16) |
            (Math.round(out[2] * 255) << 8) |
            Math.round(Math.min(1, out[3] * alpha) * 255)) >>>
            0,
        );
      }
    }

    const white = this.textures.white;

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const c0 = grid[j * (N + 1) + i];
        const c1 = grid[j * (N + 1) + i + 1];
        const c2 = grid[(j + 1) * (N + 1) + i];
        const c3 = grid[(j + 1) * (N + 1) + i + 1];
        const x0 = (i / N) * w;
        const x1 = ((i + 1) / N) * w;
        const y0 = (j / N) * h;
        const y1 = ((j + 1) / N) * h;

        this._quad(node, white, x0, y0, x1, y1, 0, 0, 1, 1, c0, c1, c2, c3, 0, 0, w, h, 0, 0, 0, clip, null, MODE_DITHER);
      }
    }
  }

  /**
   * One quad in the node's local space: (lx0..ly1) is what's drawn, (sx, sy, sw, sh)
   * the rect the rounded/border SDF is evaluated against. Axis-aligned quads are
   * clipped on the CPU; anything rotated falls back to scissor.
   */
  private _quad(
    node: CoreNode,
    tex: Texture,
    lx0: number,
    ly0: number,
    lx1: number,
    ly1: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    c0: number,
    c1: number,
    c2: number,
    c3: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    radius: number,
    border: number,
    borderColor: number,
    clip: Rect | null,
    radii: ArrayLike<number> | null = null,
    mode = MODE_QUAD,
    p0 = 0,
    p1 = 0,
  ): void {
    const wa = node._wa;
    const wb = node._wb;
    const wc = node._wc;
    const wd = node._wd;
    const wx = node._wx;
    const wy = node._wy;

    if (clip && clip.r > 0 && radius === 0 && radii === null && border === 0 && mode === MODE_QUAD && wb === 0 && wc === 0 && wa > 0 && wd > 0) {
      // Rounded clipping without a stencil: evaluate the clip's rounded rect as this quad's SDF.
      sx = (clip.rx0 - wx) / wa;
      sy = (clip.ry0 - wy) / wd;
      sw = (clip.rx1 - clip.rx0) / wa;
      sh = (clip.ry1 - clip.ry0) / wd;
      radius = clip.r / wa;
    }

    if (wb === 0 && wc === 0 && wa > 0 && wd > 0) {
      let x0 = wx + wa * lx0;
      let x1 = wx + wa * lx1;
      let y0 = wy + wd * ly0;
      let y1 = wy + wd * ly1;
      let ax0 = lx0;
      let ax1 = lx1;
      let ay0 = ly0;
      let ay1 = ly1;
      let cu0 = u0;
      let cu1 = u1;
      let cv0 = v0;
      let cv1 = v1;
      let k0 = c0;
      let k1 = c1;
      let k2 = c2;
      let k3 = c3;
      const cx0 = clip ? (clip.x0 > 0 ? clip.x0 : 0) : 0;
      const cy0 = clip ? (clip.y0 > 0 ? clip.y0 : 0) : 0;
      const cx1 = clip ? (clip.x1 < this._w ? clip.x1 : this._w) : this._w;
      const cy1 = clip ? (clip.y1 < this._h ? clip.y1 : this._h) : this._h;

      if (x1 <= cx0 || x0 >= cx1 || y1 <= cy0 || y0 >= cy1) {
        return;
      }

      if (clip && (x0 < cx0 || x1 > cx1 || y0 < cy0 || y1 > cy1)) {
        const gradient = c0 !== c1 || c0 !== c2 || c0 !== c3;
        const fw = lx1 - lx0;
        const fh = ly1 - ly0;

        if (x0 < cx0) {
          ax0 = (cx0 - wx) / wa;
          x0 = cx0;
        }

        if (x1 > cx1) {
          ax1 = (cx1 - wx) / wa;
          x1 = cx1;
        }

        if (y0 < cy0) {
          ay0 = (cy0 - wy) / wd;
          y0 = cy0;
        }

        if (y1 > cy1) {
          ay1 = (cy1 - wy) / wd;
          y1 = cy1;
        }

        const tx0 = (ax0 - lx0) / fw;
        const tx1 = (ax1 - lx0) / fw;
        const ty0 = (ay0 - ly0) / fh;
        const ty1 = (ay1 - ly0) / fh;

        cu0 = u0 + (u1 - u0) * tx0;
        cu1 = u0 + (u1 - u0) * tx1;
        cv0 = v0 + (v1 - v0) * ty0;
        cv1 = v0 + (v1 - v0) * ty1;

        if (gradient) {
          k0 = bilerp(c0, c1, c2, c3, tx0, ty0);
          k1 = bilerp(c0, c1, c2, c3, tx1, ty0);
          k2 = bilerp(c0, c1, c2, c3, tx0, ty1);
          k3 = bilerp(c0, c1, c2, c3, tx1, ty1);
        }
      }

      this._batcher.pushQuadC(
        tex,
        x0,
        y0,
        x1,
        y0,
        x0,
        y1,
        x1,
        y1,
        cu0,
        cv0,
        cu1,
        cv1,
        k0,
        k1,
        k2,
        k3,
        ax0 - sx,
        ay0 - sy,
        ax1 - sx,
        ay1 - sy,
        sw,
        sh,
        radius,
        border,
        borderColor,
        radii,
        mode,
        p0,
        p1,
      );

      return;
    }

    this._batcher.setScissor(clip);
    this._batcher.pushQuadC(
      tex,
      wx + wa * lx0 + wc * ly0,
      wy + wb * lx0 + wd * ly0,
      wx + wa * lx1 + wc * ly0,
      wy + wb * lx1 + wd * ly0,
      wx + wa * lx0 + wc * ly1,
      wy + wb * lx0 + wd * ly1,
      wx + wa * lx1 + wc * ly1,
      wy + wb * lx1 + wd * ly1,
      u0,
      v0,
      u1,
      v1,
      c0,
      c1,
      c2,
      c3,
      lx0 - sx,
      ly0 - sy,
      lx1 - sx,
      ly1 - sy,
      sw,
      sh,
      radius,
      border,
      borderColor,
      radii,
      mode,
      p0,
      p1,
    );
    this._batcher.setScissor(null);
  }
}

function rgba(c: number): number[] {
  return [((c >>> 24) & 255) / 255, ((c >>> 16) & 255) / 255, ((c >>> 8) & 255) / 255, (c & 255) / 255];
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));

  return t * t * (3 - 2 * t);
}

function withAlpha(c: number, a: number): number {
  if (a >= 1) {
    return c;
  }

  return ((c & 0xffffff00) | Math.round((c & 255) * a)) >>> 0;
}

function bilerp(c0: number, c1: number, c2: number, c3: number, tx: number, ty: number): number {
  const top = mergeColorProgress(c0, c1, tx);
  const bottom = mergeColorProgress(c2, c3, tx);

  return mergeColorProgress(top, bottom, ty);
}

function gradientColor(colors: number[], stops: number[], d: number): number {
  const last = colors.length - 1;
  const t = d < 0 ? 0 : d > 1 ? 1 : d;

  if (last <= 0 || t <= (stops[0] ?? 0)) {
    return colors[0];
  }

  if (t >= (stops[last] ?? 1)) {
    return colors[last];
  }

  for (let i = 0; i < last; i++) {
    const l = stops[i] ?? i / last;
    const r = stops[i + 1] ?? (i + 1) / last;

    if (t >= l && t <= r) {
      const x = r > l ? (t - l) / (r - l) : 0;
      const s = x * x * (3 - 2 * x);

      return mergeColorProgress(colors[i], colors[i + 1], s);
    }
  }

  return colors[last];
}

function computeWorld(node: CoreNode): void {
  const p = node._parent;
  const pa = p ? p._wa : 1;
  const pb = p ? p._wb : 0;
  const pc = p ? p._wc : 0;
  const pd = p ? p._wd : 1;
  const px = p ? p._wx : 0;
  const py = p ? p._wy : 0;
  const sx = node._scaleX;
  const sy = node._scaleY;
  let la = sx;
  let lb = 0;
  let lc = 0;
  let ld = sy;

  if (node._rotation !== 0) {
    const cos = Math.cos(node._rotation);
    const sin = Math.sin(node._rotation);

    la = cos * sx;
    lb = sin * sx;
    lc = -sin * sy;
    ld = cos * sy;
  }

  const w = node._w;
  const h = node._h;
  let lx = node._x - node._mountX * w;
  let ly = node._y - node._mountY * h;

  if (la !== 1 || lb !== 0 || lc !== 0 || ld !== 1) {
    const ox = node._pivotX * w;
    const oy = node._pivotY * h;

    lx += ox - (la * ox + lc * oy);
    ly += oy - (lb * ox + ld * oy);
  }

  node._wa = pa * la + pc * lb;
  node._wb = pb * la + pd * lb;
  node._wc = pa * lc + pc * ld;
  node._wd = pb * lc + pd * ld;
  node._wx = pa * lx + pc * ly + px;
  node._wy = pb * lx + pd * ly + py;
}

function updateDrawOrder(node: CoreNode): void {
  const children = node.children;
  let hasZ = false;

  for (let i = 0; i < children.length; i++) {
    if (children[i]._zIndex !== 0) {
      hasZ = true;
      break;
    }
  }

  if (!hasZ) {
    node._drawOrder = null;

    return;
  }

  const order = children.slice();
  const index = new Map<CoreNode, number>();

  for (let i = 0; i < children.length; i++) {
    index.set(children[i], i);
  }

  order.sort((a, b) => a._zIndex - b._zIndex || (index.get(a) as number) - (index.get(b) as number));
  node._drawOrder = order;
}

export { CoreTextNode };
