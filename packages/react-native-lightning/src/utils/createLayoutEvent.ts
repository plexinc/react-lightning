import type { Rect } from '@plex/react-lightning';
import type { LayoutChangeEvent } from 'react-native';

export function createLayoutEvent(dimensions: Rect): LayoutChangeEvent {
  return {
    // $FlowFixMe
    nativeEvent: {
      layout: dimensions,
    },
    bubbles: false,
    cancelable: false,
    timeStamp: Date.now(),
    // @ts-expect-error TODO: Override typings to use LightningElement
    target: 0,
    // @ts-expect-error TODO: Override typings to use LightningElement
    currentTarget: 0,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: false,
    preventDefault: () => {},
    stopPropagation: () => {},
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    persist: () => {},
    type: 'layout',
  };
}
