# Contributing

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (install via `npm install -g pnpm`)
- **Git** (for version control)

## Setup

```bash
# Clone the repository
git clone <repository-url>
cd backgammon-pro

# Install all workspace dependencies
pnpm install

# Verify the build
pnpm build
```

## Development Workflow

### Running in Development Mode

```bash
# Run all packages and applications in parallel
pnpm dev

# Run a specific package or app
pnpm --filter @backgammon/web dev
pnpm --filter @backgammon/game-server dev
pnpm --filter @backgammon/shared dev
```

### Building

```bash
# Build everything in dependency order
pnpm build

# Build a specific package
pnpm --filter @backgammon/shared build

# Build a specific package and its dependencies
pnpm --filter @backgammon/web... build
```

### Code Quality

```bash
# Lint all files
pnpm lint

# Check formatting without modifying files
pnpm format:check

# Format all files
pnpm format
```

### Testing

```bash
# Run all tests across the workspace
pnpm -r test

# Run tests for a specific package
pnpm --filter @backgammon/game-engine test

# Run tests in watch mode
pnpm --filter @backgammon/shared test:watch
```

## Code Conventions

### TypeScript

- Strict mode is enabled across all packages via the shared `base.json` tsconfig
- All source files must be TypeScript (`.ts` or `.tsx`)
- Packages output ESM only — use standard `import`/`export` syntax
- Each package has a single entry point at `src/index.ts`
- Declarations are auto-generated during build

### Formatting

- Prettier is configured with `@backgammon/prettier-config` (semicolons, single quotes, trailing commas, 100 character width)
- Pre-commit hooks automatically format staged files
- Run `pnpm format` before pushing to ensure consistency

### Linting

- ESLint is configured with `@backgammon/eslint-config` which includes TypeScript strict rules
- `@typescript-eslint/no-unused-vars` is set to warn (with `_` prefix ignored)
- `@typescript-eslint/no-explicit-any` is set to warn

### Git and Commits

- The pre-commit hook (Husky) automatically runs lint-staged on staged files
- lint-staged applies ESLint fixes and Prettier formatting
- Commit messages should be clear and descriptive

## Package Structure

Every library package follows this convention:

```
package-name/
├── src/
│   └── index.ts          # Package entry point
├── tsconfig.json          # Extends @backgammon/config/tsconfig/<preset>.json
├── tsup.config.ts         # Build configuration
└── package.json           # Dependencies and scripts
```

Application packages may deviate based on framework requirements (e.g., Next.js App Router structure for `@backgammon/web`).

## Dependency Guidelines

- All dependencies must be explicitly declared in each package's `package.json`
- Workspace dependencies use `"workspace:*"` protocol
- `@backgammon/config` is a devDependency for packages that need TypeScript configuration
- Shared linting and formatting configs are devDependencies at the workspace root
- Type definitions (`@types/*`) are devDependencies of the packages that use them

## Pull Request Process

1. Ensure all tests pass: `pnpm -r test`
2. Verify linting and formatting are clean: `pnpm lint && pnpm format:check`
3. Confirm the full build succeeds: `pnpm build`
4. Submit the pull request with a description of the changes
5. Address any review feedback before merge
