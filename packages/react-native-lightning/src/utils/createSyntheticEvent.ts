import type { LightningViewElement } from '@plextv/react-lightning';
import type { BaseSyntheticEvent } from 'react';

const defaultEventProps = {
  bubbles: true,
  cancelable: false,
  defaultPrevented: false,
  eventPhase: 0,
  isDefaultPrevented: (): false => false,
  isPropagationStopped: (): false => false,
  isTrusted: false,
  persist: (): void => {},
  preventDefault: (): void => {},
  stopPropagation: (): void => {},
  timeStamp: Date.now() as number,
} as const;

defaultEventProps satisfies Partial<
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
