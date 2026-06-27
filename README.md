# Backgammon Pro

A commercial-quality online Backgammon platform built with a modular monorepo architecture, targeting web, Android, and iOS deployments.

## Technology Stack

| Layer            | Technology                   |
| ---------------- | ---------------------------- |
| Framework (Web)  | Next.js 14 (React 18)        |
| Server           | Fastify 4                    |
| Language         | TypeScript 5 (strict mode)   |
| Styling          | Tailwind CSS 3               |
| Package Manager  | pnpm 9 (workspaces)          |
| Build (Packages) | tsup (ESM output)            |
| Linting          | ESLint 8 + TypeScript plugin |
| Formatting       | Prettier 3                   |
| Testing          | Vitest                       |
| Git Hooks        | Husky + lint-staged          |

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (install via `npm install -g pnpm`)

## Quick Start

```bash
# Install all dependencies
pnpm install

# Build all packages and applications
pnpm build

# Run everything in development mode
pnpm dev
```

## Project Structure

```
backgammon-pro/
├── apps/
│   ├── web/              # Next.js 14 web application
│   └── game-server/      # Fastify 4 game server
├── packages/
│   ├── game-engine/      # Backgammon game logic and rules
│   ├── board-renderer/   # Board rendering primitives
│   ├── layout-engine/    # Layout geometry and calculations
│   ├── shared/           # Shared types, constants, utilities
│   ├── ui/               # Reusable UI component library
│   ├── config/           # Shared TypeScript configurations
│   ├── eslint-config/    # Shared ESLint rules
│   └── prettier-config/  # Shared Prettier formatting rules
├── database/             # Database schemas and migrations
├── docs/                 # Project documentation
│   ├── architecture/     # System architecture documentation
│   ├── adr/              # Architecture Decision Records
│   ├── api/              # API specifications
│   ├── database/         # Database design documentation
│   ├── game-engine/      # Game engine documentation
│   ├── layout/           # Layout system documentation
│   ├── ui/               # UI component documentation
│   └── testing/          # Testing strategy and guides
└── infra/                # Infrastructure configuration
```

## Documentation

| Document                           | Description                                   |
| ---------------------------------- | --------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and package relationships |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development setup and contribution guidelines |
| [DECISIONS.md](DECISIONS.md)       | Architecture Decision Record index            |
| [ROADMAP.md](ROADMAP.md)           | Project roadmap and milestones                |
| [docs/adr/](docs/adr/)             | Detailed Architecture Decision Records        |

## Scripts

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `pnpm dev`          | Run all packages and apps in dev mode (parallel) |
| `pnpm build`        | Build all packages and apps                      |
| `pnpm lint`         | Lint all files with ESLint                       |
| `pnpm format`       | Format all files with Prettier                   |
| `pnpm format:check` | Check formatting without writing                 |

## License

Proprietary. All rights reserved.
