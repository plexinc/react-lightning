import { type ReactNode, createContext, useCallback, useRef } from 'react';
import type {
  BridgeMessage,
  OnMessageCallback,
  ProtocolMap,
} from 'webext-bridge';

type Props = {
  children: ReactNode;
  verbose?: boolean;
  onMessage: (event: string, callback: (data: unknown) => void) => void;
};

export type MessageCallback<K extends keyof ProtocolMap> = OnMessageCallback<
  ProtocolMap[K]
>;

export type MessageSubscribeFn = <K extends keyof ProtocolMap>(
  event: K,
  callback: MessageCallback<K>,
) => void;

export const MessagingContext = createContext<MessageSubscribeFn>(() => {});

export const MessagingProvider = <K extends keyof ProtocolMap>({
  children,
  verbose,
  onMessage,
}: Props) => {
  const handlers = useRef<Map<K, Set<MessageCallback<K>>>>(new Map());

  const subscribe = useCallback(
    (event: K, callback: OnMessageCallback<ProtocolMap[K]>) => {
      let set = handlers.current.get(event);

      if (!set) {
        set = new Set();
        handlers.current.set(event, set);

        onMessage(event, (data) => {
          if (verbose) {
            console.debug('Received event:', event, data);
          }

          if (set) {
            for (const callback of set) {
              callback(data as BridgeMessage<ProtocolMap[K]>);
            }
          }
        });
      }

      set.add(callback);

      return () => handlers.current.delete(event);
    },
    [onMessage, verbose],
  );

  return (
    <MessagingContext.Provider value={subscribe as MessageSubscribeFn}>
      {children}
    </MessagingContext.Provider>
  );
};
