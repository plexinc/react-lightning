---
'@plextv/react-lightning-plugin-flexbox': patch
---

fix(flexbox): detach removed nodes from the yoga parent so shrink-fit containers shrink

`removeNode` freed the child's yoga node and spliced the ManagerNode children array, but never called `parent.node.removeChild(child.node)` on the yoga nodes themselves (unlike `detachChildNode`). The freed child stayed in the parent's yoga child list, so on the next layout the parent kept laying it out and a shrink-to-content container never shrank back. Visible as buttons that grow to fit a label on focus but stay expanded after blur once the label is removed. Now the child is detached from its yoga parent before it's freed.
