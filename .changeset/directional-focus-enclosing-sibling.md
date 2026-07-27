---
'@plextv/react-lightning': patch
---

Directional focus can enter a sibling that fully encloses the source on the movement axis. A screen scene behind a floating header keeps its focusable content below the source, but the distance was measured to the sibling's top edge — above the source — so the move was rejected and focus stayed stuck in the header. Such a container is now entered from the source's trailing edge instead.
