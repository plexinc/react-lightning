# CLAUDE.md — react-lightning

## Repository Overview

**react-lightning** is a monorepo providing a React reconciler for [Lightning.js](https://lightningjs.io/), enabling developers to build Lightning.js apps using React and React Native patterns.

- **Package manager:** pnpm@10.12.3 (workspace monorepo)
- **Build orchestrator:** Turbo 2.7.5
- **Node requirement:** >=22 (Volta pins: node 24.11.1, pnpm 10.12.3)

---

## Monorepo Structure

```
apps/
  react-lightning-example/          # Main React + Lightning.js example app
  react-native-lightning-example/   # React Native + Lightning example app
  storybook/                        # Component documentation (Storybook 9)

packages/
  react-lightning/                  # Core React reconciler for Lightning.js
  react-lightning-components/       # Pre-built UI components (Column, Row, VirtualList, etc.)
  react-native-lightning/           # React Native API layer on Lightning
  react-native-lightning-components/
  configs/                          # Shared tsconfig, vite, tsdown configs
  plugin-flexbox/                   # Yoga-based flexbox layout plugin
  plugin-flexbox-lite/              # Lightweight flexbox alternative
  plugin-css-transform/             # CSS property → Lightning property transforms
  plugin-reanimated/                # Reanimated animation integration
  vite-plugin-msdf-fontgen/         # Vite plugin for MSDF font generation
  vite-plugin-react-native-lightning/
  vite-plugin-react-reanimated-lightning/

templates/
  app-template/                     # Starter template for new projects

types/                              # Global TypeScript type definitions
scripts/                            # Build and maintenance scripts
```

---

## Key Commands

### Development

```bash
pnpm dev                             # Run all dev servers
pnpm dev --filter=@plextv/react-lightning-example  # Run a specific app
```

### Testing

```bash
pnpm test                            # Run all unit tests (vitest)
```

### Linting & Formatting

```bash
pnpm lint                            # Lint with oxlint
pnpm lint:format                     # Lint + format with oxlint and oxfmt
```

### Type Checking

```bash
pnpm check:types                     # TypeScript type checking across all packages
```

### Building

```bash
pnpm build                           # Build all packages (turbo)
pnpm build:tsdown                    # Build library packages with tsdown
pnpm build:vite                      # Build app/vite packages
pnpm build:types                     # Generate type declarations only
pnpm build:storybook                 # Build Storybook docs
```

### Maintenance

```bash
pnpm clean                           # Remove dist directories
pnpm nuke                            # Deep clean: clean + remove node_modules + reinstall
pnpm unused                          # Check for unused dependencies
```

### Versioning & Release

```bash
pnpm changeset                       # Create a changeset (required for releases)
pnpm ci:version                      # Bump versions (CI only)
pnpm ci:publish                      # Publish to npm (CI only)
```

---

## Build System

### Library packages (tsdown)

Core packages (`react-lightning`, `react-lightning-components`, plugins, etc.) are bundled with **tsdown 0.19.0**.

- Shared config: `packages/configs/tsdown.config.ts`
- Output: ESM + CJS with `dist/es/` and `dist/cjs/` directories
- Dual dev/prod builds: `index.development.js` and `index.production.js`
- CJS entry auto-selects dev vs. prod based on `NODE_ENV`
- Type declarations emitted to `dist/types/`
- React Compiler applied via `@rollup/plugin-babel` + `babel-plugin-react-compiler`

### App packages (Vite)

Example apps and Storybook are built with **Vite 7.3.1**.

- Shared config base: `packages/configs/`
- Key plugins: `@vitejs/plugin-react`, `@vitejs/plugin-legacy` (Chrome 69+), `vite-tsconfig-paths`, `vite-plugin-msdf-fontgen`

---

## TypeScript

- **Base config:** `packages/configs/tsconfig.json`
- **React library config:** `packages/configs/tsconfig.react-library.json`
- **Key settings:** `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`, `strict: true`, `isolatedModules: true`, `isolatedDeclarations: true`, `jsx: react-jsx`
- All packages extend `@repo/configs/tsconfig.react-library.json`
- Use `workspace:*` protocol for internal package dependencies

---

## Code Style

- **Formatter:** oxfmt 0.35 — run `pnpm lint:format` to fix
- **Linter:** oxlint 1.50 — run `pnpm lint` to check
- **Indentation:** 2 spaces
- **Quotes:** Single quotes in JS/TS
- **No class components** — functional components + hooks only
- **No default exports on hooks or utilities** — prefer named exports
- Pre-commit hook via husky runs `oxlint`
- `.npmrc` enforces exact versions (`save-exact=true`)

---

## Architecture

### Core Layer: `@plextv/react-lightning`

The reconciler bridges React's virtual DOM to Lightning.js node tree.

**Element system** (`src/element/`):

- `LightningViewElement` — container (like `<div>`)
- `LightningImageElement` — image rendering
- `LightningTextElement` — text rendering
- All wrap Lightning's `INode` with React-specific prop handling

**Plugin system:**
Plugins extend renderer behavior via three hooks:

```typescript
type Plugin<T> = {
  handledStyleProps?: Set<string>;
  init?(renderer, reconciler): Promise<void>;
  onCreateInstance?(instance, props, fiber): void;
  transformProps?(instance, props): object | null; // return null to stop pipeline
};
```

The `handledStyleProps` property defines the properties that the plugin will act on. This
will allow us to skip plugin processing.

Built-in plugins: `plugin-flexbox`, `plugin-css-transform`, `plugin-reanimated`

**Focus management** (`src/focus/`):

- Tree-based focus tracking with support for layers (modals)
- `FocusManager`, `FocusGroup`, `focusable()` HOC
- Hooks: `useFocus()`, `useFocusManager()`
- Features: auto-focus, focus traps, focus redirection, custom navigation

**Input handling** (`src/input/`):

- `Keys` constants, `KeyPressHandler` component
- Full event bubbling, capture, and `preventDefault` support

**Renderer** (`src/render/`):

- `createRoot()` — main entry point; accepts `RenderOptions` (renderer, fonts, shaders, plugins)
- Lightning DevTools integration in dev builds
- `import.meta.env.DEV` guards dev-only code

### Component Library: `@plextv/react-lightning-components`

Pre-built Lightning-optimized components:

- **Layout:** `Column`, `Row` (flexbox via `plugin-flexbox`)
- **Lists:** `VirtualList` (virtualized list with view recycling, optimized for low-powered devices)
- **Text:** `StyledText`
- **Dev:** `FPSMonitor`

### React Native Layer: `@plextv/react-native-lightning`

Provides a React Native-compatible API on top of Lightning:

- RN-compatible components: `View`, `Text`, `Image`, `ScrollView`, etc.
- Built on `react-native-web` polyfills + `its-fine` for context bridging
- RN styling patterns supported

### React Native Components: `@plextv/react-native-lightning-components`

RN-style wrappers for Lightning components:

- **Layout:** `Column`, `Row`

---

## Naming Conventions

| Thing              | Convention                     | Example                                 |
| ------------------ | ------------------------------ | --------------------------------------- |
| React components   | PascalCase                     | `LightningViewElement`, `FocusGroup`    |
| Hooks              | `use` prefix + camelCase       | `useFocus`, `useCombinedRef`            |
| Types / interfaces | PascalCase + descriptor suffix | `LightningElementProps`, `FocusNode<T>` |
| Plugin files       | kebab-case directory           | `plugin-flexbox/`                       |
| Utility functions  | camelCase                      | `bubbleEvent`, `traceWrap`              |

---

## Testing

- **Test runner:** vitest 4.0.17
- **Config:** `vitest.workspace.ts` at root
- Tests are colocated with source files (`.spec.ts` or `.test.ts` suffix)
- `passWithNoTests: true` — packages without tests do not fail CI
- Mock utilities live in `src/mocks/`

---

## CI/CD

All workflows are in `.github/workflows/`:

| Workflow               | Trigger                             | What it does                                   |
| ---------------------- | ----------------------------------- | ---------------------------------------------- |
| `test.yml`             | PRs to `main`, pushes to `main`     | Runs `pnpm lint` then `pnpm test`              |
| `release-packages.yml` | After `test.yml` succeeds on `main` | Changesets version bump + npm publish via OIDC |
| `deploy-storybook.yml` | Pushes to `main`                    | Builds and deploys Storybook to GitHub Pages   |

CI uses `--frozen-lockfile` installs. Never modify `pnpm-lock.yaml` manually.

---

## Releases & Versioning

- Releases are managed by **Changesets** (`@changesets/cli`)
- Every PR that changes user-facing behavior needs a changeset: `pnpm changeset`
- Changeset config: `.changeset/config.json`
- Packages are published to npm under the `@plextv` scope
- CI uses npm OIDC trust (no token required in secrets)

---

## Key Dependencies

| Package                       | Version      | Purpose                                 |
| ----------------------------- | ------------ | --------------------------------------- |
| `@lightningjs/renderer`       | 3.0.0-beta20 | Underlying Lightning.js renderer        |
| `react-reconciler`            | 0.33.0       | React custom reconciler API             |
| `yoga-layout`                 | 3.2.1        | Flexbox layout engine (plugin-flexbox)  |
| `react-native-web`            | 0.21.2       | RN polyfills (react-native-lightning)   |
| `its-fine`                    | 2.0.0        | Context bridge for concurrent renderers |
| `tseep`                       | 1.3.1        | Typed event emitter                     |
| `babel-plugin-react-compiler` | 1.0.0        | React Compiler for auto-memoization     |

---

## Docs & Resources

- Official docs: https://plexinc.github.io/react-lightning/
- Storybook (deployed from `main`): GitHub Pages
- GitHub: https://github.com/plexinc/react-lightning
