---
'@plextv/react-lightning': patch
'@plextv/react-native-lightning': patch
---

Add `BackHandler`, `useTVEventHandler`, `TVEventHandler`, `TVEventControl` and the `HWEvent` type, fed by a global key bus (`keyEventBus`) that `CanvasRoot` dispatches every key press nothing on the focus path handled to, newest listener first, so apps no longer need their own key handler provider.
