import type { Plugin } from '@plextv/react-lightning';
import { plugin as cssPlugin } from '@plextv/react-lightning-plugin-css-transform';
import {
  plugin as flexboxPlugin,
  type YogaOptions,
} from '@plextv/react-lightning-plugin-flexbox';
import { cssClassNameTransformPlugin } from '../plugins/cssClassNameTransformPlugin';
import { domPolyfillsPlugin } from '../plugins/domPolyfillsPlugin';
import { reactNativePolyfillsPlugin } from '../plugins/reactNativePolyfillsPlugin';

export type PluginOptions = {
  flexbox?: YogaOptions;
};

export function getReactNativePlugins(
  extraPlugins?: Plugin[],
  pluginOptions?: PluginOptions,
): Plugin[] {
  const finalPlugins: Plugin[] = extraPlugins ?? [];

  // Default plugins that react native will almost always need
  finalPlugins.unshift(
    domPolyfillsPlugin(),
    reactNativePolyfillsPlugin(),
    cssClassNameTransformPlugin(),
    cssPlugin(),
    flexboxPlugin({
      errata: 'all',
      expandToAutoFlexBasis: true,
      ...pluginOptions?.flexbox,
    }),
  );

  return finalPlugins;
}
