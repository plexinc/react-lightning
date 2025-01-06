import type {
  LightningElement,
  LightningElementEvents,
} from '@plex/react-lightning';
import { useEffect, useState } from 'react';

export const useRenderElementOnEvents = (
  element: LightningElement | null,
  events: (keyof LightningElementEvents)[],
) => {
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    if (!element || !events) {
      return () => {};
    }

    const disposers = events.map((evt) =>
      element.on(evt, () => setRenderCount(renderCount + 1)),
    );

    return () => {
      for (const disposer of disposers) {
        disposer();
      }
    };
  }, [element, renderCount, events]);
};
