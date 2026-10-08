---
'@plextv/react-lightning': minor
---

`FocusManager` takes `batchInitialFocus` (on in `CanvasRoot`): the first focus pick and initial focus claims wait for the registrations of the current tick, a claim whose winner has no content yet holds the default pick for up to a second, and a focused item that goes away while its list re-renders is repicked once the new items are in. Entering a group at `first` picks the top-left item instead of the first registered, `last-focused` in `destinationKeys` skips a group that never had focus, an outer `last-focused` group returns to the exact remembered item through nested `first` groups, removal repick falls to the next sibling on ties, and a group that unmounts while focused sends no `onFocusLeave`. A reparented element that stays on the focus path is no longer blurred and refocused.
