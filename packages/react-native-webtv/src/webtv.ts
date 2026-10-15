import type { RendererBackend } from '@plextv/react-lightning';
import { RendererMain } from '@plextv/react-lightning-renderer/compat';
import * as shaders from '@plextv/react-lightning-renderer/compat/webgl/shaders';

import { sceneElementFactory } from './scene/sceneElementFactory';

export { SceneElement } from './scene/SceneElement';
export { sceneElementFactory } from './scene/sceneElementFactory';

/** The own WebGL renderer, drawing react-lightning's elements directly (no Lightning node per element). */
export const backend: RendererBackend = {
  async createRenderer({ useCanvas: _useCanvas, includeCanvasFontRenderer: _canvasText, ...settings }, target) {
    const renderer = new RendererMain(settings, target);

    return {
      renderer: renderer as unknown as Awaited<ReturnType<RendererBackend['createRenderer']>>['renderer'],
      shaders: shaders as Record<string, unknown>,
    };
  },
  elementFactory: sceneElementFactory,
};
