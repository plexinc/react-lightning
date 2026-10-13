import { useEffect } from 'react';

import { keyEventBus } from '@plextv/react-lightning';

import { addTVEventListener, type TVEventListener } from '../tv/tvEvents';

export type { HWEvent, TVEventType } from '../tv/tvEvents';

type Subscription = { remove: () => void };

export const TVEventHandler: { addListener(listener: TVEventListener): Subscription } = {
  addListener(listener) {
    return { remove: addTVEventListener(keyEventBus, listener) };
  },
};

const noop = (): void => {};

type TVEventControlStatic = Record<
  | 'enableTVMenuKey'
  | 'disableTVMenuKey'
  | 'enableTVPanGesture'
  | 'disableTVPanGesture'
  | 'enableGestureHandlersCancelTouches'
  | 'disableGestureHandlersCancelTouches',
  () => void
>;

export const TVEventControl: TVEventControlStatic = {
  enableTVMenuKey: noop,
  disableTVMenuKey: noop,
  enableTVPanGesture: noop,
  disableTVPanGesture: noop,
  enableGestureHandlersCancelTouches: noop,
  disableGestureHandlersCancelTouches: noop,
};

export function useTVEventHandler(listener: TVEventListener): void {
  useEffect(() => addTVEventListener(keyEventBus, listener), [listener]);
}
