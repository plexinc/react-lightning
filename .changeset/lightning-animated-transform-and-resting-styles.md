---
'@plextv/react-lightning-plugin-flexbox': patch
'@plextv/react-lightning-plugin-reanimated': patch
---

fix(reanimated): apply animated transforms and replay resting styles to late-attached nodes

Two gaps stopped a reanimated `transform` (e.g. a scroll-linked `translateY`) from reaching a laid-out node. The flexbox worker proxy filtered every non-flex style key before postMessage, so `transform` was dropped even though the worker-side Yoga already applies it as a top/left offset (and the serializer special-cases transform objects) — let it through. And `useAnimatedStyle` only pushed styles when a shared value changed, so a view that registers after the fact (recycled cell, re-created node) never got the current resting value; `AnimatedStyle` now exposes `applyToView`, which `createAnimatedComponent` calls on registration to replay the last-applied styles. Replay-only on purpose: computing a fresh value at attach time pushed states the normal flow never emitted and broke focus on some nodes.
