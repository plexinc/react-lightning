import { Animator } from './Animator';
import { QuadBatcher, type Rect } from './QuadBatcher';
import {
  DIRTY_ALPHA,
  DIRTY_ORDER,
  DIRTY_SRC,
  DIRTY_TEXT,
  DIRTY_TRANSFORM,
  KIND_IMAGE,
  KIND_RAW_TEXT,
  KIND_TEXT,
  KIND_VIEW,
  SceneNode,
} from './SceneNode';
import { TextRasterizer, type TextStyle } from './TextRasterizer';
import {
  TEX_READY,
  type Texture,
  TextureManager,
  type TextureManagerOptions,
} from './TextureManager';

export type StageOptions = {
  width?: number;
  height?: number;
  clearColor?: number;
  /** Extra pixels around the viewport where textures still load. */
  boundsMargin?: number;
  textures?: TextureManagerOptions;
};

export type FrameStats = {
  frames: number;
  drawCalls: number;
  quads: number;
  uploads: number;
  nodesVisited: number;
  transformsComputed: number;
  frameMs: number;
};

const raf: (cb: (t: number) => void) => number =
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame.bind(window)
    : (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number;

export class Stage {
  public readonly canvas: HTMLCanvasElement;
  public readonly gl: WebGLRenderingContext;
  public readonly root: SceneNode;
  public readonly textures: TextureManager;
  public readonly text = new TextRasterizer();
  public readonly animator = new Animator();
  public readonly stats: FrameStats = {
    frames: 0,
    drawCalls: 0,
    quads: 0,
    uploads: 0,
    nodesVisited: 0,
    transformsComputed: 0,
    frameMs: 0,
  };
  public onFrame: ((stats: FrameStats) => void) | null = null;

  private readonly _batcher: QuadBatcher;
  private readonly _width: number;
  private readonly _height: number;
  private readonly _clearColor: number;
  private readonly _margin: number;
  private _scheduled = false;
  private readonly _clipStack: Rect[] = [];
  private _clipDepth = 0;
  private readonly _textStyle: TextStyle = {
    text: '',
    fontFamily: '',
    fontWeight: '',
    fontSize: 0,
    lineHeight: 0,
    maxWidth: 0,
    maxLines: 0,
    textAlign: 'left',
  };

  public constructor(canvas: HTMLCanvasElement, opts: StageOptions = {}) {
    this.canvas = canvas;
    this._width = opts.width ?? 1920;
    this._height = opts.height ?? 1080;
    this._clearColor = opts.clearColor ?? 0x000000ff;
    this._margin = opts.boundsMargin ?? 100;
    canvas.width = this._width;
    canvas.height = this._height;

    const gl = (canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: true,
      stencil: false,
      depth: false,
    }) ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    if (!gl) {
      throw new Error('WebGL unavailable');
    }

    this.gl = gl;
    this.textures = new TextureManager(gl, () => this.requestRender(), opts.textures);
    this._batcher = new QuadBatcher(gl);
    this.root = new SceneNode(KIND_VIEW);
    this.root.w = this._width;
    this.root.h = this._height;
    this.root.stage = this;
    this.requestRender();
  }

  public createNode(kind: number): SceneNode {
    const node = new SceneNode(kind);

    node.stage = this;

    return node;
  }

  public requestRender(): void {
    if (this._scheduled) {
      return;
    }

    this._scheduled = true;
    raf(this._frame);
  }

  private readonly _frame = (now: number): void => {
    this._scheduled = false;

    const t0 = performance.now();
    const stats = this.stats;

    if (this.animator.tick(now)) {
      this.requestRender();
    }

    this.textures.processUploads();
    stats.nodesVisited = 0;
    stats.transformsComputed = 0;

    const batcher = this._batcher;

    batcher.begin(this._width, this._height, this._clearColor);
    this._clipDepth = 0;
    this._visit(this.root, false, false, null);
    batcher.end();

    stats.frames++;
    stats.drawCalls = batcher.drawCalls;
    stats.quads = batcher.quads;
    stats.uploads = this.textures.uploadsThisFrame;
    stats.frameMs = performance.now() - t0;
    this.onFrame?.(stats);
  };

  /**
   * Single pass: world transform/alpha recompute (only where dirty or a parent
   * changed), lazy texture acquisition for in-bounds nodes, and quad emission.
   */
  private _visit(
    node: SceneNode,
    parentMoved: boolean,
    parentFaded: boolean,
    clip: Rect | null,
  ): void {
    const stats = this.stats;
    const flags = node.flags;
    const moved = parentMoved || (flags & DIRTY_TRANSFORM) !== 0;
    const faded = parentFaded || (flags & DIRTY_ALPHA) !== 0;

    stats.nodesVisited++;

    if (moved) {
      computeWorld(node);
      stats.transformsComputed++;
    }

    if (faded) {
      node.worldAlpha = (node.parent ? node.parent.worldAlpha : 1) * node.alpha;
    }

    if (flags & DIRTY_ORDER) {
      updateDrawOrder(node);
    }

    node.flags = 0;

    if (!node.visible || node.worldAlpha <= 0.001 || node.kind === KIND_RAW_TEXT) {
      // Keep the flags on this node so its subtree refreshes when it's next drawn.
      node.flags = (moved ? DIRTY_TRANSFORM : 0) | (faded ? DIRTY_ALPHA : 0);

      return;
    }

    if (
      node.kind === KIND_TEXT &&
      (flags & DIRTY_TEXT || !node.texture) &&
      this._textNearView(node)
    ) {
      this._ensureText(node);
    }

    // World AABB, cheap path for axis-aligned transforms.
    const ax = node.wx;
    const ay = node.wy;
    const bx = node.wx + node.wa * node.w;
    const by = node.wy + node.wd * node.h;
    const axisAligned = node.wb === 0 && node.wc === 0;
    let minX: number;
    let minY: number;
    let maxX: number;
    let maxY: number;

    if (axisAligned) {
      minX = ax < bx ? ax : bx;
      maxX = ax < bx ? bx : ax;
      minY = ay < by ? ay : by;
      maxY = ay < by ? by : ay;
    } else {
      const cx = node.wc * node.h;
      const by2 = node.wb * node.w;
      const xs0 = node.wx;
      const xs1 = node.wx + node.wa * node.w;
      const xs2 = node.wx + cx;
      const xs3 = xs1 + cx;
      const ys0 = node.wy;
      const ys1 = node.wy + by2;
      const ys2 = node.wy + node.wd * node.h;
      const ys3 = ys1 + node.wd * node.h;

      minX = Math.min(xs0, xs1, xs2, xs3);
      maxX = Math.max(xs0, xs1, xs2, xs3);
      minY = Math.min(ys0, ys1, ys2, ys3);
      maxY = Math.max(ys0, ys1, ys2, ys3);
    }

    const m = this._margin;
    const inBounds =
      maxX >= -m && minX <= this._width + m && maxY >= -m && minY <= this._height + m;
    const inView =
      maxX > 0 &&
      minX < this._width &&
      maxY > 0 &&
      minY < this._height &&
      (!clip || (maxX > clip.x0 && minX < clip.x1 && maxY > clip.y0 && minY < clip.y1));

    if (node.kind === KIND_IMAGE && inBounds && (flags & DIRTY_SRC || !node.texture) && node.src) {
      this._ensureImage(node);
    }

    if (inView && node.w > 0 && node.h > 0) {
      this._emit(node, axisAligned, clip);
    }

    let childClip = clip;

    if (node.clipping) {
      if (!inView) {
        // Clipped subtree fully outside: skip it, refresh it when it comes back.
        node.flags = (moved ? DIRTY_TRANSFORM : 0) | (faded ? DIRTY_ALPHA : 0);

        return;
      }

      childClip = this._pushClip(minX, minY, maxX, maxY, clip);
    }

    const list = node.drawOrder ?? node.children;

    for (let i = 0; i < list.length; i++) {
      this._visit(list[i], moved, faded, childClip);
    }

    if (node.clipping) {
      this._clipDepth--;
    }
  }

  private _pushClip(x0: number, y0: number, x1: number, y1: number, parent: Rect | null): Rect {
    let r = this._clipStack[this._clipDepth];

    if (!r) {
      r = { x0: 0, y0: 0, x1: 0, y1: 0 };
      this._clipStack[this._clipDepth] = r;
    }

    this._clipDepth++;
    r.x0 = parent ? Math.max(parent.x0, x0) : x0;
    r.y0 = parent ? Math.max(parent.y0, y0) : y0;
    r.x1 = parent ? Math.min(parent.x1, x1) : x1;
    r.y1 = parent ? Math.min(parent.y1, y1) : y1;

    return r;
  }

  private _emit(node: SceneNode, axisAligned: boolean, clip: Rect | null): void {
    let tex: Texture;
    let tint = node.color;

    if (node.kind === KIND_VIEW) {
      if ((tint & 255) === 0 && node.borderWidth <= 0) {
        return;
      }

      tex = this.textures.white;
    } else {
      const t = node.texture;

      if (!t || t.state !== TEX_READY || !t.glTexture) {
        return;
      }

      tex = t;
    }

    const a = node.worldAlpha;

    if (a < 1) {
      tint = (tint & 0xffffff00) | Math.round((tint & 255) * a);
    }

    const borderColor =
      a < 1
        ? (node.borderColor & 0xffffff00) | Math.round((node.borderColor & 255) * a)
        : node.borderColor;
    const w = node.w;
    const h = node.h;

    if (axisAligned) {
      let x0 = node.wx;
      let y0 = node.wy;
      let x1 = node.wx + node.wa * w;
      let y1 = node.wy + node.wd * h;
      let u0 = 0;
      let v0 = 0;
      let u1 = 1;
      let v1 = 1;
      let lx0 = 0;
      let ly0 = 0;
      let lx1 = w;
      let ly1 = h;

      if (clip) {
        // CPU clip: shrink the quad and its UVs/local coords, no scissor, no batch break.
        const sx = (x1 - x0) / w;
        const sy = (y1 - y0) / h;

        if (x0 < clip.x0) {
          const d = (clip.x0 - x0) / sx;

          lx0 += d;
          u0 = lx0 / w;
          x0 = clip.x0;
        }

        if (x1 > clip.x1) {
          const d = (x1 - clip.x1) / sx;

          lx1 -= d;
          u1 = lx1 / w;
          x1 = clip.x1;
        }

        if (y0 < clip.y0) {
          const d = (clip.y0 - y0) / sy;

          ly0 += d;
          v0 = ly0 / h;
          y0 = clip.y0;
        }

        if (y1 > clip.y1) {
          const d = (y1 - clip.y1) / sy;

          ly1 -= d;
          v1 = ly1 / h;
          y1 = clip.y1;
        }

        if (x1 <= x0 || y1 <= y0) {
          return;
        }
      }

      this._batcher.pushQuad(
        tex,
        x0,
        y0,
        x1,
        y0,
        x0,
        y1,
        x1,
        y1,
        u0,
        v0,
        u1,
        v1,
        tint,
        lx0,
        ly0,
        lx1,
        ly1,
        w,
        h,
        node.radius,
        node.borderWidth,
        borderColor,
      );

      return;
    }

    this._batcher.setScissor(clip);

    const ax = node.wa * w;
    const ay = node.wb * w;
    const bx = node.wc * h;
    const by = node.wd * h;

    this._batcher.pushQuad(
      tex,
      node.wx,
      node.wy,
      node.wx + ax,
      node.wy + ay,
      node.wx + bx,
      node.wy + by,
      node.wx + ax + bx,
      node.wy + ay + by,
      0,
      0,
      1,
      1,
      tint,
      0,
      0,
      w,
      h,
      w,
      h,
      node.radius,
      node.borderWidth,
      borderColor,
    );
    this._batcher.setScissor(null);
  }

  /** Before the first raster a text node has no size; estimate from maxWidth/fontSize. */
  private _textNearView(node: SceneNode): boolean {
    const w = node.w || node.maxWidth || this._width;
    const h = node.h || node.fontSize * Math.max(1, node.maxLines);
    const m = this._margin;
    const x0 = node.wx;
    const y0 = node.wy;
    const x1 = x0 + node.wa * w + node.wc * h;
    const y1 = y0 + node.wb * w + node.wd * h;

    return (
      Math.max(x0, x1) >= -m &&
      Math.min(x0, x1) <= this._width + m &&
      Math.max(y0, y1) >= -m &&
      Math.min(y0, y1) <= this._height + m
    );
  }

  private _ensureText(node: SceneNode): void {
    const s = this._textStyle;

    s.text = node.text;
    s.fontFamily = node.fontFamily;
    s.fontWeight = node.fontWeight;
    s.fontSize = node.fontSize;
    s.lineHeight = node.lineHeight;
    s.maxWidth = node.maxWidth;
    s.maxLines = node.maxLines;
    s.textAlign = node.textAlign;

    const key = TextRasterizer.key(s);
    const old = node.texture;

    if (old && old.key === key) {
      return;
    }

    if (!s.text) {
      if (old) {
        this.textures.release(old);
      }

      node.texture = null;

      return;
    }

    const text = this.text;
    const tex = this.textures.acquireCanvas(key, () => text.rasterize(s, text.layout(s, key)));

    if (old) {
      this.textures.release(old);
    }

    node.texture = tex;
    this._batcher.resetBindings();

    if (node.w !== tex.w || node.h !== tex.h) {
      node.w = tex.w;
      node.h = tex.h;
      computeWorld(node);
      markSubtree(node, DIRTY_TRANSFORM);
    }
  }

  private _ensureImage(node: SceneNode): void {
    const old = node.texture;

    if (old && old.key === node.src) {
      return;
    }

    const tex = this.textures.acquireImage(node.src ?? '');

    if (old) {
      this.textures.release(old);
    }

    node.texture = tex;

    const onLoad = node.onLoad;

    if (onLoad) {
      this.textures.whenReady(tex, () => {
        if (node.texture === tex) {
          onLoad(tex.w, tex.h);
        }
      });
    }
  }
}

function computeWorld(node: SceneNode): void {
  const p = node.parent;
  const pa = p ? p.wa : 1;
  const pb = p ? p.wb : 0;
  const pc = p ? p.wc : 0;
  const pd = p ? p.wd : 1;
  const px = p ? p.wx : 0;
  const py = p ? p.wy : 0;

  // Local: translate(x + pivot) * rotate * scale * translate(-pivot)
  const sx = node.scaleX;
  const sy = node.scaleY;
  let la = sx;
  let lb = 0;
  let lc = 0;
  let ld = sy;

  if (node.rotation !== 0) {
    const cos = Math.cos(node.rotation);
    const sin = Math.sin(node.rotation);

    la = cos * sx;
    lb = sin * sx;
    lc = -sin * sy;
    ld = cos * sy;
  }

  let lx = node.x;
  let ly = node.y;

  if (la !== 1 || lb !== 0 || lc !== 0 || ld !== 1) {
    const ox = node.pivotX * node.w;
    const oy = node.pivotY * node.h;

    lx += ox - (la * ox + lc * oy);
    ly += oy - (lb * ox + ld * oy);
  }

  node.wa = pa * la + pc * lb;
  node.wb = pb * la + pd * lb;
  node.wc = pa * lc + pc * ld;
  node.wd = pb * lc + pd * ld;
  node.wx = pa * lx + pc * ly + px;
  node.wy = pb * lx + pd * ly + py;
}

function updateDrawOrder(node: SceneNode): void {
  const children = node.children;
  let hasZ = false;

  for (let i = 0; i < children.length; i++) {
    if (children[i].zIndex !== 0) {
      hasZ = true;
      break;
    }
  }

  node.hasZChildren = hasZ;

  if (!hasZ) {
    node.drawOrder = null;

    return;
  }

  // Stable sort by zIndex.
  const order = children.slice();

  order.sort((a, b) => a.zIndex - b.zIndex || children.indexOf(a) - children.indexOf(b));
  node.drawOrder = order;
}

function markSubtree(node: SceneNode, flag: number): void {
  for (let i = 0; i < node.children.length; i++) {
    const c = node.children[i];

    c.flags |= flag;
    markSubtree(c, flag);
  }
}

export {
  DIRTY_ALPHA,
  DIRTY_ORDER,
  DIRTY_SRC,
  DIRTY_TEXT,
  DIRTY_TRANSFORM,
  KIND_IMAGE,
  KIND_RAW_TEXT,
  KIND_TEXT,
  KIND_VIEW,
};
