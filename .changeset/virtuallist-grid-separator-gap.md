---
'@plextv/react-lightning-components': patch
---

VirtualList reserves the separator size between grid rows. The `ItemSeparatorComponent` size was left out of the multi-column row offsets, so rows sat a separator's height too high and the total content size came up short. Separators sit between rows rather than between columns (matching FlashList), and zero-height empty rows are skipped.
