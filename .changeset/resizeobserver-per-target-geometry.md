---
'@plextv/react-lightning': patch
---

The ResizeObserver shim reports each entry against its own target's rect. A single shared layout handler meant every observed element was handed the last-laid-out element's geometry, and the handler couldn't be removed per target on `unobserve`/`disconnect`.
