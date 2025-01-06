import type { Config, Node } from 'yoga-layout';
import { type Yoga, loadYoga } from 'yoga-layout/load';

export type YogaOptions = {
  useWebDefaults?: boolean;
  errata?:
    | 'none'
    | 'all'
    | 'classic'
    | 'stretch-flex-basis'
    | 'absolute-percent-against-inner'
    | 'absolute-position-without-insets';
};

let _yoga: Yoga;
let _config: Config;

export async function init(options?: YogaOptions) {
  const { useWebDefaults, errata } = {
    useWebDefaults: false,
    ...options,
  };

  _yoga = await loadYoga();
  _config = _yoga.Config.create();
  _config.setUseWebDefaults(useWebDefaults);

  if (errata) {
    switch (errata) {
      case 'all':
        _config.setErrata(_yoga.ERRATA_ALL);
        break;
      case 'classic':
        _config.setErrata(_yoga.ERRATA_CLASSIC);
        break;
      case 'stretch-flex-basis':
        _config.setErrata(_yoga.ERRATA_STRETCH_FLEX_BASIS);
        break;
      case 'absolute-percent-against-inner':
        _config.setErrata(_yoga.ERRATA_ABSOLUTE_PERCENT_AGAINST_INNER_SIZE);
        break;
      case 'absolute-position-without-insets':
        _config.setErrata(
          _yoga.ERRATA_ABSOLUTE_POSITION_WITHOUT_INSETS_EXCLUDES_PADDING,
        );
        break;
      default:
        _config.setErrata(_yoga.ERRATA_NONE);
        break;
    }
  }
}

export function createNode(): Node {
  if (!_yoga || !_config) {
    throw new Error('Yoga was not initialized! Did you call `init()`?');
  }

  return _yoga.Node.create(_config);
}

export default {
  get instance() {
    return _yoga;
  },
};
