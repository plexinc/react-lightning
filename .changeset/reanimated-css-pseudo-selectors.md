---
'@plextv/react-lightning-plugin-reanimated': minor
---

Support reanimated's CSS transitions and pseudo selectors. A `CSSStyle` on an animated component now works: `transitionProperty` / `transitionDuration` / `transitionTimingFunction` / `transitionDelay` (and the `transition` shorthand) become a Lightning transition on the node, and per-property values keyed by `default` / `:focus` / `:focus-within` swap on focus without a re-render. `:hover`, `:active` and `:active-deepest` need pointer or press state that Lightning doesn't have, so they're ignored with a dev warning, as are CSS animations (`animationName` and friends) for now.
