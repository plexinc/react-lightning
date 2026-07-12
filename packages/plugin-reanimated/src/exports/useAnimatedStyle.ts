import type { DependencyList } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { useAnimatedStyle as useAnimatedStyleRN } from 'react-native-reanimated-original';
import type { Mutable } from 'react-native-reanimated/lib/typescript/commonTypes';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import type { LightningElement, LightningElementStyle } from '@plextv/react-lightning';

import {
  type CancelAnimation,
  runAnimationProgram,
} from '../animation/runAnimationProgram';
import type { AnimatedObject } from '../types/AnimatedObject';
import type { AnimatedStyle } from '../types/AnimatedStyle';
import {
  type ScheduledAnimation,
  toLightningAnimationAndStyles,
} from '../utils/toLightningAnimationAndStyles';
import { useTrackedReaction } from './useTrackedReaction';

type UseAnimatedStyleFn = (...args: Parameters<typeof useAnimatedStyleRN>) => AnimatedStyle;

type Runners = WeakMap<LightningElement, CancelAnimation[]>;

function setStyles(
  view: LightningElement,
  transition: ReturnType<typeof toLightningAnimationAndStyles>['transition'],
  style: ReturnType<typeof toLightningAnimationAndStyles>['style'],
  schedules: ScheduledAnimation[],
  runners: Runners,
): void {
  // Cancel any program still playing on this view before re-applying, so a
  // reset (e.g. a shared value set back to a static value) stops the old one.
  runners.get(view)?.forEach((cancel) => cancel());
  runners.delete(view);

  view.setProps({
    transition,
    // setProps expects lightning props, but we will just pass through the raw
    // styles from the useAnimatedStyle and let the transforms take care of
    // converting the CSS styles to lightning
    style: style as LightningElementStyle,
  });

  if (schedules.length) {
    runners.set(
      view,
      schedules.map((schedule) =>
        runAnimationProgram(view, schedule.prop, schedule.program),
      ),
    );
  }
}

type AppliedStyles = {
  transition: ReturnType<typeof toLightningAnimationAndStyles>['transition'];
  style: ReturnType<typeof toLightningAnimationAndStyles>['style'];
  schedules: ScheduledAnimation[];
} | null;

function applyComputedStyle(
  computedStyle: AnimatedObject<DefaultStyle>,
  views: Set<LightningElement>,
  lastApplied: { current: AppliedStyles },
  runners: Runners,
): void {
  const { transition, style, schedules } = toLightningAnimationAndStyles(computedStyle);

  lastApplied.current = { transition, style, schedules };

  for (const view of views) {
    setStyles(view, transition, style, schedules, runners);
  }
}

let idCount = 0;

export const useAnimatedStyle: UseAnimatedStyleFn = (updater, dependencies) => {
  const [views] = useState(() => new Set<LightningElement>());
  const [runners] = useState<Runners>(() => new WeakMap());
  // Without explicit deps we infer them by tracking which shared values the
  // updater reads (no babel plugin runs on Lightning to infer from closure).
  const autoTrack = dependencies === undefined;
  const inputs: DependencyList = dependencies ?? [];
  const pendingRef = useRef(false);
  const lastApplied = useRef<AppliedStyles>(null);

  // Coalesce shared-value updates from the same JS turn into one style
  // computation. Must be a microtask, not a timer: timers fire after the
  // frame paints, so scroll-linked styles would trail the scroll by a frame.
  const applyStyles = () => {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;

    queueMicrotask(() => {
      pendingRef.current = false;
      applyComputedStyle(updater(), views, lastApplied, runners);
    });
  };

  useTrackedReaction(autoTrack ? updater : null, (computedStyle) => {
    applyComputedStyle(computedStyle, views, lastApplied, runners);
  });

  useEffect(() => {
    if (autoTrack) {
      return;
    }

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
  }, [autoTrack, inputs, applyStyles]);

  return {
    viewsRef: views,
    // A view registering after styles were already pushed (recycled cells,
    // re-created nodes) missed that push and a resting shared value may never
    // change again. Replay only what was already applied — never compute a
    // fresh value here, that would push states the normal flow never emitted.
    applyToView: (view: LightningElement) => {
      if (lastApplied.current) {
        setStyles(
          view,
          lastApplied.current.transition,
          lastApplied.current.style,
          lastApplied.current.schedules,
          runners,
        );
      }
    },
  };
};
