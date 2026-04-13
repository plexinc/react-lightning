import type { GestureResponderEvent } from 'react-native';

export function createGestureResponderEvent(
  // oxlint-disable-next-line typescript/no-explicit-any -- TODO
  originalEvent?: any,
  // oxlint-disable-next-line typescript/no-explicit-any -- TODO
  currentTarget?: any,
  // oxlint-disable-next-line typescript/no-explicit-any -- TODO
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
