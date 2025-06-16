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
import type { Yoga as YogaInstance } from 'yoga-layout/load';
import type { FlexProps } from './isFlexStyleProp';
import { isFlexStyleProp } from './isFlexStyleProp';
import type { AutoDimensionValue, Transform } from './types/FlexStyles';
import Yoga from './yoga';

// Cache Yoga constants to avoid repeated property access to the yoga instance.
// However we can't do this immediately, since the yoga instance is loaded
// dynamically.
let instance: YogaInstance;

function mapDisplay(value?: 'flex' | 'none'): Display {
  switch (value) {
    case 'none':
      return instance.DISPLAY_NONE;
    default:
      return instance.DISPLAY_FLEX;
  }
}

function mapDirection(value?: number | string): YogaFlexDirection {
  switch (value) {
    case 'column-reverse':
      return instance.FLEX_DIRECTION_COLUMN_REVERSE;
    case 'column':
      return instance.FLEX_DIRECTION_COLUMN;
    case 'row-reverse':
      return instance.FLEX_DIRECTION_ROW_REVERSE;
    default:
      return instance.FLEX_DIRECTION_ROW;
  }
}

function mapAlignItems(value?: number | string): Align {
  switch (value) {
    case 'flex-start':
      return instance.ALIGN_FLEX_START;
    case 'flex-end':
      return instance.ALIGN_FLEX_END;
    case 'center':
      return instance.ALIGN_CENTER;
    case 'baseline':
      return instance.ALIGN_BASELINE;
    default:
      return instance.ALIGN_STRETCH;
  }
}

function mapAlignContent(value?: number | string): Align {
  switch (value) {
    case 'space-around':
      return instance.ALIGN_SPACE_AROUND;
    case 'space-between':
    case 'space-evenly':
      return instance.ALIGN_SPACE_BETWEEN;
    case 'center':
      return instance.ALIGN_CENTER;
    case 'flex-end':
      return instance.ALIGN_FLEX_END;
    case 'stretch':
      return instance.ALIGN_STRETCH;
    default:
      return instance.ALIGN_FLEX_START;
  }
}

function mapWrap(value?: number | string): Wrap {
  switch (value) {
    case 'wrap':
      return instance.WRAP_WRAP;
    case 'wrap-reverse':
      return instance.WRAP_WRAP_REVERSE;
    default:
      return instance.WRAP_NO_WRAP;
  }
}

function mapJustify(value?: number | string): Justify {
  switch (value) {
    case 'center':
      return instance.JUSTIFY_CENTER;
    case 'flex-end':
      return instance.JUSTIFY_FLEX_END;
    case 'space-around':
      return instance.JUSTIFY_SPACE_AROUND;
    case 'space-between':
      return instance.JUSTIFY_SPACE_BETWEEN;
    case 'space-evenly':
      return instance.JUSTIFY_SPACE_EVENLY;
    default:
      return instance.JUSTIFY_FLEX_START;
  }
}

function mapPosition(value?: number | string): PositionType {
  switch (value) {
    case 'absolute':
    case 'fixed':
      return instance.POSITION_TYPE_ABSOLUTE;
    case 'static':
      return instance.POSITION_TYPE_STATIC;
    default:
      return instance.POSITION_TYPE_RELATIVE;
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
  if (!instance) {
    instance = Yoga.instance;
  }

  for (const [prop, value] of Object.entries(style)) {
    if (isFlexStyleProp(prop)) {
      applyFlexPropToYoga(
        node,
        prop,
        value as LightningViewElementStyle[typeof prop],
      );
    }
  }
}

export function applyFlexPropToYoga<K extends FlexProps>(
  node: Node,
  key: K,
  styleValue: LightningViewElementStyle[K],
): boolean {
  if (styleValue == null) {
    return false;
  }

  if (!instance) {
    instance = Yoga.instance;
  }

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
          instance.EDGE_ALL,
          value as LightningViewElementStyle['margin'],
        );
        return true;
      case 'marginBottom':
        node.setMargin(
          instance.EDGE_BOTTOM,
          value as LightningViewElementStyle['marginBottom'],
        );
        return true;
      case 'marginEnd':
        node.setMargin(
          instance.EDGE_END,
          value as LightningViewElementStyle['marginEnd'],
        );
        return true;
      case 'marginLeft':
        node.setMargin(
          instance.EDGE_LEFT,
          value as LightningViewElementStyle['marginLeft'],
        );
        return true;
      case 'marginRight':
        node.setMargin(
          instance.EDGE_RIGHT,
          value as LightningViewElementStyle['marginRight'],
        );
        return true;
      case 'marginStart':
        node.setMargin(
          instance.EDGE_START,
          value as LightningViewElementStyle['marginStart'],
        );
        return true;
      case 'marginTop':
        node.setMargin(
          instance.EDGE_TOP,
          value as LightningViewElementStyle['marginTop'],
        );
        return true;
      case 'marginHorizontal':
      case 'marginInline':
        node.setMargin(
          instance.EDGE_HORIZONTAL,
          value as LightningViewElementStyle['marginInline'],
        );
        return true;
      case 'marginVertical':
      case 'marginBlock':
        node.setMargin(
          instance.EDGE_VERTICAL,
          value as LightningViewElementStyle['marginBlock'],
        );
        return true;
      case 'padding':
        node.setPadding(
          instance.EDGE_ALL,
          value as LightningViewElementStyle['padding'],
        );
        return true;
      case 'paddingBottom':
        node.setPadding(
          instance.EDGE_BOTTOM,
          value as LightningViewElementStyle['paddingBottom'],
        );
        return true;
      case 'paddingEnd':
        node.setPadding(
          instance.EDGE_END,
          value as LightningViewElementStyle['paddingEnd'],
        );
        return true;
      case 'paddingLeft':
        node.setPadding(
          instance.EDGE_LEFT,
          value as LightningViewElementStyle['paddingLeft'],
        );
        return true;
      case 'paddingRight':
        node.setPadding(
          instance.EDGE_RIGHT,
          value as LightningViewElementStyle['paddingRight'],
        );
        return true;
      case 'paddingStart':
        node.setPadding(
          instance.EDGE_START,
          value as LightningViewElementStyle['paddingStart'],
        );
        return true;
      case 'paddingTop':
        node.setPadding(
          instance.EDGE_TOP,
          value as LightningViewElementStyle['paddingTop'],
        );
        return true;
      case 'paddingHorizontal':
      case 'paddingInline':
        node.setPadding(
          instance.EDGE_HORIZONTAL,
          value as LightningViewElementStyle['paddingInline'],
        );
        return true;
      case 'paddingVertical':
      case 'paddingBlock':
        node.setPadding(
          instance.EDGE_VERTICAL,
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
          instance.GUTTER_ALL,
          (value as LightningViewElementStyle['gap']) ?? 0,
        );
        return true;
      case 'columnGap':
        node.setGap(
          instance.GUTTER_COLUMN,
          (value as LightningViewElementStyle['columnGap']) ?? 0,
        );
        return true;
      case 'rowGap':
        node.setGap(
          instance.GUTTER_ROW,
          (value as LightningViewElementStyle['rowGap']) ?? 0,
        );
        return true;
      case 'position':
        node.setPositionType(mapPosition(value));
        return true;
      case 'right':
        node.setPosition(
          instance.EDGE_RIGHT,
          (value as LightningViewElementStyle['right']) ?? 0,
        );
        return true;
      case 'bottom':
        node.setPosition(
          instance.EDGE_BOTTOM,
          (value as LightningViewElementStyle['bottom']) ?? 0,
        );
        return true;
      case 'left':
        node.setPosition(
          instance.EDGE_LEFT,
          (value as LightningViewElementStyle['left']) ?? 0,
        );
        return true;
      case 'top':
        node.setPosition(
          instance.EDGE_TOP,
          (value as LightningViewElementStyle['top']) ?? 0,
        );
        return true;
    }
  } catch (err) {
    console.error(err);
  }

  return false;
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

// Cache for parsed flex values
const flexCache = new Map<
  string,
  { grow: number; shrink: number; basis: AutoDimensionValue | string }
>();

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

  // Check cache first for string values to prevent parsing again
  if (flexCache.has(value)) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const cached = flexCache.get(value)!;

    node.setFlexGrow(cached.grow);
    node.setFlexShrink(cached.shrink);
    applyFlexBasis(node, cached.basis);

    return;
  }

  const parts = value.split(' ');
  const [grow, shrink, basis] = parts;
  let flexConfig: {
    grow: number;
    shrink: number;
    basis: AutoDimensionValue | string;
  };

  // https://developer.mozilla.org/en-US/docs/Web/CSS/flex
  if (grow != null && shrink != null && basis != null) {
    flexConfig = {
      grow: Number.parseFloat(grow),
      shrink: Number.parseFloat(shrink),
      basis,
    };
  } else if (parts.length === 2 && grow != null && shrink != null) {
    if (/^\d+$/.test(shrink)) {
      flexConfig = {
        grow: Number.parseFloat(grow),
        shrink: Number.parseFloat(shrink),
        basis: 0,
      };
    } else {
      flexConfig = {
        grow: Number.parseFloat(grow),
        shrink: 1,
        basis: shrink,
      };
    }
  } else if (parts.length === 1 && grow != null) {
    if (/^\d+$/.test(grow)) {
      flexConfig = {
        grow: Number.parseFloat(grow),
        shrink: 1,
        basis: 0,
      };
    } else if (grow === 'none') {
      flexConfig = { grow: 0, shrink: 0, basis: 'auto' };
    } else {
      flexConfig = { grow: 1, shrink: 1, basis: grow };
    }
  } else {
    return;
  }

  // Cache the parsed result
  flexCache.set(value, flexConfig);

  node.setFlexGrow(flexConfig.grow);
  node.setFlexShrink(flexConfig.shrink);
  applyFlexBasis(node, flexConfig.basis);
}
