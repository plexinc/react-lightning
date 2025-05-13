import { useContext } from 'react';
import { FocusManagerContext } from './FocusManagerContext';

export const useFocusKeyManager = () => {
  const focusContext = useContext(FocusManagerContext);

  if (!focusContext) {
    throw new Error(
      'useFocusKeyManager must be used within a FocusManagerProvider',
    );
  }

  return focusContext.focusKeyManager;
};
