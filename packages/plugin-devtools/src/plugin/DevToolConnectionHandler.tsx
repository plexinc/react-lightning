import { type FC, type ReactNode, useCallback } from 'react';
import { useExtensionMessaging } from '../communication/useExtensionMessaging';
import type { ElementTracker } from './ElementTracker';

type Props = {
  elementTracker: ElementTracker;
  children: ReactNode;
};

export const DevToolConnectionHandler: FC<Props> = ({
  elementTracker,
  children,
}) => {
  useExtensionMessaging(
    'connected',
    useCallback(() => {
      console.log('DevTools connected');
      elementTracker.connect();
    }, [elementTracker]),
  );

  useExtensionMessaging(
    'disconnected',
    useCallback(() => {
      console.log('DevTools disconnected');
      elementTracker.disconnect();
    }, [elementTracker]),
  );

  useExtensionMessaging(
    'requestProps',
    useCallback(
      ({ data }) => {
        console.log(`Watching props for element ${data}`);
        elementTracker.watchElement(data);
      },
      [elementTracker],
    ),
  );

  return children;
};
