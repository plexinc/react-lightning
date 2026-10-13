---
'@plextv/react-lightning-plugin-reanimated': patch
---

:focus and :focus-within styles keep following focus after Suspense or Activity hides and shows a tree, instead of freezing on the state they had when it was hidden.
