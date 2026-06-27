# Roadmap

## Current State — Foundation Phase

The project has completed its initial foundation. The following infrastructure is in place:

- **Workspace:** pnpm monorepo with 11 packages
- **Web shell:** Next.js 14 application with Tailwind CSS
- **Server shell:** Fastify 4 HTTP server
- **Library packages:** Six empty packages with build pipeline (game-engine, board-renderer, layout-engine, shared, ui, config)
- **Shared config:** TypeScript presets (base, nextjs, node), ESLint rules, Prettier formatting
- **Build pipeline:** tsup for packages, Next.js for web, tsup+tsx for game server
- **Code quality:** ESLint, Prettier, Husky pre-commit hooks, lint-staged
- **Testing:** Vitest configured across all packages
- **Documentation:** Architecture docs, ADRs, contributing guide

## Next Phases

Future phases will be defined as project goals are established. Planned areas of work include:

- Implementation of the backgammon game engine
- Board rendering and layout systems
- Web application UI
- Game server logic and API endpoints
- Database schema and persistence
- Authentication and authorization
- WebSocket real-time communication
- Mobile platform support (Android, iOS)

Specific milestones, timelines, and priorities will be documented here as they are determined.
