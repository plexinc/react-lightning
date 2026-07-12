---
'@plextv/react-lightning': patch
---

Add an opt-in `roundedClipping` render option: a node with borderRadius + clipping (overflow hidden) clips its children to the rounded rect, like the other RN platforms. Implemented via the renderer's stencil clip (`clipRadius`), so it costs no extra textures, nests, and works for text and images.
