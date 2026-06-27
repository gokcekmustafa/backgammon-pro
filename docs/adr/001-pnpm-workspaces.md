# ADR-001: Monorepo with pnpm Workspaces

**Status:** Accepted

**Date:** 2026-06-27

## Context

The project requires multiple deployable applications (web frontend, game server) and shared library packages. These components must be developed, tested, and built together with consistent tooling. The monorepo approach was chosen to enable code sharing, unified dependency management, and coordinated builds.

Key requirements:

- Multiple applications sharing common packages
- Strict dependency isolation between packages
- Efficient installation and disk usage
- No additional build orchestration layer

## Decision

Use **pnpm workspaces** as the monorepo management tool. Turborepo was considered but rejected to keep the build system minimal.

Specific choices:

- `pnpm-workspace.yaml` declares `apps/*` and `packages/*` as workspace members
- All inter-package dependencies use the `workspace:*` protocol
- pnpm's strict dependency model ensures each package declares its own dependencies
- The workspace uses a shared lockfile (`pnpm-lock.yaml`)
- No `.npmrc` hoisting configuration — pnpm's default strict mode is used

## Consequences

### Positive

- Single source of truth for dependency versions via the lockfile
- Packages explicitly declare all dependencies (no implicit access to hoisted packages)
- Disk-efficient with pnpm's content-addressable store
- Simple build orchestration using `pnpm -r` filters

### Negative

- Each package must install its own devDependencies even if the root also has them
- New contributors must have pnpm installed (not bundled with Node.js by default)

### Neutral

- Build order is determined by the dependency graph, managed by pnpm
- No centralized build script orchestration — each package manages its own build
