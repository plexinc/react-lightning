import type { LightningElement } from '../types';
import type { Traps } from './Traps';

export type FocusContextType = {
  focused: boolean;
  focusedChild: LightningElement | null;
  updateTraps: (element: LightningElement, traps: Traps) => void;
  addChild: (element: LightningElement, autoFocus?: boolean) => void;
  removeChild: (element: LightningElement) => void;
  focusChild: (element: LightningElement) => void;
};
