import {
  createRoot as createLightningRoot,
  type LightningRoot,
  type RenderOptions,
  type RendererBackend,
} from '@plextv/react-lightning';

export { getReactNativePlugins } from '@plextv/react-native-lightning';

/** `lightning` is the stock @lightningjs/renderer, `webtv` the own renderer with direct elements. */
export type RendererName = 'lightning' | 'webtv';

export type WebTvRenderOptions = RenderOptions & {
  /** Defaults to `lightning`, which is exactly what react-lightning's createRoot does. */
  renderer?: RendererName;
};

/**
 * Loads one backend. Each is its own chunk, so the one an app doesn't pick is never fetched;
 * import `@plextv/react-native-webtv/lightning` or `/webtv` directly to drop the other at build time.
 */
export async function getRendererBackend(renderer: RendererName): Promise<RendererBackend> {
  return renderer === 'webtv' ? (await import('./webtv')).backend : (await import('./lightning')).backend;
}

export async function createRoot(
  target: string | HTMLElement,
  options: WebTvRenderOptions | (() => WebTvRenderOptions),
): Promise<LightningRoot> {
  const { renderer = 'lightning', ...rest } = typeof options === 'function' ? options() : options;

  return createLightningRoot(target, {
    ...rest,
    backend: rest.backend ?? (await getRendererBackend(renderer)),
  });
}
