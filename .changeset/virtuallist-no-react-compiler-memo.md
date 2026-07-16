---
'@plextv/react-lightning-components': patch
---

Keep the React Compiler from caching VirtualList's mutable layout reads. Layout state lives in the LayoutManager and every change (data updates, measurements, reveal re-checks) signals through a bare version-bump state that the compiler's dependency sets never see, so the memoized visible range replayed stale and data arriving after mount never mounted any cells (the footer offset had the same staleness). The render-phase reads now live in two `'use no memo'` hooks (`useVisibleRange`, `useLayoutTotalSize`) whose fresh results downstream scopes key on; the rest of the component stays compiled.
