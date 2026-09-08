---
'@plextv/react-lightning': minor
'@plextv/react-lightning-plugin-css-transform': minor
'@plextv/react-lightning-plugin-reanimated': patch
---

Support css outlines. `outlineWidth` / `outlineColor` / `outlineOffset` now paint a ring outside the node (the border shader can draw outside its bounds with a gap), so a focus ring no longer needs an extra absolutely-positioned view. A border and an outline share the one shader an element gets, so the border still wins and a dev warning says so. Also: a partial style push (reanimated, or an imperative `style.x =`) now resolves its shader against the merged style, so pushing only a `borderColor` or `outlineColor` keeps the width it already had, and an `outlineColor` transition animates the shader.
