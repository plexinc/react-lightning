---
'@plextv/react-lightning-plugin-css-transform': patch
---

Color parsing handles 8- and 4-digit alpha hex, `hsl()`/`hsla()`, and the modern space-separated `rgb()` form with a `/` alpha delimiter. These previously fell through unparsed.

`PlatformColor`/`OpaqueColorValue` objects have no resolvable string form, so they're dropped with a warning (like unresolvable keyword colors) instead of throwing and taking the screen down.
