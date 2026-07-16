# @plextv/react-lightning-components

## 0.4.4-alpha.1

### Patch Changes

- badb2f6: Bubble focus/blur events up the element tree. tvOS and web deliver focus events to ancestor views (a wrapper View's onFocus fires when a focused descendant changes), but the focus path only reaches registered focus nodes, so handlers on plain wrappers never fired. FocusManager now walks the focused leaf's element ancestry on every leaf change and delivers the event to elements that didn't just fire their own focus()/blur(). VirtualList forwards onFocus/onBlur to its outer element so handlers spread onto a list participate like they do on a native FlashList host view.
- 0980f51: Resolve the focused VirtualList index with the cross axis. handleVLFocus mapped the focused child back to an item via its main-axis offset alone, which in a multi-column grid identifies only the row: findIndexAtOffset returned the row's first index, the shouldFocus claim then pulled focus to column 0. New LayoutManager.findIndexAt(offset, crossOffset) walks the row's entries and picks the column containing the cross position, so D-pad Down/Up land on the item directly below/above.
- 18eb21a: Give a vertical VirtualList's outer element a zero flex basis. With the default auto basis, the content plane's explicit height became the flex basis of every ancestor, and one grow-only ancestor (no flexShrink) locked the whole chain at content height (tens of thousands of px). A virtualized list never sizes from its content.
- 74aefc6: VirtualList understands the native snap props: `snapToAlignment`/`scrollSnapAlign` resolve per child, `scrollSnapOffset` shifts the snap point, and `snapToItemPadding` pads the snapped item against the viewport edge.
- 75738d7: Keep the React Compiler from caching VirtualList's mutable layout reads. Layout state lives in the LayoutManager and every change (data updates, measurements, reveal re-checks) signals through a bare version-bump state that the compiler's dependency sets never see, so the memoized visible range replayed stale and data arriving after mount never mounted any cells (the footer offset had the same staleness). The render-phase reads now live in two `'use no memo'` hooks (`useVisibleRange`, `useLayoutTotalSize`) whose fresh results downstream scopes key on; the rest of the component stays compiled.
- 5af32c0: Back-stop the VirtualList reveal gate for cells that never measure. A cell that is visible with an estimated size but has not measured yet (async content still pending) returned `Infinity` from the gate, so no re-check timer was scheduled and every cell below it stayed hidden until an unrelated commit woke the list. Such a cell now counts down the same max window a churning cell already uses, so the rows below it can't be stranded invisibly.
- Updated dependencies [edaeae2]
- Updated dependencies [5f304aa]
- Updated dependencies [895f6a9]
- Updated dependencies [badb2f6]
- Updated dependencies [692445d]
- Updated dependencies [0f901bd]
  - @plextv/react-lightning@0.4.3-alpha.1
  - @plextv/react-lightning-plugin-flexbox@0.4.3-alpha.1

## 0.4.4-alpha.0

### Patch Changes

- 658f68e: feat(virtuallist): getLayout ref API and skipChildFocusScroll opt-out for FlashList parity

  `VirtualListRef` now exposes `getLayout(index)`, returning the scroll-space `{ x, y, width, height }` rectangle of an item (or `undefined` when out of range) — mirroring FlashList's per-item layout query for callers that interpolate row positions against the scroll offset (crossfade/parallax). A new `skipChildFocusScroll` prop opts out of VirtualList's internal focus-follow scroll: a focused child crossing a cell boundary still resolves and persists `focusedIndex`, but the list no longer scrolls the cell into view, letting the app layer own scrolling (e.g. a row that drives `scrollToIndex` from its own authoritative focused index). Both are additive — default behaviour is unchanged.

- 0647e88: VirtualList cells now pin their FlexRoot's cross axis to the cell's cross size when the list's cross size is definite (explicit style, parent cell bounds, or the flex-allocated outer size), so flex children can fill the cell width/height like a native list cell. Content-derived cross sizes stay unpinned to avoid the measure feedback loop.
- 7f54f81: VirtualList header and footer now pin their FlexRoot's cross axis under the same definiteness rule as the cells, so flex content (e.g. a stretch Column) fills the list width instead of shrink-fitting to its widest child.
- f2f0c11: Reveal VirtualList cells off Yoga's `settled` signal instead of wall-clock timers. A cell now reads its final size once layout has converged to a fixpoint and reports it as authoritative, so the LayoutManager skips its stability window and the RevealGate skips its quiet window. Cuts content-paint latency on the main-thread (worker-off) path; worker mode never emits `settled`, so it falls back to the existing timers.
- Updated dependencies [e2a5e11]
- Updated dependencies [5237e31]
- Updated dependencies [8d0b8e8]
- Updated dependencies [df7da6a]
- Updated dependencies [69653c6]
- Updated dependencies [5e69f9c]
- Updated dependencies [c34f03c]
- Updated dependencies [ec4f817]
- Updated dependencies [3a9a0c7]
- Updated dependencies [4a7e3a4]
- Updated dependencies [f31d1d1]
- Updated dependencies [01a42e4]
- Updated dependencies [7005125]
- Updated dependencies [15fb74a]
- Updated dependencies [66c2c93]
- Updated dependencies [9beb550]
- Updated dependencies [6e50057]
- Updated dependencies [b2492c6]
- Updated dependencies [3f4ed43]
- Updated dependencies [660ae8d]
- Updated dependencies [dded826]
- Updated dependencies [8d993ca]
- Updated dependencies [f6bee05]
- Updated dependencies [43594e7]
- Updated dependencies [f2f0c11]
  - @plextv/react-lightning@0.4.3-alpha.0
  - @plextv/react-lightning-plugin-flexbox@0.4.3-alpha.0

## 0.4.3

### Patch Changes

- cff7886: chore(virtuallist): A little cleanup and aligning typings with FlashList a little better

## 0.4.2

### Patch Changes

- 247d2e8: chore: Remove .cjs from packages
- Updated dependencies [247d2e8]
  - @plextv/react-lightning@0.4.2
  - @plextv/react-lightning-plugin-flexbox@0.4.2

## 0.4.1

### Patch Changes

- 38f1b60: feat: Add VirtualList component for fast virtualized lists with view recycling
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
  - @plextv/react-lightning@0.4.1
  - @plextv/react-lightning-plugin-flexbox@0.4.1

## 0.4.0

### Patch Changes

- 848a0c1: chore: Dependency version bumps
- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- Updated dependencies [01d5f33]
- Updated dependencies [f9a9cab]
- Updated dependencies [264488a]
- Updated dependencies [848a0c1]
- Updated dependencies [8d4ef27]
- Updated dependencies [589da1b]
- Updated dependencies [8d1ac42]
- Updated dependencies [8c5ce17]
- Updated dependencies [1c9a5ac]
- Updated dependencies [848a0c1]
- Updated dependencies [b5e7254]
- Updated dependencies [8d1ac42]
- Updated dependencies [f9a9cab]
- Updated dependencies [451dddd]
- Updated dependencies [a7a4885]
- Updated dependencies [dbaa0ed]
  - @plextv/react-lightning@0.4.0
  - @plextv/react-lightning-plugin-flexbox@0.4.0

## 0.4.0-alpha.1

### Patch Changes

- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- Updated dependencies [451dddd]
- Updated dependencies [a7a4885]
  - @plextv/react-lightning@0.4.0-alpha.4
  - @plextv/react-lightning-plugin-flexbox@0.4.0-alpha.2

## 0.4.0-alpha.0

### Minor Changes

- 63ec701: Move everything to React 19 and React Native 0.82

### Patch Changes

- Updated dependencies [63ec701]
  - @plextv/react-lightning@0.4.0-alpha.0
  - @plextv/react-lightning-plugin-flexbox@0.4.0-alpha.0

## 0.3.3

### Patch Changes

- 774d679: chore: Force package version bump
- Updated dependencies [774d679]
  - @plextv/react-lightning@0.3.11
  - @plextv/react-lightning-plugin-flexbox@0.3.9

## 0.3.2

### Patch Changes

- ded4552: Updated lightning and storybook packages
- 65a90d4: chore: Package updates and dep cleanup
- Updated dependencies [ded4552]
- Updated dependencies [65a90d4]
  - @plextv/react-lightning-plugin-flexbox@0.3.8
  - @plextv/react-lightning@0.3.10

## 0.3.1

### Patch Changes

- 81ff0f5: Switch builds to use vite and update packages
- Updated dependencies [81ff0f5]
- Updated dependencies [81ff0f5]
- Updated dependencies [c2fe33c]
- Updated dependencies [81ff0f5]
- Updated dependencies [4e58bb5]
- Updated dependencies [81ff0f5]
  - @plextv/react-lightning-plugin-flexbox@0.3.1
  - @plextv/react-lightning@0.3.1

## 0.3.0

### Minor Changes

- 3c22b29: Change package scope from plexinc to plextv

### Patch Changes

- Updated dependencies [3c22b29]
  - @plextv/react-lightning@0.3.0
  - @plextv/react-lightning-plugin-flexbox@0.3.0

## 0.2.9

### Patch Changes

- Updated dependencies [2f2f8f2]
  - @plextv/react-lightning@0.2.8
  - @plextv/react-lightning-plugin-flexbox@0.2.8

## 0.2.8

### Patch Changes

- Updated dependencies [d757a05]
- Updated dependencies [f057984]
  - @plextv/react-lightning@0.2.7
  - @plextv/react-lightning-plugin-flexbox@0.2.7

## 0.2.7

### Patch Changes

- Updated dependencies [d14b8f2]
- Updated dependencies [d14b8f2]
  - @plextv/react-lightning@0.2.6
  - @plextv/react-lightning-plugin-flexbox@0.2.6

## 0.2.6

### Patch Changes

- Updated dependencies [680a2ef]
  - @plextv/react-lightning@0.2.5
  - @plextv/react-lightning-plugin-flexbox@0.2.5

## 0.2.5

### Patch Changes

- Updated dependencies [c531bf6]
- Updated dependencies [7155482]
  - @plextv/react-lightning-plugin-flexbox@0.2.4
  - @plextv/react-lightning@0.2.4

## 0.2.4

### Patch Changes

- eb5907d: Fix issue with a prop name overriding an internal Lightning prop.
  Added some debug logging to prevent it from happening again.
- Updated dependencies [eb5907d]
  - @plextv/react-lightning@0.2.3
  - @plextv/react-lightning-plugin-flexbox@0.2.3

## 0.2.3

### Patch Changes

- a997f70: Fix typings export path

## 0.2.2

### Patch Changes

- 2c7be90: Fix packages not importing properly in some cases
- Updated dependencies [2c7be90]
  - @plextv/react-lightning@0.2.2
  - @plextv/react-lightning-plugin-flexbox@0.2.2

## 0.2.1

### Patch Changes

- 8406624: Fix rollup not building proper index files for absolute imports
- Updated dependencies [8406624]
  - @plextv/react-lightning@0.2.1
  - @plextv/react-lightning-plugin-flexbox@0.2.1

## 0.2.0

### Minor Changes

- a793b9b: Clean up build configs for better support

### Patch Changes

- e74ac2e: Updated imports for better tree shaking
- Updated dependencies [a793b9b]
- Updated dependencies [c86498e]
  - @plextv/react-lightning@0.2.0
  - @plextv/react-lightning-plugin-flexbox@0.2.0

## 0.1.9

### Patch Changes

- Updated dependencies [a4a409c]
  - @plextv/react-lightning@0.1.6
  - @plextv/react-lightning-plugin-flexbox@0.1.9

## 0.1.8

### Patch Changes

- Updated dependencies [a2d64f0]
  - @plextv/react-lightning@0.1.5
  - @plextv/react-lightning-plugin-flexbox@0.1.8

## 0.1.7

### Patch Changes

- Updated dependencies [e0cd671]
  - @plextv/react-lightning-plugin-flexbox@0.1.7

## 0.1.6

### Patch Changes

- Updated dependencies [a42e9d6]
  - @plextv/react-lightning-plugin-flexbox@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies [81e885f]
  - @plextv/react-lightning-plugin-flexbox@0.1.5

## 0.1.4

### Patch Changes

- 3ef955a: Remove focusedStyle from FocusGroup
- b276845: Changed font name from Ubuntu to `sans-serif`
- Updated dependencies [3ef955a]
- Updated dependencies [6bececd]
  - @plextv/react-lightning@0.1.4
  - @plextv/react-lightning-plugin-flexbox@0.1.4

## 0.1.3

### Patch Changes

- c7589f6: Fixing cjs builds pt.2
- Updated dependencies [c7589f6]
  - @plextv/react-lightning-plugin-flexbox@0.1.3
  - @plextv/react-lightning@0.1.3

## 0.1.2

### Patch Changes

- 341b33d: Fix cjs builds for packages to include es interop
- Updated dependencies [341b33d]
  - @plextv/react-lightning-plugin-flexbox@0.1.2
  - @plextv/react-lightning@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [1dfeb72]
  - @plextv/react-lightning@0.1.1
  - @plextv/react-lightning-plugin-flexbox@0.1.1
