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
        // If it's text, we don't actually use children as text
        if (type === LightningElementType.Text) {
          const textProps = mappedProps as LightningTextElementProps;
          const children = props[prop];

          if (isValidTextChild(children)) {
            textProps.text = String(children);
          } else if (
            Array.isArray(children) &&
            children.every((child) => isValidTextChild(child))
          ) {
            textProps.text = children.reduce<string>(
              (acc, child) => acc + String(child),
              '',
            );
          } else if (
            children &&
            'props' in children &&
            children.props?.defaultMessage
          ) {
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
        // biome-ignore lint/suspicious/noExplicitAny: TODO
        mappedProps[prop] = props[prop] as any;
        break;
    }
  }

  return mappedProps;
}
