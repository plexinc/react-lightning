import {
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  FadeIn as ReanimatedFadeIn,
  FadeInDown as ReanimatedFadeInDown,
  FadeInLeft as ReanimatedFadeInLeft,
  FadeInRight as ReanimatedFadeInRight,
  FadeInUp as ReanimatedFadeInUp,
  FadeOut as ReanimatedFadeOut,
  FadeOutDown as ReanimatedFadeOutDown,
  FadeOutLeft as ReanimatedFadeOutLeft,
  FadeOutRight as ReanimatedFadeOutRight,
  FadeOutUp as ReanimatedFadeOutUp,
} from 'react-native-reanimated-original';
import { withTiming } from '../exports/withTiming';
import { createBuilderWrapper } from './createBuilderWrapper';

export const FadeIn = createBuilderWrapper(
  ReanimatedFadeIn,
  function (this: ReanimatedFadeIn) {
    return () => ({
      animations: {
        alpha: withTiming(1, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 0.00001,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeInRight = createBuilderWrapper(
  ReanimatedFadeInRight,
  function (this: ReanimatedFadeInRight) {
    return (values: EntryAnimationsValues) => ({
      animations: {
        alpha: withTiming(1, {
          duration: this.durationV,
          easing: this.easingV,
        }),
        x: withTiming(values.targetOriginX, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 0.00001,
        x: values.targetOriginX + 25,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeInLeft = createBuilderWrapper(
  ReanimatedFadeInLeft,
  function (this: ReanimatedFadeInLeft) {
    return (values: EntryAnimationsValues) => ({
      animations: {
        alpha: withTiming(1, {
          duration: this.durationV,
          easing: this.easingV,
        }),
        x: withTiming(values.targetOriginX, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 0.00001,
        x: values.targetOriginX - 25,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeInUp = createBuilderWrapper(
  ReanimatedFadeInUp,
  function (this: ReanimatedFadeInUp) {
    return (values: EntryAnimationsValues) => ({
      animations: {
        alpha: withTiming(1, {
          duration: this.durationV,
          easing: this.easingV,
        }),
        y: withTiming(values.targetOriginY, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 0.00001,
        y: values.targetOriginY - 25,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeInDown = createBuilderWrapper(
  ReanimatedFadeInDown,
  function (this: ReanimatedFadeInDown) {
    return (values: EntryAnimationsValues) => ({
      animations: {
        alpha: withTiming(1, {
          duration: this.durationV,
          easing: this.easingV,
        }),
        y: withTiming(values.targetOriginY, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 0.00001,
        y: values.targetOriginY + 25,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeOut = createBuilderWrapper(
  ReanimatedFadeOut,
  function (this: ReanimatedFadeOut) {
    return () => ({
      animations: {
        alpha: withTiming(0, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 1,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeOutRight = createBuilderWrapper(
  ReanimatedFadeOutRight,
  function (this: ReanimatedFadeOutRight) {
    return (values: ExitAnimationsValues) => ({
      animations: {
        alpha: withTiming(0, {
          duration: this.durationV,
          easing: this.easingV,
        }),
        x: withTiming(values.currentOriginX + 25, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 1,
        x: values.currentOriginX,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeOutLeft = createBuilderWrapper(
  ReanimatedFadeOutLeft,
  function (this: ReanimatedFadeOutLeft) {
    return (values: ExitAnimationsValues) => ({
      animations: {
        alpha: withTiming(0, {
          duration: this.durationV,
          easing: this.easingV,
        }),
        x: withTiming(values.currentOriginX - 25, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 1,
        x: values.currentOriginX,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeOutUp = createBuilderWrapper(
  ReanimatedFadeOutUp,
  function (this: ReanimatedFadeOutUp) {
    return (values: ExitAnimationsValues) => ({
      animations: {
        alpha: withTiming(0, {
          duration: this.durationV,
          easing: this.easingV,
        }),
        y: withTiming(values.currentOriginY - 25, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 1,
        y: values.currentOriginY,
      },
      callback: this.callbackV,
    });
  },
);

export const FadeOutDown = createBuilderWrapper(
  ReanimatedFadeOutDown,
  function (this: ReanimatedFadeOutDown) {
    return (values: ExitAnimationsValues) => ({
      animations: {
        alpha: withTiming(0, {
          duration: this.durationV,
          easing: this.easingV,
        }),
        y: withTiming(values.currentOriginY + 25, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        alpha: 1,
        y: values.currentOriginY,
      },
      callback: this.callbackV,
    });
  },
);
