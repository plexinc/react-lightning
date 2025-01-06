import type { AnimationSettings } from '@lightningjs/renderer';
import type {
  AnimatableValue,
  AnimationCallback,
  WithSpringConfig,
  WithTimingConfig,
} from 'react-native-reanimated-original';
import { AnimationType } from '../types/AnimationType';
import { createSpringAnimation } from './spring';
import { createTimingAnimation } from './timing';

export type AnimationConfigType = {
  [AnimationType.Spring]: WithSpringConfig;
  [AnimationType.Timing]: WithTimingConfig;
};

export class AnimatedValue<TType extends AnimationType = AnimationType> {
  public type: AnimationType;
  public value: AnimatableValue;
  public lngAnimation: AnimationSettings;

  private _callback?: AnimationCallback;

  public constructor(
    type: TType,
    value: AnimatableValue,
    config?: AnimationConfigType[TType],
    callback?: AnimationCallback,
  ) {
    this.type = type;
    this.value = value;
    this.lngAnimation = this._getLightningAnimationSettings(config);
    this._callback = callback;
  }

  private _getLightningAnimationSettings(
    config?: AnimationConfigType[TType],
  ): AnimationSettings {
    switch (this.type) {
      case AnimationType.Spring:
        return createSpringAnimation(config);
      default:
        return createTimingAnimation(config);
    }
  }
}
