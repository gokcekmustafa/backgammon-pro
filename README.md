# Backgammon Pro

A commercial-grade online Backgammon platform with real-time multiplayer, tournaments, seasons, battle pass, and full administrative tooling.

## Technology Stack

| Layer            | Technology                   |
| ---------------- | ---------------------------- |
| Framework (Web)  | Next.js 14 (React 18)        |
| API Server       | Fastify 4                    |
| Language         | TypeScript 5 (strict)        |
| Styling          | Tailwind CSS 3               |
| Database         | PostgreSQL 16 + Prisma ORM   |
| Real-time        | WebSocket (ws)               |
| Caching          | In-memory (Redis-compatible) |
| Package Manager  | pnpm 9 (workspaces)          |
| Container        | Docker + docker-compose      |
| Testing          | Vitest                       |

## Quick Start

```bash
pnpm install
pnpm --filter @backgammon/database run prisma:generate
pnpm build
pnpm dev
```

## Project Structure

```
apps/
  game-server/       # Fastify API + WebSocket server
  web/               # Next.js frontend
packages/
  board-renderer/    # Canvas-based board rendering
  config/            # Shared config (eslint, prettier, tsconfig)
  database/          # Prisma schema + client
  game-engine/       # Game logic (rules, AI, validation)
docs/                # Documentation
load-tests/          # k6 load testing scripts
```

## Key Features

- **Real-time multiplayer** with WebSocket-based game sessions
- **Matchmaking** with ranked/standard tables in themed rooms
- **Tournaments** with single-elimination brackets
- **Seasons & Battle Pass** with XP progression and rewards
- **Anti-cheat** with server-side validation, timing checks, replay detection
- **Security** with refresh token rotation, session management, rate limiting
- **Admin panel** for user management, moderation, and system oversight
- **Monitoring** with health checks, metrics, and structured logging

## Documentation

| Document | Description |
|----------|-------------|
| [API](docs/API.md) | Complete API reference |
| [Environment](docs/ENVIRONMENT.md) | Environment variable reference |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment |
| [Docker](docs/DEPLOYMENT_DOCKER.md) | Docker deployment guide |
| [Backup & Restore](docs/operations/backup-strategy.md) | Backup procedures |
| [Disaster Recovery](docs/DISASTER_RECOVERY.md) | DR plan |
| [Security](docs/SECURITY_AUDIT.md) | Security architecture |
| [Monitoring](docs/MONITORING.md) | Metrics & observability |
| [Admin Guide](docs/ADMIN_GUIDE.md) | Admin operations |
| [Super Admin Guide](docs/SUPER_ADMIN_GUIDE.md) | Super Admin operations |
| [Architecture](ARCHITECTURE.md) | System architecture |
| [Contributing](CONTRIBUTING.md) | Contribution guidelines |

## Environment Variables

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for the complete reference.

## License

Proprietary. All rights reserved.
