export function clampSize(size: unknown, min: unknown, max: unknown): unknown {
  if (typeof size !== 'number') {
    return size;
  }

  let result = size;

  if (typeof max === 'number') {
    result = Math.min(result, max);
  }

  if (typeof min === 'number') {
    result = Math.max(result, min);
  }

  return result;
}
