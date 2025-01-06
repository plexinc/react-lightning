import type { LightningElement } from '@plex/react-lightning';
import type { NativeSyntheticEvent } from 'react-native';

export function createNativeSyntheticEvent<T>(
  event: T,
  target?: LightningElement | null,
): NativeSyntheticEvent<T> {
  return {
    bubbles: true,
    cancelable: false,
    // @ts-expect-error TODO: Override typings to use LightningElement
    currentTarget: target,
    defaultPrevented: false,
    eventPhase: 0,
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    isTrusted: false,
    nativeEvent: event,
    persist: () => {},
    preventDefault: () => {},
    stopPropagation: () => {},
    // @ts-expect-error TODO: Override typings to use LightningElement
    target,
    timeStamp: Date.now(),
    type: 'layout',
  };
}
