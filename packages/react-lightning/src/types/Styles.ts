import type { INodeProps, ITextNodeProps } from '@lightningjs/renderer';
import type { Rect } from './Geometry';

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
  borderColor?: number;
  borderTop?: number;
  borderRight?: number;
  borderBottom?: number;
  borderLeft?: number;
  /**
   * Follows css border-radius syntax
   * https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius#syntax
   */
  borderRadius?: number | [number, number?, number?, number?];

  /** Used as the initial dimensions for the element before yoga has calculated
   * where placement should actually go. This is to estimate where elements are
   * place on the screen so things like images don't all get loaded immediately
   * when they aren't supposed to be visible */
  initialDimensions?: Rect;
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
