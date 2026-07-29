---
'@plextv/react-lightning-components': patch
'@plextv/react-lightning-plugin-reanimated': patch
---

Surface momentum scroll callbacks. VirtualList now fires `onMomentumScrollBegin`/`onMomentumScrollEnd` once around a focus-driven animated scroll — begin when it starts, end when it settles or is cancelled — mirroring tvOS/AndroidTV. The reanimated `useAnimatedScrollHandler` shim now routes the `onMomentumBegin`/`onMomentumEnd` handler keys by event name instead of only ever calling `onScroll`. Consumers that key off momentum (fast-scroll detection, jump-bar auto-hide) can react to the real end of a scroll instead of an idle timeout.
