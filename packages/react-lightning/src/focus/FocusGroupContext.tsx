import { createContext } from 'react';
import type { FocusContextType } from './FocusContextType';

export const FocusGroupContext = createContext<FocusContextType>({
  focused: true,
  focusedChild: null,
  updateTraps: () => {},
  addChild: () => {},
  removeChild: () => {},
  focusChild: () => {},
});

FocusGroupContext.displayName = 'FocusGroupContext';
