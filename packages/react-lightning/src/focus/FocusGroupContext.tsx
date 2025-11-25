import { type Context, createContext } from 'react';
import type { LightningElement } from '../types';

export const FocusGroupContext: Context<LightningElement | null> =
  createContext<LightningElement | null>(null);

FocusGroupContext.displayName = 'FocusGroupContext';
