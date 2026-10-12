---
'@plextv/react-lightning': patch
---

An empty group that only forwards focus (`destinationKeys` or `destinations` with no focusable children, like a claim region) is no longer picked when a focused item unmounts or when focus enters its parent. Before, a remounting button could leave focus stuck on the invisible claim region next to it.
