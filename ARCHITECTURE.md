# Architecture

## System Overview

Backgammon Pro is organized as a pnpm monorepo with two deployable applications and six shared packages. The architecture follows a layered design where each package has a single responsibility and communicates with others through well-defined interfaces.

## Workspace Topology

```
                    ┌──────────────────────┐
                    │    @backgammon/web    │
                    │   (Next.js 14, App)   │
                    └──────┬───────────┬────┘
                           │           │
              ┌────────────┘           └────────────┐
              │                                      │
     ┌────────▼────────┐                  ┌─────────▼──────────┐
     │  @backgammon/ui │                  │ @backgammon/shared │
     │  (Components)   │                  │  (Types, Utils)    │
     └────────┬────────┘                  └─────────┬──────────┘
              │                                      │
     ┌────────▼────────┐                  ┌─────────▼──────────┐
     │@backgammon/     │                  │ @backgammon/       │
     │board-renderer   │                  │ layout-engine      │
     └────────┬────────┘                  └─────────┬──────────┘
              │                                      │
              └──────────┬───────────────┬───────────┘
                         │               │
              ┌──────────▼───┐   ┌───────▼──────────┐
              │ @backgammon/ │   │ @backgammon/     │
              │ game-engine  │   │ game-server      │
              │              │   │ (Fastify 4)      │
              └──────────────┘   └──────────────────┘
```

## Package Boundaries

### Application Packages

#### `@backgammon/web` (apps/web)

- **Framework:** Next.js 14 with App Router
- **UI:** React 18 with Tailwind CSS 3
- **Role:** Web application entry point
- **Consumes:** `@backgammon/ui`, `@backgammon/board-renderer`, `@backgammon/layout-engine`, `@backgammon/shared`

#### `@backgammon/game-server` (apps/game-server)

- **Framework:** Fastify 4
- **Role:** HTTP server for game management
- **Consumes:** `@backgammon/game-engine`, `@backgammon/shared`
- **Development:** tsup for builds, tsx for watch mode

### Library Packages

#### `@backgammon/game-engine`

- **Responsibility:** Backgammon game state management, rules engine, dice logic, move validation
- **Build:** tsup → ESM + declarations
- **Consumed by:** game-server, web

#### `@backgammon/board-renderer`

- **Responsibility:** Board rendering primitives and abstractions
- **Build:** tsup → ESM + declarations
- **Consumed by:** web

#### `@backgammon/layout-engine`

- **Responsibility:** Layout geometry, responsive calculations, board positioning
- **Build:** tsup → ESM + declarations
- **Consumed by:** web, board-renderer

#### `@backgammon/shared`

- **Responsibility:** Shared types, constants, enumerations, utility functions
- **Build:** tsup → ESM + declarations
- **Consumed by:** all packages

#### `@backgammon/ui`

- **Responsibility:** Reusable UI components, design system primitives
- **Build:** tsup → ESM + declarations
- **Consumed by:** web

### Configuration Packages

#### `@backgammon/config`

- **Contents:** Shared TypeScript configuration presets (base, nextjs, node)
- **No build step:** Config files consumed directly

#### `@backgammon/eslint-config`

- **Contents:** Shared ESLint configuration with TypeScript plugin
- **Dependencies:** `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
- **Consumed by:** Root ESLint configuration

#### `@backgammon/prettier-config`

- **Contents:** Shared Prettier formatting configuration
- **Consumed by:** Root Prettier configuration

## Build Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  tsup build  │    │  next build  │    │  tsup build  │
│  (packages)  │    │  (web app)   │    │(game-server) │
│              │    │              │    │              │
│  src/ → dist/│    │  src/→.next/ │    │  src/ → dist/│
│  ESM + .d.ts │    │  optimized   │    │  ESM + .d.ts │
└──────────────┘    └──────────────┘    └──────────────┘
```

- **Library packages:** TypeScript source compiled by tsup to ESM with declaration files
- **Web app:** Compiled and optimized by Next.js bundler
- **Game server:** Compiled by tsup for production; tsx watch for development

## Configuration Architecture

### TypeScript

Three shared presets in `packages/config/tsconfig/`:

- **base.json:** Strict ES2022 target, bundler module resolution, isolated modules, declarations
- **nextjs.json:** DOM lib, JSX preserve, noEmit (Next.js handles compilation)
- **node.json:** Node.js-appropriate settings, extends base

### Linting & Formatting

- **ESLint:** Root configuration extends `@backgammon/eslint-config` which includes TypeScript strict rules
- **Prettier:** Root configuration references `@backgammon/prettier-config` (semicolons, single quotes, trailing commas)
- **Git hooks:** Husky runs lint-staged on pre-commit, which applies ESLint fixes and Prettier formatting

### Testing

- **Framework:** Vitest
- **Available in:** All library packages and the game server
- **Configuration:** Each package manages its own Vitest configuration

## Dependency Management

- pnpm's strict mode requires each package to declare all dependencies explicitly
- Workspace packages reference each other via `"@backgammon/*": "workspace:*"`
- The root `package.json` is reserved for workspace-wide tools (ESLint, Prettier, Husky)
- Each sub-package manages its own build, test, and type dependencies
