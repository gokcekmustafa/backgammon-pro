# Release Checklist — v1.0.0-RC1

## Pre-Release

- [x] All 549 tests pass (game-engine: 210, board-renderer: 55, layout-engine: 54, game-server: 203, web: 27)
- [x] Production build succeeds (game-server: 72.8 KB, web: 87.3 KB shared)
- [x] ESLint clean: 0 errors, 92 warnings (pre-existing, all `any` type warnings)
- [x] Prettier formatted: 0 formatting issues
- [x] No TODO/FIXME/HACK comments remaining
- [x] TypeScript strict mode enabled in all packages (via `base.json`)
- [x] Dead code removed:
  - `packages/shared/` - deleted (unused)
  - `packages/ui/` - deleted (unused)
  - `@backgammon/layout-engine` removed from web dependencies (unused)
  - `apps/game-server/dist/` - build artifacts (gitignored)
- [x] Duplicate `resolvePlayer` method removed from `stats-service.ts`
- [x] Duplicate `applyMoveToState` replaced with `applyMove` from `Move.ts`
- [x] Docker multi-stage builds verified (game-server + web)
- [x] `.dockerignore` verified (excludes node_modules, .git, .env\*, dist/)

## Environment & Configuration

- [x] `.env.example` documents all required variables (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, etc.)
- [x] Prisma schema validated (13 models, 8 enums, proper indexes)
- [x] No pending Prisma migrations (schema is source of truth)
- [x] Environment variables validated at startup via Zod in `env.ts`
- [x] JWT secrets crash production if missing
- [x] CORS configured per environment
- [x] CSP header configured in `next.config.mjs`

## CI/CD

- [x] GitHub Actions CI pipeline valid:
  - PostgreSQL service container
  - pnpm@9.15.0 setup
  - Prisma client generation
  - Lint → Test → Build → Docker push → Cloudflare deploy
- [x] Docker images tagged with `latest` + commit SHA
- [x] GHCR login with GITHUB_TOKEN

## Infrastructure

- [x] Docker Compose (dev + prod) with health checks, resource limits, logging
- [x] Cloudflare Pages config (`wrangler.toml`) with env vars
- [x] Graceful shutdown in game-server (SIGTERM/SIGINT)
- [x] Health check endpoints (`GET /api/health`, `GET /api/health/ready`)
- [x] Database backup/restore documented in `docs/operations/`
- [x] Rollback procedures documented in `docs/operations/`

## Security

- [x] Security audit completed (20 vulnerabilities fixed, score 88/100)
- [x] JWT key separation (access vs refresh tokens)
- [x] WebSocket auth gate (unauthenticated messages rejected)
- [x] WebSocket rate limiting (60 msg/10s window)
- [x] CSP header blocking inline scripts
- [x] Prisma transactions for rating updates + table joins
- [x] Zod validation on all API inputs
- [x] Docker non-root user
- [x] Chat username sanitized (< > stripped, 50 char cap)

## Accessibility

- [x] Skip-to-content link added
- [x] Game board SVG has `role="application"` + `aria-label`
- [x] Chat has `aria-live="polite"` region
- [x] Connection status has `aria-live="polite"` region
- [x] PlayerPanel turn indicator has `aria-live="polite"`
- [x] Form inputs all have associated `<label>` elements
- [x] All interactive elements have `:focus-visible` ring
- [x] Color contrast: minimum 4.5:1 ratio for text

## Cross-Platform

- [x] Safe-area CSS (notch/home indicator) via `env(safe-area-inset-*)`
- [x] `viewport-fit=cover` meta tag for iOS full-screen
- [x] WebSocket reconnect logic (3s delay) + PING/PONG heartbeat (25s)
- [x] Touch interaction support via Pointer Events API
- [x] Responsive layout: 4 breakpoints (mobile portrait → ultra-wide)
- [x] PWA manifest + service worker
- [x] Theme support (dark/light/system)

## Documentation

- [x] `ARCHITECTURE.md` - overall architecture
- [x] `DECISIONS.md` - key architectural decisions
- [x] `CONTRIBUTING.md` - contribution guidelines
- [x] `ROADMAP.md` - future plans
- [x] `docs/DEPLOYMENT.md` - production deployment
- [x] `docs/INFRASTRUCTURE.md` - infrastructure overview
- [x] `docs/SECURITY_AUDIT.md` - security audit report
- [x] `docs/PERFORMANCE_REPORT.md` - performance benchmarks
- [x] `docs/QA_REPORT.md` - cross-platform QA report
- [x] `docs/operations/backup-strategy.md` - backup/restore
- [x] `docs/operations/rollback.md` - rollback procedures

## Final Verification

- [ ] All secrets configured in production environment
- [ ] DATABASE_URL points to production PostgreSQL with SSL
- [ ] JWT_SECRET and JWT_REFRESH_SECRET set to unique random values
- [ ] CORS_ORIGIN set to production domain
- [ ] NEXT_PUBLIC_API_URL / NEXT_PUBLIC_WS_URL set to production endpoints
- [ ] Docker images pushed to GHCR
- [ ] Cloudflare Pages deployment triggered
- [ ] Prisma migrations applied to production database
- [ ] Health check endpoints responding
- [ ] SSL/TLS configured (Cloudflare or reverse proxy)
- [ ] Monitoring alerts configured

## Post-Release

- [ ] Smoke test: login, lobby, create table, play game
- [ ] Test WebSocket reconnection (close laptop lid, reopen)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Verify analytics/error tracking
- [ ] Check database connection pool size
