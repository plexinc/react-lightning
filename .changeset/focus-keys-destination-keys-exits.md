---
'@plextv/react-lightning': minor
---

Focus groups can be registered under a string `focusKey`, so other groups can name them without holding a ref. `destinationKeys` forwards arriving focus to the first mounted key (`first` and `last-focused` stand for the group's own first and remembered child), `exits` sends a move that finds nothing inside the group to a key per direction, and `FocusManager.focusByKey` focuses a keyed element.
