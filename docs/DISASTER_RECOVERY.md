# Disaster Recovery Plan

## Recovery Objectives

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 1 hour (point-in-time recovery) |
| Data Loss Tolerance | Up to 1 hour of game state |

## Failure Scenarios

### 1. Database Failure

**Symptoms:** Health check fails, `database` status shows `disconnected`, API returns 503

**Recovery Steps:**
```bash
# 1. Check database container status
docker compose ps postgres

# 2. Check logs for errors
docker compose logs --tail=50 postgres

# 3. If container crashed, restart
docker compose restart postgres

# 4. If data corrupted, restore from backup
docker compose down postgres
docker compose run --rm postgres bash -c "pg_restore -d postgres://user:pass@host/db < /backups/latest.dump"
docker compose up -d postgres

# 5. If volume corrupted, restore from volume backup
# Stop services, restore pgdata volume, restart
```

### 2. Application Server Failure

**Symptoms:** Health check fails, 5xx errors on API

**Recovery Steps:**
```bash
# 1. Check container status
docker compose ps game-server web

# 2. Restart if crashed
docker compose restart game-server
docker compose restart web

# 3. If stuck, force recreate
docker compose up -d --force-recreate game-server
```

### 3. Full Region Failure

**Recovery Steps:**
1. Provision new infrastructure in secondary region
2. Restore database from latest backup
3. Deploy application using deployment pipeline
4. Run database migrations
5. Update DNS to point to new region
6. Verify health checks pass

### 4. Security Breach

**Immediate Actions:**
1. Revoke all active sessions: `POST /api/admin/security/sessions/revoke-all`
2. Rotate JWT secrets
3. Rotate database credentials
4. Review security events: `GET /api/admin/security/events`
5. Audit all recent admin actions: `GET /api/admin/audit`
6. Force password reset for affected users

### 5. Data Corruption

**Steps:**
```bash
# 1. Take the application offline
docker compose down

# 2. Identify the last known good backup
ls -la /backups/

# 3. Restore database
docker compose run --rm postgres \
  pg_restore --clean --if-exists \
  -d postgres://user:pass@host/db \
  /backups/backup_before_corruption.dump

# 4. Verify data integrity
docker compose up -d postgres
docker compose exec game-server node dist/seed.js --check

# 5. Bring application back online
docker compose up -d
```

## Backup Verification

Monthly: Restore backup to staging environment, run full test suite.

## Communication

- **Critical incidents:** Notify on-call engineer within 15 minutes
- **Major incidents:** Notify team lead within 1 hour
- **Minor incidents:** Log in incident tracker within 24 hours

## Post-Incident

1. Document root cause
2. Create preventive measures
3. Update runbook
4. Review RTO/RPO targets
5. Schedule follow-up review within 1 week
