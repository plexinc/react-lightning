import type { LightningElement } from './Element';
import type { EventNotifier } from './EventNotifier';

export interface Focusable extends EventNotifier<FocusEvents<Focusable>> {
  get focused(): boolean;
  focusable: boolean;
  focus: () => void;
  blur: () => void;
}

export interface FocusEvents<T> {
  childFocused: (child: T) => void;
  focusChanged: (element: T, isFocused: boolean) => void;
  focusableChanged: (element: T, isFocusable: boolean) => void;

  // biome-ignore lint/suspicious/noExplicitAny: TODO
  [x: string | symbol]: (...args: any[]) => void;
}

export interface FocusableProps {
  onFocusCapture?: (element: LightningElement) => void;
  onFocus?: (element: LightningElement) => void;
  onBlur?: (element: LightningElement) => void;
}
