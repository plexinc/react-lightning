export type TimingFunction = (t: number) => number;

const linear: TimingFunction = (t) => t;

const NAMED: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  'ease-in-sine': [0.12, 0, 0.39, 0],
  'ease-out-sine': [0.61, 1, 0.88, 1],
  'ease-in-out-sine': [0.37, 0, 0.63, 1],
  'ease-in-cubic': [0.32, 0, 0.67, 0],
  'ease-out-cubic': [0.33, 1, 0.68, 1],
  'ease-in-out-cubic': [0.65, 0, 0.35, 1],
  'ease-in-circ': [0.55, 0, 1, 0.45],
  'ease-out-circ': [0, 0.55, 0.45, 1],
  'ease-in-out-circ': [0.85, 0, 0.15, 1],
  'ease-in-back': [0.36, 0, 0.66, -0.56],
  'ease-out-back': [0.34, 1.56, 0.64, 1],
  'ease-in-out-back': [0.68, -0.6, 0.32, 1.6],
};

const cache = new Map<string, TimingFunction>();

export function bezier(x1: number, y1: number, x2: number, y2: number): TimingFunction {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) {
      return 0;
    }

    if (x >= 1) {
      return 1;
    }

    let t = x;

    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;

      if (Math.abs(err) < 1e-5) {
        return sy(t);
      }

      const d = dx(t);

      if (Math.abs(d) < 1e-6) {
        break;
      }

      t -= err / d;
    }

    let lo = 0;
    let hi = 1;

    t = x;

    for (let i = 0; i < 20; i++) {
      const v = sx(t);

      if (Math.abs(v - x) < 1e-5) {
        break;
      }

      if (v < x) {
        lo = t;
      } else {
        hi = t;
      }

      t = (lo + hi) / 2;
    }

    return sy(t);
  };
}

export function getTimingFunction(str: string): TimingFunction {
  if (!str || str === 'linear') {
    return linear;
  }

  const hit = cache.get(str);

  if (hit) {
    return hit;
  }

  let fn: TimingFunction | null = null;
  const named = NAMED[str];

  if (named) {
    fn = bezier(named[0], named[1], named[2], named[3]);
  } else if (str === 'step-start') {
    fn = () => 1;
  } else if (str === 'step-end') {
    fn = (t) => (t >= 1 ? 1 : 0);
  } else if (str.startsWith('cubic-bezier')) {
    const nums = str
      .slice(str.indexOf('(') + 1, str.lastIndexOf(')'))
      .split(',')
      .map((s) => Number(s.trim()));

    if (nums.length === 4 && nums.every((n) => Number.isFinite(n))) {
      fn = bezier(nums[0], nums[1], nums[2], nums[3]);
    }
  } else if (str.startsWith('steps')) {
    const n = Math.max(1, parseInt(str.slice(str.indexOf('(') + 1), 10) || 1);
    const start = str.includes('start');

    fn = (t) => (start ? Math.ceil(t * n) : Math.floor(t * n)) / n;
  }

  if (!fn) {
    console.warn(`[compat] unknown timing function ${str}, using linear`);
    fn = linear;
  }

  cache.set(str, fn);

  return fn;
}

export function mergeColorProgress(a: number, b: number, p: number): number {
  const ar = (a >>> 24) & 255;
  const ag = (a >>> 16) & 255;
  const ab = (a >>> 8) & 255;
  const aa = a & 255;
  const r = Math.round(ar + (((b >>> 24) & 255) - ar) * p);
  const g = Math.round(ag + (((b >>> 16) & 255) - ag) * p);
  const bl = Math.round(ab + (((b >>> 8) & 255) - ab) * p);
  const al = Math.round(aa + ((b & 255) - aa) * p);

  return ((clamp255(r) << 24) | (clamp255(g) << 16) | (clamp255(bl) << 8) | clamp255(al)) >>> 0;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function mergeColorAlpha(rgba: number, alpha: number): number {
  const a = Math.round((rgba & 255) * alpha);

  return ((rgba & 0xffffff00) | (a < 0 ? 0 : a > 255 ? 255 : a)) >>> 0;
}
