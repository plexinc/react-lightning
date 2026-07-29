import type { AnimationSettings } from '@lightningjs/renderer';
import type { AnimatableValue } from 'react-native-reanimated-original';

export interface ProgramLeaf {
  toValue: AnimatableValue;
  lngAnimation: AnimationSettings;
}

// A program is the composition tree for withSequence / withRepeat / withDelay.
// A single withTiming/withSpring stays off this path (see AnimatedValue); the
// tree only exists once steps are chained. delay folds onto the first leaf.
export type AnimationProgram =
  {
      kind: 'repeat';
      child: AnimationProgram;
      count: number;
      reverse: boolean;
    } | { kind: 'leaf'; leaf: ProgramLeaf } | { kind: 'sequence'; children: AnimationProgram[] };

export function leafProgram(leaf: ProgramLeaf): AnimationProgram {
  return { kind: 'leaf', leaf };
}

export function sequenceProgram(
  children: AnimationProgram[],
): AnimationProgram {
  return { kind: 'sequence', children };
}

export function repeatProgram(
  child: AnimationProgram,
  count: number,
  reverse: boolean,
): AnimationProgram {
  return { kind: 'repeat', child, count, reverse };
}

// Prepend a delay by overriding the first leaf's delay (clones so a cached
// lngAnimation, e.g. spring's, is never mutated).
export function delayProgram(
  program: AnimationProgram,
  delayMs: number,
): AnimationProgram {
  switch (program.kind) {
    case 'leaf':
      return leafProgram({
        toValue: program.leaf.toValue,
        lngAnimation: { ...program.leaf.lngAnimation, delay: delayMs },
      });
    case 'sequence': {
      const [head, ...rest] = program.children;

      if (!head) {
        return program;
      }

      return sequenceProgram([delayProgram(head, delayMs), ...rest]);
    }

    case 'repeat':
      return repeatProgram(
        delayProgram(program.child, delayMs),
        program.count,
        program.reverse,
      );
  }
}

export function firstLeaf(program: AnimationProgram): ProgramLeaf | undefined {
  switch (program.kind) {
    case 'leaf':
      return program.leaf;
    case 'sequence': {
      const first = program.children[0];

      return first ? firstLeaf(first) : undefined;
    }

    case 'repeat':
      return firstLeaf(program.child);
  }
}

export function restingValue(
  program: AnimationProgram,
): AnimatableValue | undefined {
  switch (program.kind) {
    case 'leaf':
      return program.leaf.toValue;
    case 'sequence': {
      const last = program.children[program.children.length - 1];

      return last ? restingValue(last) : undefined;
    }

    case 'repeat':
      return restingValue(program.child);
  }
}

// Structural equality of two programs, used to decide whether a running
// animation still matches a freshly computed schedule. Conservative on purpose:
// leaf settings are compared by identity (an unchanged shared value hands back
// the same AnimationSettings ref), so anything uncertain reads as changed and
// gets restarted rather than left stale.
export function programsEqual(
  a: AnimationProgram,
  b: AnimationProgram,
): boolean {
  if (a === b) {
    return true;
  }

  if (a.kind !== b.kind) {
    return false;
  }

  switch (a.kind) {
    case 'leaf': {
      const other = (b as Extract<AnimationProgram, { kind: 'leaf' }>).leaf;

      return (
        Object.is(a.leaf.toValue, other.toValue) &&
        a.leaf.lngAnimation === other.lngAnimation
      );
    }

    case 'sequence': {
      const other = (b as Extract<AnimationProgram, { kind: 'sequence' }>)
        .children;

      return (
        a.children.length === other.length &&
        a.children.every((child, i) => {
          const otherChild = other[i];

          return otherChild !== undefined && programsEqual(child, otherChild);
        })
      );
    }

    case 'repeat': {
      const other = b as Extract<AnimationProgram, { kind: 'repeat' }>;

      return (
        a.count === other.count &&
        a.reverse === other.reverse &&
        programsEqual(a.child, other.child)
      );
    }
  }
}

// Map every leaf target through fn (e.g. translateX px stays as the x value),
// keeping the tree shape and each leaf's animation settings.
export function mapProgram(
  program: AnimationProgram,
  fn: (value: AnimatableValue) => AnimatableValue,
): AnimationProgram {
  switch (program.kind) {
    case 'leaf':
      return leafProgram({
        toValue: fn(program.leaf.toValue),
        lngAnimation: program.leaf.lngAnimation,
      });
    case 'sequence':
      return sequenceProgram(
        program.children.map((child) => mapProgram(child, fn)),
      );
    case 'repeat':
      return repeatProgram(
        mapProgram(program.child, fn),
        program.count,
        program.reverse,
      );
  }
}
