# Release Checklist — v1.0.0-RC1

## Pre-Release

- [x] All 499 tests pass (429 backend + 70 frontend)
- [x] Production build succeeds
- [x] ESLint clean: 0 errors
- [x] Prettier formatted: 0 formatting issues
- [x] No TODO/FIXME/HACK comments remaining
- [x] TypeScript strict mode enabled in all packages
- [x] Dead code removed (shared/, ui/, duplicate helpers)
- [x] Docker multi-stage builds verified (game-server + web)
- [x] `.dockerignore` verified

## Environment & Configuration

- [x] `.env.example` documents all required variables
- [x] Prisma schema validated (all models, enums, indexes)
- [x] No pending Prisma migrations (schema is source of truth)
- [x] Environment variables validated at startup via Zod
- [x] JWT secrets crash production if missing
- [x] CORS configured per environment
- [x] CSP header configured
- [x] Compression enabled
- [x] Trusted proxy support (`trustProxy: isProduction`)
- [x] Rate limiting: HTTP (global, per-user, per-IP) + WebSocket (60 msg/10s)
- [x] Session management with refresh token rotation
- [x] Anti-cheat: move timing, replay detection, server-side dice

## Documentation

- [x] `README.md` — complete project overview
- [x] `ARCHITECTURE.md` — system architecture
- [x] `DECISIONS.md` — key architectural decisions
- [x] `CONTRIBUTING.md` — contribution guidelines
- [x] `ROADMAP.md` — future plans
- [x] `docs/API.md` — complete API reference
- [x] `docs/ENVIRONMENT.md` — environment variable reference
- [x] `docs/DEPLOYMENT.md` — production deployment guide
- [x] `docs/DEPLOYMENT_DOCKER.md` — Docker deployment guide
- [x] `docs/DISASTER_RECOVERY.md` — disaster recovery plan
- [x] `docs/MONITORING.md` — monitoring & metrics guide
- [x] `docs/ADMIN_GUIDE.md` — admin operations guide
- [x] `docs/SUPER_ADMIN_GUIDE.md` — super admin operations guide
- [x] `docs/SECURITY_AUDIT.md` — security architecture
- [x] `docs/PERFORMANCE_REPORT.md` — performance benchmarks
- [x] `docs/QA_REPORT.md` — cross-platform QA report
- [x] `docs/INFRASTRUCTURE.md` — infrastructure overview
- [x] `docs/operations/backup-strategy.md` — backup & restore
- [x] `docs/operations/rollback.md` — rollback procedures

## CI/CD

- [x] GitHub Actions CI pipeline valid (lint → test → build → Docker)
- [x] Docker images tagged with `latest` + commit SHA
- [x] GHCR login with GITHUB_TOKEN

## Infrastructure & Deployment

- [x] `docker-compose.yml` (dev) + `docker-compose.prod.yml` (production)
- [x] PostgreSQL health check + application health checks
- [x] Correct startup order (postgres → game-server → web)
- [x] Graceful shutdown (SIGTERM/SIGINT with timeout)
- [x] Resource limits (CPU + memory) for all services
- [x] JSON-file logging with rotation (10MB max, 3 files)
- [x] `restart: unless-stopped` for all services
- [x] `tini` init system in Docker images for proper signal handling
- [x] Application runs as non-root user in Docker
- [x] Cloudflare Pages config (`wrangler.toml`)

## Security

- [x] Authentication: JWT access + refresh tokens, guest accounts
- [x] Authorization: role-based (SUPER_ADMIN, ADMIN, MODERATOR, USER)
- [x] Admin endpoints gated by role verification
- [x] Tournament registration checks permissions
- [x] Battle Pass premium rewards require PREMIUM/VIP subscription
- [x] Notification permissions: user can only access own notifications
- [x] WebSocket auth gate (unauthenticated messages rejected)
- [x] WebSocket rate limiting (60 msg/10s window)
- [x] HTTP rate limiting (global + per-user + per-IP)
- [x] CSP header blocking inline scripts
- [x] Prisma transactions for atomic operations
- [x] Zod validation on all API inputs
- [x] Chat username sanitized (< > stripped, 50 char cap)
- [x] Anti-cheat: impossible timing, replay detection, server dice

## Monitoring & Observability

- [x] Health endpoint: `GET /api/health` (basic) + `GET /api/health/ready` (readiness)
- [x] Metrics endpoint: `GET /api/metrics` (memory, CPU, connections, response times, event loop)
- [x] Cache stats: `GET /api/cache/stats` (hit ratio, size)
- [x] Security events: `GET /api/admin/security/events`
- [x] Audit logs: `GET /api/admin/audit`
- [x] Structured JSON logging (configurable via `LOG_FORMAT`)

## Performance

- [x] In-memory cache layer (Redis-compatible) with TTL invalidation
- [x] N+1 query elimination in season-service
- [x] Missing database indexes added (5 new)
- [x] WebSocket heartbeat (30s) + idle timeout (30min) + broadcast batching
- [x] React Query optimization (staleTime, gcTime, refetchOnMount: false)
- [x] Load testing scripts (login, leaderboard, tournaments, notifications, WebSocket)

## Code Quality

- [x] No TODO/FIXME/HACK/XXX comments
- [x] No dead code (`shared/`, `ui/`, duplicate helpers removed)
- [x] No debug `console.log` in production code (only seed.ts + env.ts + index.ts for startup)
- [x] Benchmark files isolated in `packages/game-engine/src/benchmarks/`
- [x] Consistent naming conventions across codebase
- [x] No temporary or generated files in version control

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
- [ ] Load tests pass against production

## Post-Release

- [ ] Smoke test: login, lobby, create table, play game
- [ ] Test WebSocket reconnection (close laptop lid, reopen)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Verify analytics/error tracking
- [ ] Check database connection pool size
