export type YogaOptions = {
  useWebDefaults?: boolean;
  useWebWorker?: boolean;
  processHiddenNodes?: boolean;
  errata?:
    | 'none'
    | 'all'
    | 'classic'
    | 'stretch-flex-basis'
    | 'absolute-percent-against-inner'
    | 'absolute-position-without-insets';
};
