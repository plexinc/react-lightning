import type { AnimationSettings } from '@lightningjs/renderer';
import { describe, expect, it } from 'vitest';
import type { LightningElement } from '@plextv/react-lightning';
import { leafProgram, sequenceProgram } from './animationProgram';
import { runAnimationProgram } from './runAnimationProgram';

const settings = (
  over: Partial<AnimationSettings> = {},
): AnimationSettings => ({
  duration: 10,
  easing: 'linear',
  delay: 0,
  loop: false,
  repeat: 0,
  stopMethod: false,
  ...over,
});

// A fake node whose animateStyle reads instance state through `this`, so an
// unbound call (this === undefined) throws instead of animating — the exact
// failure that froze every composed-program consumer (marquee, now-marker).
function makeView() {
  const view = {
    recycled: false,
    props: { transition: {} as Record<PropertyKey, unknown> },
    applied: [] as { key: PropertyKey; value: unknown }[],
    setProps(next: { transition?: Record<PropertyKey, unknown> }) {
      Object.assign(this.props.transition, next.transition);
    },
    animateStyle(key: PropertyKey, value: unknown) {
      // Reading `this.applied` blows up when animateStyle is called unbound.
      this.applied.push({ key, value });
      return {
        waitUntilStopped: () => Promise.resolve(),
        stop() {},
      };
    },
  };

  return view;
}

const flush = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
};

describe('runAnimationProgram', () => {
  it('animates a single leaf against the node (method stays bound to the view)', async () => {
    const view = makeView();

    runAnimationProgram(
      view as unknown as LightningElement,
      'x',
      leafProgram({ toValue: -840, lngAnimation: settings() }),
    );
    await flush();

    expect(view.applied).toEqual([{ key: 'x', value: -840 }]);
    expect(view.props.transition.x).toEqual(settings());
  });

  it('plays sequence steps in order', async () => {
    const view = makeView();

    runAnimationProgram(
      view as unknown as LightningElement,
      'x',
      sequenceProgram([
        leafProgram({ toValue: -840, lngAnimation: settings() }),
        leafProgram({ toValue: 300, lngAnimation: settings({ duration: 0 }) }),
        leafProgram({ toValue: 0, lngAnimation: settings() }),
      ]),
    );
    await flush();

    expect(view.applied.map((a) => a.value)).toEqual([-840, 300, 0]);
  });

  it('cancel stops advancing the program', async () => {
    const view = makeView();

    const cancel = runAnimationProgram(
      view as unknown as LightningElement,
      'x',
      sequenceProgram([
        leafProgram({ toValue: 1, lngAnimation: settings() }),
        leafProgram({ toValue: 2, lngAnimation: settings() }),
      ]),
    );
    cancel();
    await flush();

    // Cancelled before the first leaf resolved, so no further steps run.
    expect(view.applied.length).toBeLessThanOrEqual(1);
  });
});
