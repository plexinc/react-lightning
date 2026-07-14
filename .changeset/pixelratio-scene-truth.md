---
'@plextv/react-native-lightning': patch
---

Report PixelRatio 1 instead of window.devicePixelRatio. The Lightning canvas backing store equals the configured scene size, so one layout pixel is one canvas pixel; inheriting react-native-web's devicePixelRatio made image sizing fetch 2x assets on retina displays that the renderer downscales anyway: 4x the texture memory for no visible gain, enough to blow the texture manager's cleanup budget and evict visible tiles.
