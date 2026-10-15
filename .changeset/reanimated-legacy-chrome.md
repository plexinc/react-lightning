---
'@plextv/react-lightning': patch
'@plextv/react-lightning-plugin-reanimated': patch
---

Animated styles and `:focus-within` no longer need Chrome 71+ / 92+: they schedule through the exported `scheduleMicrotask` (a promise where `queueMicrotask` is missing) and read the focus leaf by index instead of `Array.prototype.at`.
