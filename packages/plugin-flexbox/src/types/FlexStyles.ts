import type { Rect } from '@plextv/react-lightning';

export type FlexDirection = 'column-reverse' | 'column' | 'row-reverse' | 'row';
export type FlexWrap = 'nowrap' | 'wrap-reverse' | 'wrap';

export type AlignContent =
  | 'center'
  | 'flex-end'
  | 'flex-start'
  | 'space-around'
  | 'space-between'
  | 'space-evenly'
  | 'stretch';

export type AlignItems =
  | 'baseline'
  | 'center'
  | 'flex-end'
  | 'flex-start'
  | 'stretch';

export type JustifyContent =
  | 'center'
  | 'flex-end'
  | 'flex-start'
  | 'space-around'
  | 'space-between'
  | 'space-evenly';

export type Transform = {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
};

export type FlexLightningBaseElementStyle = {
  margin?: AutoDimensionValue;
  marginBottom?: AutoDimensionValue;
  marginEnd?: AutoDimensionValue;
  marginLeft?: AutoDimensionValue;
  marginRight?: AutoDimensionValue;
  marginStart?: AutoDimensionValue;
  marginTop?: AutoDimensionValue;
  marginInline?: AutoDimensionValue;
  marginBlock?: AutoDimensionValue;
  marginHorizontal?: AutoDimensionValue;
  marginVertical?: AutoDimensionValue;

  padding?: DimensionValue;
  paddingBottom?: DimensionValue;
  paddingEnd?: DimensionValue;
  paddingLeft?: DimensionValue;
  paddingRight?: DimensionValue;
  paddingStart?: DimensionValue;
  paddingTop?: DimensionValue;
  paddingInline?: DimensionValue;
  paddingBlock?: DimensionValue;
  paddingHorizontal?: DimensionValue;
  paddingVertical?: DimensionValue;

  aspectRatio?: number;
  maxHeight?: DimensionValue;
  maxWidth?: DimensionValue;
  minHeight?: DimensionValue;
  minWidth?: DimensionValue;

  display?: 'flex' | 'none';
  transform?: Transform;

  /** Only affects flex layouts */
  position?: 'absolute' | 'relative' | 'static';
  /** Same as setting `y` if not using flexbox */
  top?: DimensionValue;
  /** Same as setting `x` if not using flexbox */
  left?: DimensionValue;
  /** Only affects flex layouts */
  right?: DimensionValue;
  /** Only affects flex layouts */
  bottom?: DimensionValue;

  /** Used as the initial dimensions for the element before yoga has calculated
   * where placement should actually go. This is to estimate where elements are
   * place on the screen so things like images don't all get loaded immediately
   * when they aren't supposed to be visible */
  initialDimensions?: Rect;
};

export interface FlexContainer {
  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  alignContent?: AlignContent;
  alignItems?: AlignItems;
  justifyContent?: JustifyContent;
  rowGap?: number;
  gap?: number;
  columnGap?: number;
}

export interface FlexItem {
  alignSelf?: AlignItems;
  flex?: string | number;
  flexBasis?: AutoDimensionValue;
  flexGrow?: number;
  flexShrink?: number;
}

export type DimensionValue = number | `${number}%`;
export type AutoDimensionValue = DimensionValue | 'auto';
