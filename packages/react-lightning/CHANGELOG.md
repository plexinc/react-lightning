# @plextv/react-lightning

## 0.4.0-alpha.7

### Patch Changes

- f9a9cab: fix: support preventDefault() api for events
- f9a9cab: fix: onChildFocused event now works on FocusGroups and useFocus

## 0.4.0-alpha.6

### Patch Changes

- 589da1b: fix(focus): Fix removing elements not applying across focus layers

## 0.4.0-alpha.5

### Patch Changes

- 01d5f33: fix(focus): Fix traps not working properly in some cases

## 0.4.0-alpha.4

### Patch Changes

- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations

## 0.4.0-alpha.3

### Patch Changes

- 8d1ac42: chore: Update lightning versions
- 8d1ac42: fix(focus): Fix case where FocusGroups sometimes get added to the wrong layer

## 0.4.0-alpha.2

### Patch Changes

- 1c9a5ac: feat(react-lightning): Add inViewport event from Lightning

## 0.4.0-alpha.1

### Patch Changes

- b5e7254: chore: Update lightning packages

## 0.4.0-alpha.0

### Minor Changes

- 63ec701: Move everything to React 19 and React Native 0.82

## 0.3.13

### Patch Changes

- e56cc1d: fix(focus): Don't attempt to focus elements with no size

## 0.3.12

### Patch Changes

- 10332b7: chore: Clean up some package typings

## 0.3.11

### Patch Changes

- 774d679: chore: Force package version bump

## 0.3.10

### Patch Changes

- ded4552: Updated lightning and storybook packages
- 65a90d4: chore: Package updates and dep cleanup

## 0.3.9

### Patch Changes

- 6425981: (focus) Do not pass in element to pushLayer

## 0.3.8

### Patch Changes

- 2968a78: Add support for reanimated animation builders

## 0.3.7

### Patch Changes

- bcc5e8c: Fix some issues with focus and layers

## 0.3.6

### Patch Changes

- 54622f2: Add support for focus layers, for example for Modals

## 0.3.5

### Patch Changes

- d7d750f: Fix initial focus on elements with focus redirection

## 0.3.4

### Patch Changes

- eb0c947: Added Focus Redirection support

## 0.3.3

### Patch Changes

- 2201571: Fixed react native entry rendering

## 0.3.2

### Patch Changes

- 56769e3: Include tseep into the build

## 0.3.1

### Patch Changes

- 81ff0f5: Various performance improvements
- c2fe33c: More optimizations with yoga workers
- 81ff0f5: Switch builds to use vite and update packages
- 4e58bb5: Remove useWasm RenderOption
- 81ff0f5: Removed effects and improved shaders

## 0.3.0

### Minor Changes

- 3c22b29: Change package scope from plexinc to plextv

## 0.2.8

### Patch Changes

- 2f2f8f2: Fix svg imageType not getting set in all cases

## 0.2.7

### Patch Changes

- d757a05: Adds support for svgs that use data urls
- f057984: Fix FocusManager sometimes getting into infinite loop

## 0.2.6

### Patch Changes

- d14b8f2: Fix simpleDiff to not error on nullish objects
- d14b8f2: Tweak focus logic to match W3C spatial navigation spec

## 0.2.5

### Patch Changes

- 680a2ef: Refactored focus management to be a little more performant and reliable

## 0.2.4

### Patch Changes

- 7155482: Update lightningjs renderer

## 0.2.3

### Patch Changes

- eb5907d: Fix issue with a prop name overriding an internal Lightning prop.
  Added some debug logging to prevent it from happening again.

## 0.2.2

### Patch Changes

- 2c7be90: Fix packages not importing properly in some cases

## 0.2.1

### Patch Changes

- 8406624: Fix rollup not building proper index files for absolute imports

## 0.2.0

### Minor Changes

- a793b9b: Clean up build configs for better support

### Patch Changes

- c86498e: Added onFocusCapture event for better react native support

## 0.1.6

### Patch Changes

- a4a409c: Added instrumentation for new lightning devtools

## 0.1.5

### Patch Changes

- a2d64f0: Fixed a bug where shaders can fail to update

## 0.1.4

### Patch Changes

- 3ef955a: Remove focusedStyle from FocusGroup
- 6bececd: Don't flatten array styles from LightningViewElement, moved to react-native

## 0.1.3

### Patch Changes

- c7589f6: Fixing cjs builds pt.2

## 0.1.2

### Patch Changes

- 341b33d: Fix cjs builds for packages to include es interop

## 0.1.1

### Patch Changes

- 1dfeb72: Updated packages
