# @plextv/react-native-webtv

react-native-lightning with a renderer switch. Same plugins, same element API, same JSX; pick what draws it:

- `lightning` (default): the stock `@lightningjs/renderer`, exactly what react-lightning's `createRoot` does today.
- `webtv`: the own WebGL renderer (`@plextv/react-lightning-renderer`), with react-lightning's elements drawn directly as scene nodes. One object per element, no Lightning `CoreNode` behind it, no prop copying between the two.

## Usage

```tsx
import { createRoot, getReactNativePlugins } from '@plextv/react-native-webtv';

const root = await createRoot(document.getElementById('app')!, {
  renderer: 'webtv', // or 'lightning'
  appWidth: 1920,
  appHeight: 1080,
  fonts: FONTS,
  shaders: ['Border', 'Rounded', 'RoundedWithBorder'],
  flattenLayoutViews: true,
  plugins: getReactNativePlugins(),
});

root.render(<App />);
```

`createRoot` takes react-lightning's `RenderOptions` plus `renderer`. Each backend is its own chunk, so the one you don't pick is never loaded. To drop it from the build too, import a backend and pass it to react-lightning yourself:

```tsx
import { createRoot } from '@plextv/react-lightning';
import { backend } from '@plextv/react-native-webtv/webtv'; // or /lightning

const root = await createRoot(target, { ...options, backend });
```

## How it plugs in

react-lightning's `createRoot` takes a `backend` (`RendererBackend`): something that builds the renderer and, optionally, an `elementFactory` for the host instances. The default is the stock renderer with react-lightning's own element classes, so nothing changes for apps that don't pass one.

The `webtv` backend's elements are `SceneElement`s (`src/scene/SceneElement.ts`): the `LightningViewElement`/`TextElement`/`ImageElement` API on top of the fields the own renderer's stage draws from. `element.node === element`, and `instanceof LightningViewElement` still holds, so react-native-lightning's polyfills, plugin-flexbox, plugin-css-transform, plugin-reanimated, the focus manager and VirtualList work unchanged. `src/scene/parity.spec.ts` runs the same element scripts against both implementations and compares the scene they draw and the events the plugins see.

Caveats: the renderer itself still lives in `packages/renderer` (`@plextv/react-lightning-renderer`), including the compat stage the scene elements draw through, and the known renderer gaps (SDF text, rounded clipping depth, RTT, inspector) apply to `webtv` as they do to the compat layer. Props that aren't Lightning node props (handlers, `testID`, ...) aren't copied onto the node: they were inert on a `CoreNode` too, but code reading them back from `element.node` gets `undefined` now.
