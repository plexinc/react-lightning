---
'@plextv/react-lightning-plugin-reanimated': patch
---

Make `useDerivedValue(() => withTiming(...))` expose the live number reanimated does. It stored the raw animation descriptor, so reading it back for arithmetic (or as a style value) got an object, not a number. Now the derived value ticks from its current value toward the target on the JS thread each frame (timing and spring share the path, since a spring bakes its physics into the easing), so reads stay numeric and styles still animate. Composed programs (`withSequence`/`withRepeat`/`withDelay`) snap to their resting target.
