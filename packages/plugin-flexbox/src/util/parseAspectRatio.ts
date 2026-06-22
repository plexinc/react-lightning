/**
 * Normalizes a React Native `aspectRatio` value to the plain number Yoga
 * expects. RN accepts a number (`1.5`), a ratio string (`'3/2'`), or a numeric
 * string (`'1.5'`); Yoga's `setAspectRatio` only takes a number, so passing a
 * string straight through yields `NaN` and the ratio is silently dropped —
 * leaving e.g. an image sized only by `aspectRatio` + a height with no width,
 * so it never paints.
 *
 * Returns `undefined` for values that don't describe a positive, finite ratio,
 * so callers can skip applying it rather than feeding Yoga a bad number.
 */
export function parseAspectRatio(value: number | string): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  const slash = value.indexOf('/');

  if (slash !== -1) {
    const width = Number.parseFloat(value.slice(0, slash));
    const height = Number.parseFloat(value.slice(slash + 1));

    if (Number.isFinite(width) && Number.isFinite(height) && height > 0 && width > 0) {
      return width / height;
    }

    return undefined;
  }

  const ratio = Number.parseFloat(value);

  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;
}
