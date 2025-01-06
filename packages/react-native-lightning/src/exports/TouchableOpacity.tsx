import type { LightningElement } from '@plex/react-lightning';
import { useCombinedRef, useFocus } from '@plex/react-lightning';
import React, { forwardRef } from 'react';
import type { TouchableOpacityProps } from 'react-native';
import { Pressable } from './Pressable';

export const TouchableOpacity = forwardRef<
  LightningElement,
  TouchableOpacityProps
>(({ onLayout, activeOpacity, style, ...props }, ref) => {
  const { ref: focusRef, focused } = useFocus();
  const combinedRef = useCombinedRef(ref, focusRef);

  const baseOpacity = focused ? 1 : 0.8;

  return (
    <Pressable
      ref={combinedRef}
      style={({ pressed }) => [
        style,
        { opacity: pressed ? (activeOpacity ?? 0.2) : baseOpacity },
      ]}
      {...props}
      onLayout={onLayout}
    />
  );
});
TouchableOpacity.displayName = 'TouchableOpacity';

export type { TouchableOpacityProps };
