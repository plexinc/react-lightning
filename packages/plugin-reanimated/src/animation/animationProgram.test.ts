import type { AnimationSettings } from '@lightningjs/renderer';
import { describe, expect, it } from 'vitest';

import {
  type AnimationProgram,
  delayProgram,
  firstLeaf,
  leafProgram,
  repeatProgram,
  mapProgram,
  restingValue,
  sequenceProgram,
} from './animationProgram';

const settings = (over: Partial<AnimationSettings> = {}): AnimationSettings => ({
  duration: 100,
  easing: 'linear',
  delay: 0,
  loop: false,
  repeat: 0,
  stopMethod: false,
  ...over,
});

const leaf = (toValue: number, over?: Partial<AnimationSettings>): AnimationProgram =>
  leafProgram({ toValue, lngAnimation: settings(over) });

describe('animationProgram', () => {
  it('wraps a single step as a leaf', () => {
    const p = leaf(10);

    expect(p).toEqual({
      kind: 'leaf',
      leaf: { toValue: 10, lngAnimation: settings() },
    });
  });

  it('builds a sequence preserving child order', () => {
    const p = sequenceProgram([leaf(1), leaf(2), leaf(3)]);

    expect(p.kind).toBe('sequence');
    expect((p as { children: AnimationProgram[] }).children.map(restingValue)).toEqual([1, 2, 3]);
  });

  it('resting value is the last leaf of a sequence', () => {
    expect(restingValue(sequenceProgram([leaf(1), leaf(2), leaf(3)]))).toBe(3);
  });

  it('first leaf is the first leaf of a sequence', () => {
    const p = sequenceProgram([leaf(7), leaf(8)]);

    expect(firstLeaf(p)?.toValue).toBe(7);
  });

  it('wraps a child in a repeat with count and reverse', () => {
    const seq = sequenceProgram([leaf(1), leaf(2)]);
    const p = repeatProgram(seq, -1, false);

    expect(p).toEqual({ kind: 'repeat', child: seq, count: -1, reverse: false });
  });

  it('resting value of a repeat is its child resting value', () => {
    expect(restingValue(repeatProgram(sequenceProgram([leaf(1), leaf(2)]), 3, false))).toBe(2);
  });

  it('delay sets the delay on the first leaf only, without mutating the source', () => {
    const inner = settings();
    const p = sequenceProgram([leafProgram({ toValue: 5, lngAnimation: inner }), leaf(6)]);
    const delayed = delayProgram(p, 1000);

    expect(firstLeaf(delayed)?.lngAnimation.delay).toBe(1000);
    expect(firstLeaf(delayed)?.toValue).toBe(5);
    // source untouched
    expect(inner.delay).toBe(0);
    // later leaves keep their delay
    expect(restingValue(delayed)).toBe(6);
  });

  it('nested sequence resolves first/resting through the tree', () => {
    const p = sequenceProgram([
      leaf(1),
      repeatProgram(sequenceProgram([leaf(2), leaf(3)]), -1, false),
    ]);

    expect(firstLeaf(p)?.toValue).toBe(1);
    expect(restingValue(p)).toBe(3);
  });
  it('mapProgram maps every leaf target and keeps the tree shape', () => {
    const p = sequenceProgram([
      leaf(1),
      repeatProgram(sequenceProgram([leaf(2), leaf(3)]), -1, false),
    ]);
    const mapped = mapProgram(p, (v) => (v as number) * 10);

    expect(firstLeaf(mapped)?.toValue).toBe(10);
    expect(restingValue(mapped)).toBe(30);
    expect(mapped.kind).toBe('sequence');
  });
});
