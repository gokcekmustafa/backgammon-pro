FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
COPY tsconfig.json ./
COPY apps/web/next.config.mjs ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/tailwind.config.ts ./apps/web/
COPY apps/web/postcss.config.js ./apps/web/
COPY apps/web/src/ ./apps/web/src/
COPY packages/ ./packages/
RUN pnpm --filter @backgammon/database run build
RUN pnpm --filter @backgammon/web run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache tini
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/apps/web/.next/ ./.next/
COPY --from=builder /app/apps/web/public/ ./public/
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/node_modules/ ./node_modules/

RUN rm -rf /tmp/* /root/.cache /root/.npm

USER appuser
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "--filter", "@backgammon/web", "start"]