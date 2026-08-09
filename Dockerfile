# ─── Production Containerization ──────────────────────────────────
# Multi-stage build for the BurFlow SaaS platform.
#
# Stages / targets:
#   base             → Node.js 20 with native toolchain (better-sqlite3)
#   engine-builder   → installs monorepo deps, builds saas-core, saas-api,
#                      pipeline-orchestrator, conversation-orchestrator, widget
#   frontend-builder → builds the React dashboard (frontend/)
#   runner           → lightweight runtime: saas-api server + background worker
#                      (pipeline-orchestrator server)
#   static           → nginx image with built dashboard + widget assets baked in
#
#   docker build -t burflow/app:latest --target runner .
#   docker build -t burflow/nginx:latest --target static .

# ─── Stage 1: base ────────────────────────────────────────────────
FROM node:20-alpine AS base
# Native module compilation (better-sqlite3) needs python3/make/g++
RUN apk add --no-cache python3 make g++

# ─── Stage 2: engine builder ──────────────────────────────────────
FROM base AS engine-builder
WORKDIR /app/engine

# Install dependencies first for optimal layer caching
COPY engine/package.json engine/package-lock.json ./
COPY engine/packages ./packages
RUN npm ci

# Compile TypeScript across all workspaces (saas-core, saas-api,
# conversation-orchestrator, pipeline-orchestrator, widget, ...)
RUN npm run build:all

# Drop devDependencies from the install tree
RUN npm prune --production

# ─── Stage 3: frontend builder ────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ─── Stage 4: runner (saas-api server + background worker) ────────
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
COPY --from=engine-builder /app/engine/node_modules ./node_modules
COPY --from=engine-builder /app/engine/packages ./packages
COPY --from=engine-builder /app/engine/package.json ./package.json

# Persistent SQLite volume mount point, owned by the non-root user
RUN mkdir -p /app/data && chown -R app:app /app

USER app
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=15s \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

# Start the pipeline-orchestrator server as a background worker, then
# launch the saas-api server as the main process.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "PORT=3456 node packages/pipeline-orchestrator/dist/server.js & exec node packages/saas-api/dist/index.js"]

# ─── Stage 5: static assets for nginx ─────────────────────────────
FROM nginx:1.25-alpine AS static
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY --from=engine-builder /app/engine/packages/widget/dist/widget.js /usr/share/nginx/html/widget/widget.js
