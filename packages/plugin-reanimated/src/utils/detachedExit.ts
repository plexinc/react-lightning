type Translate = { translateX?: number | string; translateY?: number | string } | undefined;

type ExitStyle = { transform?: Translate };

type Box = { x: number; y: number; w: number; h: number };

const EXIT_GRACE_MS = 100;

function toPx(value: number | string | undefined, size: number): number {
  if (typeof value === 'number') {
    return value;
  }

  const pct = value === undefined ? 0 : Number.parseFloat(value);

  return Number.isNaN(pct) ? 0 : (pct / 100) * size;
}

export function takeExitTranslate(
  style: ExitStyle,
  box: Box,
  current: Translate,
): { x?: number; y?: number } | null {
  const transform = style.transform;

  if (!transform) {
    return null;
  }

  delete style.transform;

  const targets: { x?: number; y?: number } = {};

  if (transform.translateX !== undefined) {
    targets.x = box.x + toPx(transform.translateX, box.w) - toPx(current?.translateX, box.w);
  }

  if (transform.translateY !== undefined) {
    targets.y = box.y + toPx(transform.translateY, box.h) - toPx(current?.translateY, box.h);
  }

  return targets;
}

export function getExitTimeout(
  transition: Record<string, { duration?: number; delay?: number } | undefined>,
): number {
  let longest = 0;

  for (const key in transition) {
    const settings = transition[key];

    if (settings) {
      longest = Math.max(longest, (settings.duration ?? 0) + (settings.delay ?? 0));
    }
  }

  return longest + EXIT_GRACE_MS;
}
