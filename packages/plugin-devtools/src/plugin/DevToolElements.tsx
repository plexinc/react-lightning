import {
  type LightningElement,
  LightningViewElement,
} from '@plex/react-lightning';
import { type FC, type ReactNode, useCallback, useState } from 'react';
import { useExtensionMessaging } from '../communication/useExtensionMessaging';
import { useRenderElementOnEvents } from '../utils/useRenderElementOnEvents';

type Props = {
  children: (elements: {
    selectedElement: LightningElement | null;
    hoveredElement: LightningElement | null;
  }) => ReactNode;
};

const eventsToReRenderOn = [
  'layout',
  'flexLayout',
  'stylesChanged',
  'animationFinished',
];

export const DevToolElements: FC<Props> = ({ children }) => {
  const [selectedElement, setSelectedElement] =
    useState<LightningElement | null>(null);
  const [hoveredElement, setHoveredElement] = useState<LightningElement | null>(
    null,
  );

  useExtensionMessaging(
    'setSelectedElement',
    useCallback(({ data }) => {
      if (data === null) {
        setSelectedElement(null);
        return;
      }

      const element = LightningViewElement.allElements[data];

      if (element) {
        setSelectedElement(element);
      }
    }, []),
  );

  useExtensionMessaging(
    'setHoveredElement',
    useCallback(({ data }) => {
      if (data === null) {
        setHoveredElement(null);
        return;
      }

      const element = LightningViewElement.allElements[data];

      if (element) {
        setHoveredElement(element);
      }
    }, []),
  );

  useRenderElementOnEvents(selectedElement, eventsToReRenderOn);
  useRenderElementOnEvents(hoveredElement, eventsToReRenderOn);

  return children({ selectedElement, hoveredElement });
};
