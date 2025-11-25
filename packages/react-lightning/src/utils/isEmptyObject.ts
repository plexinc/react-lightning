export function isEmptyObject(obj: object): boolean {
  for (const _ in obj) {
    return false;
  }

  return true;
}
