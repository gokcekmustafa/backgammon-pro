# Production Infrastructure

## Architecture Overview

```
                    Internet
                       |
               ┌───────┴───────┐
               |  Cloudflare   |
               | (DNS + Pages) |
               └───────┬───────┘
                       |
          ┌────────────┴────────────┐
          |                         |
  Cloudflare Pages           Docker Host
  (Next.js static + SSR)     ┌──────┴──────┐
                             |             |
                      game-server      postgres
                      (Node.js)        (PostgreSQL
                       HTTP:3001        16-alpine)
                       WS:3002
```

## Component Mapping

| Component        | Technology             | Port(s)    | Purpose              |
| ---------------- | ---------------------- | ---------- | -------------------- |
| web              | Next.js 14 (React)     | 3000       | Frontend UI          |
| game-server      | Node.js + Fastify + WS | 3001, 3002 | HTTP API + WebSocket |
| postgres         | PostgreSQL 16          | 5432       | Database             |
| Cloudflare Pages | Static + Functions     | 80/443     | CDN + SSR            |

## Deployment Options

### Option A: Docker Compose (Recommended)

Single host, all services in Docker. Good for MVP up to ~100 concurrent users.

### Option B: Cloudflare Pages + Docker

- Web app on Cloudflare Pages (global CDN, zero maintenance)
- Game server + DB on VPS (Docker Compose)

### Option C: Fully Managed

- Web app → Cloudflare Pages
- Game server → Fly.io / Railway / Render
- Database → Managed Postgres (RDS, Cloud SQL, etc.)

## Scaling Considerations

- **Game server**: Horizontally scalable behind a load balancer (requires shared Redis for session state)
- **WebSocket**: Sticky sessions needed if scaling game-server instances; consider Socket.io with Redis adapter
- **Database**: Connection pooling via PgBouncer; read replicas for leaderboard queries
- **Rate limiting**: Increase `RATE_LIMIT_MAX` per-instance or use centralized Redis-based rate limiting
