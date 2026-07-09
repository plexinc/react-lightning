import type { AnimationSettings } from '@lightningjs/renderer';
import type {
  AnimatableValue,
  AnimationCallback,
  WithSpringConfig,
  WithTimingConfig,
} from 'react-native-reanimated-original';

import { AnimationType } from '../types/AnimationType';
import {
  type AnimationProgram,
  firstLeaf,
  leafProgram,
  restingValue,
} from './animationProgram';
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
  public callback?: AnimationCallback;
  // Set once withSequence/withRepeat(sequence)/withDelay compose steps. A plain
  // withTiming/withSpring leaves it undefined and takes the direct transition
  // path; a program is played step-by-step against the node instead.
  public program?: AnimationProgram;

  public constructor(
    type: TType,
    value: AnimatableValue,
    config?: AnimationConfigType[TType],
    callback?: AnimationCallback,
  ) {
    this.type = type;
    this.value = value;
    this.lngAnimation = this._getLightningAnimationSettings(config);
    this.callback = callback;
  }

  public static fromProgram(program: AnimationProgram): AnimatedValue {
    const value = new AnimatedValue(AnimationType.Timing, restingValue(program) ?? 0);
    const first = firstLeaf(program);

    if (first) {
      value.lngAnimation = first.lngAnimation;
    }

    value.program = program;

    return value;
  }

  public toProgram(): AnimationProgram {
    return (
      this.program ??
      leafProgram({ toValue: this.value, lngAnimation: this.lngAnimation })
    );
  }

  private _getLightningAnimationSettings(config?: AnimationConfigType[TType]): AnimationSettings {
    switch (this.type) {
      case AnimationType.Spring:
        return createSpringAnimation(config);
      default:
        return createTimingAnimation(config);
    }
  }
}
