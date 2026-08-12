# ─── Production Containerization ──────────────────────────────────
# Multi-stage build: compiles the TypeScript monorepo, then produces a
# minimal Alpine runner image with only production dependencies.
#
# Targets:
#   runner           → saas-api server (default target)
#   pipeline-runner  → pipeline-orchestrator server
#
#   docker build -t conversation-engine/saas-api:latest -f Dockerfile .
#   docker build --target pipeline-runner -t conversation-engine/pipeline:latest -f Dockerfile .

# ─── Stage 1: builder ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Native module compilation (better-sqlite3) needs python3/make/g++
RUN apk add --no-cache python3 make g++

# Install dependencies first for optimal layer caching
COPY package.json package-lock.json ./
COPY packages packages/
# Root TypeScript configs: `npm run build:all` runs `tsc -b` from the root
# (requires tsconfig.json) and every package tsconfig extends tsconfig.base.json
COPY tsconfig.json tsconfig.base.json ./
# Migration SQL + CLI runners ship in the image so deployments can run
# `npm run db:migrate` as an explicit step (the app never auto-migrates).
COPY migrations migrations/
RUN npm ci
COPY scripts scripts/

# Compile TypeScript across all workspaces (saas-core, saas-api,
# conversation-orchestrator, widget, pipeline stages, ...)
RUN npm run build:all

# Drop devDependencies from the install tree
RUN npm prune --production

# ─── Stage 2: runner ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# tini for proper PID 1 signal handling; curl for healthchecks
RUN apk add --no-cache tini curl \
    && addgroup -S app \
    && adduser -S app -G app

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/saas.db \
    DATA_DIR=/app/data

# Only built dist bundles + production node_modules cross the stages
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/packages packages/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/migrations migrations/
COPY --from=builder /app/scripts scripts/

# Persistent SQLite volume mount point, owned by the non-root user
RUN mkdir -p /app/data && chown -R app:app /app

USER app
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=15s \
  CMD curl -fsS http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "packages/saas-api/dist/index.js"]

# ─── Pipeline orchestrator runner ────────────────────────────────
FROM runner AS pipeline-runner
ENV PORT=3456 \
    DATABASE_PATH=/app/data/pipeline.db
EXPOSE 3456
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD curl -fsS http://127.0.0.1:3456/api/healthz || exit 1
CMD ["node", "packages/pipeline-orchestrator/dist/server.js"]
