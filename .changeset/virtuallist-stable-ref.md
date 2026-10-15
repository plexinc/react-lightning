---
'@plextv/react-lightning-components': patch
---

virtual list keeps one ref handle for its lifetime, so cells reading it from a layout effect during a scroll no longer get null.
