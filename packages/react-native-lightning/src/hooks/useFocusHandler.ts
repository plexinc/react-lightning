import {
  type LightningElement,
  LightningViewElement,
} from '@plextv/react-lightning';
import { useCallback } from 'react';
import type {
  BlurEvent,
  FocusEvent,
  TargetedEvent,
  ViewProps,
} from 'react-native';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';

type Handler<T extends 'focus' | 'blur'> = (
  target: (T extends 'focus' ? FocusEvent : BlurEvent) | LightningElement,
) => void;

function useHandler<T extends 'focus' | 'blur'>(
  _eventType: T,
  onEvent?: ViewProps[`on${Capitalize<T>}`],
): Handler<T> | undefined {
  const handler = useCallback<Handler<T>>(
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
): Handler<'focus'> | undefined {
  return useHandler('focus', onFocus);
}

export function useBlurHandler(
  onBlur?: ViewProps['onBlur'],
): Handler<'blur'> | undefined {
  return useHandler('blur', onBlur);
}
