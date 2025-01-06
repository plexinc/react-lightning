import type { GestureResponderEvent } from 'react-native';

export function createGestureResponderEvent(
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  originalEvent?: any,
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  currentTarget?: any,
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  originalTarget?: any,
): GestureResponderEvent {
  return {
    nativeEvent: originalEvent,
    bubbles: false,
    cancelable: false,
    timeStamp: Date.now(),
    target: originalTarget ?? currentTarget,
    currentTarget: currentTarget,
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
