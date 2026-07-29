---
'@plextv/react-lightning-components': patch
---

A center-aligned focus target stays mid-viewport instead of snapping to the header/footer edge. The edge protection left rows near a header or footer stuck at the top or bottom; center placement now wins (tvOS parity), and the downstream clamp still bounds the resulting target.
