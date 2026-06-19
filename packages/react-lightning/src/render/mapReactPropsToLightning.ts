import {
  type LightningElementProps,
  LightningElementType,
  type LightningTextElementProps,
} from '../types';
import { isValidTextChild } from './isValidTextChild';

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
        // Text takes its children as raw text content rather than as rendered
        // child nodes — but only the primitive cases reach us here. Anything
        // React must render (a `<FormattedMessage>`, a ternary, a fragment) is
        // routed through the reconciler by `shouldSetTextContent` and folded
        // back in by `LightningTextElement`, so we never see it as a prop.
        if (type === LightningElementType.Text) {
          const textProps = mappedProps as LightningTextElementProps;
          const children = props[prop];

          if (isValidTextChild(children)) {
            textProps.text = String(children);
          } else if (Array.isArray(children)) {
            let text = '';

            for (let i = 0; i < children.length; i++) {
              if (isValidTextChild(children[i])) {
                text += String(children[i]);
              }
            }

            textProps.text = text;
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
