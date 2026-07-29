---
'@plextv/react-lightning-plugin-reanimated': patch
---

`withRepeat` treats any count <= 0 as infinite on both the renderer-looped and composed paths, matching native reanimated. Only `-1` was infinite before, so a `0` count stopped immediately instead of looping forever.
