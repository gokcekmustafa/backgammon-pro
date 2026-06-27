# Architecture Decisions

This document indexes significant architecture decisions made for Backgammon Pro. Each decision is recorded as an Architecture Decision Record (ADR) in [docs/adr/](docs/adr/).

## Decision Log

| Date       | ADR                                        | Title                                   | Status   |
| ---------- | ------------------------------------------ | --------------------------------------- | -------- |
| 2026-06-27 | [ADR-001](docs/adr/001-pnpm-workspaces.md) | Monorepo with pnpm Workspaces           | Accepted |
| 2026-06-27 | [ADR-002](docs/adr/002-shared-tsconfig.md) | Shared TypeScript Configuration Presets | Accepted |
| 2026-06-27 | [ADR-003](docs/adr/003-esm-only.md)        | ESM-only Package Output                 | Accepted |

## Summary

### ADR-001: Monorepo with pnpm Workspaces

The project uses pnpm workspaces (not Turborepo) for monorepo management. This provides strict dependency isolation, efficient disk usage, and native workspace protocol support without additional build orchestration layers. Each package explicitly declares its own dependencies.

**Key points:**

- `apps/*` and `packages/*` are workspace members
- `workspace:*` protocol for inter-package dependencies
- pnpm's strict mode ensures dependency isolation
- No build orchestration tool beyond pnpm's built-in capabilities

### ADR-002: Shared TypeScript Configuration Presets

Three shared tsconfig presets in `@backgammon/config/tsconfig/` provide consistent compilation settings across the workspace:

- `base.json` — Universal strict TypeScript settings
- `nextjs.json` — Next.js-specific settings (DOM lib, JSX preserve, noEmit)
- `node.json` — Node.js-specific settings

### ADR-003: ESM-only Package Output

All workspace packages output ESM only. This simplifies the build pipeline (single format per package), reduces build time, and aligns with the ESM-native environments (Next.js 14, Fastify 4, modern Node.js) used by the project's consumers.
