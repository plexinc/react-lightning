---
'@plextv/react-lightning-plugin-reanimated': patch
---

export createAnimatedComponent and createCSSAnimatedComponent as named exports so they resolve to the lightning implementation instead of reanimated's dom one.
