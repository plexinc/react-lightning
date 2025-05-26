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
import type { FlexProps } from './isFlexStyleProp';
import { isFlexStyleProp } from './isFlexStyleProp';
import type { AutoDimensionValue, Transform } from './types/FlexStyles';
import Yoga from './yoga';

function mapDisplay(value?: 'flex' | 'none'): Display {
  switch (value) {
    case 'none':
      return Yoga.instance.DISPLAY_NONE;
    default:
      return Yoga.instance.DISPLAY_FLEX;
  }
}

function mapDirection(value?: number | string): YogaFlexDirection {
  switch (value) {
    case 'column-reverse':
      return Yoga.instance.FLEX_DIRECTION_COLUMN_REVERSE;
    case 'column':
      return Yoga.instance.FLEX_DIRECTION_COLUMN;
    case 'row-reverse':
      return Yoga.instance.FLEX_DIRECTION_ROW_REVERSE;
    default:
      return Yoga.instance.FLEX_DIRECTION_ROW;
  }
}

function mapAlignItems(value?: number | string): Align {
  switch (value) {
    case 'flex-start':
      return Yoga.instance.ALIGN_FLEX_START;
    case 'flex-end':
      return Yoga.instance.ALIGN_FLEX_END;
    case 'center':
      return Yoga.instance.ALIGN_CENTER;
    case 'baseline':
      return Yoga.instance.ALIGN_BASELINE;
    default:
      return Yoga.instance.ALIGN_STRETCH;
  }
}

function mapAlignContent(value?: number | string): Align {
  switch (value) {
    case 'space-around':
      return Yoga.instance.ALIGN_SPACE_AROUND;
    case 'space-between':
    case 'space-evenly':
      return Yoga.instance.ALIGN_SPACE_BETWEEN;
    case 'center':
      return Yoga.instance.ALIGN_CENTER;
    case 'flex-end':
      return Yoga.instance.ALIGN_FLEX_END;
    case 'stretch':
      return Yoga.instance.ALIGN_STRETCH;
    default:
      return Yoga.instance.ALIGN_FLEX_START;
  }
}

function mapWrap(value?: number | string): Wrap {
  switch (value) {
    case 'wrap':
      return Yoga.instance.WRAP_WRAP;
    case 'wrap-reverse':
      return Yoga.instance.WRAP_WRAP_REVERSE;
    default:
      return Yoga.instance.WRAP_NO_WRAP;
  }
}

function mapJustify(value?: number | string): Justify {
  switch (value) {
    case 'center':
      return Yoga.instance.JUSTIFY_CENTER;
    case 'flex-end':
      return Yoga.instance.JUSTIFY_FLEX_END;
    case 'space-around':
      return Yoga.instance.JUSTIFY_SPACE_AROUND;
    case 'space-between':
      return Yoga.instance.JUSTIFY_SPACE_BETWEEN;
    case 'space-evenly':
      return Yoga.instance.JUSTIFY_SPACE_EVENLY;
    default:
      return Yoga.instance.JUSTIFY_FLEX_START;
  }
}

function mapPosition(value?: number | string): PositionType {
  switch (value) {
    case 'absolute':
    case 'fixed':
      return Yoga.instance.POSITION_TYPE_ABSOLUTE;
    case 'static':
      return Yoga.instance.POSITION_TYPE_STATIC;
    default:
      return Yoga.instance.POSITION_TYPE_RELATIVE;
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

export default function applyReactPropsToYoga(
  node: Node,
  style: Partial<LightningViewElementStyle>,
) {
  for (const prop of Object.keys(style)) {
    if (isFlexStyleProp(prop)) {
      applyFlexPropToYoga(node, prop, style[prop]);
    }
  }
}

export function applyFlexPropToYoga<K extends FlexProps>(
  node: Node,
  key: K,
  styleValue: LightningViewElementStyle[K],
): boolean {
  try {
    const value = styleValue as Exclude<
      LightningViewElementStyle[K],
      Transform
    >;

    switch (key) {
      case 'display':
        node.setDisplay(
          mapDisplay(value as LightningViewElementStyle['display']),
        );
        return true;
      case 'width':
        node.setWidth(value as LightningViewElementStyle['width']);
        return true;
      case 'minWidth':
        node.setMinWidth(value as LightningViewElementStyle['minWidth']);
        return true;
      case 'maxWidth':
        node.setMaxWidth(formatSizeValue<'maxWidth'>(value));
        return true;
      case 'height':
        node.setHeight(value as LightningViewElementStyle['height']);
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
          Yoga.instance.EDGE_ALL,
          value as LightningViewElementStyle['margin'],
        );
        return true;
      case 'marginBottom':
        node.setMargin(
          Yoga.instance.EDGE_BOTTOM,
          value as LightningViewElementStyle['marginBottom'],
        );
        return true;
      case 'marginEnd':
        node.setMargin(
          Yoga.instance.EDGE_END,
          value as LightningViewElementStyle['marginEnd'],
        );
        return true;
      case 'marginLeft':
        node.setMargin(
          Yoga.instance.EDGE_LEFT,
          value as LightningViewElementStyle['marginLeft'],
        );
        return true;
      case 'marginRight':
        node.setMargin(
          Yoga.instance.EDGE_RIGHT,
          value as LightningViewElementStyle['marginRight'],
        );
        return true;
      case 'marginStart':
        node.setMargin(
          Yoga.instance.EDGE_START,
          value as LightningViewElementStyle['marginStart'],
        );
        return true;
      case 'marginTop':
        node.setMargin(
          Yoga.instance.EDGE_TOP,
          value as LightningViewElementStyle['marginTop'],
        );
        return true;
      case 'marginHorizontal':
      case 'marginInline':
        node.setMargin(
          Yoga.instance.EDGE_HORIZONTAL,
          value as LightningViewElementStyle['marginInline'],
        );
        return true;
      case 'marginVertical':
      case 'marginBlock':
        node.setMargin(
          Yoga.instance.EDGE_VERTICAL,
          value as LightningViewElementStyle['marginBlock'],
        );
        return true;
      case 'padding':
        node.setPadding(
          Yoga.instance.EDGE_ALL,
          value as LightningViewElementStyle['padding'],
        );
        return true;
      case 'paddingBottom':
        node.setPadding(
          Yoga.instance.EDGE_BOTTOM,
          value as LightningViewElementStyle['paddingBottom'],
        );
        return true;
      case 'paddingEnd':
        node.setPadding(
          Yoga.instance.EDGE_END,
          value as LightningViewElementStyle['paddingEnd'],
        );
        return true;
      case 'paddingLeft':
        node.setPadding(
          Yoga.instance.EDGE_LEFT,
          value as LightningViewElementStyle['paddingLeft'],
        );
        return true;
      case 'paddingRight':
        node.setPadding(
          Yoga.instance.EDGE_RIGHT,
          value as LightningViewElementStyle['paddingRight'],
        );
        return true;
      case 'paddingStart':
        node.setPadding(
          Yoga.instance.EDGE_START,
          value as LightningViewElementStyle['paddingStart'],
        );
        return true;
      case 'paddingTop':
        node.setPadding(
          Yoga.instance.EDGE_TOP,
          value as LightningViewElementStyle['paddingTop'],
        );
        return true;
      case 'paddingHorizontal':
      case 'paddingInline':
        node.setPadding(
          Yoga.instance.EDGE_HORIZONTAL,
          value as LightningViewElementStyle['paddingInline'],
        );
        return true;
      case 'paddingVertical':
      case 'paddingBlock':
        node.setPadding(
          Yoga.instance.EDGE_VERTICAL,
          value as LightningViewElementStyle['paddingBlock'],
        );
        return true;
      case 'flex':
        applyFlex(node, value);
        return true;
      case 'flexDirection':
        node.setFlexDirection(mapDirection(value));
        return true;
      case 'alignContent':
        node.setAlignContent(mapAlignContent(value));
        return true;
      case 'alignItems':
        node.setAlignItems(mapAlignItems(value));
        return true;
      case 'alignSelf':
        node.setAlignSelf(mapAlignItems(value));
        return true;
      case 'justifyContent':
        node.setJustifyContent(mapJustify(value));
        return true;
      case 'flexWrap':
        node.setFlexWrap(mapWrap(value));
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
          Yoga.instance.GUTTER_ALL,
          (value as LightningViewElementStyle['gap']) ?? 0,
        );
        return true;
      case 'columnGap':
        node.setGap(
          Yoga.instance.GUTTER_COLUMN,
          (value as LightningViewElementStyle['columnGap']) ?? 0,
        );
        return true;
      case 'rowGap':
        node.setGap(
          Yoga.instance.GUTTER_ROW,
          (value as LightningViewElementStyle['rowGap']) ?? 0,
        );
        return true;
      case 'position':
        node.setPositionType(mapPosition(value));
        return true;
      case 'right':
        node.setPosition(
          Yoga.instance.EDGE_RIGHT,
          (value as LightningViewElementStyle['right']) ?? 0,
        );
        return true;
      case 'bottom':
        node.setPosition(
          Yoga.instance.EDGE_BOTTOM,
          (value as LightningViewElementStyle['bottom']) ?? 0,
        );
        return true;
      case 'left':
        node.setPosition(
          Yoga.instance.EDGE_LEFT,
          (value as LightningViewElementStyle['left']) ?? 0,
        );
        return true;
      case 'top':
        node.setPosition(
          Yoga.instance.EDGE_TOP,
          (value as LightningViewElementStyle['top']) ?? 0,
        );
        return true;
    }
  } catch (err) {
    console.error(err);
  }

  return false;
}

function applyFlexBasis(node: Node, value?: AutoDimensionValue) {
  if (value == null) {
    return;
  }

  if (typeof value === 'string' && value.endsWith('%')) {
    node.setFlexBasisPercent(Number.parseFloat(value));
  } else if (value === 'auto') {
    node.setFlexBasisAuto();
  } else {
    node.setFlexBasis(value);
  }
}

function applyFlex(node: Node, value?: string | number) {
  if (value == null) {
    return;
  }

  if (typeof value === 'number') {
    node.setFlexGrow(value);
    node.setFlexShrink(1);
    node.setFlexBasis(0);

    return;
  }

  const parts = value.split(' ');
  const [grow, shrink, basis] = parts;

  // https://developer.mozilla.org/en-US/docs/Web/CSS/flex
  if (grow != null && shrink != null && basis != null) {
    node.setFlexGrow(Number.parseFloat(grow));
    node.setFlexShrink(Number.parseFloat(shrink));
    applyFlexBasis(node, shrink as AutoDimensionValue);
  } else if (parts.length === 2 && grow != null && shrink != null) {
    node.setFlexGrow(Number.parseFloat(grow));

    if (/^\d+$/.test(shrink)) {
      node.setFlexShrink(Number.parseFloat(shrink));
      node.setFlexBasis(0);
    } else {
      node.setFlexShrink(1);
      applyFlexBasis(node, shrink as AutoDimensionValue);
    }
  } else if (parts.length === 1 && grow != null) {
    if (/^\d+$/.test(grow)) {
      node.setFlexGrow(Number.parseFloat(grow));
      node.setFlexShrink(1);
      node.setFlexBasis(0);
    } else if (grow === 'none') {
      node.setFlexGrow(0);
      node.setFlexShrink(0);
      node.setFlexBasisAuto();
    } else if (typeof grow === 'string') {
      node.setFlexGrow(1);
      node.setFlexShrink(1);
      applyFlexBasis(node, grow as AutoDimensionValue);
    }
  }
}
