---
'@plextv/react-lightning-plugin-css-transform': patch
'@plextv/react-lightning-plugin-flexbox': patch
---

Resolve percentage translateX/translateY against the node's own size (RN semantics). The css-transform converter used parseInt, which stripped the % and treated the number as pixels; the flexbox plugin now stashes the percentage and resolves it at layout readback, once the node's computed size is known, and keeps emitting the node on passes that don't dirty yoga.
