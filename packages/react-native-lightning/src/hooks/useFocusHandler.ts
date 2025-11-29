import {
  type LightningElement,
  LightningViewElement,
} from '@plextv/react-lightning';
import { useCallback } from 'react';
import type {
  BlurEvent,
  FocusEvent,
  NativeSyntheticEvent,
  TargetedEvent,
  ViewProps,
} from 'react-native';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';

export type FocusHandler<T extends 'focus' | 'blur', TEvent> = (
  target:
    | (T extends 'focus' ? FocusEvent : BlurEvent)
    | NativeSyntheticEvent<TEvent>
    | LightningElement,
) => void | Promise<void>;

function useHandler<T extends 'focus' | 'blur'>(
  _eventType: T,
  onEvent?: ViewProps[`on${Capitalize<T>}`],
): FocusHandler<T, TargetedEvent> | undefined {
  const handler = useCallback<FocusHandler<T, TargetedEvent>>(
    (element) => {
      if (element instanceof LightningViewElement) {
        onEvent?.(
          createNativeSyntheticEvent<TargetedEvent>(
            { target: element.id },
            element,
          ),
        );
      }
    },
    [onEvent],
  );

  return onEvent ? handler : undefined;
}

export function useFocusHandler(
  onFocus?: ViewProps['onFocus'],
): FocusHandler<'focus', TargetedEvent> | undefined {
  return useHandler('focus', onFocus);
}

export function useBlurHandler(
  onBlur?: ViewProps['onBlur'],
): FocusHandler<'blur', TargetedEvent> | undefined {
  return useHandler('blur', onBlur);
}
