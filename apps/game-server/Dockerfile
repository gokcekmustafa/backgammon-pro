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

# DIAG 1: deps stage after pnpm install
RUN echo "=== DIAG 1: deps node_modules ===" && \
    ls -la node_modules/jsonwebtoken 2>&1 || echo "jsonwebtoken_NOT_FOUND" && \
    readlink -f node_modules/jsonwebtoken 2>&1 || echo "readlink_FAILED" && \
    ls -la node_modules/.pnpm/ | grep jsonwebtoken 2>&1 || echo "NO_pnpm_jsonwebtoken" && \
    pnpm list jsonwebtoken --depth 0 2>&1 || echo "pnpm_list_FAILED" && \
    true

RUN pnpm prune --prod

# DIAG 2: after prune
RUN echo "=== DIAG 2: after pnpm prune --prod ===" && \
    (ls -la node_modules/jsonwebtoken 2>&1 || echo "jsonwebtoken_NOT_FOUND") && \
    (readlink -f node_modules/jsonwebtoken 2>&1 || echo "readlink_FAILED") && \
    (ls -la node_modules/.pnpm/ 2>&1 | grep jsonwebtoken || echo "NO_pnpm_jsonwebtoken") && \
    (pnpm list jsonwebtoken --depth 0 2>&1 || echo "pnpm_list_FAILED") && \
    (node --input-type=module -e "import('jsonwebtoken').then(()=>console.log('ESM OK')).catch(e=>{console.error('ESM FAIL:',e.code,e.message);process.exit(0)})" 2>&1 || echo "node_import_FAILED") && \
    (node -e "console.log('CJS:',require.resolve('jsonwebtoken'))" 2>&1 || echo "cjs_resolve_FAILED") && \
    true

COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/game-server/package.json ./
COPY --from=builder /app/apps/game-server/dist/ ./dist/

# DIAG 3: final stage
RUN echo "=== DIAG 3: final runner ===" && \
    (ls -la node_modules/jsonwebtoken 2>&1 || echo "jsonwebtoken_NOT_FOUND") && \
    (readlink -f node_modules/jsonwebtoken 2>&1 || echo "readlink_FAILED") && \
    (node --input-type=module -e "import('jsonwebtoken').then(()=>console.log('ESM OK')).catch(e=>{console.error('ESM FAIL:',e.code,e.message);process.exit(0)})" 2>&1 || echo "node_import_FAILED") && \
    (node -e "console.log('CJS:',require.resolve('jsonwebtoken'))" 2>&1 || echo "cjs_resolve_FAILED") && \
    (head -5 /app/package.json 2>&1 || echo "no_package_json") && \
    true

USER appuser
EXPOSE 3001 3002
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
