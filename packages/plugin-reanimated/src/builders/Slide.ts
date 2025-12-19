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
import type { Class } from 'type-fest';
import { withDelay } from '../exports/withDelay';
import { withTiming } from '../exports/withTiming';
import { createBuilderWrapper } from './createBuilderWrapper';

export const SlideInRight: Class<ReanimatedSlideInRight> = createBuilderWrapper(
  ReanimatedSlideInRight,
  function (this: ReanimatedSlideInRight) {
    const delay = this.getDelay();

    return (values: EntryAnimationsValues) => ({
      animations: {
        x: withDelay(
          delay,
          withTiming(values.targetOriginX, {
            duration: this.durationV,
            easing: this.easingV,
          }),
        ),
      },
      initialValues: {
        x: values.targetOriginX + values.windowWidth,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideInLeft: Class<ReanimatedSlideInLeft> = createBuilderWrapper(
  ReanimatedSlideInLeft,
  function (this: ReanimatedSlideInLeft) {
    const delay = this.getDelay();

    return (values: EntryAnimationsValues) => ({
      animations: {
        x: withDelay(
          delay,
          withTiming(values.targetOriginX, {
            duration: this.durationV,
            easing: this.easingV,
          }),
        ),
      },
      initialValues: {
        x: values.targetOriginX - values.windowWidth,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideInUp: Class<ReanimatedSlideInUp> = createBuilderWrapper(
  ReanimatedSlideInUp,
  function (this: ReanimatedSlideInUp) {
    const delay = this.getDelay();

    return (values: EntryAnimationsValues) => ({
      animations: {
        y: withDelay(
          delay,
          withTiming(values.targetOriginY, {
            duration: this.durationV,
            easing: this.easingV,
          }),
        ),
      },
      initialValues: {
        y: -values.windowHeight,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideInDown: Class<ReanimatedSlideInDown> = createBuilderWrapper(
  ReanimatedSlideInDown,
  function (this: ReanimatedSlideInDown) {
    const delay = this.getDelay();

    return (values: EntryAnimationsValues) => ({
      animations: {
        y: withDelay(
          delay,
          withTiming(values.targetOriginY, {
            duration: this.durationV,
            easing: this.easingV,
          }),
        ),
      },
      initialValues: {
        y: values.targetOriginY + values.windowHeight,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideOutRight: Class<ReanimatedSlideOutRight> =
  createBuilderWrapper(
    ReanimatedSlideOutRight,
    function (this: ReanimatedSlideOutRight) {
      const delay = this.getDelay();

      return (values: ExitAnimationsValues) => ({
        animations: {
          x: withDelay(
            delay,
            withTiming(
              Math.max(
                values.currentOriginX + values.windowWidth,
                values.windowWidth,
              ),
              {
                duration: this.durationV,
                easing: this.easingV,
              },
            ),
          ),
        },
        initialValues: {
          x: values.currentOriginX,
        },
        callback: this.callbackV,
      });
    },
  );

export const SlideOutLeft: Class<ReanimatedSlideOutLeft> = createBuilderWrapper(
  ReanimatedSlideOutLeft,
  function (this: ReanimatedSlideOutLeft) {
    const delay = this.getDelay();

    return (values: ExitAnimationsValues) => ({
      animations: {
        x: withDelay(
          delay,
          withTiming(
            Math.min(
              values.currentOriginX - values.windowWidth,
              -values.windowWidth,
            ),
            {
              duration: this.durationV,
              easing: this.easingV,
            },
          ),
        ),
      },
      initialValues: {
        x: values.currentOriginX,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideOutUp: Class<ReanimatedSlideOutUp> = createBuilderWrapper(
  ReanimatedSlideOutUp,
  function (this: ReanimatedSlideOutUp) {
    const delay = this.getDelay();

    return (values: ExitAnimationsValues) => ({
      animations: {
        y: withDelay(
          delay,
          withTiming(
            Math.min(
              values.currentOriginY - values.windowHeight,
              -values.windowHeight,
            ),
            {
              duration: this.durationV,
              easing: this.easingV,
            },
          ),
        ),
      },
      initialValues: {
        y: values.currentOriginY,
      },
      callback: this.callbackV,
    });
  },
);

export const SlideOutDown: Class<ReanimatedSlideOutDown> = createBuilderWrapper(
  ReanimatedSlideOutDown,
  function (this: ReanimatedSlideOutDown) {
    const delay = this.getDelay();

    return (values: ExitAnimationsValues) => ({
      animations: {
        y: withDelay(
          delay,
          withTiming(
            Math.max(
              values.currentOriginY + values.windowHeight,
              values.windowHeight,
            ),
            {
              duration: this.durationV,
              easing: this.easingV,
            },
          ),
        ),
      },
      initialValues: {
        y: values.currentOriginY,
      },
      callback: this.callbackV,
    });
  },
);
