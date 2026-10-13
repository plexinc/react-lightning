---
'@plextv/react-lightning-components': patch
---

virtuallist holds scrollToIndex until the viewport is measured, keeps the focused item snapped when items above it resize, adds scrollAnimationEnabled, shouldSuppressFocusScroll and onContentSizeChange, and fires onEndReached once per item count.
