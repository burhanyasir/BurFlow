# ─── Pipeline Orchestrator ───────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY packages packages/
RUN npm ci && npm run build && npm prune --production

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini curl && addgroup -S app && adduser -S app -G app
COPY --from=build /app/node_modules node_modules/
COPY --from=build /app/packages packages/
COPY --from=build /app/package.json .
RUN mkdir -p /data && chown -R app:app /data
ENV NODE_ENV=production \
    PORT=3456 \
    DATA_DIR=/data
USER app
EXPOSE 3456
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:3456/api/healthz || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "packages/pipeline-orchestrator/dist/server.js"]
