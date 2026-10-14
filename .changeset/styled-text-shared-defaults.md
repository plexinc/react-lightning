---
'@plextv/react-lightning-components': patch
---

use shared default props in StyledText so a re-render without them doesn't re-run its layout effect and restyle every segment
