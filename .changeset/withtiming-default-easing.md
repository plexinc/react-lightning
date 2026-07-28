---
'@plextv/react-lightning-plugin-reanimated': patch
---

`withTiming` with no easing defaults to reanimated's `Easing.inOut(Easing.quad)`, expressed as the equivalent cubic-bezier the renderer parses. It previously fell back to linear, so every un-eased timing animation ran flat.
