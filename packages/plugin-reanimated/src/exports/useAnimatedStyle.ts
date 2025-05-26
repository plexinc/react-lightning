import type {
  Animatable,
  LightningElement,
  LightningElementStyle,
} from '@plextv/react-lightning';
import { convertCSSTransformToLightning } from '@plextv/react-lightning-plugin-css-transform';
import type { Transform } from '@plextv/react-lightning-plugin-flexbox';
import type { DependencyList } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { useAnimatedStyle as useAnimatedStyleRN } from 'react-native-reanimated-original';
import type { Mutable } from 'react-native-reanimated/lib/typescript/commonTypes';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';
import { AnimatedValue } from '../animation/AnimatedValue';
import type { AnimatedStyle } from '../types/AnimatedStyle';
import { getTransitionProperty } from '../utils/getTransitionProperty';

type UseAnimatedStyleFn = (
  ...args: Parameters<typeof useAnimatedStyleRN>
) => AnimatedStyle;

type AnimatedObject<T> = {
  [K in keyof T]: T[K] | AnimatedValue;
};

type AnimatableTransform = Record<
  keyof Transform,
  number | string | AnimatedValue
>;

type LightningTransition = NonNullable<
  Animatable<LightningElementStyle>['transition']
>;

type DefaultStyleWithLightningTransform = Omit<DefaultStyle, 'transform'> & {
  transform?: Transform;
};

function computeAndSetStyles(
  updater: () => AnimatedObject<DefaultStyle>,
  views: Set<LightningElement>,
): void {
  const computedStyle = updater();
  const style: DefaultStyleWithLightningTransform = {};
  const transition: LightningTransition = {};

  for (const key in computedStyle) {
    const prop = key as keyof AnimatedObject<DefaultStyle>;
    const value = computedStyle[prop];

    // If the transform is a string, just pass thru for the css plugin to
    // handle, though this should not happen since you normally wouldn't set a
    // transform to a string from react-reanimated
    if (prop === 'transform' && value && typeof value !== 'string') {
      applyTransforms(
        style,
        transition,
        value as unknown as AnimatableTransform | AnimatableTransform[],
      );
    } else {
      applyStyle(style, transition, prop, value);
    }
  }

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

function applyTransforms(
  style: DefaultStyleWithLightningTransform,
  transition: LightningTransition,
  animatableTransforms: AnimatableTransform | AnimatableTransform[],
) {
  if (Array.isArray(animatableTransforms)) {
    for (const animatableTransform of animatableTransforms) {
      applyTransform(style, transition, animatableTransform);
    }
  } else {
    applyTransform(style, transition, animatableTransforms);
  }
}

function applyTransform(
  style: DefaultStyleWithLightningTransform,
  transition: LightningTransition,
  animatableTransform: AnimatableTransform,
) {
  for (const [key, value] of Object.entries(animatableTransform)) {
    const actualValue = value instanceof AnimatedValue ? value.value : value;

    switch (key) {
      case 'translate':
      case 'translateX':
      case 'translateY':
        // Using our lightning style transform instead of RN
        style.transform = {
          ...style.transform,
          ...convertCSSTransformToLightning(key, actualValue),
        };

        if (value instanceof AnimatedValue) {
          if (key === 'translate' || key === 'translateX') {
            transition.x = value.lngAnimation;
          }

          if (key === 'translate' || key === 'translateY') {
            transition.y = value.lngAnimation;
          }
        }

        break;
      case 'scale':
        applyStyle(style, transition, 'scaleX', value as AnimatedValue);
        applyStyle(style, transition, 'scaleY', value as AnimatedValue);
        break;
      case 'rotate':
        applyStyle(style, transition, 'rotation', value as AnimatedValue);
        break;
      default:
        applyStyle(style, transition, key as keyof DefaultStyle, value);
        break;
    }
  }
}

function applyStyle<T extends DefaultStyle, K extends keyof T>(
  style: DefaultStyleWithLightningTransform,
  transition: LightningTransition,
  prop: K,
  value: AnimatedObject<T>[K] | (AnimatedObject<T>[K] & string),
) {
  if (value instanceof AnimatedValue) {
    const transitionProp = getTransitionProperty(prop as keyof DefaultStyle);

    // biome-ignore lint/suspicious/noExplicitAny: Just passing through
    (style as any)[prop] = value.value as T[K];
    transition[transitionProp] = value.lngAnimation;
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: Just passing through
    (style as any)[prop] = value;
  }
}

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
    // Generate a random id
    const id = Math.floor(Math.random() * 1000000);

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
