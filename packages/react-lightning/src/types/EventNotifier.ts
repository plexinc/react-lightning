import type { DefaultEventMap, IEventEmitter } from 'tseep';

export type EventNotifier<T extends DefaultEventMap = DefaultEventMap> = {
  on: (...args: Parameters<IEventEmitter<T>['on']>) => () => void;
  off: (...args: Parameters<IEventEmitter<T>['off']>) => void;
  emit: (...args: Parameters<IEventEmitter<T>['emit']>) => void;
};
