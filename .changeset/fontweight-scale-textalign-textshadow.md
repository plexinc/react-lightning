---
'@plextv/react-lightning-plugin-css-transform': patch
---

`fontWeight` keeps the full 100-900 scale. Weights were collapsed to bold/normal, and a numeric string like `'600'` then fell through to 400 in the renderer; numeric strings are parsed and numbers and keywords pass through untouched. Unsupported `textAlign` values are mapped rather than forwarded as-is.

Text shadow styles (`shadowColor`, `textShadow*`) are dropped with a warning instead of converted: the shipping SDF text renderer has no shadow, and RN's `textShadow*` props were never wired to the renderer's keys.
