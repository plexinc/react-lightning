import type { LightningElement } from './Element';
import type { EventNotifier } from './EventNotifier';

export interface Focusable extends EventNotifier<FocusEvents<Focusable>> {
  get focused(): boolean;
  focusable: boolean;
  focus: () => void;
  blur: () => void;
  /**
   * Invoked for focus/blur bubbling up from a focused descendant (tvOS/web parity; the focus
   * path alone doesn't reach plain wrapper views). `target` is the originating element.
   */
  bubbleFocusEvent?(type: 'focus' | 'blur', target: Focusable): void;
}

export interface FocusEvents<T> {
  childFocused: (child: T) => void;
  focusChanged: (element: T, isFocused: boolean) => void;
  focusableChanged: (element: T, isFocusable: boolean) => void;

  // oxlint-disable-next-line typescript/no-explicit-any -- TODO
  [x: string | symbol]: (...args: any[]) => void;
}

export interface FocusableProps {
  onFocusCapture?: (element: LightningElement) => void;
  onFocus?: null | ((element: LightningElement) => void);
  onBlur?: null | ((element: LightningElement) => void);
}
