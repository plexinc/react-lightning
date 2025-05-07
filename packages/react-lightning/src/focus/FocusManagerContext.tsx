import { createContext } from 'react';
import type { LightningElement } from '../types';
import type { FocusKeyManager } from './FocusKeyManager';
import type { FocusManager } from './FocusManager';

export const FocusManagerContext = createContext<{
  focusManager: FocusManager<LightningElement>;
  focusKeyManager: FocusKeyManager<LightningElement>;
} | null>(null);
