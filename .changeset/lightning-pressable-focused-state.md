---
'@plextv/react-native-lightning': patch
---

fix(pressable): expose `focused` to function children

`Pressable` tracked only `{ pressed }` in state and passed that to its style/children render functions, so `focused` was always `undefined`. Every focus-driven visual built on RN's `({ focused }) => …` contract — focus rings, focus scale — was dead on Lightning. It also only wired `onFocus`/`onBlur` to the node when the consumer passed those callbacks, so a focusable with no listeners tracked nothing.

`Pressable` now tracks `focused` in state, updates it on focus/blur regardless of whether the consumer passes `onFocus`/`onBlur` (still forwarding to them), and passes `{ focused, pressed }` to its function children — matching React Native. The `pressed` setters no longer replace the whole state object, so a keypress can't clobber `focused`.
