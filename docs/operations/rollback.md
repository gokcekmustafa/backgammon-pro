# Rollback Procedures

## 1. Docker Rollback

```bash
# Revert to previous image tag
docker compose -f docker-compose.prod.yml up -d --pull=always

# Or explicitly specify previous tag
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml run --rm game-server ghcr.io/your-org/backgammon-pro/game-server:<previous-sha>
docker compose -f docker-compose.prod.yml run --rm web ghcr.io/your-org/backgammon-pro/web:<previous-sha>
```

## 2. Database Rollback

Prisma Migrate supports rollback via migration history:

```bash
# Check migration history
docker compose -f docker-compose.prod.yml exec game-server npx prisma migrate status

# Roll back last migration
docker compose -f docker-compose.prod.yml exec game-server npx prisma migrate reset --force
```

**⚠️ Warning:** `migrate reset` drops all data. Use database restore from backup instead when data preservation is needed.

## 3. Cloudflare Pages Rollback

### Via Dashboard

1. Go to Cloudflare Dashboard > Pages > backgammon-pro
2. Click on the latest deployment
3. Click "Rollback" to revert to a previous deployment

### Via Wrangler CLI

```bash
wrangler pages deployment list --project-name=backgammon-pro
wrangler pages deployment --project-name=backgammon-pro <deployment-id>
```

## 4. DNS / Cloudflare Rollback

If DNS changes caused issues:

1. Cloudflare Dashboard > DNS > Records
2. Revert any changed A/AAAA/CNAME records
3. If using Cloudflare Tunnel, check tunnel status in Zero Trust dashboard

## Quick Checklist

- [ ] Identify the issue (health endpoint? logs?)
- [ ] Decide: rollback Docker images or revert Cloudflare Pages?
- [ ] For DB issues: restore from latest backup
- [ ] Verify health endpoint returns 200
- [ ] Verify WebSocket connections succeed
- [ ] Notify users if applicable
