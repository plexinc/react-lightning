import type {
  BlurEvent,
  FocusEvent,
  NativeSyntheticEvent,
  TargetedEvent,
  ViewProps,
} from 'react-native';

import { type LightningElement, LightningViewElement } from '@plextv/react-lightning';

import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';

export type FocusHandler<T extends 'focus' | 'blur', TEvent> = (
  target:
    | (T extends 'focus' ? FocusEvent : BlurEvent)
    | NativeSyntheticEvent<TEvent>
    | LightningElement,
) => void | Promise<void>;

function handleEvent<T extends 'focus' | 'blur'>(
  element: Parameters<FocusHandler<T, TargetedEvent>>[0],
  onEvent: ViewProps[`on${Capitalize<T>}`] | undefined,
): void {
  if (element instanceof LightningViewElement) {
    onEvent?.(createNativeSyntheticEvent<TargetedEvent>({ target: element.id }, element));
  }
}

function useHandler<T extends 'focus' | 'blur'>(
  onEvent?: ViewProps[`on${Capitalize<T>}`],
): FocusHandler<T, TargetedEvent> | undefined {
  const handler: FocusHandler<T, TargetedEvent> = (element) => handleEvent(element, onEvent);

  return onEvent ? handler : undefined;
}

export function createHandler<T extends 'focus' | 'blur'>(
  onEvent?: ViewProps[`on${Capitalize<T>}`],
): FocusHandler<T, TargetedEvent> | undefined {
  return (element) => handleEvent(element, onEvent);
}

export function useFocusHandler(
  onFocus?: ViewProps['onFocus'],
): FocusHandler<'focus', TargetedEvent> | undefined {
  return useHandler(onFocus);
}

export function useBlurHandler(
  onBlur?: ViewProps['onBlur'],
): FocusHandler<'blur', TargetedEvent> | undefined {
  return useHandler(onBlur);
}
