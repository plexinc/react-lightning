---
'@plextv/react-lightning-components': patch
---

VirtualList cells now pin their FlexRoot's cross axis to the cell's cross size when the list's cross size is definite (explicit style, parent cell bounds, or the flex-allocated outer size), so flex children can fill the cell width/height like a native list cell. Content-derived cross sizes stay unpinned to avoid the measure feedback loop.
