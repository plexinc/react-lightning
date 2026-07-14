---
'@plextv/react-lightning-components': patch
---

Resolve the focused VirtualList index with the cross axis. handleVLFocus mapped the focused child back to an item via its main-axis offset alone, which in a multi-column grid identifies only the row: findIndexAtOffset returned the row's first index, the shouldFocus claim then pulled focus to column 0. New LayoutManager.findIndexAt(offset, crossOffset) walks the row's entries and picks the column containing the cross position, so D-pad Down/Up land on the item directly below/above.
