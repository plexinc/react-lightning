import type { IAnimationController } from '@lightningjs/renderer';

import type { LightningElement, LightningElementStyle } from '@plextv/react-lightning';

import type { AnimationProgram, ProgramLeaf } from './animationProgram';

export type CancelAnimation = () => void;

// Play a composed program against one node prop: register each step's transition,
// animate to its target, wait for the node to report it stopped, then advance.
// Sequences chain, repeats loop (count < 0 = forever). Reverse isn't needed by
// any current consumer, so it plays forward.
export function runAnimationProgram(
  view: LightningElement,
  prop: keyof LightningElementStyle,
  program: AnimationProgram,
): CancelAnimation {
  let cancelled = false;
  let current: IAnimationController | undefined;

  const playLeaf = async (leaf: ProgramLeaf): Promise<void> => {
    if (cancelled || view.recycled) {
      return;
    }

    try {
      view.setProps({ transition: { [prop]: leaf.lngAnimation } } as never);

      const animateStyle = view.animateStyle as (
        key: keyof LightningElementStyle,
        value: unknown,
      ) => IAnimationController;
      const controller = animateStyle(prop, leaf.toValue);

      current = controller;

      await controller.waitUntilStopped();
    } catch {
      // node was destroyed or recycled mid-flight; stop quietly
      cancelled = true;
    }
  };

  const play = async (node: AnimationProgram): Promise<void> => {
    if (cancelled) {
      return;
    }

    switch (node.kind) {
      case 'leaf':
        await playLeaf(node.leaf);
        break;
      case 'sequence':
        for (const child of node.children) {
          if (cancelled) {
            break;
          }

          await play(child);
        }
        break;
      case 'repeat': {
        const infinite = node.count < 0;

        for (let i = 0; (infinite || i < node.count) && !cancelled; i++) {
          await play(node.child);
        }

        break;
      }
    }
  };

  void play(program);

  return () => {
    cancelled = true;

    try {
      current?.stop();
    } catch {
      // ignore
    }
  };
}
