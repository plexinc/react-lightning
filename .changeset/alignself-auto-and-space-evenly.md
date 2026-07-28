---
'@plextv/react-lightning-plugin-flexbox': patch
---

`alignSelf: 'auto'` resolves to the parent's `alignItems` (yoga `ALIGN_AUTO`) instead of being mapped to a fixed alignment, matching RN's type and behavior. `space-evenly` maps to yoga's `ALIGN_SPACE_EVENLY` rather than sharing the `space-between` case.
