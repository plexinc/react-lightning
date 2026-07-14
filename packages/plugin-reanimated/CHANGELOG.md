# @plextv/react-lightning-plugin-reanimated

## 0.4.3-alpha.0

### Patch Changes

- 4a7e3a4: fix(reanimated): apply animated transforms and replay resting styles to late-attached nodes

  Two gaps stopped a reanimated `transform` (e.g. a scroll-linked `translateY`) from reaching a laid-out node. The flexbox worker proxy filtered every non-flex style key before postMessage, so `transform` was dropped even though the worker-side Yoga already applies it as a top/left offset (and the serializer special-cases transform objects) — let it through. And `useAnimatedStyle` only pushed styles when a shared value changed, so a view that registers after the fact (recycled cell, re-created node) never got the current resting value; `AnimatedStyle` now exposes `applyToView`, which `createAnimatedComponent` calls on registration to replay the last-applied styles. Replay-only on purpose: computing a fresh value at attach time pushed states the normal flow never emitted and broke focus on some nodes.

- e1a8ad2: Infer reanimated hook dependencies at runtime by tracking shared-value reads. No babel plugin runs on Lightning, so `useAnimatedStyle` / `useDerivedValue` / `useAnimatedReaction` without an explicit dependency array never subscribed to their shared values and only updated on re-renders. Shared values from `useSharedValue` / `makeMutable` now report reads to the active hook, which subscribes to exactly what its updater read (re-collected on every run, so branches are handled). Explicit dependency arrays keep their old behavior.
- Updated dependencies [6ced46f]
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
- Updated dependencies [58a3c4d]
- Updated dependencies [7005125]
- Updated dependencies [15fb74a]
- Updated dependencies [66c2c93]
- Updated dependencies [9beb550]
- Updated dependencies [6e50057]
- Updated dependencies [48f2025]
- Updated dependencies [b2492c6]
- Updated dependencies [3f4ed43]
- Updated dependencies [660ae8d]
- Updated dependencies [dded826]
- Updated dependencies [8d993ca]
- Updated dependencies [f6bee05]
- Updated dependencies [43594e7]
- Updated dependencies [f2f0c11]
  - @plextv/react-lightning-plugin-css-transform@0.4.3-alpha.0
  - @plextv/react-lightning@0.4.3-alpha.0
  - @plextv/react-lightning-plugin-flexbox@0.4.3-alpha.0
  - @plextv/react-native-lightning@0.4.3-alpha.0

## 0.4.2

### Patch Changes

- 247d2e8: chore: Remove .cjs from packages
- Updated dependencies [247d2e8]
  - @plextv/react-native-lightning@0.4.2
  - @plextv/react-lightning-plugin-css-transform@0.4.2
  - @plextv/react-lightning@0.4.2
  - @plextv/react-lightning-plugin-flexbox@0.4.2

## 0.4.1

### Patch Changes

- 38f1b60: chore: Update dependencies and migrate from Biome to oxc
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
  - @plextv/react-lightning@0.4.1
  - @plextv/react-lightning-plugin-css-transform@0.4.1
  - @plextv/react-lightning-plugin-flexbox@0.4.1
  - @plextv/react-native-lightning@0.4.1

## 0.4.0

### Patch Changes

- 410d0ac: fix(plugin-reanimated): Use constants for gentle spring configs instead of importing from reanimated for backwards compat
- 99c54a1: feat(plugin-reanimated): Added proper spring animation
- 8d1ac42: chore: Update lightning versions
- 0b91ada: feat: Added LinearTransition support
- 80c96e3: feat: Add a placeholder withSequence
- 848a0c1: chore: Dependency version bumps
- b5e7254: chore: Update lightning packages
- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- 56845cc: Added useAnimatedScrollHandler, withDelay implementations.
- Updated dependencies [01d5f33]
- Updated dependencies [f9a9cab]
- Updated dependencies [264488a]
- Updated dependencies [848a0c1]
- Updated dependencies [dbaa0ed]
- Updated dependencies [b57bb68]
- Updated dependencies [8d4ef27]
- Updated dependencies [dbaa0ed]
- Updated dependencies [589da1b]
- Updated dependencies [8d1ac42]
- Updated dependencies [8c5ce17]
- Updated dependencies [1c9a5ac]
- Updated dependencies [848a0c1]
- Updated dependencies [b23e312]
- Updated dependencies [43bf756]
- Updated dependencies [8d4ef27]
- Updated dependencies [34ddeb8]
- Updated dependencies [b5e7254]
- Updated dependencies [8d1ac42]
- Updated dependencies [f9a9cab]
- Updated dependencies [451dddd]
- Updated dependencies [a7a4885]
- Updated dependencies [dbaa0ed]
  - @plextv/react-lightning@0.4.0
  - @plextv/react-lightning-plugin-flexbox@0.4.0
  - @plextv/react-native-lightning@0.4.0
  - @plextv/react-lightning-plugin-css-transform@0.4.0

## 0.4.0-alpha.6

### Patch Changes

- 0b91ada: feat: Added LinearTransition support
- Updated dependencies [f9a9cab]
- Updated dependencies [b23e312]
- Updated dependencies [f9a9cab]
  - @plextv/react-lightning@0.4.0-alpha.7
  - @plextv/react-native-lightning@0.4.0-alpha.8

## 0.4.0-alpha.5

### Patch Changes

- 80c96e3: feat: Add a placeholder withSequence

## 0.4.0-alpha.4

### Patch Changes

- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- Updated dependencies [451dddd]
- Updated dependencies [a7a4885]
  - @plextv/react-native-lightning@0.4.0-alpha.5
  - @plextv/react-lightning-plugin-css-transform@0.4.0-alpha.3
  - @plextv/react-lightning@0.4.0-alpha.4
  - @plextv/react-lightning-plugin-flexbox@0.4.0-alpha.2

## 0.4.0-alpha.3

### Patch Changes

- 8d1ac42: chore: Update lightning versions
- Updated dependencies [8d1ac42]
- Updated dependencies [8d1ac42]
  - @plextv/react-native-lightning@0.4.0-alpha.4
  - @plextv/react-lightning-plugin-css-transform@0.4.0-alpha.2
  - @plextv/react-lightning@0.4.0-alpha.3

## 0.4.0-alpha.2

### Patch Changes

- 410d0ac: fix(plugin-reanimated): Use constants for gentle spring configs instead of importing from reanimated for backwards compat
- Updated dependencies [43bf756]
  - @plextv/react-native-lightning@0.4.0-alpha.2

## 0.4.0-alpha.1

### Minor Changes

- 56845cc: Added useAnimatedScrollHandler, withDelay implementations.

### Patch Changes

- 99c54a1: feat(plugin-reanimated): Added proper spring animation
- b5e7254: chore: Update lightning packages
- Updated dependencies [b5e7254]
  - @plextv/react-native-lightning@0.4.0-alpha.1
  - @plextv/react-lightning-plugin-css-transform@0.4.0-alpha.1
  - @plextv/react-lightning@0.4.0-alpha.1

## 0.4.0-alpha.0

### Minor Changes

- 63ec701: Move everything to React 19 and React Native 0.82

### Patch Changes

- Updated dependencies [63ec701]
  - @plextv/react-native-lightning@0.4.0-alpha.0
  - @plextv/react-lightning-plugin-css-transform@0.4.0-alpha.0
  - @plextv/react-lightning@0.4.0-alpha.0
  - @plextv/react-lightning-plugin-flexbox@0.4.0-alpha.0

## 0.3.6

### Patch Changes

- 1932178: chore(reanimated): Add missing dependency

## 0.3.5

### Patch Changes

- 774d679: chore: Force package version bump
- Updated dependencies [774d679]
  - @plextv/react-lightning-plugin-css-transform@0.3.5
  - @plextv/react-lightning@0.3.11
  - @plextv/react-lightning-plugin-flexbox@0.3.9

## 0.3.4

### Patch Changes

- ded4552: Updated lightning and storybook packages
- 65a90d4: chore: Package updates and dep cleanup
- Updated dependencies [ded4552]
- Updated dependencies [65a90d4]
  - @plextv/react-lightning-plugin-css-transform@0.3.4
  - @plextv/react-lightning-plugin-flexbox@0.3.8
  - @plextv/react-lightning@0.3.10

## 0.3.3

### Patch Changes

- 2968a78: Add support for reanimated animation builders
- Updated dependencies [2968a78]
  - @plextv/react-lightning@0.3.8
  - @plextv/react-lightning-plugin-css-transform@0.3.2
  - @plextv/react-lightning-plugin-flexbox@0.3.6

## 0.3.2

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
  - @plextv/react-lightning-plugin-css-transform@0.3.2

## 0.3.1

### Patch Changes

- Updated dependencies [2963dd8]
  - @plextv/react-lightning-plugin-css-transform@0.3.1

## 0.3.0

### Minor Changes

- 3c22b29: Change package scope from plexinc to plextv

### Patch Changes

- Updated dependencies [3c22b29]
  - @plextv/react-lightning-plugin-css-transform@0.3.0
  - @plextv/react-lightning@0.3.0
  - @plextv/react-lightning-plugin-flexbox@0.3.0

## 0.2.9

### Patch Changes

- Updated dependencies [2f2f8f2]
  - @plextv/react-lightning@0.2.8
  - @plextv/react-lightning-plugin-css-transform@0.2.8
  - @plextv/react-lightning-plugin-flexbox@0.2.8

## 0.2.8

### Patch Changes

- Updated dependencies [d757a05]
- Updated dependencies [f057984]
  - @plextv/react-lightning@0.2.7
  - @plextv/react-lightning-plugin-css-transform@0.2.7
  - @plextv/react-lightning-plugin-flexbox@0.2.7

## 0.2.7

### Patch Changes

- Updated dependencies [d14b8f2]
- Updated dependencies [d14b8f2]
  - @plextv/react-lightning@0.2.6
  - @plextv/react-lightning-plugin-css-transform@0.2.6
  - @plextv/react-lightning-plugin-flexbox@0.2.6

## 0.2.6

### Patch Changes

- Updated dependencies [680a2ef]
  - @plextv/react-lightning@0.2.5
  - @plextv/react-lightning-plugin-css-transform@0.2.5
  - @plextv/react-lightning-plugin-flexbox@0.2.5

## 0.2.5

### Patch Changes

- 7155482: Update lightningjs renderer
- Updated dependencies [c531bf6]
- Updated dependencies [7155482]
  - @plextv/react-lightning-plugin-flexbox@0.2.4
  - @plextv/react-lightning-plugin-css-transform@0.2.4
  - @plextv/react-lightning@0.2.4

## 0.2.4

### Patch Changes

- 73c0485: Add `addWhitelistedNativeProps` function (no-op)

## 0.2.3

### Patch Changes

- Updated dependencies [eb5907d]
  - @plextv/react-lightning@0.2.3
  - @plextv/react-lightning-plugin-css-transform@0.2.3
  - @plextv/react-lightning-plugin-flexbox@0.2.3

## 0.2.2

### Patch Changes

- 2c7be90: Fix packages not importing properly in some cases
- Updated dependencies [2c7be90]
  - @plextv/react-lightning-plugin-css-transform@0.2.2
  - @plextv/react-lightning@0.2.2
  - @plextv/react-lightning-plugin-flexbox@0.2.2

## 0.2.1

### Patch Changes

- 8406624: Fix rollup not building proper index files for absolute imports
- Updated dependencies [8406624]
  - @plextv/react-lightning-plugin-css-transform@0.2.1
  - @plextv/react-lightning@0.2.1
  - @plextv/react-lightning-plugin-flexbox@0.2.1

## 0.2.0

### Minor Changes

- a793b9b: Clean up build configs for better support

### Patch Changes

- Updated dependencies [a793b9b]
- Updated dependencies [c86498e]
- Updated dependencies [88d4ec5]
  - @plextv/react-lightning-plugin-css-transform@0.2.0
  - @plextv/react-lightning@0.2.0
  - @plextv/react-lightning-plugin-flexbox@0.2.0

## 0.1.9

### Patch Changes

- Updated dependencies [a4a409c]
  - @plextv/react-lightning@0.1.6
  - @plextv/react-lightning-plugin-css-transform@0.1.9
  - @plextv/react-lightning-plugin-flexbox@0.1.9

## 0.1.8

### Patch Changes

- Updated dependencies [a2d64f0]
  - @plextv/react-lightning@0.1.5
  - @plextv/react-lightning-plugin-css-transform@0.1.8
  - @plextv/react-lightning-plugin-flexbox@0.1.8

## 0.1.7

### Patch Changes

- Updated dependencies [e0cd671]
  - @plextv/react-lightning-plugin-flexbox@0.1.7
  - @plextv/react-lightning-plugin-css-transform@0.1.7

## 0.1.6

### Patch Changes

- Updated dependencies [a42e9d6]
  - @plextv/react-lightning-plugin-flexbox@0.1.6
  - @plextv/react-lightning-plugin-css-transform@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies [81e885f]
  - @plextv/react-lightning-plugin-flexbox@0.1.5
  - @plextv/react-lightning-plugin-css-transform@0.1.5

## 0.1.4

### Patch Changes

- Updated dependencies [3ef955a]
- Updated dependencies [6bececd]
  - @plextv/react-lightning@0.1.4
  - @plextv/react-lightning-plugin-css-transform@0.1.4
  - @plextv/react-lightning-plugin-flexbox@0.1.4

## 0.1.3

### Patch Changes

- c7589f6: Fixing cjs builds pt.2
- Updated dependencies [c7589f6]
  - @plextv/react-lightning-plugin-css-transform@0.1.3
  - @plextv/react-lightning-plugin-flexbox@0.1.3
  - @plextv/react-lightning@0.1.3

## 0.1.2

### Patch Changes

- 341b33d: Fix cjs builds for packages to include es interop
- Updated dependencies [341b33d]
  - @plextv/react-lightning-plugin-css-transform@0.1.2
  - @plextv/react-lightning-plugin-flexbox@0.1.2
  - @plextv/react-lightning@0.1.2

## 0.1.1

### Patch Changes

- 1dfeb72: Updated packages
- Updated dependencies [1dfeb72]
  - @plextv/react-lightning-plugin-css-transform@0.1.1
  - @plextv/react-lightning@0.1.1
  - @plextv/react-lightning-plugin-flexbox@0.1.1
