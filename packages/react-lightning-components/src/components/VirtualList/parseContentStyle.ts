import type { ContentStyle } from './VirtualListTypes';

export interface ParsedContentStyle {
  top: number;
  right: number;
  bottom: number;
  left: number;
  backgroundColor?: number;
}

export function parseContentStyle(style?: ContentStyle): ParsedContentStyle {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const base = style.padding ?? 0;
  const vertical = style.paddingVertical ?? base;
  const horizontal = style.paddingHorizontal ?? base;

  return {
    top: style.paddingTop ?? vertical,
    right: style.paddingRight ?? horizontal,
    bottom: style.paddingBottom ?? vertical,
    left: style.paddingLeft ?? horizontal,
    backgroundColor: style.backgroundColor,
  };
}
