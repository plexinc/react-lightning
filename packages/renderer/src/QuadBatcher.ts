import type { Texture } from './TextureManager';

// Per vertex: pos(2f) uv(2f) color(4ub) tex(1f) local(2f) size(2f) radius(1f) border(1f) borderColor(4ub)
const FLOATS_PER_VERTEX = 13;
const BYTES_PER_VERTEX = FLOATS_PER_VERTEX * 4;
const MAX_QUADS = 8000;

const VS = `
attribute vec2 aPos;
attribute vec2 aUV;
attribute vec4 aColor;
attribute float aTex;
attribute vec2 aLocal;
attribute vec2 aSize;
attribute float aRadius;
attribute float aBorder;
attribute vec4 aBorderColor;
uniform vec2 uRes;
varying vec2 vUV;
varying vec4 vColor;
varying float vTex;
varying vec2 vLocal;
varying vec2 vSize;
varying float vRadius;
varying float vBorder;
varying vec4 vBorderColor;
void main() {
  vec2 p = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  vUV = aUV;
  vColor = vec4(aColor.rgb * aColor.a, aColor.a);
  vTex = aTex;
  vLocal = aLocal;
  vSize = aSize;
  vRadius = aRadius;
  vBorder = aBorder;
  vBorderColor = vec4(aBorderColor.rgb * aBorderColor.a, aBorderColor.a);
}`;

function fragmentSource(units: number): string {
  let samplers = '';
  let pick = '';

  for (let i = 0; i < units; i++) {
    samplers += `uniform sampler2D uT${i};\n`;
    pick += `${i === 0 ? '' : 'else '}if (vTex < ${i}.5) c = texture2D(uT${i}, vUV);\n`;
  }

  return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
${samplers}
varying vec2 vUV;
varying vec4 vColor;
varying float vTex;
varying vec2 vLocal;
varying vec2 vSize;
varying float vRadius;
varying float vBorder;
varying vec4 vBorderColor;
void main() {
  vec4 c = vec4(1.0);
  ${pick}
  c *= vColor;
  if (vRadius > 0.0 || vBorder > 0.0) {
    vec2 halfSize = vSize * 0.5;
    vec2 p = vLocal - halfSize;
    float r = min(vRadius, min(halfSize.x, halfSize.y));
    vec2 q = abs(p) - halfSize + r;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    if (vBorder > 0.0) {
      c = mix(c, vBorderColor, clamp(0.5 + d + vBorder, 0.0, 1.0));
    }
    c *= clamp(0.5 - d, 0.0, 1.0);
  }
  gl_FragColor = c;
}`;
}

export type Rect = { x0: number; y0: number; x1: number; y1: number };

type Batch = {
  start: number;
  count: number;
  textures: (Texture | null)[];
  texCount: number;
  scissor: Rect | null;
};

/**
 * One program, one interleaved vertex buffer, up to `units` textures per draw.
 * Rounded corners and borders are per-quad attributes, so they don't break batches.
 */
export class QuadBatcher {
  public drawCalls = 0;
  public quads = 0;

  private readonly _gl: WebGLRenderingContext;
  private readonly _program: WebGLProgram;
  private readonly _vbo: WebGLBuffer;
  private readonly _ibo: WebGLBuffer;
  private readonly _f32: Float32Array;
  private readonly _u32: Uint32Array;
  private readonly _units: number;
  private readonly _bound: (Texture | null)[];
  private readonly _uRes: WebGLUniformLocation | null;
  private _count = 0;
  private _texCount = 0;
  private _batchStart = 0;
  private _batchCount = 0;
  private readonly _batches: Batch[] = [];
  private readonly _glBound: (Texture | null)[] = [];
  private _scissor: Rect | null = null;
  private _width = 0;
  private _height = 0;

  public constructor(gl: WebGLRenderingContext) {
    this._gl = gl;
    this._units = Math.max(1, Math.min(8, gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number));
    this._bound = Array.from({ length: this._units }, () => null);
    this._program = createProgram(gl, VS, fragmentSource(this._units));
    gl.useProgram(this._program);

    for (let i = 0; i < this._units; i++) {
      gl.uniform1i(gl.getUniformLocation(this._program, `uT${i}`), i);
    }

    this._uRes = gl.getUniformLocation(this._program, 'uRes');

    const buffer = new ArrayBuffer(MAX_QUADS * 4 * BYTES_PER_VERTEX);

    this._f32 = new Float32Array(buffer);
    this._u32 = new Uint32Array(buffer);
    this._vbo = must(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
    gl.bufferData(gl.ARRAY_BUFFER, buffer.byteLength, gl.DYNAMIC_DRAW);

    const indices = new Uint16Array(MAX_QUADS * 6);

    for (let i = 0, v = 0; i < indices.length; i += 6, v += 4) {
      indices[i] = v;
      indices[i + 1] = v + 1;
      indices[i + 2] = v + 2;
      indices[i + 3] = v + 2;
      indices[i + 4] = v + 1;
      indices[i + 5] = v + 3;
    }

    this._ibo = must(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const attr = (
      name: string,
      size: number,
      type: number,
      normalized: boolean,
      offset: number,
    ) => {
      const loc = gl.getAttribLocation(this._program, name);

      if (loc < 0) {
        return;
      }

      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, type, normalized, BYTES_PER_VERTEX, offset);
    };

    attr('aPos', 2, gl.FLOAT, false, 0);
    attr('aUV', 2, gl.FLOAT, false, 8);
    attr('aColor', 4, gl.UNSIGNED_BYTE, true, 16);
    attr('aTex', 1, gl.FLOAT, false, 20);
    attr('aLocal', 2, gl.FLOAT, false, 24);
    attr('aSize', 2, gl.FLOAT, false, 32);
    attr('aRadius', 1, gl.FLOAT, false, 40);
    attr('aBorder', 1, gl.FLOAT, false, 44);
    attr('aBorderColor', 4, gl.UNSIGNED_BYTE, true, 48);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
  }

  public begin(width: number, height: number, clearColor: number): void {
    const gl = this._gl;

    this.drawCalls = 0;
    this.quads = 0;
    this._width = width;
    this._height = height;
    gl.viewport(0, 0, width, height);
    gl.useProgram(this._program);
    gl.uniform2f(this._uRes, width, height);
    gl.disable(gl.SCISSOR_TEST);
    this._scissor = null;
    this.resetBindings();
    gl.clearColor(
      ((clearColor >>> 24) & 255) / 255,
      ((clearColor >>> 16) & 255) / 255,
      ((clearColor >>> 8) & 255) / 255,
      (clearColor & 255) / 255,
    );
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  public setScissor(rect: Rect | null): void {
    if (rect === this._scissor) {
      return;
    }

    this.flush();
    this._scissor = rect;
  }

  /**
   * Corners are given in screen space (tl, tr, bl, br); `lw`/`lh` is the
   * quad's local size for the rounded-rect SDF, `l*` its local sub-rect when clipped.
   */
  public pushQuad(
    tex: Texture,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    color: number,
    lx0: number,
    ly0: number,
    lx1: number,
    ly1: number,
    lw: number,
    lh: number,
    radius: number,
    border: number,
    borderColor: number,
  ): void {
    this.pushQuadC(
      tex, x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1,
      color, color, color, color,
      lx0, ly0, lx1, ly1, lw, lh, radius, border, borderColor,
    );
  }

  /** Same as pushQuad with a color per corner (tl, tr, bl, br), for gradients. */
  public pushQuadC(
    tex: Texture,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    color0: number,
    color1: number,
    color2: number,
    color3: number,
    lx0: number,
    ly0: number,
    lx1: number,
    ly1: number,
    lw: number,
    lh: number,
    radius: number,
    border: number,
    borderColor: number,
  ): void {
    let slot = -1;

    for (let i = 0; i < this._texCount; i++) {
      if (this._bound[i] === tex) {
        slot = i;
        break;
      }
    }

    if (slot < 0) {
      if (this._texCount === this._units) {
        this.flush();
      }

      slot = this._texCount++;
      this._bound[slot] = tex;
    }

    if (this._count === MAX_QUADS) {
      // Buffer full: draw what we have and start over at offset 0.
      this.end();
      slot = 0;
      this._bound[0] = tex;
      this._texCount = 1;
    }

    const f = this._f32;
    const u = this._u32;
    const bc = abgr(borderColor);
    let o = this._count * 4 * FLOATS_PER_VERTEX;

    o = vert(f, u, o, x0, y0, u0, v0, abgr(color0), slot, lx0, ly0, lw, lh, radius, border, bc);
    o = vert(f, u, o, x1, y1, u1, v0, abgr(color1), slot, lx1, ly0, lw, lh, radius, border, bc);
    o = vert(f, u, o, x2, y2, u0, v1, abgr(color2), slot, lx0, ly1, lw, lh, radius, border, bc);
    vert(f, u, o, x3, y3, u1, v1, abgr(color3), slot, lx1, ly1, lw, lh, radius, border, bc);
    this._count++;
    this.quads++;
  }

  /** Closes the current batch; the GPU work is issued in `end()`. */
  public flush(): void {
    const count = this._count - this._batchStart;

    if (count > 0) {
      let b = this._batches[this._batchCount];

      if (!b) {
        b = {
          start: 0,
          count: 0,
          textures: Array.from({ length: this._units }, () => null),
          texCount: 0,
          scissor: null,
        };
        this._batches[this._batchCount] = b;
      }

      b.start = this._batchStart;
      b.count = count;
      b.texCount = this._texCount;
      b.scissor = this._scissor;

      for (let i = 0; i < this._texCount; i++) {
        b.textures[i] = this._bound[i];
      }

      this._batchCount++;
      this._batchStart = this._count;
    }

    this._texCount = 0;
  }

  /** One buffer upload for the whole frame, then one draw per batch. */
  public end(): void {
    this.flush();

    const gl = this._gl;

    if (this._count > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        this._f32.subarray(0, this._count * 4 * FLOATS_PER_VERTEX),
      );
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ibo);

    let scissor: Rect | null = null;
    const bound: (Texture | null)[] = this._glBound;

    for (let i = 0; i < this._batchCount; i++) {
      const b = this._batches[i];

      if (b.scissor !== scissor) {
        scissor = b.scissor;

        if (!scissor) {
          gl.disable(gl.SCISSOR_TEST);
        } else {
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(
            Math.round(scissor.x0),
            Math.round(this._height - scissor.y1),
            Math.max(0, Math.round(scissor.x1 - scissor.x0)),
            Math.max(0, Math.round(scissor.y1 - scissor.y0)),
          );
        }
      }

      for (let t = 0; t < b.texCount; t++) {
        const tex = b.textures[t];

        if (bound[t] !== tex) {
          gl.activeTexture(gl.TEXTURE0 + t);
          gl.bindTexture(gl.TEXTURE_2D, tex ? tex.glTexture : null);
          bound[t] = tex;
        }
      }

      gl.drawElements(gl.TRIANGLES, b.count * 6, gl.UNSIGNED_SHORT, b.start * 12);
      this.drawCalls++;
    }

    if (scissor) {
      gl.disable(gl.SCISSOR_TEST);
    }

    this._batchCount = 0;
    this._batchStart = 0;
    this._count = 0;
  }

  /** Texture uploads rebind TEXTURE_2D, so forget what we think is bound. */
  public resetBindings(): void {
    for (let i = 0; i < this._glBound.length; i++) {
      this._glBound[i] = null;
    }
  }

  public get width(): number {
    return this._width;
  }
}

function vert(
  f: Float32Array,
  u: Uint32Array,
  o: number,
  x: number,
  y: number,
  uu: number,
  vv: number,
  c: number,
  slot: number,
  lx: number,
  ly: number,
  lw: number,
  lh: number,
  radius: number,
  border: number,
  bc: number,
): number {
  f[o] = x;
  f[o + 1] = y;
  f[o + 2] = uu;
  f[o + 3] = vv;
  u[o + 4] = c;
  f[o + 5] = slot;
  f[o + 6] = lx;
  f[o + 7] = ly;
  f[o + 8] = lw;
  f[o + 9] = lh;
  f[o + 10] = radius;
  f[o + 11] = border;
  u[o + 12] = bc;

  return o + FLOATS_PER_VERTEX;
}

// 0xRRGGBBAA -> little-endian bytes R,G,B,A for a normalized UNSIGNED_BYTE attribute.
function abgr(c: number): number {
  return (
    (((c & 255) << 24) |
      (((c >>> 8) & 255) << 16) |
      (((c >>> 16) & 255) << 8) |
      ((c >>> 24) & 255)) >>>
    0
  );
}

function createProgram(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const compile = (type: number, src: string) => {
    const sh = must(gl.createShader(type), 'shader');

    gl.shaderSource(sh, src);
    gl.compileShader(sh);

    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(sh)}`);
    }

    return sh;
  };
  const p = must(gl.createProgram(), 'program');

  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);

  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(p)}`);
  }

  return p;
}

function must<T>(v: T | null, what: string): T {
  if (v === null) {
    throw new Error(`WebGL ${what} unavailable (context lost?)`);
  }

  return v;
}
