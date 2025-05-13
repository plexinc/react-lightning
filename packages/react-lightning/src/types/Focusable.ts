import type { EventEmitter } from '../utils/EventEmitter';
import type { LightningElement } from './Element';

export interface Focusable extends EventEmitter<FocusEvents<Focusable>> {
  get focused(): boolean;
  focusable: boolean;
  focus: () => void;
  blur: () => void;
}

export interface FocusEvents<T> {
  childFocused: (child: T) => void;
  focusChanged: (element: T, isFocused: boolean) => void;
  focusableChanged: (element: T, isFocusable: boolean) => void;
}

export interface FocusableProps {
  onFocusCapture?: (element: LightningElement) => void;
  onFocus?: (element: LightningElement) => void;
  onBlur?: (element: LightningElement) => void;
}
