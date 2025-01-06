import type { LightningElement, Rect } from '@plex/react-lightning';
import type { SimpleElement } from '../types';

export type SerializableProps = Pick<LightningElement, 'props' | 'rawProps'> & {
  element: SimpleElement;
  boundingRect: Rect;
  lngProps: { id: number } & ReturnType<
    LightningElement['_toLightningNodeProps']
  >;
};

export function getSerializableProps(
  element: SimpleElement,
  lngElement: LightningElement,
): SerializableProps {
  return {
    element,
    props: lngElement.props,
    rawProps: lngElement.rawProps,
    lngProps: {
      id: lngElement.node.id,
      /* @ts-expect-error Don't try this at home */
      ...lngElement._toLightningNodeProps(lngElement.props),
    },
    boundingRect: lngElement.getBoundingClientRect(lngElement.parent),
  };
}
