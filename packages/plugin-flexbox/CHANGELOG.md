# @plextv/react-lightning-plugin-flexbox

## 0.4.3-alpha.1

### Patch Changes

- 5f304aa: Keep className-derived styles on style-only updates. Update payloads omit an unchanged className, so its resolved styles vanished from the style object and the flexbox plugin reset those props (a column screen re-laid out as a row after toggling display). The className plugin now remembers what it resolved per instance. Also: a dropped flexDirection resets to column (the node creation default, not the CSS row default), and addChildNode without an index appends at the parent's child count instead of index 0.
- Updated dependencies [edaeae2]
- Updated dependencies [895f6a9]
- Updated dependencies [badb2f6]
- Updated dependencies [692445d]
- Updated dependencies [0f901bd]
  - @plextv/react-lightning@0.4.3-alpha.1

## 0.4.3-alpha.0

### Patch Changes

- df7da6a: Add a deterministic layout benchmark (synthetic home/details/grid/epg pages run through the real managers) with a baseline gate, so layout changes are checked instead of eyeballed.
- 69653c6: Logical `start`/`end` position insets now map to yoga's `EDGE_START`/`EDGE_END` (LTR), matching the existing logical margin/padding handling. Previously they were silently dropped, so an absolutely positioned box pinned with `end: 0` fell back to the left edge.
- 5e69f9c: Measure missing glyphs at the ? fallback advance so text boxes match painted output
- c34f03c: Reset yoga props to their defaults when a style re-apply drops them
- ec4f817: Add a synchronous flushLayout() that lays out to a fixpoint, and a settled event that fires once layout converges. Deterministic replacement for the timer-based "has it settled yet" guesses in VirtualList.
- 4a7e3a4: fix(reanimated): apply animated transforms and replay resting styles to late-attached nodes

  Two gaps stopped a reanimated `transform` (e.g. a scroll-linked `translateY`) from reaching a laid-out node. The flexbox worker proxy filtered every non-flex style key before postMessage, so `transform` was dropped even though the worker-side Yoga already applies it as a top/left offset (and the serializer special-cases transform objects) — let it through. And `useAnimatedStyle` only pushed styles when a shared value changed, so a view that registers after the fact (recycled cell, re-created node) never got the current resting value; `AnimatedStyle` now exposes `applyToView`, which `createAnimatedComponent` calls on registration to replay the last-applied styles. Replay-only on purpose: computing a fresh value at attach time pushed states the normal flow never emitted and broke focus on some nodes.

- f31d1d1: fix(flexbox): parse string `aspectRatio` values so ratio-sized nodes get a box

  React Native accepts `aspectRatio` as a number (`1.5`), a ratio string (`'3/2'`), or a numeric string (`'1.5'`), but the value was passed straight to Yoga's `setAspectRatio`, which only takes a number. String forms became `NaN` and the ratio was silently dropped — so a node sized only by `aspectRatio` plus one dimension (e.g. an image with `aspectRatio: '3/2'` and `height: '65%'` but no width) resolved to zero width and never painted. String ratios are now parsed to a number before being applied.

- 7005125: fix(flexbox): withhold paint until first layout to avoid the async-flex origin flash

  Flex layout is computed asynchronously (in a worker), so a definite-sized node mounts and paints at its pre-layout origin (0,0) for a frame or two before the layout result moves it. A node now keeps its rendered alpha at 0 from mount until its first layout resolves, then restores the styled alpha (`withholdPaintUntilLayout` / `releaseWithheldPaint`). Zero-sized and already-invisible nodes are skipped, and subtrees detached from flex layout are released so they can never be stranded invisible.

- 15fb74a: fix(flexbox): detach removed nodes from the yoga parent so shrink-fit containers shrink

  `removeNode` freed the child's yoga node and spliced the ManagerNode children array, but never called `parent.node.removeChild(child.node)` on the yoga nodes themselves (unlike `detachChildNode`). The freed child stayed in the parent's yoga child list, so on the next layout the parent kept laying it out and a shrink-to-content container never shrank back. Visible as buttons that grow to fit a label on focus but stay expanded after blur once the label is removed. Now the child is detached from its yoga parent before it's freed.

- b2492c6: Handle same-parent insertChild as a move so reordered children re-layout in the new order
- 660ae8d: feat(flexbox): measure text synchronously in Yoga for wrapping and intrinsic sizing

  Text leaves are now measured during Yoga layout (via msdf font metrics passed through the new `fonts` option) instead of relying solely on the renderer's async texture measurement, so text wraps and sizes correctly within flex layouts. The text node's explicit width/height is cleared when it becomes a measured leaf so the measure function — not a stale renderer-set width — drives its size, and `react-lightning` emits a `textChanged` signal so recycled/updated text re-measures.

- dded826: fix(flexbox): resolve font atlas URLs before they cross into the Yoga worker

  The Yoga worker is bundled inline (`?worker&inline`), so in a production build its `self.location` is a `blob:` URL. A root-relative atlas URL like `/fonts/x.msdf.json` (what `import.meta.env.BASE_URL` produces) can't resolve against a blob base, so the worker's `fetch` threw "is not a valid URL" and font metrics never loaded — text fell back to single-line, unmeasured layout. It only reproduced in built apps; the dev server serves the worker as a real module, so root-relative URLs resolved fine. Atlas URLs are now resolved to absolute against the document URL on the main thread, before the options cross `postMessage`.

- 8d993ca: Resolve percentage translateX/translateY against the node's own size (RN semantics). The css-transform converter used parseInt, which stripped the % and treated the number as pixels; the flexbox plugin now stashes the percentage and resolves it at layout readback, once the node's computed size is known, and keeps emitting the node on passes that don't dirty yoga.
- f2f0c11: Reveal VirtualList cells off Yoga's `settled` signal instead of wall-clock timers. A cell now reads its final size once layout has converged to a fixpoint and reports it as authoritative, so the LayoutManager skips its stability window and the RevealGate skips its quiet window. Cuts content-paint latency on the main-thread (worker-off) path; worker mode never emits `settled`, so it falls back to the existing timers.
- Updated dependencies [e2a5e11]
- Updated dependencies [5237e31]
- Updated dependencies [8d0b8e8]
- Updated dependencies [3a9a0c7]
- Updated dependencies [01a42e4]
- Updated dependencies [7005125]
- Updated dependencies [66c2c93]
- Updated dependencies [9beb550]
- Updated dependencies [6e50057]
- Updated dependencies [b2492c6]
- Updated dependencies [3f4ed43]
- Updated dependencies [660ae8d]
- Updated dependencies [f6bee05]
- Updated dependencies [43594e7]
  - @plextv/react-lightning@0.4.3-alpha.0

## 0.4.2

### Patch Changes

- 247d2e8: chore: Remove .cjs from packages
- Updated dependencies [247d2e8]
  - @plextv/react-lightning@0.4.2

## 0.4.1

### Patch Changes

- 38f1b60: chore: Update dependencies and migrate from Biome to oxc
- 38f1b60: refactor: Rework YogaManager, LightningManager, and the worker pipeline for faster prop translation and a non-flex fast path.
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
  - @plextv/react-lightning@0.4.1

## 0.4.0

### Patch Changes

- 848a0c1: fix: Layout event sometimes does not get fired
- 8d4ef27: fix: Minor optimization
- 8c5ce17: fix(flexbox): Fix Flexbox not applying translate transforms to non-text/image elements
- 848a0c1: chore: Dependency version bumps
- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- Updated dependencies [01d5f33]
- Updated dependencies [f9a9cab]
- Updated dependencies [264488a]
- Updated dependencies [848a0c1]
- Updated dependencies [589da1b]
- Updated dependencies [8d1ac42]
- Updated dependencies [1c9a5ac]
- Updated dependencies [848a0c1]
- Updated dependencies [b5e7254]
- Updated dependencies [8d1ac42]
- Updated dependencies [f9a9cab]
- Updated dependencies [451dddd]
- Updated dependencies [a7a4885]
- Updated dependencies [dbaa0ed]
  - @plextv/react-lightning@0.4.0

## 0.4.0-alpha.3

### Patch Changes

- 8d4ef27: fix: Minor optimization

## 0.4.0-alpha.2

### Patch Changes

- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- Updated dependencies [451dddd]
- Updated dependencies [a7a4885]
  - @plextv/react-lightning@0.4.0-alpha.4

## 0.4.0-alpha.1

### Patch Changes

- 8c5ce17: fix(flexbox): Fix Flexbox not applying translate transforms to non-text/image elements
- Updated dependencies [1c9a5ac]
  - @plextv/react-lightning@0.4.0-alpha.2

## 0.4.0-alpha.0

### Minor Changes

- 63ec701: Move everything to React 19 and React Native 0.82

### Patch Changes

- Updated dependencies [63ec701]
  - @plextv/react-lightning@0.4.0-alpha.0

## 0.3.14

### Patch Changes

- 10332b7: chore: Clean up some package typings
- 10332b7: fix(flexbox): Fix worker not working in dev mode
- Updated dependencies [10332b7]
  - @plextv/react-lightning@0.3.12

## 0.3.13

### Patch Changes

- 976b1a8: chore(flexbox): Fix worker builds for legacy targets

## 0.3.12

### Patch Changes

- 6b98299: chore(react-native): Fix RN not loading properly

## 0.3.11

### Patch Changes

- 62f280f: chore(flexbox): One more package.json fix

## 0.3.10

### Patch Changes

- 461defb: chore(flexbox): Fix bad exports in package.json

## 0.3.9

### Patch Changes

- 774d679: chore: Force package version bump
- Updated dependencies [774d679]
  - @plextv/react-lightning@0.3.11

## 0.3.8

### Patch Changes

- ded4552: Updated lightning and storybook packages
- 65a90d4: chore: Package updates and dep cleanup
- Updated dependencies [ded4552]
- Updated dependencies [65a90d4]
  - @plextv/react-lightning@0.3.10

## 0.3.7

### Patch Changes

- 81db081: (flexbox) Prevent unserializable values being passed to worker"

## 0.3.6

### Patch Changes

- bcc5e8c: Fix some issues with focus and layers
- Updated dependencies [bcc5e8c]
  - @plextv/react-lightning@0.3.7

## 0.3.5

### Patch Changes

- eb0c947: Added Focus Redirection support
- Updated dependencies [eb0c947]
  - @plextv/react-lightning@0.3.4

## 0.3.4

### Patch Changes

- 948b31b: Handle flexbox sometimes not parsing updates correctly when components were removed

## 0.3.3

### Patch Changes

- d26a135: Fix race condition in flexbox worker mode

## 0.3.2

### Patch Changes

- 56769e3: Include tseep into the build
- Updated dependencies [56769e3]
  - @plextv/react-lightning@0.3.2

## 0.3.1

### Patch Changes

- 81ff0f5: Flexbox performance improvements, and added optional useWebWorker option
- c2fe33c: More optimizations with yoga workers
- 81ff0f5: Switch builds to use vite and update packages
- Updated dependencies [81ff0f5]
- Updated dependencies [c2fe33c]
- Updated dependencies [81ff0f5]
- Updated dependencies [4e58bb5]
- Updated dependencies [81ff0f5]
  - @plextv/react-lightning@0.3.1

## 0.3.0

### Minor Changes

- 3c22b29: Change package scope from plexinc to plextv

### Patch Changes

- Updated dependencies [3c22b29]
  - @plextv/react-lightning@0.3.0

## 0.2.8

### Patch Changes

- Updated dependencies [2f2f8f2]
  - @plextv/react-lightning@0.2.8

## 0.2.7

### Patch Changes

- Updated dependencies [d757a05]
- Updated dependencies [f057984]
  - @plextv/react-lightning@0.2.7

## 0.2.6

### Patch Changes

- Updated dependencies [d14b8f2]
- Updated dependencies [d14b8f2]
  - @plextv/react-lightning@0.2.6

## 0.2.5

### Patch Changes

- Updated dependencies [680a2ef]
  - @plextv/react-lightning@0.2.5

## 0.2.4

### Patch Changes

- c531bf6: Skip processing hidden nodes for flex calculations, with an option to opt out
- Updated dependencies [7155482]
  - @plextv/react-lightning@0.2.4

## 0.2.3

### Patch Changes

- Updated dependencies [eb5907d]
  - @plextv/react-lightning@0.2.3

## 0.2.2

### Patch Changes

- 2c7be90: Fix packages not importing properly in some cases
- Updated dependencies [2c7be90]
  - @plextv/react-lightning@0.2.2

## 0.2.1

### Patch Changes

- 8406624: Fix rollup not building proper index files for absolute imports
- Updated dependencies [8406624]
  - @plextv/react-lightning@0.2.1

## 0.2.0

### Minor Changes

- a793b9b: Clean up build configs for better support

### Patch Changes

- Updated dependencies [a793b9b]
- Updated dependencies [c86498e]
  - @plextv/react-lightning@0.2.0

## 0.1.9

### Patch Changes

- Updated dependencies [a4a409c]
  - @plextv/react-lightning@0.1.6

## 0.1.8

### Patch Changes

- Updated dependencies [a2d64f0]
  - @plextv/react-lightning@0.1.5

## 0.1.7

### Patch Changes

- e0cd671: Fix maxWidth when parent is unmeasurable

## 0.1.6

### Patch Changes

- a42e9d6: Fix bug with maxWidth not setting contain property on text nodes

## 0.1.5

### Patch Changes

- 81e885f: Fixed maxWidth being applied incorrectly on unmeasured elements

## 0.1.4

### Patch Changes

- Updated dependencies [3ef955a]
- Updated dependencies [6bececd]
  - @plextv/react-lightning@0.1.4

## 0.1.3

### Patch Changes

- c7589f6: Fixing cjs builds pt.2
- Updated dependencies [c7589f6]
  - @plextv/react-lightning@0.1.3

## 0.1.2

### Patch Changes

- 341b33d: Fix cjs builds for packages to include es interop
- Updated dependencies [341b33d]
  - @plextv/react-lightning@0.1.2

## 0.1.1

### Patch Changes

- 1dfeb72: Updated packages
- Updated dependencies [1dfeb72]
  - @plextv/react-lightning@0.1.1
