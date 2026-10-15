import { LightningViewElement } from '../element/LightningViewElement';
import type {
  CoreShaderType,
  RendererMain,
  RendererMainSettings,
  Stage,
  TextureMap,
} from '@lightningjs/renderer';
import type { ComponentType, Context, ReactNode } from 'react';
import { createContext, createElement } from 'react';
import createReconciler, { type Reconciler } from 'react-reconciler';

import type { LightningTextElement } from '../element/LightningTextElement';
import type { FocusManager } from '../focus/FocusManager';
import type { LightningElement } from '../types';
import { traceWrap } from '../utils/traceWrap';
import { createHostConfig, type ReconcilerContainer } from './createHostConfig';
import type { Plugin } from './Plugin';
import type { RendererBackend } from './RendererBackend';

// https://github.com/lightning-js/devtools/blob/main/src/types/globals.d.ts
declare global {
  interface Window {
    __LIGHTNINGJS_DEVTOOLS_HOOK__?: {
      config?: {
        renderer?: RendererMain;
        focusManager?: FocusManager<LightningElement>;
        features?: string[];
      };
      injected?: boolean;
      inject?: () => Promise<void>;
    };
  }
}

declare module 'react-reconciler' {
  interface Fiber {
    _debugInfo?: {
      isLngNode?: boolean;
    };
  }
}

type ShaderMap = string | Record<string, CoreShaderType>;
type FontInfo = {
  type: Parameters<Stage['loadFont']>[0];
} & Parameters<Stage['loadFont']>[1];

export type RenderOptions = Omit<
  Partial<RendererMainSettings>,
  'renderEngine' | 'fontEngines' | 'inspector'
> & {
  useCanvas?: boolean;
  includeCanvasFontRenderer?: boolean;
  fonts: FontInfo[];
  isPrimaryRenderer?: boolean;
  plugins?: Plugin<LightningElement>[];
  debug?: boolean;
  /**
   * borderRadius + overflow hidden clips children to the rounded rect (RN
   * semantics) by rendering the subtree to a texture. Off by default: every
   * such container costs a GPU framebuffer, and renderer RTT invalidation
   * still has rough edges with late-mounting content.
   */
  roundedClipping?: boolean;
  /**
   * Layout-only Views (no background, border, clip, alpha, transform or
   * transition) skip renderer node creation; their children attach to the
   * nearest materialized ancestor with positions folded in. Off by default
   * while the optimization is validated per app.
   */
  flattenLayoutViews?: boolean;
  shaders?: ShaderMap[];
  textures?: Partial<TextureMap>;
  /**
   * The renderer and element classes to use. Defaults to the stock
   * @lightningjs/renderer with react-lightning's own elements, loaded on demand
   * so another backend keeps it out of the app's startup path.
   */
  backend?: RendererBackend;
};

export type LightningRoot = {
  render(component: ReactNode | ComponentType<unknown>, callback?: () => void): void;
  unmount(): void;
  configure(): void;
  renderer: RendererMain;
};

const TRACE_ENABLED = false;
const SKIP_STACK_TRACE = true;

export const LightningRootContext: Context<LightningRoot | null> =
  createContext<LightningRoot | null>(null);

let reconciler: Reconciler<
  ReconcilerContainer,
  LightningElement,
  LightningTextElement,
  null,
  null,
  LightningElement
>;
const defaultOptions: Partial<RenderOptions> = {
  fpsUpdateInterval: 500,
  appHeight: 1080,
  appWidth: 1920,
  clearColor: 0x000000ff,
  deviceLogicalPixelRatio: 1,
  devicePhysicalPixelRatio: 1,
  fonts: [],
  plugins: [],
  isPrimaryRenderer: true,
  debug: false,
  roundedClipping: false,
  flattenLayoutViews: false,
};

export async function createRoot(
  target: string | HTMLElement,
  options: RenderOptions | (() => RenderOptions),
): Promise<LightningRoot> {
  const allOptions = {
    ...defaultOptions,
    ...(typeof options === 'function' ? options() : options),
  };

  const elementOptions = {
    roundedClipping: allOptions.roundedClipping === true,
    flattenLayoutViews: allOptions.flattenLayoutViews === true,
  };

  LightningViewElement.roundedClippingEnabled = elementOptions.roundedClipping;
  LightningViewElement.flattenLayoutViewsEnabled = elementOptions.flattenLayoutViews;

  // Don't use the lightning inspector, we have our own.
  const { fonts, backend: requestedBackend, ...finalOptions } = allOptions;
  const backend = requestedBackend ?? (await import('./lightningBackend')).lightningBackend;
  const elementFactory = backend.elementFactory;

  elementFactory?.configure?.(elementOptions);

  const { renderer, shaders } = (await backend.createRenderer(finalOptions, target)) as {
    renderer: RendererMain;
    shaders: Record<string, CoreShaderType>;
  };

  for (const font of fonts) {
    const { type, ...options } = font;

    renderer.stage.loadFont(type, options);
  }

  if (finalOptions.shaders) {
    for (const shader of finalOptions.shaders) {
      if (typeof shader === 'string') {
        if (!(shader in shaders)) {
          throw new Error(
            `Shader "${shader}" is not registered in the renderer. Available shaders: ${Object.keys(
              shaders,
            ).join(', ')}`,
          );
        }

        renderer.stage.shManager.registerShaderType(shader, shaders[shader] as CoreShaderType);
      } else {
        for (const [key, value] of Object.entries(shader)) {
          renderer.stage.shManager.registerShaderType(key, value);
        }
      }
    }
  }

  if (finalOptions.textures) {
    for (const [key, textureType] of Object.entries(finalOptions.textures)) {
      renderer.stage.txManager.registerTextureType(key as keyof TextureMap, textureType);
    }
  }

  if (!renderer.root) {
    throw new Error('There was an error setting up the Lightning renderer');
  }

  if (!reconciler) {
    let hostConfig = createHostConfig({
      isPrimaryRenderer: finalOptions.isPrimaryRenderer ?? true,
    });

    if (finalOptions.debug && TRACE_ENABLED) {
      hostConfig = traceWrap(hostConfig, SKIP_STACK_TRACE);
    }

    reconciler = createReconciler(hostConfig);

    reconciler.injectIntoDevTools({
      bundleType: import.meta.env.DEV ? 1 : 0,
      version: '0.4.0',
      rendererPackageName: '@plextv/react-lightning',
    });
  }

  await Promise.all([
    import('../shim/resizeObserverShim'),
    ...(finalOptions.plugins?.map?.((plugin) => plugin.init?.(renderer, reconciler)) ?? []),
  ]);

  const root = reconciler.createContainer(
    {
      renderer,
      plugins: finalOptions.plugins ?? [],
      createElement: elementFactory?.createElement,
    },
    1, // ConcurrentRoot
    null,
    false,
    null,
    '',
    (error) => console.error(error),
    (error) => console.error(error),
    (error) => console.error(error),
    () => {},
  );

  const lngRoot: LightningRoot = {
    async render(componentOrElement, callback) {
      let reactElement: ReactNode | Promise<ReactNode>;

      if (componentOrElement instanceof Function) {
        reactElement = createElement(componentOrElement);
      } else {
        reactElement = componentOrElement;
      }

      reconciler.updateContainer(
        <LightningRootContext.Provider value={lngRoot}>
          {await reactElement}
        </LightningRootContext.Provider>,
        root,
        null,
        callback,
      );
    },
    configure() {
      // noop
    },
    unmount() {
      reconciler.updateContainer(null, root, null, () => {
        renderer.root.destroy();
        renderer.removeAllListeners();
        renderer.stage.renderer.reset();
      });
    },
    renderer,
  };

  return lngRoot;
}
