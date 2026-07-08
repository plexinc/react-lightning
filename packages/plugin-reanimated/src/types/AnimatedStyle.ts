import type { LightningElement } from '@plextv/react-lightning';

export type AnimatedStyle = {
  viewsRef: Set<LightningElement>;
  /**
   * Apply the style's current computed value to a single view. Called when a
   * view registers, so late-attached or re-created nodes don't miss styles
   * whose shared values are at rest (listeners only push on change).
   */
  applyToView: (view: LightningElement) => void;
};
