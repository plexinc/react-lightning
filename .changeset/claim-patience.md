---
'@plextv/react-lightning': patch
---

Initial focus claims get a second of patience, as on tvOS and Android. A claim whose destination key registers late (or becomes focusable late) moves focus there when the key arrives, as long as focus still sits in the claim and the user hasn't moved (a directional key or a landed `focusByKey`). A claim with nothing to land on (no destination that can take focus and no content of its own) loses to the next candidate once its second is up, instead of holding focus on an empty group.
