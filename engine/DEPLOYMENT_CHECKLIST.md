# RC1 Deployment Checklist

## Prerequisites

### Environment
- [ ] Node.js 20+ installed
- [ ] npm 9+ installed
- [ ] Access to production server (Linux x64 recommended)
- [ ] SQLite 3.x (bundled with better-sqlite3, no system install needed)
- [ ] PM2 installed globally (`npm i -g pm2`) for non-container deployments
- [ ] Docker + Docker Compose installed for container deployments
- [ ] DNS records configured for services

### Build Verification
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run lint` succeeds (no type errors)
- [ ] `npm test` passes — all **964+ tests** across **48 files**
- [ ] `npm run verify:build` passes (no stale build artifacts)
- [ ] `npm run ci` passes (full verification pipeline)
- [ ] `npx vitest run tests/load/load-suite.test.ts` passes — load test within budget
- [ ] `npx vitest run tests/failure/failure-injection.test.ts` passes — failure injection tests pass
- [ ] `npx vitest run tests/stability/stability.test.ts` passes — stability tests pass
- [ ] `npx vitest run tests/deployment/deployment-check.test.ts` passes — deployment artifacts verified
- [ ] `node scripts/validate-env.js` exits 0 (all required vars set)

---

## Environment Variables

### Required (service will not start without these)
| Variable | Service | Expected Value | Verified |
|----------|---------|----------------|----------|
| `JWT_SECRET` | SaaS API | 32+ character random hex string | [ ] |
| `INTERNAL_SYNC_KEY` | Both | 16+ character random hex string | [ ] |

### Strongly Recommended
| Variable | Service | Expected Value | Verified |
|----------|---------|----------------|----------|
| `LLM_API_KEY` | Pipeline | `sk-...` or `pk-...` API key | [ ] |
| `CORS_ORIGIN` | SaaS API | Comma-separated origins or `false` | [ ] |
| `LOG_LEVEL` | Both | `info` (default), `warn`, `error`, `debug` | [ ] |
| `DATA_DIR` | Pipeline | Path to persistent data directory | [ ] |
| `DB_PATH` | SaaS API | Path to SaaS SQLite database | [ ] |

### Security Notes
- `JWT_SECRET` must be at least 32 characters. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `INTERNAL_SYNC_KEY` must be at least 16 characters. Generate with: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`
- Pipeline sync traffic uses HTTP by default. In production, `PIPELINE_URL` should be `https://...`
- A startup warning is emitted if `PIPELINE_URL` uses HTTP to a non-localhost target

---

## Service Configuration

### Pipeline Orchestrator (Port 3456)
- [ ] Health endpoint accessible at `/api/healthz` (no auth — for load balancer probes)
- [ ] Readiness endpoint accessible at `/api/ready` (no auth — checks store availability)
- [ ] Metrics at `/api/metrics` (JSON) and `/api/metrics/prometheus` (Prometheus text format)
- [ ] `require.main === module` guard ensures server only listens when run directly

### SaaS API (Port 8080)
- [ ] Auth endpoint at `/api/auth/login`
- [ ] Health endpoint at `/api/health`
- [ ] Metrics at `/api/metrics`
- [ ] CORS configured via `CORS_ORIGIN` env var

### Admin Portal (Port 3000)
- [ ] Served via Vite dev server or built static files
- [ ] API proxy targets SaaS API at configured URL

---

## Deployment Options

### Option A: Docker Compose (Recommended)
```bash
# 1. Build and start
docker compose up -d

# 2. Verify
docker compose ps
curl http://localhost:3456/api/healthz
curl http://localhost:8080/api/health

# 3. View logs
docker compose logs -f
```

### Option B: PM2 (Non-Container)
```bash
# 1. Validate environment
node scripts/validate-env.js

# 2. Build TypeScript
npm run build

# 3. Start with PM2
pm2 start ecosystem.config.js --env production

# 4. Verify
pm2 status
curl http://localhost:3456/api/healthz

# 5. Persist PM2 config for auto-restart
pm2 save
pm2 startup
```

### Option C: Manual Start
```powershell
# Terminal 1 — Pipeline Orchestrator
$env:LLM_API_KEY="sk-..." ; $env:INTERNAL_SYNC_KEY="..." ; node packages/pipeline-orchestrator/dist/server.js

# Terminal 2 — SaaS API
$env:JWT_SECRET="..." ; $env:INTERNAL_SYNC_KEY="..." ; node packages/saas-api/dist/index.js
```

---

## Security Checklist

### Authentication & Authorization
- [ ] Pipeline `/api/chat` requires valid API key (Bearer token or `x-api-key` header)
- [ ] Internal sync endpoints require `INTERNAL_SYNC_KEY` + replay protection (timestamp + nonce)
- [ ] SaaS API auth endpoints rate-limited (login: 20/15min, signup: 10/15min)
- [ ] CORS configured with specific origins (not `*`)
- [ ] API keys hashed with salt in tenant registry
- [ ] Tenant isolation enforced — API key determines tenant (not `x-tenant-id` header)

### Transport Security
- [ ] TLS/SSL configured for all public-facing endpoints (reverse proxy required)
- [ ] `PIPELINE_URL` uses `https://` when pipeline is not on localhost
- [ ] Internal sync traffic between SaaS API and pipeline is on private network or HTTPS

### Secrets Management
- [ ] `JWT_SECRET` generated with sufficient entropy (32+ bytes)
- [ ] `INTERNAL_SYNC_KEY` generated with sufficient entropy (16+ bytes)
- [ ] `LLM_API_KEY` stored in environment variable (not committed)
- [ ] Secrets vault rotation supported — runtime env var changes picked up immediately

### Data Protection
- [ ] All SQLite databases in persistent storage with regular backups
- [ ] Config store (JSON files) in persistent storage
- [ ] Session TTL expiry — stale sessions not returned (lazy cleanup)
- [ ] Dedup entries auto-expire via TTL

---

## Monitoring

### Essential Endpoints
| Endpoint | Purpose | Auth | Used By |
|----------|---------|------|---------|
| `/api/healthz` | Liveness probe | None | Load balancer, K8s, Docker |
| `/api/ready` | Readiness probe | None | Load balancer, K8s, Docker |
| `/api/health` | Detailed health | Required | Operators |
| `/api/metrics` | JSON metrics | None | Manual inspection |
| `/api/metrics/prometheus` | Prometheus metrics | None | Prometheus scraper |

### Health Check Integration
- Docker healthcheck configured in `docker-compose.yml` (30s interval, 3 retries)
- PM2 monitor: `pm2 monit`
- Load balancer targets: `/api/healthz` on port 3456, `/api/health` on port 8080

### Logging
- Pino structured JSON logs (stdout for container, files for PM2)
- Log level configurable via `LOG_LEVEL` env var
- Secret redaction configured for passwords, API keys, tokens, auth headers
- Request context propagation via AsyncLocalStorage (requestId, tenantId, userId)

### Metric Scraping (Prometheus)
```yaml
# prometheus.yml target example
scrape_configs:
  - job_name: 'ce-pipeline'
    static_configs:
      - targets: ['localhost:3456']
    metrics_path: '/api/metrics/prometheus'
```

---

## Load Validation

### Before Production Traffic
- [ ] Run load test: `node tests/load/load-test.mjs --duration 60 --concurrent 20`
  - P50 < 1000ms, P95 < 3000ms, P99 < 5000ms
  - Error rate < 5%, Throughput > 1 rps
- [ ] Run soak test: `node tests/stability/soak-test.mjs --iterations 300 --interval 200`
  - No memory leak (heap growth < 50MB over 60s)
  - Error rate < 10%
- [ ] Run E2E test: `npx vitest run packages/pipeline-orchestrator/src/__tests__/e2e.test.ts`
  - All 45 E2E tests pass
- [ ] Run full test suite: `npm test`
  - All 48 test files, 964+ tests pass

---

## Rollback Plan

### Safe Rollback Steps
1. Keep previous deployment's `dist/` directories and `node_modules` intact
2. To roll back a Docker deployment: `docker compose down && docker compose -f docker-compose.previous.yml up -d`
3. To roll back a PM2 deployment: `pm2 stop all && git checkout <previous-tag> && npm run build && pm2 restart all`
4. Verify rollback health: `curl http://localhost:3456/api/healthz`

### Data Migration Notes
- SQLite schema is backward-compatible for the last 2 releases
- Config store JSON format is versioned — old versions remain accessible
- Session state is ephemeral — rollback may lose in-flight requests

---

## Go/No-Go Decision

### All Must Pass
- [ ] All build verification steps pass
- [ ] All required environment variables configured
- [ ] Load test within latency budget
- [ ] Soak test passes (no memory leak, stable error rate)
- [ ] Health endpoints respond correctly
- [ ] TLS termination configured
- [ ] DNS records propagated
- [ ] Database backups configured
- [ ] Monitoring dashboards operational
- [ ] Rollback plan documented and tested

### Decision
- [ ] **GO** — All criteria met
- [ ] **NO-GO** — Blocking issues identified (list below)

### Blocking Issues
1.
2.
3.
