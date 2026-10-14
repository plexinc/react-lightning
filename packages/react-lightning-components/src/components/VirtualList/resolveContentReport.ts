export interface ContentSize {
  w: number;
  h: number;
}

export function resolveContentReport(
  prev: ContentSize,
  next: ContentSize,
  settled: boolean,
): ContentSize | undefined {
  if (!settled || (prev.w === next.w && prev.h === next.h)) {
    return undefined;
  }

  return next;
}
