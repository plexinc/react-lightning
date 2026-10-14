---
'@plextv/react-lightning-components': patch
---

let the React Compiler memoize the VirtualList scroll handler hook, which it skipped entirely because a ref was handed to a function during render
