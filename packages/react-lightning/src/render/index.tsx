import {
  type CoreShaderType,
  RendererMain,
  type RendererMainSettings,
  type Stage,
  type TextureMap,
} from '@lightningjs/renderer';
import {
  CanvasCoreRenderer,
  CanvasTextRenderer,
} from '@lightningjs/renderer/canvas';
import {
  SdfTextRenderer,
  WebGlCoreRenderer,
} from '@lightningjs/renderer/webgl';
import type { ComponentType, Context, ReactNode } from 'react';
import { createContext, createElement } from 'react';
import createReconciler, { type Reconciler } from 'react-reconciler';
import type { LightningTextElement } from '../element/LightningTextElement';
import type { LightningElement } from '../types';
import { traceWrap } from '../utils/traceWrap';
import { createHostConfig, type ReconcilerContainer } from './createHostConfig';
import type { Plugin } from './Plugin';

// https://github.com/lightning-js/devtools/blob/main/src/types/globals.d.ts
declare global {
  interface Window {
    __LIGHTNINGJS_DEVTOOLS__?: {
      renderer: RendererMain;
      features?: string[];
    };
  }
}

type TextRenderer = RendererMainSettings['fontEngines'][number];
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
  shaders?: ShaderMap[];
  textures?: Partial<TextureMap>;
};

export type LightningRoot = {
  render(
    component: ReactNode | ComponentType<unknown>,
    callback?: () => void,
  ): void;
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
};

export async function createRoot(
  target: string | HTMLElement,
  options: RenderOptions | (() => RenderOptions),
): Promise<LightningRoot> {
  const allOptions = {
    ...defaultOptions,
    ...(typeof options === 'function' ? options() : options),
  };

  // Don't use the lightning inspector, we have our own.
  const { fonts, useCanvas, includeCanvasFontRenderer, ...finalOptions } =
    allOptions;

  const fontEngines: RendererMainSettings['fontEngines'] = [];
  let renderEngine: RendererMainSettings['renderEngine'];
  let shaders:
    | typeof import('@lightningjs/renderer/webgl/shaders')
    | typeof import('@lightningjs/renderer/canvas/shaders');

  if (useCanvas) {
    renderEngine = CanvasCoreRenderer;
    // Temporary cast until CanvasTextRenderer is typed properly
    fontEngines.push(CanvasTextRenderer as unknown as TextRenderer);
    shaders = await import('@lightningjs/renderer/canvas/shaders');
  } else {
    renderEngine = WebGlCoreRenderer;
    fontEngines.push(SdfTextRenderer);
    shaders = await import('@lightningjs/renderer/webgl/shaders');

    if (includeCanvasFontRenderer) {
      // Temporary cast until CanvasTextRenderer is typed properly
      fontEngines.push(CanvasTextRenderer as unknown as TextRenderer);
    }
  }

  const renderer = new RendererMain(
    {
      ...finalOptions,
      renderEngine,
      fontEngines,
      inspector: undefined,
    },
    target,
  );

  if (import.meta.env.DEV) {
    window.__LIGHTNINGJS_DEVTOOLS__ = {
      renderer,
      features: ['react-lightning'],
    };
  }

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

        renderer.stage.shManager.registerShaderType(
          shader as keyof typeof shaders,
          shaders[shader as keyof typeof shaders],
        );
      } else {
        for (const [key, value] of Object.entries(shader)) {
          renderer.stage.shManager.registerShaderType(key, value);
        }
      }
    }
  }

  if (finalOptions.textures) {
    for (const [key, textureType] of Object.entries(finalOptions.textures)) {
      renderer.stage.txManager.registerTextureType(
        key as keyof TextureMap,
        textureType,
      );
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
  }

  await Promise.all([
    import('../shim/resizeObserverShim'),
    ...(finalOptions.plugins?.map?.((plugin) =>
      plugin.init?.(renderer, reconciler),
    ) ?? []),
  ]);

  const root = reconciler.createContainer(
    {
      renderer,
      plugins: finalOptions.plugins ?? [],
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
    null,
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
