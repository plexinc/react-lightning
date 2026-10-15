import { RendererMain, type RendererMainSettings } from '@lightningjs/renderer';
import { CanvasCoreRenderer, CanvasTextRenderer } from '@lightningjs/renderer/canvas';
import { SdfTextRenderer, WebGlCoreRenderer } from '@lightningjs/renderer/webgl';

import type { RendererBackend } from './RendererBackend';

type TextRenderer = RendererMainSettings['fontEngines'][number];

/** The stock @lightningjs/renderer, which createRoot uses unless told otherwise. */
export const lightningBackend: RendererBackend = {
  async createRenderer({ useCanvas, includeCanvasFontRenderer, ...settings }, target) {
    const fontEngines: RendererMainSettings['fontEngines'] = [];
    let renderEngine: RendererMainSettings['renderEngine'];
    let shaders: Record<string, unknown>;

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
        ...(settings as Partial<RendererMainSettings>),
        renderEngine,
        fontEngines,
        inspector: undefined,
      },
      target,
    );

    return { renderer, shaders };
  },
};
