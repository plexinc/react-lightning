---
'@plextv/react-native-lightning': patch
---

Typing fixes across the react-native compat layer exports: `View`'s `onFocusCapture` accepts either the RN or the Lightning handler (intersecting them produced a signature nothing could satisfy), `Pressable` tolerates null `onFocus`/`onBlur`, and `ActivityIndicator` handles the asset-id vs URL mismatch on its image source. `LightningViewElementStyle` comes from the package entry instead of a `src/` deep path.

`usesExplicitAlignment` also narrows its argument, so `snapToAlignment: 'item'` falls back to `'start'` in the scroll-into-view math rather than being passed through to alignment code that doesn't implement it.
