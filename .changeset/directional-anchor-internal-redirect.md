---
'@plextv/react-lightning': patch
---

Anchor directional focus into a nested group and fix internal-redirect self-cycling. Directional nav now beams from the deepest focused leaf and descends by geometry into the chosen sibling, so a narrow-header-beside-wide-group row lands under the source's cross-axis position instead of on the group's first child; a redirect node is returned for the focus manager to forward to its destination. Separately, `_focusNode`'s upward walk now only hands focus off to external redirects: an internal redirect (destinations within the node's own subtree, e.g. an EPG airings guide pointing at its own cells) is already satisfied by the downward-arrival redirect, and re-firing it while walking back up targeted a descendant just visited and self-cycled, aborting the move and stranding focus on the guide's first child.
