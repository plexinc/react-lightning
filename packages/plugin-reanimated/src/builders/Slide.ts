import {
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  SlideInDown as ReanimatedSlideInDown,
  SlideInLeft as ReanimatedSlideInLeft,
  SlideInRight as ReanimatedSlideInRight,
  SlideInUp as ReanimatedSlideInUp,
  SlideOutDown as ReanimatedSlideOutDown,
  SlideOutLeft as ReanimatedSlideOutLeft,
  SlideOutRight as ReanimatedSlideOutRight,
  SlideOutUp as ReanimatedSlideOutUp,
} from 'react-native-reanimated-original';
import { withTiming } from '../exports/withTiming';
import { createBuilderWrapper } from './createBuilderWrapper';

export const SlideInRight = createBuilderWrapper(
  ReanimatedSlideInRight,
  function (this: ReanimatedSlideInRight) {
    return (values: EntryAnimationsValues) => ({
      animations: {
        x: withTiming(values.targetOriginX, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        x: values.targetOriginX + values.windowWidth,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideInLeft = createBuilderWrapper(
  ReanimatedSlideInLeft,
  function (this: ReanimatedSlideInLeft) {
    return (values: EntryAnimationsValues) => ({
      animations: {
        x: withTiming(values.targetOriginX, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        x: values.targetOriginX - values.windowWidth,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideInUp = createBuilderWrapper(
  ReanimatedSlideInUp,
  function (this: ReanimatedSlideInUp) {
    return (values: EntryAnimationsValues) => ({
      animations: {
        y: withTiming(values.targetOriginY, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        y: -values.windowHeight,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideInDown = createBuilderWrapper(
  ReanimatedSlideInDown,
  function (this: ReanimatedSlideInDown) {
    return (values: EntryAnimationsValues) => ({
      animations: {
        y: withTiming(values.targetOriginY, {
          duration: this.durationV,
          easing: this.easingV,
        }),
      },
      initialValues: {
        y: values.targetOriginY + values.windowHeight,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideOutRight = createBuilderWrapper(
  ReanimatedSlideOutRight,
  function (this: ReanimatedSlideOutRight) {
    return (values: ExitAnimationsValues) => ({
      animations: {
        x: withTiming(
          Math.max(
            values.currentOriginX + values.windowWidth,
            values.windowWidth,
          ),
          {
            duration: this.durationV,
            easing: this.easingV,
          },
        ),
      },
      initialValues: {
        x: values.currentOriginX,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideOutLeft = createBuilderWrapper(
  ReanimatedSlideOutLeft,
  function (this: ReanimatedSlideOutLeft) {
    return (values: ExitAnimationsValues) => ({
      animations: {
        x: withTiming(
          Math.min(
            values.currentOriginX - values.windowWidth,
            -values.windowWidth,
          ),
          {
            duration: this.durationV,
            easing: this.easingV,
          },
        ),
      },
      initialValues: {
        x: values.currentOriginX,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideOutUp = createBuilderWrapper(
  ReanimatedSlideOutUp,
  function (this: ReanimatedSlideOutUp) {
    return (values: ExitAnimationsValues) => ({
      animations: {
        y: withTiming(
          Math.min(
            values.currentOriginY - values.windowHeight,
            -values.windowHeight,
          ),
          {
            duration: this.durationV,
            easing: this.easingV,
          },
        ),
      },
      initialValues: {
        y: values.currentOriginY,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideOutDown = createBuilderWrapper(
  ReanimatedSlideOutDown,
  function (this: ReanimatedSlideOutDown) {
    return (values: ExitAnimationsValues) => ({
      animations: {
        y: withTiming(
          Math.max(
            values.currentOriginY + values.windowHeight,
            values.windowHeight,
          ),
          {
            duration: this.durationV,
            easing: this.easingV,
          },
        ),
      },
      initialValues: {
        y: values.currentOriginY,
      },
      callback: this.callbackV,
    });
  },
);
