import type {
  AnimatableValue,
  ReduceMotion,
  withSequence as withSequenceRN,
} from 'react-native-reanimated-original';

import { AnimatedValue } from '../animation/AnimatedValue';
import { sequenceProgram } from '../animation/animationProgram';

export function withSequence(
  reduceMotionOrFirst: ReduceMotion | AnimatableValue,
  ...rest: AnimatableValue[]
): ReturnType<typeof withSequenceRN> {
  // reanimated allows an optional ReduceMotion string as the first arg
  const animations =
    typeof reduceMotionOrFirst === 'string'
      ? rest
      : [reduceMotionOrFirst, ...rest];

  const values = animations.filter(
    (animation) => animation instanceof AnimatedValue,
  ) as unknown as AnimatedValue[];

  if (!values.length) {
    throw new Error('[Reanimated] withSequence requires at least one animation.');
  }

  return AnimatedValue.fromProgram(
    sequenceProgram(values.map((value) => value.toProgram())),
  ) as unknown as ReturnType<typeof withSequenceRN>;
}
