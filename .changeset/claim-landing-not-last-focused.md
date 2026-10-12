---
'@plextv/react-lightning': patch
---

Where a claim lands on its own no longer counts as the region's last-focused item. A claim like `['last-focused', episodeKey]` that falls back to its first child while the episode key is still mounting now moves to the episode when it registers, instead of resolving 'last-focused' to its own fallback and staying put. A side effect: until the user moves inside the claimed region, a later `autoFocus` child there can still take its preferred slot.
