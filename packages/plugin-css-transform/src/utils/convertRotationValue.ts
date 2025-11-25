export function convertRotationValue(value: string): number {
  if (value.endsWith('deg')) {
    return (Number.parseFloat(value) * Math.PI) / 180;
  }
  if (value.endsWith('grad')) {
    return (Number.parseFloat(value) * Math.PI) / 200;
  }
  if (value.endsWith('rad')) {
    return Number.parseFloat(value);
  }
  if (value.endsWith('turn')) {
    return Number.parseFloat(value) * Math.PI * 2;
  }
  return Number.parseFloat(value);
}
