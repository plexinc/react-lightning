---
'@plextv/react-lightning-plugin-reanimated': patch
---

Infer reanimated hook dependencies at runtime by tracking shared-value reads. No babel plugin runs on Lightning, so `useAnimatedStyle` / `useDerivedValue` / `useAnimatedReaction` without an explicit dependency array never subscribed to their shared values and only updated on re-renders. Shared values from `useSharedValue` / `makeMutable` now report reads to the active hook, which subscribes to exactly what its updater read (re-collected on every run, so branches are handled). Explicit dependency arrays keep their old behavior.
