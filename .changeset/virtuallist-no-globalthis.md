---
'@plextv/react-lightning-components': patch
---

VirtualList reads the pointer focus-scroll hook off `window` (or `self`) instead of `globalThis`, which needs Chrome 71.
