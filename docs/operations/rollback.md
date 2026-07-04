# Rollback Procedures

## Application Rollback

### Prerequisites
- Previous Docker images tagged or available in registry
- Database migration rollback scripts available (see below)
- Backup from before the deployment

### Rollback Steps

```bash
# 1. Identify the previous stable version
docker compose -f docker-compose.prod.yml images

# 2. Revert to previous images
docker compose -f docker-compose.prod.yml up -d --force-recreate \
  game-server=previous-tag \
  web=previous-tag

# 3. Verify health
curl -f http://localhost:3001/api/health/ready

# 4. If database schema changed, run rollback migration
# See Database Rollback below

# 5. Verify full functionality
curl -f http://localhost:3001/api/health
```

## Database Rollback

All migrations are additive (no destructive operations), so rollback is typically unnecessary. However, if a migration introduced a breaking schema change:

### Rollback via Manual SQL

Each migration has a corresponding rollback script in `packages/database/prisma/migrations/`. Run these in reverse order:

```bash
# Connect to database
docker compose exec -T postgres psql -U backgammon -d backgammon

# Reverse the most recent migration
ALTER TABLE "Users" DROP COLUMN IF EXISTS "role";
DROP TYPE IF EXISTS "user_role";

ALTER TABLE "Users" DROP COLUMN IF EXISTS "deleted_at";
ALTER TABLE "Users" DROP COLUMN IF EXISTS "banned_at";
DROP TABLE IF EXISTS "AuditLogs";

# Verify
\dt
```

### Full Database Restore

If multiple migrations need reversal:

```bash
# 1. Restore from backup taken before the deployments
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U backgammon -d backgammon --clean --if-exists < /backups/pre-deploy.dump

# 2. Verify
docker compose -f docker-compose.prod.yml exec game-server npx prisma migrate status

# 3. Run any remaining required migrations
docker compose -f docker-compose.prod.yml exec game-server npx prisma migrate deploy
```

## Migration Safety

All existing migrations are **additive only**:
- `20260703215600_add_rbac`: Added `role` column + enum (safe to revert)
- `20260703220000_add_audit_log`: Added `banned_at`/`deleted_at` columns + AuditLogs table (safe to revert)

**Never** create destructive migrations (DROP COLUMN, DROP TABLE, ALTER COLUMN type) in this codebase. Always: add columns, create new tables, add indexes.

## Verification After Rollback

```bash
# 1. Health check
curl http://localhost:3001/api/health/ready

# 2. Database connectivity
docker compose exec game-server npx prisma migrate status

# 3. Run test suite
pnpm test

# 4. Manual smoke test
curl http://localhost:3001/api/stats/leaderboard
```
