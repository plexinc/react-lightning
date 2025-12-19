import {
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  LinearTransition as ReanimatedLinearTransition,
} from 'react-native-reanimated-original';
import type { Class } from 'type-fest';
import { withDelay } from '../exports/withDelay';
import { withTiming } from '../exports/withTiming';
import { createBuilderWrapper } from './createBuilderWrapper';

export const LinearTransition: Class<ReanimatedLinearTransition> =
  createBuilderWrapper(
    ReanimatedLinearTransition,
    function (this: ReanimatedLinearTransition) {
      const delay = this.getDelay();

      return (values: ExitAnimationsValues & EntryAnimationsValues) => ({
        animations: {
          originX: withDelay(
            delay,
            withTiming(values.targetOriginX, {
              duration: this.durationV,
            }),
            // biome-ignore lint/suspicious/noExplicitAny: Reanimated typings are wrong
          ) as any,
          originY: withDelay(
            delay,
            withTiming(values.targetOriginY, {
              duration: this.durationV,
            }),
            // biome-ignore lint/suspicious/noExplicitAny: See above
          ) as any,
          width: withDelay(
            delay,
            withTiming(values.targetWidth, {
              duration: this.durationV,
            }),
            // biome-ignore lint/suspicious/noExplicitAny: See above
          ) as any,
          height: withDelay(
            delay,
            withTiming(values.targetHeight, {
              duration: this.durationV,
            }),
            // biome-ignore lint/suspicious/noExplicitAny: See above
          ) as any,
        },
        initialValues: {
          originX: values.currentOriginX,
          originY: values.currentOriginY,
          width: values.currentWidth,
          height: values.currentHeight,
        },
        callback: this.callbackV,
      });
    },
  );
