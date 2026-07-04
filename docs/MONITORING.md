# Monitoring Guide

## Metrics Endpoint

`GET /api/metrics` returns a full system snapshot:

### Response Fields

| Field | Description |
|-------|-------------|
| `timestamp` | ISO 8601 timestamp |
| `uptime` | Process uptime in seconds |
| `memory` | RSS, heapTotal, heapUsed, external (bytes) |
| `cpu` | User and system CPU time (microseconds) |
| `connections.activeUsers` | Unique users with active WS connection |
| `connections.totalConnections` | Total WebSocket connections |
| `connections.authenticatedConnections` | Authenticated WS connections |
| `games.activeGames` | Currently active games |
| `games.finishedGamesToday` | Matches completed today |
| `rateLimiter` | Global count, user buckets, IP buckets |
| `cache.size` | Number of cached entries |
| `cache.hitRatio` | Cache hit ratio (0.0–1.0) |
| `database.connected` | Database connectivity status |
| `database.responseTimeMs` | Database query response time |
| `responseTimes` | Average, p95, p99 API response times (ms) |
| `eventLoop.lagMs` | Event loop lag (ms) |

## Health Endpoints

### Basic Health
`GET /api/health`
```json
{ "status": "ok", "database": "connected", "uptime": 12345, "timestamp": "..." }
```

### Readiness
`GET /api/health/ready`
```json
{ "status": "ready", "checks": { "database": "connected", "websocket": "running" }, "uptime": 12345 }
```

### Cache Stats
`GET /api/cache/stats`
```json
{ "size": 15, "hitCount": 234, "missCount": 12, "hitRatio": 0.95, "keys": ["seasons:active", "..."] }
```

## Security Events

Security events are automatically logged to the `SecurityEvents` table. Monitor via:

```bash
# Recent events
GET /api/admin/security/events?limit=50

# Summary counts
GET /api/admin/security/summary

# Filter by type
GET /api/admin/security/events?eventType=CHEAT_ATTEMPT&severity=HIGH
```

### Event Types
| Type | Trigger |
|------|---------|
| `FAILED_LOGIN` | Invalid credentials |
| `TOKEN_ABUSE` | Reused/rotated token detected |
| `RATE_LIMIT_VIOLATION` | Rate limit exceeded |
| `CHEAT_ATTEMPT` | Impossible move timing, replay attack |
| `SUSPICIOUS_ACTIVITY` | Unusual pattern detected |
| `SESSION_REVOKED` | Session revoked due to abuse |

## Audit Logs

Admin actions are logged to `AuditLogs` table:

```bash
GET /api/admin/audit?limit=50
```

## Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Response time (p95) | >2000ms | >5000ms |
| Error rate | >1% | >5% |
| Cache hit ratio | <0.7 | <0.5 |
| Event loop lag | >50ms | >200ms |
| Memory usage | >70% heap | >90% heap |
| Database response time | >100ms | >500ms |
| Failed logins (24h) | >50 | >200 |
| Active connections | >5000 | >8000 |

## Logging

All services output structured JSON logs. Log format:

```json
{
  "level": "info",
  "time": "2026-07-04T02:30:00.000Z",
  "msg": "HTTP server listening",
  "port": 3001
}
```

### Log Levels
- `error` — Unexpected errors requiring investigation
- `warn` — Recoverable issues, rate limiting, suspicious activity
- `info` — Normal operations: server start/stop, game events
- `debug` — Detailed operational information
- `trace` — Full request/response data
