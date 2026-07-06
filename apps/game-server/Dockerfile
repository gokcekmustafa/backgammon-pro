FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/game-server/package.json ./apps/game-server/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @backgammon/database run prisma:generate

FROM deps AS builder
COPY apps/game-server/tsconfig.json ./apps/game-server/
COPY apps/game-server/tsup.config.ts ./apps/game-server/
COPY apps/game-server/src/ ./apps/game-server/src/
RUN pnpm -r run build

FROM deps AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/game-server/dist/ ./apps/game-server/dist/

USER appuser
EXPOSE 3001 3002
CMD ["node", "apps/game-server/dist/index.js"]
