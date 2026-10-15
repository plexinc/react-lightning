---
'@plextv/react-lightning-components': patch
---

virtual list keeps the focused row snapped when a scrollToIndex or scrollToOffset asks for the spot focus already scrolled to, so rows above it resizing afterwards no longer leave it off its rest position.
