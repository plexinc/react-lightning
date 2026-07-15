---
'@plextv/react-lightning-components': patch
---

Give a vertical VirtualList's outer element a zero flex basis. With the default auto basis, the content plane's explicit height became the flex basis of every ancestor, and one grow-only ancestor (no flexShrink) locked the whole chain at content height (tens of thousands of px). A virtualized list never sizes from its content.
