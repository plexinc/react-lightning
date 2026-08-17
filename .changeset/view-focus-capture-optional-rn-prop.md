---
'@plextv/react-native-lightning': patch
---

`View`'s `onFocusCapture` type no longer assumes `react-native`'s `ViewProps` declares the prop. react-native-tvos has it, plain react-native doesn't, so the indexed access was a hard `check:types` error for anyone on upstream react-native. Reads the prop only when it's actually present, so both forks typecheck.
