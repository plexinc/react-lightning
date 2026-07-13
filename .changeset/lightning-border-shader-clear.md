---
'@plextv/react-lightning': patch
---

fix(react-lightning): clear a removed border's shader on full restyles

The keep-shader guard (added so reanimated's partial pushes don't square off a rounded node) inferred "partial" from "no shader-relevant prop present". A full restyle that dropped a border matched that too, so a removed focus-ring border kept painting. It now gates on the PARTIAL_STYLE marker: a reconciler snapshot recomputes (and clears) the shader, while reanimated and imperative single-key style sets keep it. Imperative `el.style.x =` pushes are marked PARTIAL_STYLE too.
