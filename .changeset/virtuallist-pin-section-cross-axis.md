---
'@plextv/react-lightning-components': patch
---

VirtualList header and footer now pin their FlexRoot's cross axis under the same definiteness rule as the cells, so flex content (e.g. a stretch Column) fills the list width instead of shrink-fitting to its widest child.
