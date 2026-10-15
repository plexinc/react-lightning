// Badge and F9 toggle. The renderer for this load was already picked by the inline head script
// (see dev-compat.mts), which also handles ?renderer=; this only reads the stored choice.
const KEY = 'lng.renderer';
const TOGGLE_KEY = 'F9';

type Mode = 'own' | 'stock';

const read = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const mode: Mode = read() === 'own' ? 'own' : 'stock';

window.addEventListener(
  'keydown',
  (event) => {
    if (event.key !== TOGGLE_KEY) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      localStorage.setItem(KEY, mode === 'own' ? 'stock' : 'own');
    } catch {}

    location.reload();
  },
  true,
);

const badge = document.createElement('div');
badge.id = 'lng-renderer-badge';
badge.dataset.renderer = mode;
badge.style.cssText =
  'position:fixed;left:8px;bottom:8px;z-index:2147483647;padding:2px 6px;border-radius:4px;' +
  'font:12px/16px ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,0.55);' +
  'opacity:0.8;pointer-events:none;white-space:nowrap';

let fps: number | null = null;
let lastFpsAt = 0;

const paint = () => {
  const stale = performance.now() - lastFpsAt > 1500;
  const suffix = fps == null ? '' : stale ? ' · idle' : ` · ${fps} fps`;
  badge.textContent = `renderer: ${mode}${suffix}`;
};

paint();
document.documentElement.appendChild(badge);
setInterval(paint, 1000);

export const onRenderer = (renderer: {
  on: (event: 'fpsUpdate', listener: (target: unknown, data: { fps: number }) => void) => void;
}) => {
  renderer.on('fpsUpdate', (_target, data) => {
    fps = data.fps;
    lastFpsAt = performance.now();
    paint();
  });
};
