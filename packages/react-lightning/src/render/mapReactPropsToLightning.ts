import {
  type LightningElementProps,
  LightningElementType,
  type LightningTextElementProps,
} from '../types';
import { isValidTextChild } from './isValidTextChild';

function isIntlObject(obj: unknown): obj is { props: { defaultMessage?: string } } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'props' in obj &&
    !!obj.props &&
    'defaultMessage' in (obj.props as { defaultMessage?: string })
  );
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
        // If it's text, we don't actually use children as text
        if (type === LightningElementType.Text) {
          const textProps = mappedProps as LightningTextElementProps;
          const children = props[prop];

          if (isValidTextChild(children)) {
            textProps.text = String(children);
          } else if (Array.isArray(children)) {
            // Single-pass: validate and concatenate simultaneously
            let text = '';
            let allValid = true;
            for (let i = 0; i < children.length; i++) {
              if (isValidTextChild(children[i])) {
                text += String(children[i]);
              } else {
                allValid = false;
                break;
              }
            }
            if (allValid) {
              textProps.text = text;
            }
          } else if (isIntlObject(children)) {
            textProps.text = children.props.defaultMessage;
          } else if (children) {
            console.error('Unsupported child type found for text element');
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
