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

export type FlexLightningBaseElementStyle = {
  margin?: number;
  marginBottom?: number;
  marginEnd?: number;
  marginLeft?: number;
  marginRight?: number;
  marginStart?: number;
  marginTop?: number;
  marginInline?: number;
  marginBlock?: number;
  marginHorizontal?: number;
  marginVertical?: number;

  padding?: number;
  paddingBottom?: number;
  paddingEnd?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingStart?: number;
  paddingTop?: number;
  paddingInline?: number;
  paddingBlock?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;

  aspectRatio?: number;
  maxHeight?: number;
  maxWidth?: number;
  minHeight?: number;
  minWidth?: number;

  display?: 'flex' | 'none';

  /** Only affects flex layouts */
  position?: 'absolute' | 'relative' | 'static';
  /** Same as setting `y` if not using flexbox */
  top?: number;
  /** Same as setting `x` if not using flexbox */
  left?: number;
  /** Only affects flex layouts */
  right?: number;
  /** Only affects flex layouts */
  bottom?: number;
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
  flexBasis?: number;
  flexGrow?: number;
  flexShrink?: number;
}
