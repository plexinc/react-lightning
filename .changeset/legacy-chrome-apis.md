---
'@plextv/react-lightning': patch
'@plextv/react-native-lightning': patch
---

Run on Chrome 57-73 (webOS 5, Tizen 5.x): the ResizeObserver shim no longer crashes `render()` when the browser has no ResizeObserver or DOMRectReadOnly, microtasks fall back to a promise where `queueMicrotask` is missing, and `Array.prototype.at` / `flat` are no longer used on the render, focus and key paths.
