# Deployment Guide

## Architecture

```
Internet
   |
   ├── Cloudflare DNS ── Cloudflare Pages (Web App)
   |
   └── Docker Host
       ├── game-server  (port 3001 HTTP + 3002 WS)
       ├── web          (port 3000 Next.js)
       └── postgres     (port 5432)
```

## Prerequisites

- Docker & Docker Compose (production)
- Cloudflare account (Pages + DNS)
- GitHub repository with CI configured

## Environment Setup

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/backgammon-pro.git
cd backgammon-pro
cp .env.example .env
```

### 2. Set Production Secrets

Edit `.env`:

```env
DATABASE_URL=postgres://user:password@postgres:5432/backgammon
JWT_SECRET=<random-64-char-hex>
JWT_REFRESH_SECRET=<random-64-char-hex>
CORS_ORIGIN=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
LOG_LEVEL=info
LOG_FORMAT=json
```

### 3. Deploy with Docker Compose

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

### 4. Run Database Migrations

```bash
docker compose -f docker-compose.prod.yml exec game-server npx prisma migrate deploy
```

### 5. Cloudflare Pages Deployment

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Deploy
pnpm install --frozen-lockfile
pnpm --filter @backgammon/database run build
pnpm --filter @backgammon/web run build
wrangler pages deploy apps/web/.next --project-name=backgammon-pro
```

Or push to `main` branch — CI handles it automatically.

## Health Check

```bash
# Basic health
curl https://api.your-domain.com/api/health

# Readiness check
curl https://api.your-domain.com/api/health/ready
```

## Troubleshooting

| Symptom                    | Likely Cause         | Fix                                               |
| -------------------------- | -------------------- | ------------------------------------------------- |
| WebSocket connection fails | CORS_ORIGIN mismatch | Check env vars                                    |
| DB connection refused      | Postgres not healthy | Check logs: `docker compose logs postgres`        |
| JWT errors                 | Missing secrets      | Verify JWT_SECRET / JWT_REFRESH_SECRET            |
| 502 from Cloudflare        | Pages build failed   | Check CI logs or `wrangler pages deployment list` |

## Monitoring

- Health endpoint: `GET /api/health` (basic) and `/api/health/ready` (readiness)
- Docker: `docker compose logs --tail=50 -f`
- Structured JSON logs in production (set `LOG_FORMAT=json`)
