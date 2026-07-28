---
'@plextv/react-lightning-components': patch
---

VirtualList reconciles its scroll offset against the latest content size. A shrink reclamps the offset instead of leaving it past the new end, and a list short enough to fit its viewport primes `onEndReached` on mount. The clamp and threshold decision is now shared by the scroll handler and the content-size effect, so both paths agree.
