import type { LightningViewElementStyle } from '@plextv/react-lightning';
import type {
  Align,
  Display,
  Justify,
  Node,
  PositionType,
  Wrap,
  FlexDirection as YogaFlexDirection,
} from 'yoga-layout';
import type { Yoga } from 'yoga-layout/load';
import type { YogaOptions } from '../types';
import type { AutoDimensionValue, Transform } from '../types/FlexStyles';
import type { FlexProps } from './isFlexStyleProp';
import { isFlexStyleProp } from './isFlexStyleProp';
import { parseFlexValue } from './parseFlexValue';

function mapDisplay(yoga: Yoga, value?: 'flex' | 'none'): Display {
  switch (value) {
    case 'none':
      return yoga.DISPLAY_NONE;
    default:
      return yoga.DISPLAY_FLEX;
  }
}

function mapDirection(yoga: Yoga, value?: number | string): YogaFlexDirection {
  switch (value) {
    case 'column-reverse':
      return yoga.FLEX_DIRECTION_COLUMN_REVERSE;
    case 'column':
      return yoga.FLEX_DIRECTION_COLUMN;
    case 'row-reverse':
      return yoga.FLEX_DIRECTION_ROW_REVERSE;
    default:
      return yoga.FLEX_DIRECTION_ROW;
  }
}

function mapAlignItems(yoga: Yoga, value?: number | string): Align {
  switch (value) {
    case 'flex-start':
      return yoga.ALIGN_FLEX_START;
    case 'flex-end':
      return yoga.ALIGN_FLEX_END;
    case 'center':
      return yoga.ALIGN_CENTER;
    case 'baseline':
      return yoga.ALIGN_BASELINE;
    default:
      return yoga.ALIGN_STRETCH;
  }
}

function mapAlignContent(yoga: Yoga, value?: number | string): Align {
  switch (value) {
    case 'space-around':
      return yoga.ALIGN_SPACE_AROUND;
    case 'space-between':
    case 'space-evenly':
      return yoga.ALIGN_SPACE_BETWEEN;
    case 'center':
      return yoga.ALIGN_CENTER;
    case 'flex-end':
      return yoga.ALIGN_FLEX_END;
    case 'stretch':
      return yoga.ALIGN_STRETCH;
    default:
      return yoga.ALIGN_FLEX_START;
  }
}

function mapWrap(yoga: Yoga, value?: number | string): Wrap {
  switch (value) {
    case 'wrap':
      return yoga.WRAP_WRAP;
    case 'wrap-reverse':
      return yoga.WRAP_WRAP_REVERSE;
    default:
      return yoga.WRAP_NO_WRAP;
  }
}

function mapJustify(yoga: Yoga, value?: number | string): Justify {
  switch (value) {
    case 'center':
      return yoga.JUSTIFY_CENTER;
    case 'flex-end':
      return yoga.JUSTIFY_FLEX_END;
    case 'space-around':
      return yoga.JUSTIFY_SPACE_AROUND;
    case 'space-between':
      return yoga.JUSTIFY_SPACE_BETWEEN;
    case 'space-evenly':
      return yoga.JUSTIFY_SPACE_EVENLY;
    default:
      return yoga.JUSTIFY_FLEX_START;
  }
}

function mapPosition(yoga: Yoga, value?: number | string): PositionType {
  switch (value) {
    case 'absolute':
    case 'fixed':
      return yoga.POSITION_TYPE_ABSOLUTE;
    case 'static':
      return yoga.POSITION_TYPE_STATIC;
    default:
      return yoga.POSITION_TYPE_RELATIVE;
  }
}

function formatSizeValue<T extends keyof LightningViewElementStyle>(
  value?: string | number | undefined,
): LightningViewElementStyle[T] {
  if (value === 'none' || value === 'auto') {
    return undefined;
  }

  return value as LightningViewElementStyle[T];
}

function applyFlexBasis(node: Node, value?: AutoDimensionValue | string) {
  if (value == null) {
    return;
  }

  if (typeof value === 'string') {
    if (value === 'auto') {
      node.setFlexBasisAuto();
    } else if (value.endsWith('%')) {
      node.setFlexBasisPercent(Number.parseFloat(value));
    } else {
      node.setFlexBasis(Number.parseFloat(value));
    }
  } else if (typeof value === 'number') {
    node.setFlexBasis(value);
  }
}

function applyFlex(
  node: Node,
  value?: string | number,
  expandToAutoFlexBasis = false,
) {
  if (value == null) {
    return;
  }

  const flexConfig = parseFlexValue(value, expandToAutoFlexBasis);

  if (flexConfig) {
    node.setFlexGrow(flexConfig.grow);
    node.setFlexShrink(flexConfig.shrink);
    applyFlexBasis(node, flexConfig.basis);
  }
}

export default function applyReactPropsToYoga(
  yoga: Yoga,
  config: YogaOptions,
  node: Node,
  style: Partial<LightningViewElementStyle>,
): void {
  for (const [prop, value] of Object.entries(style)) {
    if (isFlexStyleProp(prop)) {
      applyFlexPropToYoga(
        yoga,
        config,
        node,
        prop,
        value as LightningViewElementStyle[typeof prop],
      );
    }
  }
}

export function applyFlexPropToYoga<K extends FlexProps>(
  yoga: Yoga,
  config: YogaOptions,
  node: Node,
  key: K,
  styleValue: LightningViewElementStyle[K],
): boolean {
  if (styleValue == null) {
    return false;
  }

  try {
    const value = styleValue as Exclude<
      LightningViewElementStyle[K],
      Transform
    >;

    switch (key) {
      case 'display':
        node.setDisplay(
          mapDisplay(yoga, value as LightningViewElementStyle['display']),
        );
        return true;
      case 'w':
        node.setWidth(value as LightningViewElementStyle['w']);
        return true;
      case 'minWidth':
        node.setMinWidth(value as LightningViewElementStyle['minWidth']);
        return true;
      case 'maxWidth':
        node.setMaxWidth(formatSizeValue<'maxWidth'>(value));
        return true;
      case 'h':
        node.setHeight(value as LightningViewElementStyle['h']);
        return true;
      case 'minHeight':
        node.setMinHeight(value as LightningViewElementStyle['minHeight']);
        return true;
      case 'maxHeight':
        node.setMaxHeight(formatSizeValue<'maxHeight'>(value));
        return true;
      case 'aspectRatio':
        node.setAspectRatio(value as LightningViewElementStyle['aspectRatio']);
        return true;
      case 'margin':
        node.setMargin(
          yoga.EDGE_ALL,
          value as LightningViewElementStyle['margin'],
        );
        return true;
      case 'marginBottom':
        node.setMargin(
          yoga.EDGE_BOTTOM,
          value as LightningViewElementStyle['marginBottom'],
        );
        return true;
      case 'marginEnd':
        node.setMargin(
          yoga.EDGE_END,
          value as LightningViewElementStyle['marginEnd'],
        );
        return true;
      case 'marginLeft':
        node.setMargin(
          yoga.EDGE_LEFT,
          value as LightningViewElementStyle['marginLeft'],
        );
        return true;
      case 'marginRight':
        node.setMargin(
          yoga.EDGE_RIGHT,
          value as LightningViewElementStyle['marginRight'],
        );
        return true;
      case 'marginStart':
        node.setMargin(
          yoga.EDGE_START,
          value as LightningViewElementStyle['marginStart'],
        );
        return true;
      case 'marginTop':
        node.setMargin(
          yoga.EDGE_TOP,
          value as LightningViewElementStyle['marginTop'],
        );
        return true;
      case 'marginHorizontal':
      case 'marginInline':
        node.setMargin(
          yoga.EDGE_HORIZONTAL,
          value as LightningViewElementStyle['marginInline'],
        );
        return true;
      case 'marginVertical':
      case 'marginBlock':
        node.setMargin(
          yoga.EDGE_VERTICAL,
          value as LightningViewElementStyle['marginBlock'],
        );
        return true;
      case 'padding':
        node.setPadding(
          yoga.EDGE_ALL,
          value as LightningViewElementStyle['padding'],
        );
        return true;
      case 'paddingBottom':
        node.setPadding(
          yoga.EDGE_BOTTOM,
          value as LightningViewElementStyle['paddingBottom'],
        );
        return true;
      case 'paddingEnd':
        node.setPadding(
          yoga.EDGE_END,
          value as LightningViewElementStyle['paddingEnd'],
        );
        return true;
      case 'paddingLeft':
        node.setPadding(
          yoga.EDGE_LEFT,
          value as LightningViewElementStyle['paddingLeft'],
        );
        return true;
      case 'paddingRight':
        node.setPadding(
          yoga.EDGE_RIGHT,
          value as LightningViewElementStyle['paddingRight'],
        );
        return true;
      case 'paddingStart':
        node.setPadding(
          yoga.EDGE_START,
          value as LightningViewElementStyle['paddingStart'],
        );
        return true;
      case 'paddingTop':
        node.setPadding(
          yoga.EDGE_TOP,
          value as LightningViewElementStyle['paddingTop'],
        );
        return true;
      case 'paddingHorizontal':
      case 'paddingInline':
        node.setPadding(
          yoga.EDGE_HORIZONTAL,
          value as LightningViewElementStyle['paddingInline'],
        );
        return true;
      case 'paddingVertical':
      case 'paddingBlock':
        node.setPadding(
          yoga.EDGE_VERTICAL,
          value as LightningViewElementStyle['paddingBlock'],
        );
        return true;
      case 'flex':
        applyFlex(node, value, config.expandToAutoFlexBasis);
        return true;
      case 'flexDirection':
        node.setFlexDirection(mapDirection(yoga, value));
        return true;
      case 'alignContent':
        node.setAlignContent(mapAlignContent(yoga, value));
        return true;
      case 'alignItems':
        node.setAlignItems(mapAlignItems(yoga, value));
        return true;
      case 'alignSelf':
        node.setAlignSelf(mapAlignItems(yoga, value));
        return true;
      case 'justifyContent':
        node.setJustifyContent(mapJustify(yoga, value));
        return true;
      case 'flexWrap':
        node.setFlexWrap(mapWrap(yoga, value));
        return true;
      case 'flexBasis':
        applyFlexBasis(node, value as LightningViewElementStyle['flexBasis']);
        return true;
      case 'flexGrow':
        node.setFlexGrow((value as LightningViewElementStyle['flexGrow']) ?? 1);
        return true;
      case 'flexShrink':
        node.setFlexShrink(
          (value as LightningViewElementStyle['flexShrink']) ?? 0,
        );
        return true;
      case 'gap':
        node.setGap(
          yoga.GUTTER_ALL,
          (value as LightningViewElementStyle['gap']) ?? 0,
        );
        return true;
      case 'columnGap':
        node.setGap(
          yoga.GUTTER_COLUMN,
          (value as LightningViewElementStyle['columnGap']) ?? 0,
        );
        return true;
      case 'rowGap':
        node.setGap(
          yoga.GUTTER_ROW,
          (value as LightningViewElementStyle['rowGap']) ?? 0,
        );
        return true;
      case 'position':
        node.setPositionType(mapPosition(yoga, value));
        return true;
      case 'right':
        node.setPosition(
          yoga.EDGE_RIGHT,
          (value as LightningViewElementStyle['right']) ?? 0,
        );
        return true;
      case 'bottom':
        node.setPosition(
          yoga.EDGE_BOTTOM,
          (value as LightningViewElementStyle['bottom']) ?? 0,
        );
        return true;
      case 'left':
        node.setPosition(
          yoga.EDGE_LEFT,
          (value as LightningViewElementStyle['left']) ?? 0,
        );
        return true;
      case 'top':
        node.setPosition(
          yoga.EDGE_TOP,
          (value as LightningViewElementStyle['top']) ?? 0,
        );
        return true;
    }
  } catch (err) {
    console.error(err);
  }

  return false;
}
