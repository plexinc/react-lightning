export function roundTo(value: number, significantDigits: number): number {
  const multiplier = 10 ** significantDigits;

  return Math.round(value * multiplier) / multiplier;
}
