---
'@plextv/react-lightning': patch
---

A claim that was removed no longer blocks the next one. Before, once the target of a lower priority claim unmounted, a later higher priority claim in the same scope never took focus.
