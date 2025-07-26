export type YogaOptions = {
  useWebDefaults?: boolean;
  useWebWorker?: boolean;
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
