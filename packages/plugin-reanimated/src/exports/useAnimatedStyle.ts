import type { DependencyList } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { useAnimatedStyle as useAnimatedStyleRN } from 'react-native-reanimated-original';
import type { Mutable } from 'react-native-reanimated/lib/typescript/commonTypes';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import type { LightningElement, LightningElementStyle } from '@plextv/react-lightning';

import type { AnimatedObject } from '../types/AnimatedObject';
import type { AnimatedStyle } from '../types/AnimatedStyle';
import { toLightningAnimationAndStyles } from '../utils/toLightningAnimationAndStyles';

type UseAnimatedStyleFn = (...args: Parameters<typeof useAnimatedStyleRN>) => AnimatedStyle;

function setStyles(
  view: LightningElement,
  transition: ReturnType<typeof toLightningAnimationAndStyles>['transition'],
  style: ReturnType<typeof toLightningAnimationAndStyles>['style'],
): void {
  view.setProps({
    transition,
    // setProps expects lightning props, but we will just pass through the raw
    // styles from the useAnimatedStyle and let the transforms take care of
    // converting the CSS styles to lightning
    style: style as LightningElementStyle,
  });
}

type AppliedStyles = {
  transition: ReturnType<typeof toLightningAnimationAndStyles>['transition'];
  style: ReturnType<typeof toLightningAnimationAndStyles>['style'];
} | null;

function computeAndSetStyles(
  updater: () => AnimatedObject<DefaultStyle>,
  views: Set<LightningElement>,
  lastApplied: { current: AppliedStyles },
): void {
  const computedStyle = updater();
  const { transition, style } = toLightningAnimationAndStyles(computedStyle);

  lastApplied.current = { transition, style };

  for (const view of views) {
    setStyles(view, transition, style);
  }
}

let idCount = 0;

export const useAnimatedStyle: UseAnimatedStyleFn = (updater, dependencies) => {
  const [views] = useState(() => new Set<LightningElement>());
  const inputs: DependencyList = dependencies ?? [];
  const timerRef = useRef(0);
  const lastApplied = useRef<AppliedStyles>(null);

  // Debounce this call so we don't end up calculating the styles multiple times
  // when updating multiple properties in the same hook
  const applyStyles = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      computeAndSetStyles(updater, views, lastApplied);
      timerRef.current = 0;
    }, 2);
  };

  useEffect(() => {
    const id = idCount;
    idCount += 1;

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
    viewsRef: views,
    // A view registering after styles were already pushed (recycled cells,
    // re-created nodes) missed that push and a resting shared value may never
    // change again. Replay only what was already applied — never compute a
    // fresh value here, that would push states the normal flow never emitted.
    applyToView: (view: LightningElement) => {
      if (lastApplied.current) {
        setStyles(view, lastApplied.current.transition, lastApplied.current.style);
      }
    },
  };
};
