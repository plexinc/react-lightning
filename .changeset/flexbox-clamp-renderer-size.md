---
'@plextv/react-lightning-plugin-flexbox': patch
---

clamp a node's width and height by its min/max before handing them to the renderer, so a node no longer renders wider than its maxWidth when Yoga reports no new layout.
