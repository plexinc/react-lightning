export function isEmptyObject(obj: object) {
  for (const _ in obj) {
    return false;
  }

  return true;
}
