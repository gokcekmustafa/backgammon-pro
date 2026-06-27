# ADR-003: ESM-only Package Output

**Status:** Accepted

**Date:** 2026-06-27

## Context

Workspace packages need to be consumable by both the Next.js web application (which uses ESM natively) and the Fastify game server (which also supports ESM). The build tool (tsup) supports outputting multiple formats (ESM, CJS, IIFE), but dual-format output adds complexity to the build configuration and increases build time.

## Decision

All workspace packages output **ESM only**. Each package:

- Sets `"type": "module"` in `package.json`
- Configures tsup with `format: ['esm']`
- Specifies `"main": "./dist/index.js"` pointing to the ESM output
- Generates TypeScript declarations (`dts: true`) alongside the output

## Consequences

### Positive

- Simplified build configuration (single format target)
- Faster build times (no dual output)
- All consumers (Next.js 14, Fastify 4, modern Node.js) support ESM natively
- Tree-shaking works optimally with ESM

### Negative

- Legacy CommonJS consumers cannot import these packages without transpilation
- ESM resolution rules (file extensions, import specifiers) must be followed

### Neutral

- Packages are only consumed within this workspace, so the consumer environment is known
- Future dual-format support can be added by changing the tsup format array
