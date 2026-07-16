---
'@plextv/react-lightning-components': patch
---

VirtualList no longer reports the DEFAULT_ITEM_SIZE guess through onLayout. Callers that derive layout from that width (Grid computes numColumns and re-keys the list) would remount the list on every guess-measure-guess cycle, an infinite loop when the list mounts without a laid-out size (e.g. inside a hidden Activity). resolveCrossSize now flags the fallback as an estimate and the onLayout effect skips it.
