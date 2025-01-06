import type { LightningElement } from './Element';

export interface Focusable {
  get focused(): boolean;
  focusable: boolean;
  focus: () => void;
  blur: () => void;
}

export interface FocusableProps {
  onFocus?: (element: LightningElement) => void;
  onBlur?: (element: LightningElement) => void;
}
