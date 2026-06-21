---
"@plextv/react-lightning-plugin-flexbox": minor
"@plextv/react-lightning": patch
---

feat(flexbox): measure text synchronously in Yoga for wrapping and intrinsic sizing

Text leaves are now measured during Yoga layout (via msdf font metrics passed through the new `fonts` option) instead of relying solely on the renderer's async texture measurement, so text wraps and sizes correctly within flex layouts. The text node's explicit width/height is cleared when it becomes a measured leaf so the measure function — not a stale renderer-set width — drives its size, and `react-lightning` emits a `textChanged` signal so recycled/updated text re-measures.
