export function keyExists(
  obj: Record<number | string | symbol, unknown>,
  keys: (number | string | symbol)[],
): boolean {
  for (const key of keys) {
    if (key in obj) {
      return true;
    }
  }

  return false;
}
