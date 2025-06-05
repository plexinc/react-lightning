import {
  type EffectMap,
  RendererMain,
  type RendererMainSettings,
  type ShaderMap,
  type Stage,
  type TextureMap,
  type TrFontFace,
} from '@lightningjs/renderer';
import {
  CanvasCoreRenderer,
  CanvasTextRenderer,
} from '@lightningjs/renderer/canvas';
import {
  SdfTextRenderer,
  WebGlCoreRenderer,
} from '@lightningjs/renderer/webgl';
import { createContext } from 'react';
import type { ComponentClass, ComponentType, ReactNode } from 'react';
import createReconciler from 'react-reconciler';
import type { LightningElement } from '../types';
import { traceWrap } from '../utils/traceWrap';
import type { Plugin } from './Plugin';
import { createHostConfig } from './createHostConfig';

// https://github.com/lightning-js/devtools/blob/main/src/types/globals.d.ts
declare global {
  interface Window {
    __LIGHTNINGJS_DEVTOOLS__?: {
      renderer: RendererMain;
      features?: string[];
    };
  }
}

export type RenderOptions = Omit<
  RendererMainSettings,
  'renderEngine' | 'fontEngines' | 'inspector'
> & {
  useCanvas?: boolean;
  includeCanvasFontRenderer?: boolean;
  fonts: (stage: Stage) => TrFontFace[];
  isPrimaryRenderer?: boolean;
  plugins?: Plugin<LightningElement>[];
  debug?: boolean;
  shaders?: Partial<ShaderMap>;
  effects?: Partial<EffectMap>;
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

export const LightningRootContext = createContext<LightningRoot | null>(null);

const TRACE_ENABLED = false;
const SKIP_STACK_TRACE = true;

const defaultOptions: Partial<RenderOptions> = {
  fpsUpdateInterval: 500,
  appHeight: 1080,
  appWidth: 1920,
  clearColor: 0x000000ff,
  deviceLogicalPixelRatio: 1,
  devicePhysicalPixelRatio: 1,
  fonts: () => [],
  plugins: [],
  isPrimaryRenderer: true,
  debug: false,
};

function isReactClassComponent(
  ReactComponent: ComponentType<unknown>,
): ReactComponent is ComponentClass<unknown> {
  return ReactComponent.prototype?.isReactComponent;
}

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

  if (useCanvas) {
    renderEngine = CanvasCoreRenderer;
    fontEngines.push(CanvasTextRenderer);
  } else {
    renderEngine = WebGlCoreRenderer;
    fontEngines.push(SdfTextRenderer);

    if (includeCanvasFontRenderer) {
      fontEngines.push(CanvasTextRenderer);
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

  if (process.env.NODE_ENV !== 'production') {
    window.__LIGHTNINGJS_DEVTOOLS__ = {
      renderer,
      features: ['react-lightning'],
    };
  }

  for (const font of fonts(renderer.stage)) {
    renderer.stage.fontManager.addFontFace(font);
  }

  if (finalOptions.shaders) {
    for (const [key, shaderType] of Object.entries(finalOptions.shaders)) {
      renderer.stage.shManager.registerShaderType(
        key as keyof ShaderMap,
        shaderType,
      );
    }
  }

  if (finalOptions.effects) {
    for (const [key, effectType] of Object.entries(finalOptions.effects)) {
      renderer.stage.shManager.registerEffectType(
        key as keyof EffectMap,
        effectType,
      );
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

  let hostConfig = createHostConfig(renderer, finalOptions.plugins ?? [], {
    isPrimaryRenderer: finalOptions.isPrimaryRenderer ?? true,
  });

  if (finalOptions.debug && TRACE_ENABLED) {
    hostConfig = traceWrap(hostConfig, SKIP_STACK_TRACE);
  }

  const reconciler = createReconciler(hostConfig);

  if (!renderer.root) {
    throw new Error('There was an error setting up the Lightning renderer');
  }

  await Promise.all([
    import('../shim/resizeObserverShim'),
    ...(finalOptions.plugins?.map?.((plugin) =>
      plugin.init?.(renderer, reconciler),
    ) ?? []),
  ]);

  const root = reconciler.createContainer(
    renderer,
    1, // ConcurrentRoot
    null,
    false,
    null,
    '',
    (error) => console.error(error),
    null,
  );

  const lngRoot: LightningRoot = {
    render(componentOrElement, callback) {
      let reactElement: ReactNode;

      if (componentOrElement instanceof Function) {
        reactElement = isReactClassComponent(componentOrElement)
          ? (new componentOrElement({}) as unknown as ReactNode)
          : componentOrElement({});
      } else {
        reactElement = componentOrElement;
      }

      reconciler.updateContainer(
        <LightningRootContext.Provider value={lngRoot}>
          {reactElement}
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
