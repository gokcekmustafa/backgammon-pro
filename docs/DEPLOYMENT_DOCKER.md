# Docker Deployment Guide

## Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- At least 1GB RAM allocated to Docker
- PostgreSQL 16 (or use the included container)

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with production values

# 2. Start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Run database migrations
docker compose exec game-server npx prisma migrate deploy

# 4. Seed initial data (optional)
docker compose exec game-server node dist/seed.js

# 5. Verify
curl http://localhost:3001/api/health
```

## Production Architecture

```
                    ┌─────────────┐
                    │   Reverse   │
                    │   Proxy     │
                    │(nginx/caddy)│
                    └─────┬───────┘
                 ┌────────┴────────┐
                 │                 │
          ┌──────▼──────┐  ┌──────▼──────┐
          │  Web (Next) │  │ Game Server │
          │   :3000     │  │ :3001/:3002 │
          └──────┬──────┘  └──────┬──────┘
                 │                │
                 └──────┬─────────┘
                        │
                 ┌──────▼──────┐
                 │  PostgreSQL │
                 │   :5432     │
                 └─────────────┘
```

## Service Configuration

### PostgreSQL
- Uses `postgres:16-alpine`
- Persistent volume: `pgdata`
- Health check with `pg_isready`
- Configurable via env vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

### Game Server
- Fastify API on port 3001
- WebSocket on port 3002
- Waits for PostgreSQL to be healthy before starting
- Resource limits: 1 CPU / 512MB RAM
- Health check: `/api/health/ready`
- Restart: `unless-stopped`

### Web Frontend
- Next.js on port 3000
- Depends on game-server being started
- Resource limits: 0.5 CPU / 256MB RAM
- Restart: `unless-stopped`

## Environment Variables

See [ENVIRONMENT.md](ENVIRONMENT.md) for all variables.

Production must set:
- `JWT_SECRET` (required)
- `JWT_REFRESH_SECRET` (required)
- `CORS_ORIGIN` (web frontend URL)
- `POSTGRES_PASSWORD` (strong password)

## Health Checks

All services include Docker health checks:

```bash
# Check all service statuses
docker compose ps

# Check specific service health
docker compose exec game-server wget --no-verbose --tries=1 --spider http://localhost:3001/api/health
```

## Logging

All services use `json-file` logging driver with:
- Max file size: 10MB
- Max files: 3

View logs:
```bash
docker compose logs -f game-server
docker compose logs -f web
docker compose logs -f postgres
```

## Scaling

The game server is designed to be horizontally scalable behind a load balancer. WebSocket connections are stateful per connection; use sticky sessions (IP hash) for WebSocket traffic.

## Production Checklist

- [ ] Generate strong JWT secrets
- [ ] Set strong database passwords
- [ ] Configure CORS_ORIGIN to production domain
- [ ] Enable trusted proxy if behind reverse proxy
- [ ] Set NODE_ENV=production
- [ ] Configure resource limits
- [ ] Set up monitoring alerts
- [ ] Configure automated backups
- [ ] Set up log aggregation
- [ ] Run migrations before deployment
- [ ] Verify health checks pass
- [ ] Test graceful shutdown
