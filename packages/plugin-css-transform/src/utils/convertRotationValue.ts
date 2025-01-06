export function convertRotationValue(value: string) {
  if (value.endsWith('deg')) {
    return Number.parseInt(value);
  }
  if (value.endsWith('rad')) {
    return (Number.parseInt(value) * 180) / Math.PI;
  }
  if (value.endsWith('grad')) {
    return (Number.parseInt(value) * 180) / 200;
  }
  if (value.endsWith('turn')) {
    return Number.parseInt(value) * 360;
  }
  return Number.parseInt(value);
}
