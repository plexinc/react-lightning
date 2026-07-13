---
'@plextv/react-lightning-components': patch
---

Back-stop the VirtualList reveal gate for cells that never measure. A cell that is visible with an estimated size but has not measured yet (async content still pending) returned `Infinity` from the gate, so no re-check timer was scheduled and every cell below it stayed hidden until an unrelated commit woke the list. Such a cell now counts down the same max window a churning cell already uses, so the rows below it can't be stranded invisibly.
