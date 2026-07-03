# Backup & Restore Strategy

## Database Backups

### Automatic (Recommended)

```bash
# Daily backup via cron
0 2 * * * pg_dump -U backgammon backgammon > /backups/backgammon-$(date +\%Y\%m\%d).sql

# Keep last 30 days, remove older
0 4 * * * find /backups -name "backgammon-*.sql" -mtime +30 -delete
```

### Manual Backup

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U backgammon backgammon > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore

```bash
# Stop services (except postgres)
docker compose -f docker-compose.prod.yml stop game-server web

# Drop and recreate (use with caution)
docker compose -f docker-compose.prod.yml exec -T postgres psql -U backgammon -c 'DROP DATABASE IF EXISTS backgammon; CREATE DATABASE backgammon;'

# Restore
docker compose -f docker-compose.prod.yml exec -T postgres psql -U backgammon backgammon < backup-20250101-000000.sql

# Restart services
docker compose -f docker-compose.prod.yml start game-server web
```

## Monitoring

- Check health endpoint every 60s (e.g., via UptimeRobot, Cronitor, or similar)
- Monitor Docker container restarts: `docker compose ps`
- Set up log aggregation (e.g., Grafana Loki, Papertrail) for structured JSON logs

## SLA Guidelines

- Recovery Time Objective (RTO): < 30 minutes
- Recovery Point Objective (RPO): < 24 hours (daily backup)
- For higher RPO, consider streaming WAL archiving to S3-compatible storage
