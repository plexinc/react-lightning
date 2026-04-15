import type { LightningViewElementStyle } from '@plextv/react-lightning';

export const flexProps = {
  alignContent: true,
  alignItems: true,
  alignSelf: true,
  flex: true,
  flexBasis: true,
  flexDirection: true,
  rowGap: true,
  gap: true,
  columnGap: true,
  flexGrow: true,
  flexShrink: true,
  flexWrap: true,
  justifyContent: true,

  margin: true,
  marginBottom: true,
  marginEnd: true,
  marginLeft: true,
  marginRight: true,
  marginStart: true,
  marginTop: true,
  marginInline: true,
  marginBlock: true,
  marginHorizontal: true,
  marginVertical: true,

  padding: true,
  paddingBottom: true,
  paddingEnd: true,
  paddingLeft: true,
  paddingRight: true,
  paddingStart: true,
  paddingTop: true,
  paddingInline: true,
  paddingBlock: true,
  paddingHorizontal: true,
  paddingVertical: true,

  maxHeight: true,
  maxWidth: true,
  minHeight: true,
  minWidth: true,
  w: true,
  h: true,
  aspectRatio: true,

  display: true,
  position: true,
  top: true,
  left: true,
  right: true,
  bottom: true,
} as const;

flexProps satisfies Partial<Record<keyof LightningViewElementStyle, boolean>>;

export type FlexProps = keyof typeof flexProps;

// `Set.has` is faster than the `in` operator (which walks the prototype
// chain — `'toString' in flexProps` returns true, etc.) and runs on every
// style key during transformProps and the worker proxy's applyStyle.
const _flexPropsSet: Set<string> = new Set(Object.keys(flexProps));

export function isFlexStyleProp(prop: number | string | symbol): prop is FlexProps {
  return typeof prop === 'string' && _flexPropsSet.has(prop);
}
