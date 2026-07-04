# Backup & Restore Strategy

## Database Backups

### Automated Backups (Docker Cron)

```bash
# Create backup script
cat > /usr/local/bin/pg-backup.sh << 'SCRIPT'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${RETENTION_DAYS:-30}

docker compose -f /opt/backgammon/docker-compose.prod.yml exec -T postgres \
  pg_dump -U ${POSTGRES_USER:-backgammon} -d ${POSTGRES_DB:-backgammon} \
  --format=custom --compress=9 \
  -f /tmp/backup-${TIMESTAMP}.dump

docker compose -f /opt/backgammon/docker-compose.prod.yml cp \
  postgres:/tmp/backup-${TIMESTAMP}.dump ${BACKUP_DIR}/backup-${TIMESTAMP}.dump

# Cleanup old backups
find ${BACKUP_DIR} -name "backup-*.dump" -mtime +${RETENTION_DAYS} -delete
SCRIPT

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/pg-backup.sh" | crontab -
```

### Manual Backup

```bash
# Full backup (compressed custom format)
docker compose exec -T postgres pg_dump -U backgammon -d backgammon --format=custom --compress=9 > /backups/manual-$(date +%Y%m%d-%H%M%S).dump

# SQL format (for inspection)
docker compose exec -T postgres pg_dump -U backgammon -d backgammon --clean --if-exists > /backups/manual-$(date +%Y%m%d-%H%M%S).sql
```

### Point-in-Time Recovery (WAL Archiving)

For higher RPO, enable WAL archiving in `postgresql.conf`:

```conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'
archive_timeout = 300
```

Restore with WAL:
```bash
docker compose down
# Restore base backup
pg_restore -d postgres://user:pass@host/db /backups/latest.dump
# Apply WAL up to target time
# Configure recovery.conf with restore_command and recovery_target_time
docker compose up -d postgres
```

## Restore

### Full Restore

```bash
# 1. Stop application services
docker compose -f docker-compose.prod.yml stop game-server web

# 2. Drop and recreate database
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U backgammon -c 'DROP DATABASE IF EXISTS backgammon; CREATE DATABASE backgammon;'

# 3. Restore from backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U backgammon -d backgammon --clean --if-exists < /backups/backup-latest.dump

# 4. Run migrations to ensure schema is current
docker compose -f docker-compose.prod.yml exec game-server npx prisma migrate deploy

# 5. Start application services
docker compose -f docker-compose.prod.yml start game-server web

# 6. Verify
curl -f http://localhost:3001/api/health/ready && echo "Restore successful"
```

## SLA

| Metric | Current Target | With WAL Archiving |
|--------|---------------|-------------------|
| RTO | < 30 minutes | < 15 minutes |
| RPO | < 24 hours | < 5 minutes |
| Retention | 30 days | 30 days + WAL |

## Verification

Monthly: Restore backup to staging, run `pnpm test`, verify data integrity.
