---
'@plextv/react-lightning': patch
'@plextv/react-lightning-plugin-css-transform': patch
---

add an optional `transformStyle` plugin hook so a plugin can convert the keys it handles inside the style fast path, and use it in css-transform for updates that only carry `transform` and `opacity` (reanimated's pushes), which used to go through the full transform pipeline
