import { useContext } from 'react';
import type { LightningElement } from '../types';
import type { FocusManager } from './FocusManager';
import { FocusManagerContext } from './FocusManagerContext';

export const useFocusManager = (): FocusManager<LightningElement> => {
  const focusContext = useContext(FocusManagerContext);

  if (!focusContext) {
    throw new Error(
      'useFocusManager must be used within a FocusManagerProvider',
    );
  }

  return focusContext.focusManager;
};
