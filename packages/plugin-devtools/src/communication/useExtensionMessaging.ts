import { useContext, useEffect } from 'react';
import type { ProtocolMap } from 'webext-bridge';
import { type MessageCallback, MessagingContext } from './MessagingProvider';

export const useExtensionMessaging = <K extends keyof ProtocolMap>(
  event: K,
  handler: MessageCallback<K>,
) => {
  const subscribe = useContext(MessagingContext);

  useEffect(() => {
    return subscribe(event, handler);
  });
};
