import type { INodeProps, ITextNodeProps } from '@lightningjs/renderer';

interface BorderStyleObject {
  width: number;
  color: number;
}

type BorderStyle = BorderStyleObject | number;
type RGBA = [r: number, g: number, b: number, a: number];

// We only want a subset of props from lightning's built-ins, but try to only
// list exclusions, so if new lightning props get added, we immediately get
// typing errors and know if new props are available.

export interface LightningViewElementStyle
  extends Omit<
    Partial<INodeProps>,
    'parent' | 'src' | 'shader' | 'data' | 'texture'
  > {
  border?: BorderStyle;
  borderTop?: BorderStyle;
  borderRight?: BorderStyle;
  borderBottom?: BorderStyle;
  borderLeft?: BorderStyle;
  /**
   * Follows css border-radius syntax
   * https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius#syntax
   */
  borderRadius?: number | [number, number?, number?, number?];
}

export interface LightningImageElementStyle extends LightningViewElementStyle {}

export interface LightningTextElementStyle
  extends LightningViewElementStyle,
    Omit<
      Partial<ITextNodeProps>,
      'debug' | 'parent' | 'shader' | 'src' | 'text' | 'texture'
    > {
  shadow?: boolean;
  shadowColor?: RGBA | number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;

  text?: string;
  textAlign?: 'center' | 'left' | 'right';
  textOverflow?: 'ellipsis' | 'clip';
  contain?: 'both' | 'none' | 'width';
  scrollable?: boolean;
  scrollY?: number;
  offsetY?: number;
  letterSpacing?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontWeight?: number | 'bold' | 'bolder' | 'lighter' | 'normal';
  fontStyle?: 'italic' | 'normal' | 'oblique';
  fontStretch?:
    | 'condensed'
    | 'expanded'
    | 'extra-condensed'
    | 'extra-expanded'
    | 'normal'
    | 'semi-condensed'
    | 'semi-expanded'
    | 'ultra-condensed'
    | 'ultra-expanded';
  fontSize?: number;
}

export type LightningElementStyle =
  | LightningViewElementStyle
  | LightningImageElementStyle
  | LightningTextElementStyle;
