import { useContext } from 'react';
import { FocusManagerContext } from './FocusManagerContext';

export const useFocusManager = () => {
  const focusContext = useContext(FocusManagerContext);

  if (!focusContext) {
    throw new Error(
      'useFocusManager must be used within a FocusManagerProvider',
    );
  }

  return focusContext.focusManager;
};
