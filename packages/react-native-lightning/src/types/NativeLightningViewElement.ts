import type { LightningViewElement } from '@plextv/react-lightning';

export type NativeLightningViewElement = LightningViewElement & {
  __domPolyfillsAdded?: boolean;
  __scrollLeft?: number;
  __scrollTop?: number;

  get scrollTop(): number;
  set scrollTop(value: number);

  get scrollLeft(): number;
  set scrollLeft(value: number);
};
