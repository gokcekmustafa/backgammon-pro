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
RUN pnpm --filter @backgammon/database run prisma:generate

FROM deps AS builder
COPY apps/game-server/tsconfig.json ./apps/game-server/
COPY apps/game-server/tsup.config.ts ./apps/game-server/
COPY apps/game-server/src/ ./apps/game-server/src/
RUN pnpm -r run build

FROM deps AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN ls -la node_modules/jsonwebtoken 2>&1 || echo "BEFORE_PRUNE: jsonwebtoken NOT FOUND"
RUN node -e "console.log('BEFORE_PRUNE:', require.resolve('jsonwebtoken'))" 2>&1 || echo "BEFORE_PRUNE: jsonwebtoken CJS resolve FAILED"

RUN pnpm prune --prod

RUN ls -la node_modules/jsonwebtoken 2>&1 || echo "AFTER_PRUNE: jsonwebtoken NOT FOUND"
RUN node -e "console.log('AFTER_PRUNE:', require.resolve('jsonwebtoken'))" 2>&1 || echo "AFTER_PRUNE: jsonwebtoken CJS resolve FAILED"
RUN node --input-type=module -e "import('jsonwebtoken').then(()=>{console.log('AFTER_PRUNE: jsonwebtoken ESM OK');process.exit(0)}).catch(e=>{console.error('AFTER_PRUNE: jsonwebtoken ESM FAIL:',e.message);process.exit(0)})"

COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/game-server/package.json ./
COPY --from=builder /app/apps/game-server/dist/ ./dist/

RUN node -e "console.log('FINAL:', require.resolve('jsonwebtoken'))" 2>&1 || echo "FINAL: jsonwebtoken CJS resolve FAILED"
RUN node --input-type=module -e "import('jsonwebtoken').then(()=>{console.log('FINAL: jsonwebtoken ESM OK');process.exit(0)}).catch(e=>{console.error('FINAL: jsonwebtoken ESM FAIL:',e.message);process.exit(0)})"

USER appuser
EXPOSE 3001 3002
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]