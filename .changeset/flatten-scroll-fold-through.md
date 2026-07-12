---
'@plextv/react-lightning': patch
---

Fix flattened content not scrolling: a scroll handler (or any code) that writes a flattened element's position straight through `node.x`/`node.y`, bypassing `setProps`, now folds through to the hoisted children. The placeholder's `x`/`y` are accessors that notify the owning element, which re-pushes the offset to descendants. Without this, a direct write landed on the inert placeholder and the content only jumped to its final position on the next React commit (no animation).
