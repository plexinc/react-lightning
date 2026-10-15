// What the app gets for `@plextv/react-lightning`: the worktree's source, with createRoot routed
// through @plextv/react-native-webtv's renderer switch (direct mode = `renderer: 'webtv'`).
// Imported lazily: react-native-webtv imports react-native-lightning, which imports this module.
import type { WebTvRenderOptions } from '../../../../packages/react-native-webtv/src/index.ts';
import { mode, onRenderer } from './mode.ts';

export * from '../../../../packages/react-lightning/src/index.ts';

export async function createRoot(
  target: string | HTMLElement,
  options: WebTvRenderOptions | (() => WebTvRenderOptions),
) {
  const { createRoot: createWebTvRoot } =
    await import('../../../../packages/react-native-webtv/src/index.ts');
  const resolved = typeof options === 'function' ? options() : options;

  if (mode !== 'direct') {
    return createWebTvRoot(target, { ...resolved, renderer: 'lightning' });
  }

  const root = await createWebTvRoot(target, { ...resolved, renderer: 'webtv' });

  onRenderer(root.renderer as never);

  return root;
}
