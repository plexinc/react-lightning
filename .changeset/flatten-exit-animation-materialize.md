---
'@plextv/react-lightning': patch
---

Fix flattened elements leaking when they run a reanimated exit animation. A layout-only view flattens to a placeholder node, and a placeholder's `animate()` is a no-op that never emits `stopped`. Reanimated defers node removal until the exit animation finishes, so on a flattened wrapper the finish never fired, the deferred destroy never ran, and the subtree (and its real image descendants) stayed on the scene forever, stacking on every remount. Materialize the element when a deferred-removal handler is attached so the exit animation runs on a real node and completes.
