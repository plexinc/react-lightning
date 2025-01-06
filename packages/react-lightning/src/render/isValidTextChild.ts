export function isValidTextChild(
  text: unknown,
): text is boolean | number | string {
  return (
    typeof text === 'string' ||
    typeof text === 'number' ||
    typeof text === 'boolean'
  );
}
