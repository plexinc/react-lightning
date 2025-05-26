import {
  type Plugin,
  type RenderOptions,
  createRoot,
} from '@plextv/react-lightning';
import { plugin as cssPlugin } from '@plextv/react-lightning-plugin-css-transform';
import { plugin as flexboxPlugin } from '@plextv/react-lightning-plugin-flexbox';
import type { ComponentProvider } from 'react-native';
import { cssClassNameTransformPlugin } from '../plugins/cssClassNameTransformPlugin';
import { domPolyfillsPlugin } from '../plugins/domPolyfillsPlugin';
import { reactNativePolyfillsPlugin } from '../plugins/reactNativePolyfillsPlugin';

const registry: Record<string, ComponentProvider> = {};

// Automatically add some plugins since react native will always use them
export function getPlugins(extraPlugins?: Plugin[]): Plugin[] {
  const finalPlugins: Plugin[] = extraPlugins ?? [];

  finalPlugins.unshift(
    domPolyfillsPlugin(),
    reactNativePolyfillsPlugin(),
    cssClassNameTransformPlugin(),
    cssPlugin(),
    flexboxPlugin({
      errata: 'all',
    }),
  );

  return finalPlugins;
}

const AppRegistry = {
  registerComponent(
    appKey: string,
    getComponentFunc: ComponentProvider,
  ): string {
    registry[appKey] = getComponentFunc;

    return appKey;
  },
  async runApplication(
    appKey: string,
    options: {
      renderOptions: RenderOptions | (() => RenderOptions);
      rootId: string;
      onRender?: () => void;
    },
  ): Promise<void> {
    const component = registry[appKey];

    if (!component) {
      throw new Error(`No component registered for appKey ${appKey}`);
    }

    const optionsObj =
      typeof options.renderOptions === 'function'
        ? options.renderOptions()
        : options.renderOptions;
    const { plugins, ...otherOptions } = optionsObj;

    const finalOptions = {
      ...otherOptions,
      plugins: getPlugins(plugins),
    };

    const root = await createRoot(options.rootId, finalOptions);

    return root.render(component(), options.onRender);
  },
};

export { AppRegistry };
