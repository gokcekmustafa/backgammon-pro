FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/game-server/package.json ./apps/game-server/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/game-server/tsconfig.json ./apps/game-server/
COPY apps/game-server/tsup.config.ts ./apps/game-server/
COPY apps/game-server/src/ ./apps/game-server/src/
COPY packages/ ./packages/
RUN pnpm --filter @backgammon/database run build
RUN pnpm --filter @backgammon/game-server run build
RUN pnpm --filter @backgammon/database run prisma:generate

FROM node:20-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache tini
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/apps/game-server/dist/ ./dist/
COPY --from=builder /app/packages/database/dist/ ./node_modules/@backgammon/database/dist/
COPY --from=builder /app/packages/database/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=builder /app/node_modules/ ./node_modules/

RUN rm -rf /tmp/* /root/.cache /root/.npm

USER appuser
EXPOSE 3001 3002
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
