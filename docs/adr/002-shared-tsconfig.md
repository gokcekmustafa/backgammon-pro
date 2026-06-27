# ADR-002: Shared TypeScript Configuration Presets

**Status:** Accepted

**Date:** 2026-06-27

## Context

The workspace contains multiple packages and applications, each requiring TypeScript compilation. Without a shared configuration, each package would duplicate compiler settings, leading to inconsistencies and maintenance overhead. Different packages have different requirements:

- Node.js packages (game-engine, shared) need different settings from web packages
- Next.js apps require specific JSX and module settings
- All packages should use strict TypeScript consistently

## Decision

Create a shared configuration package (`@backgammon/config`) containing three TypeScript preset files:

### `base.json`

Universal settings applied to all packages:

- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode enabled
- Isolated modules for safe transpilation
- Declaration files and source maps generated

### `nextjs.json`

Extends `base.json` for Next.js applications:

- DOM and DOM.Iterable libs
- JSX in preserve mode (handled by Next.js)
- noEmit: true (Next.js handles compilation)
- Incremental compilation for development performance

### `node.json`

Extends `base.json` for Node.js packages:

- No browser libs
- Standard ESNext module resolution

## Consequences

### Positive

- Single change point for TypeScript settings that affect all packages
- Each package extends the appropriate preset, reducing boilerplate
- Consistent strict mode enforcement across the workspace

### Negative

- Packages that need custom tsconfig settings must override on top of the preset
- Presets must be stable to avoid breaking packages that depend on them

### Neutral

- The config package has no runtime code; it only provides configuration files
- Packages reference presets via path: `@backgammon/config/tsconfig/<preset>.json`
