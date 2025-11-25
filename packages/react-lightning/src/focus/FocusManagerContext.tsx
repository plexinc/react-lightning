import { type Context, createContext } from 'react';
import type { LightningElement } from '../types';
import type { FocusKeyManager } from './FocusKeyManager';
import type { FocusManager } from './FocusManager';

type ContextType = {
  focusManager: FocusManager<LightningElement>;
  focusKeyManager: FocusKeyManager<LightningElement>;
} | null;

export const FocusManagerContext: Context<ContextType> =
  createContext<ContextType>(null);
