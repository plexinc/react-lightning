---
'@plextv/react-lightning': patch
---

Contain zIndex to its RN parent under view flattening. A flattened wrapper hoisted zIndex-carrying children to the nearest real ancestor, letting the index compete against unrelated subtrees (a nav bar's zIndex: 2 outranked modal screens mounted after it). A non-zero zIndex/zIndexLocked now materializes the flattened parent so the index only sorts among its real RN siblings, on attach and on every zIndex write path (setNodeProp, batched props, fast-path styles).
