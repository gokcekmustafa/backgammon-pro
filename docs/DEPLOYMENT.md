# Deployment Guide

## Architecture

```
                    ┌─────────────┐
                    │   Internet  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │  Cloudflare │          │  Cloudflare  │
       │  Pages (CDN)│          │  DNS + Proxy │
       └──────┬──────┘          └──────┬──────┘
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │  Web App    │          │  API Server  │
       │  (Next.js)  │          │  (Docker)    │
       └─────────────┘          └──────┬──────┘
                                       │
                               ┌──────▼──────┐
                               │  PostgreSQL  │
                               │  (Docker)    │
                               └─────────────┘
```

## Prerequisites

- Docker Engine 24+ & Docker Compose v2+
- Cloudflare account (for DNS + optional Pages)
- GitHub repository with CI configured
- Domain name with DNS pointed to your server

## Docker Deployment

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/backgammon-pro.git
cd backgammon-pro
cp .env.example .env
```

### 2. Set Production Secrets

Edit `.env`:

```env
# Database
DATABASE_URL=postgres://backgammon:strongpassword@postgres:5432/backgammon
POSTGRES_USER=backgammon
POSTGRES_PASSWORD=strongpassword

# JWT (generate with: openssl rand -base64 64)
JWT_SECRET=your-64-char-secret
JWT_REFRESH_SECRET=your-64-char-secret

# Server
HTTP_PORT=3001
WS_PORT=3002
NODE_ENV=production
LOG_LEVEL=info

# Frontend URL (for CORS)
CORS_ORIGIN=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com

# Rate Limiting (production)
RATE_LIMIT_MAX=200
```

### 3. Generate Secrets

```bash
# Generate JWT secrets
openssl rand -base64 64
openssl rand -base64 64

# Generate database password
openssl rand -base64 32
```

### 4. Deploy

```bash
# Start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d

# Run database migrations
docker compose exec game-server npx prisma migrate deploy

# Verify health
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/ready
```

### 5. Seed Initial Data (Optional)

```bash
docker compose exec -e SUPER_ADMIN_EMAIL=admin@example.com -e SUPER_ADMIN_PASSWORD=securepass game-server node dist/seed.js
```

## Zero-Downtime Deployment

The application supports rolling deployments:

1. **Database migrations are non-destructive** — all migrations are additive (add columns, create tables, add indexes). No column drops or table renames.
2. **Old code remains compatible** with migrated schema during transition.
3. **Health checks** ensure the new container is ready before accepting traffic.

Deployment script:

```bash
#!/bin/bash
set -e

# 1. Pull latest images
docker compose -f docker-compose.prod.yml pull

# 2. Run migrations first (safe, additive only)
docker compose -f docker-compose.prod.yml up -d --no-deps --scale game-server=1 game-server
docker compose exec -T game-server npx prisma migrate deploy

# 3. Restart services with new images
docker compose -f docker-compose.prod.yml up -d --force-recreate

# 4. Verify
sleep 5
curl -f http://localhost:3001/api/health/ready && echo "Deployment successful"
```

## Reverse Proxy Setup (Recommended)

For production, place a reverse proxy (nginx, Caddy, Traefik) in front:

```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    # HTTP API
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Install**: `pnpm install --frozen-lockfile`
2. **Lint**: `pnpm lint`
3. **Build**: `pnpm build`
4. **Test**: `pnpm test`
5. **Docker build**: Build and push images to registry
6. **Deploy**: SSH to server, run deployment script

## Health Checks

- `/api/health` — Basic health (database connectivity)
- `/api/health/ready` — Readiness (database + WebSocket server)
- `/api/metrics` — Full metrics snapshot

## Monitoring & Alerts

See [MONITORING.md](MONITORING.md) for full monitoring setup.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| WebSocket fails to connect | CORS origin mismatch | Verify `CORS_ORIGIN` matches frontend domain |
| DB connection refused | PostgreSQL not ready | Check `docker compose logs postgres` |
| JWT errors | Missing or invalid secrets | Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` |
| 502 Bad Gateway | Service not ready | Check `docker compose ps`, verify health checks |
| High memory usage | Resource limits not set | Verify `deploy.resources.limits` in compose file |
| Container restarting | Health check failing | Check logs: `docker compose logs --tail=50 game-server` |

## Backup & Restore

See [operations/backup-strategy.md](operations/backup-strategy.md) for backup procedures.
See [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) for disaster recovery plan.
