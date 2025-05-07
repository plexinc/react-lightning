import { createContext } from 'react';
import type { LightningElement } from '../types';

export const FocusGroupContext = createContext<LightningElement | null>(null);

FocusGroupContext.displayName = 'FocusGroupContext';
