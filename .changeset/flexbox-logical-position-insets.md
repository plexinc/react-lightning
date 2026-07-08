---
'@plextv/react-lightning-plugin-flexbox': patch
---

Logical `start`/`end` position insets now map to yoga's `EDGE_START`/`EDGE_END` (LTR), matching the existing logical margin/padding handling. Previously they were silently dropped, so an absolutely positioned box pinned with `end: 0` fell back to the left edge.
