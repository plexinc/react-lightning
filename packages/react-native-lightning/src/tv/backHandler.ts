import { type KeyEventBus, Keys } from '@plextv/react-lightning';

import { matchesKey } from './tvEvents';

export type BackPressEventName = 'hardwareBackPress';

export type BackPressHandler = () => boolean | null | undefined;

export type BackHandlerStatic = {
  exitApp(): void;
  addEventListener(
    eventName: BackPressEventName,
    handler: BackPressHandler,
  ): { remove: () => void };
};

const noop = () => {};

export function createBackHandler(bus: KeyEventBus, exitApp: () => void = noop): BackHandlerStatic {
  return {
    exitApp,

    addEventListener(eventName, handler) {
      if (eventName !== 'hardwareBackPress') {
        return { remove: noop };
      }

      const remove = bus.addListener(
        (event, phase) =>
          phase === 'up' && matchesKey(event.remoteKey, Keys.Back) && Boolean(handler()),
      );

      return { remove };
    },
  };
}
