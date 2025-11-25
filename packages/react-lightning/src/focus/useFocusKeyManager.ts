import { useContext } from 'react';
import type { LightningElement } from '../types';
import type { FocusKeyManager } from './FocusKeyManager';
import { FocusManagerContext } from './FocusManagerContext';

export const useFocusKeyManager = (): FocusKeyManager<LightningElement> => {
  const focusContext = useContext(FocusManagerContext);

  if (!focusContext) {
    throw new Error(
      'useFocusKeyManager must be used within a FocusManagerProvider',
    );
  }

  return focusContext.focusKeyManager;
};
