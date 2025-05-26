import {
  type LightningViewElement,
  useCombinedRef,
  useFocus,
} from '@plextv/react-lightning';
import { forwardRef } from 'react';
import type { TouchableWithoutFeedbackProps } from 'react-native';
import { Pressable } from './Pressable';

export const TouchableWithoutFeedback = forwardRef<
  LightningViewElement,
  TouchableWithoutFeedbackProps
>(({ onLayout, ...props }, ref) => {
  const { ref: focusRef } = useFocus();
  const combinedRef = useCombinedRef(ref, focusRef);

  return <Pressable ref={combinedRef} {...props} onLayout={onLayout} />;
});
TouchableWithoutFeedback.displayName = 'TouchableWithoutFeedback';

export type { TouchableWithoutFeedbackProps };
