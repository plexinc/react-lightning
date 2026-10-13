import { type KeyEventBus, Keys } from '@plextv/react-lightning';

export type TVEventType =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'select'
  | 'longSelect'
  | 'playPause'
  | 'play'
  | 'pause'
  | 'stop'
  | 'fastForward'
  | 'rewind'
  | 'next'
  | 'previous'
  | 'back'
  | 'menu'
  | 'info';

export type HWEvent = {
  eventType: TVEventType | (string & {});
  eventKeyAction?: -1 | 0 | 1;
  tag?: number;
  target?: number;
  body?: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    state: 'Began' | 'Changed' | 'Ended';
  };
};

export type TVEventListener = (event: HWEvent) => unknown;

const EVENT_TYPES: Partial<Record<Keys, TVEventType>> = {
  [Keys.Up]: 'up',
  [Keys.Down]: 'down',
  [Keys.Left]: 'left',
  [Keys.Right]: 'right',
  [Keys.Enter]: 'select',
  [Keys.PlayPause]: 'playPause',
  [Keys.Play]: 'play',
  [Keys.Pause]: 'pause',
  [Keys.Stop]: 'stop',
  [Keys.FastForward]: 'fastForward',
  [Keys.Rewind]: 'rewind',
  [Keys.SkipNext]: 'next',
  [Keys.SkipPrevious]: 'previous',
  [Keys.Back]: 'back',
  [Keys.Menu]: 'menu',
  [Keys.Info]: 'info',
};

export const matchesKey = (remoteKey: Keys | Keys[], key: Keys): boolean =>
  Array.isArray(remoteKey) ? remoteKey.includes(key) : remoteKey === key;

export const toTVEventType = (remoteKey: Keys | Keys[]): TVEventType | null => {
  if (!Array.isArray(remoteKey)) {
    return EVENT_TYPES[remoteKey] ?? null;
  }

  for (const key of remoteKey) {
    const eventType = EVENT_TYPES[key];

    if (eventType) {
      return eventType;
    }
  }

  return null;
};

export function addTVEventListener(bus: KeyEventBus, listener: TVEventListener): () => void {
  let longSelectHeld = false;

  return bus.addListener((event, phase) => {
    if (phase === 'longPress') {
      if (!matchesKey(event.remoteKey, Keys.Enter)) {
        return false;
      }

      longSelectHeld = true;

      return Boolean(listener({ eventType: 'longSelect', eventKeyAction: 0 }));
    }

    if (phase === 'up') {
      if (longSelectHeld && matchesKey(event.remoteKey, Keys.Enter)) {
        longSelectHeld = false;
        listener({ eventType: 'longSelect', eventKeyAction: 1 });
      }

      return false;
    }

    if (!event.repeat) {
      longSelectHeld = false;
    }

    const eventType = toTVEventType(event.remoteKey);

    if (eventType === null) {
      return false;
    }

    return Boolean(listener({ eventType, eventKeyAction: 0 }));
  });
}
