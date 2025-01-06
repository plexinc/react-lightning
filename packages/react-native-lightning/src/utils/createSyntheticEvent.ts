import type { LightningViewElement } from '@plex/react-lightning';
import type { BaseSyntheticEvent } from 'react';

const defaultEventProps = {
  bubbles: true,
  cancelable: false,
  defaultPrevented: false,
  eventPhase: 0,
  isDefaultPrevented: () => false,
  isPropagationStopped: () => false,
  isTrusted: false,
  persist: () => {},
  preventDefault: () => {},
  stopPropagation: () => {},
  timeStamp: Date.now(),
} satisfies Partial<
  BaseSyntheticEvent<unknown, LightningViewElement, LightningViewElement>
>;

type DefaultEventProps = typeof defaultEventProps;

export function createSyntheticEvent<
  E extends BaseSyntheticEvent<
    unknown,
    LightningViewElement,
    LightningViewElement
  >,
>(
  target: LightningViewElement,
  props: Omit<E, keyof DefaultEventProps | 'currentTarget' | 'target'> &
    Partial<DefaultEventProps>,
): E {
  return {
    currentTarget: target,
    target,
    ...defaultEventProps,
    ...props,
  } as E;
}
