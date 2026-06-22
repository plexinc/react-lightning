---
"@plextv/react-lightning": minor
"@plextv/react-lightning-plugin-flexbox": patch
---

fix(flexbox): withhold paint until first layout to avoid the async-flex origin flash

Flex layout is computed asynchronously (in a worker), so a definite-sized node mounts and paints at its pre-layout origin (0,0) for a frame or two before the layout result moves it. A node now keeps its rendered alpha at 0 from mount until its first layout resolves, then restores the styled alpha (`withholdPaintUntilLayout` / `releaseWithheldPaint`). Zero-sized and already-invisible nodes are skipped, and subtrees detached from flex layout are released so they can never be stranded invisible.
