/**
 * An index scroll that was clamped by a viewport or content size that later
 * settled should land where it was asked to once the range is known. Returns
 * the offset to scroll to, or undefined when the list already sits there.
 */
export function resolveScrollIntentRescroll(
  intent: number | null,
  scrollOffset: number,
  maxScroll: number,
): number | undefined {
  if (intent === null) {
    return undefined;
  }

  const target = Math.max(0, Math.min(intent, maxScroll));

  return Math.abs(target - scrollOffset) < 1 ? undefined : target;
}
