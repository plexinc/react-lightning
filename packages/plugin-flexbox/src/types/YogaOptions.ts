/** A font the worker can measure text with, by family name and atlas JSON URL. */
export type YogaFont = {
  fontFamily: string;
  /** URL of the msdf atlas `.json` (same file the renderer loads). */
  atlasDataUrl: string;
};

export type YogaOptions = {
  useWebDefaults?: boolean;
  useWebWorker?: boolean;
  /**
   * msdf fonts to load for synchronous text measurement. When provided, text
   * leaves are measured by Yoga during layout (wrapping/sizing) instead of
   * relying on the renderer's async measurement. Loaded in the background;
   * text using a not-yet-loaded font measures empty until it arrives.
   */
  fonts?: YogaFont[];
  /**
   * Whether to expand flex basis to auto when expanding a flex value. The specs
   * say it should expand to 0, but this does not match react-native behaviour.
   * Defaults to true in react-native-lightning.
   */
  expandToAutoFlexBasis?: boolean;
  processHiddenNodes?: boolean;
  /**
   * Errata to apply to the Yoga implementation. Defaults to 'all' in react-native-lightning.
   */
  errata?:
    | 'none'
    | 'all'
    | 'classic'
    | 'stretch-flex-basis'
    | 'absolute-percent-against-inner'
    | 'absolute-position-without-insets';
};
