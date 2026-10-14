---
'@plextv/react-lightning-plugin-reanimated': patch
---

A static style change on an animated component now paints with the commit that changed it. The wrapper handed its child the style from the previous render, so a changed `backgroundColor` (or any non-animated style key) showed up one update late, and a card that toggled its background on focus looked focused after it had blurred.
