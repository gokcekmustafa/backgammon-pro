# Environment Variables

## Game Server (`apps/game-server`)

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for signing access tokens (min 32 chars) | `random-64-char-string` |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 32 chars) | `random-64-char-string` |

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `3001` | HTTP API port |
| `WS_PORT` | `3002` | WebSocket port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `NODE_ENV` | `development` | Environment (`development`, `production`, `test`) |
| `LOG_LEVEL` | `info` | Logging level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |
| `SHUTDOWN_TIMEOUT_MS` | `30000` | Graceful shutdown timeout in ms |

### Security
| Variable | Default | Description |
|----------|---------|-------------|
| `CONCURRENT_SESSION_LIMIT` | `5` | Max concurrent sessions per user |
| `SUSPICIOUS_LOGIN_THRESHOLD` | `5` | Failed logins before auto-revoke |
| `MIN_MOVE_TIME_MS` | `100` | Minimum time between moves (anti-cheat) |

### Rate Limiting
| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_MAX` | `100` | Global HTTP rate limit per minute |
| `RATE_LIMIT_PER_USER` | `200` | Per-user HTTP rate limit per minute |
| `RATE_LIMIT_PER_IP` | `300` | Per-IP HTTP rate limit per minute |

### Cache TTL (milliseconds)
| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL_DEFAULT` | `60000` | Default cache TTL |
| `CACHE_TTL_LEADERBOARD` | `30000` | Leaderboard cache TTL |
| `CACHE_TTL_SEASONS` | `30000` | Seasons cache TTL |
| `CACHE_TTL_PROFILE` | `60000` | User profile cache TTL |
| `CACHE_TTL_TOURNAMENTS` | `30000` | Tournament list cache TTL |
| `CACHE_TTL_ROOMS` | `10000` | Active rooms cache TTL |
| `CACHE_TTL_TABLES` | `5000` | Active tables cache TTL |

## Web Frontend (`apps/web`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Game server API URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3002` | WebSocket server URL |

## Database (`packages/database`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |

## Production Checklist

1. Generate strong secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET` (use `openssl rand -base64 64`)
2. Set `NODE_ENV=production`
3. Set `LOG_LEVEL=info` (or `warn` for quieter logs)
4. Configure `CORS_ORIGIN` to the web frontend domain
5. Set `RATE_LIMIT_MAX=200` or higher for production
6. Enable trusted proxy if behind a reverse proxy
7. Set strong database credentials in `DATABASE_URL`
