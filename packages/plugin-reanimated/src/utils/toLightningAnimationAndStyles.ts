import type {
  Animatable,
  LightningElementStyle,
} from '@plextv/react-lightning';
import { convertCSSTransformToLightning } from '@plextv/react-lightning-plugin-css-transform';
import type { Transform } from '@plextv/react-lightning-plugin-flexbox';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';
import { AnimatedValue } from '../animation/AnimatedValue';
import type { AnimatedObject } from '../types/AnimatedObject';
import { getTransitionProperty } from '../utils/getTransitionProperty';

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
          ...(style.transform ?? {}),
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
      case 'scaleX':
      case 'scaleY':
        if (key === 'scale' || key === 'scaleX') {
          applyStyle(style, transition, 'scaleX', value as AnimatedValue);
        }

        if (key === 'scale' || key === 'scaleY') {
          applyStyle(style, transition, 'scaleY', value as AnimatedValue);
        }
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
    (style as any)[transitionProp] = value.value as T[K];
    transition[transitionProp] = value.lngAnimation;
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: Just passing through
    (style as any)[prop] = value;
  }
}

export function toLightningAnimationAndStyles(
  computedStyle: AnimatedObject<DefaultStyle>,
): {
  transition: LightningTransition;
  style: DefaultStyleWithLightningTransform;
} {
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

  return { transition, style };
}
