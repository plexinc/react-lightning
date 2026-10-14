---
'@plextv/react-lightning-components': patch
---

reconcile VirtualList slots without allocating an entry array per active slot, and record the last slot only when an index is assigned
