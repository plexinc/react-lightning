---
'@plextv/react-lightning-plugin-flexbox': patch
'@plextv/react-lightning-components': patch
---

Reveal VirtualList cells off Yoga's `settled` signal instead of wall-clock timers. A cell now reads its final size once layout has converged to a fixpoint and reports it as authoritative, so the LayoutManager skips its stability window and the RevealGate skips its quiet window. Cuts content-paint latency on the main-thread (worker-off) path; worker mode never emits `settled`, so it falls back to the existing timers.
