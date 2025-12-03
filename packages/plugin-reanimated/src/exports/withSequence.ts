import type {
  AnimatableValue,
  AnimationObject,
  withSequence as withSequenceRN,
} from 'react-native-reanimated-original';

export function withSequence(
  _reduceMotion: string,
  ...animations: AnimatableValue[]
): ReturnType<typeof withSequenceRN> {
  console.error(
    '[Reanimated] withSequence is unsupported. Consider building a custom animation in lightning directly instead. Returning just the first animation.',
  );

  const returnAnimation = animations[0];

  if (!returnAnimation) {
    throw new Error(
      '[Reanimated] withSequence requires at least one animation.',
    );
  }

  return typeof returnAnimation === 'function'
    ? (returnAnimation as () => AnimationObject)()
    : (returnAnimation as AnimationObject);
}
