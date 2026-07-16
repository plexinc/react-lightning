---
'@plextv/react-lightning': patch
---

React-hidden trees (Activity mode="hidden", suspended Suspense content) now set display: none instead of only alpha: 0, so they release their layout space like react-dom. The hide is sticky across later style pushes (a full style update used to reset display and pop the space back in while invisible), and unhide restores display and opacity from the current props.
