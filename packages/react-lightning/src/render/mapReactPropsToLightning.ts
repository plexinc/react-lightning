import {
  type LightningElementProps,
  LightningElementType,
  type LightningTextElementProps,
} from '../types';
import { areValuesEqual } from '../utils/simpleDiff';
import { isValidTextChild } from './isValidTextChild';

// Text takes its children as raw text content rather than as rendered
// child nodes — but only the primitive cases reach us here. Anything
// React must render (a `<FormattedMessage>`, a ternary, a fragment) is
// routed through the reconciler by `shouldSetTextContent` and folded
// back in by `LightningTextElement`, so we never see it as a prop.
function mapTextChildren(children: unknown): string | undefined {
  if (isValidTextChild(children)) {
    return String(children);
  }

  if (Array.isArray(children)) {
    let text = '';

    for (let i = 0; i < children.length; i++) {
      if (isValidTextChild(children[i])) {
        text += String(children[i]);
      }
    }

    return text;
  }

  return undefined;
}

/**
 * Converts React props to work with LightningElements
 */
export function mapReactPropsToLightning(
  type: LightningElementType,
  props: LightningElementProps,
): Partial<LightningElementProps> {
  const mappedProps: Partial<LightningElementProps> = {};

  if (!props) {
    return mappedProps;
  }

  let prop: keyof typeof props;

  for (prop in props) {
    switch (prop) {
      case 'children':
        if (type === LightningElementType.Text) {
          const text = mapTextChildren(props[prop]);

          if (text !== undefined) {
            (mappedProps as LightningTextElementProps).text = text;
          }
        }

        break;

      // Ignored props
      case 'ref':
      case 'key':
        break;

      default:
        // oxlint-disable-next-line typescript/no-explicit-any -- TODO
        mappedProps[prop] = props[prop] as any;
        break;
    }
  }

  return mappedProps;
}

// Same result as mapReactPropsToLightning(type, simpleDiff(old, new)) in one pass. Only text
// maps children to a prop, so other types skip diffing them; removed props are ignored, as before.
export function diffReactPropsToLightning(
  type: LightningElementType,
  oldProps: LightningElementProps,
  newProps: LightningElementProps,
): Partial<LightningElementProps> | null {
  if (oldProps === newProps) {
    return null;
  }

  const isText = type === LightningElementType.Text;
  let mappedProps: Partial<LightningElementProps> | null = null;
  let prop: keyof typeof newProps;

  for (prop in newProps) {
    if (prop === 'ref' || prop === 'key' || (prop === 'children' && !isText)) {
      continue;
    }

    const value = newProps[prop];

    if (prop in oldProps && areValuesEqual(oldProps[prop], value)) {
      continue;
    }

    if (prop === 'children') {
      const text = mapTextChildren(value);

      if (text !== undefined) {
        mappedProps ??= {};
        (mappedProps as LightningTextElementProps).text = text;
      }
    } else {
      mappedProps ??= {};
      // oxlint-disable-next-line typescript/no-explicit-any -- TODO
      mappedProps[prop] = value as any;
    }
  }

  return mappedProps;
}
