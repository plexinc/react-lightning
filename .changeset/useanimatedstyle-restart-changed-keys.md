---
'@plextv/react-lightning-plugin-reanimated': patch
---

`useAnimatedStyle` restarts only the keys whose animation actually changed. Every update previously tore down and restarted all runners, so an unrelated key's animation was restarted mid-flight and visibly jumped.
