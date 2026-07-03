# Changelog

## [1.0.0-RC1] — 2026-07-02

### Added

- **Monorepo**: pnpm workspace with 10 packages (game-engine, board-renderer, layout-engine, database, game-server, web + config packages)
- **Game Engine** (`packages/game-engine`): Full backgammon rules — dice rolling, legal move generation, bearing off, doubling cube, Crawford rule, match scoring, ELO rating. 210 tests.
- **Board Renderer** (`packages/board-renderer`): SVG board generation with responsive geometry, checker animations, 3D pip layout. 55 tests.
- **Layout Engine** (`packages/layout-engine`): Responsive board scaling, safe-area inset calculation, coordinate mapping. 54 tests.
- **Game Server** (`apps/game-server`): Fastify-based WebSocket server with typed message protocol — connection manager, room manager, table manager, game session manager, chat manager, rate limiting, JWT auth. 203 tests.
- **Web App** (`apps/web`): Next.js 14 App Router — landing page, guest/login, lobby with table list + creation, game board, settings, player profiles, leaderboard, i18n (tr/en), dark/light theme. 27 tests.
- **Database** (`packages/database`): Prisma schema with 13 models (User, Table, Game, GameMove, ChatMessage, Room, etc.), 8 enums, proper indexes and relations.
- **CI/CD**: GitHub Actions pipeline — lint, test (PostgreSQL service), build, Docker push (GHCR), Cloudflare Pages deploy.
- **Docker**: Multi-stage builds for game-server and web, Docker Compose for dev + prod, health checks, resource limits.
- **Security**: JWT access + refresh tokens, WebSocket auth gate + rate limiter, CSP headers, Zod validation, Prisma transactions, password hashing (bcrypt), Docker non-root user. Score 88/100.
- **Accessibility**: Skip-to-content link, `aria-live` regions, `role="application"` on game board, `:focus-visible` rings, safe-area CSS, 4.5:1 color contrast. Score 91/100.
- **Documentation**: ARCHITECTURE.md, DECISIONS.md, CONTRIBUTING.md, ROADMAP.md, DEPLOYMENT.md, INFRASTRUCTURE.md, SECURITY_AUDIT.md, PERFORMANCE_REPORT.md, QA_REPORT.md, backup/restore docs, rollback procedures.

### Removed

- `packages/shared/` — unused, all shared types moved to consuming packages or `@backgammon/database`
- `packages/ui/` — unused, components inlined in web app
- `@backgammon/layout-engine` dependency from web app — no longer needed

### Fixed

- Duplicate `resolvePlayer` method removed from `stats-service.ts` (60 lines dead code)
- Duplicate `applyMoveToState` replaced with `applyMove` from `Move.ts` (33 lines duplicate code)
- WebSocket reconnect logic with PING/PONG heartbeat (re-auth + re-join on reconnect)
- Safe-area CSS custom properties + Tailwind utilities for iOS notch/home indicator
- Legal move indicator minimum size (6px radius) for sub-400px screens
- Chat timestamp contrast ratio (4.5:1)
- Security audit: 20 vulnerabilities fixed (4 critical, 5 high, 6 medium, 5 low)

### Performance

- `getLegalMoves`: 8K–83K ops/sec depending on board state
- `executeAITurn`: ~3.7K ops/sec
- WebSocket rate limiter: 2.9M ops/sec
- WebSocket auth gate: 18–31M ops/sec
- Bundle: 96–113 KB first load JS per page (87.3 KB shared)
- Overall performance score: 90/100

### Known Limitations

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for full list.
