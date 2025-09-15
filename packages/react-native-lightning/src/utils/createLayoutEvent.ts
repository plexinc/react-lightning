import type { Rect } from '@plextv/react-lightning';
import type { LayoutChangeEvent } from 'react-native';

export function createLayoutEvent({ x, y, w, h }: Rect): LayoutChangeEvent {
  return {
    // $FlowFixMe
    nativeEvent: {
      layout: {
        width: w,
        height: h,
        x,
        y,
      },
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
