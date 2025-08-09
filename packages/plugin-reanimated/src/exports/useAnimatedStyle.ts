import type {
  LightningElement,
  LightningElementStyle,
} from '@plextv/react-lightning';
import type { DependencyList } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { Mutable } from 'react-native-reanimated/lib/typescript/commonTypes';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';
import type { useAnimatedStyle as useAnimatedStyleRN } from 'react-native-reanimated-original';
import type { AnimatedObject } from '../types/AnimatedObject';
import type { AnimatedStyle } from '../types/AnimatedStyle';
import { toLightningAnimationAndStyles } from '../utils/toLightningAnimationAndStyles';

type UseAnimatedStyleFn = (
  ...args: Parameters<typeof useAnimatedStyleRN>
) => AnimatedStyle;

function computeAndSetStyles(
  updater: () => AnimatedObject<DefaultStyle>,
  views: Set<LightningElement>,
): void {
  const computedStyle = updater();
  const { transition, style } = toLightningAnimationAndStyles(computedStyle);

  for (const view of views) {
    view.setProps({
      transition,
      // setProps expects lightning props, but we will just pass through the raw
      // styles from the useAnimatedStyle and let the transforms take care of
      // converting the CSS styles to lightning
      style: style as LightningElementStyle,
    });
  }
}

let idCount = 0;

export const useAnimatedStyle: UseAnimatedStyleFn = (updater, dependencies) => {
  const viewsRef = useRef(new Set<LightningElement>());
  const inputs: DependencyList = dependencies ?? [];
  const timerRef = useRef(0);

  // Debounce this call so we don't end up calculating the styles multiple times
  // when updating multiple properties in the same hook
  const applyStyles = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      computeAndSetStyles(updater, viewsRef.current);
      timerRef.current = 0;
    }, 2);
  }, [updater]);

  useEffect(() => {
    const id = idCount++;

    for (const dep of inputs) {
      if (dep && typeof dep === 'object' && 'addListener' in dep) {
        (dep as Mutable).addListener(id, applyStyles);
      }
    }

    applyStyles();

    return () => {
      for (const dep of inputs) {
        if (dep && typeof dep === 'object' && 'removeListener' in dep) {
          (dep as Mutable).removeListener(id);
        }
      }
      applyStyles();
    };
  }, [inputs, applyStyles]);

  return {
    viewsRef: viewsRef.current,
  };
};
