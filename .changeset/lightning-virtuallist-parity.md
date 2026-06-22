---
"@plextv/react-lightning-components": minor
---

feat(virtuallist): getLayout ref API and skipChildFocusScroll opt-out for FlashList parity

`VirtualListRef` now exposes `getLayout(index)`, returning the scroll-space `{ x, y, width, height }` rectangle of an item (or `undefined` when out of range) — mirroring FlashList's per-item layout query for callers that interpolate row positions against the scroll offset (crossfade/parallax). A new `skipChildFocusScroll` prop opts out of VirtualList's internal focus-follow scroll: a focused child crossing a cell boundary still resolves and persists `focusedIndex`, but the list no longer scrolls the cell into view, letting the app layer own scrolling (e.g. a row that drives `scrollToIndex` from its own authoritative focused index). Both are additive — default behaviour is unchanged.
