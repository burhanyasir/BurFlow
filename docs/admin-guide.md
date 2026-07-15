# BrightSmile AI — Admin Guide

This guide is for agency administrators who operate the BrightSmile AI console and backend.

## Architecture Overview

- **Server**: Node.js + Express (`server.js`)
- **Database**: SQLite (`agency.db`) via `better-sqlite3`
- **Agency modules**: `lib/agency/*` (clients, tenants, scanner, onboarding, proposals, invoices, deployment)
- **Core chatbot**: `lib/conversation-manager.js` (unchanged demo engine)
- **Logging**: structured JSON via `pino` (`lib/logger.js`)
- **Health**: `GET /api/health`

## Starting the Server

```bash
npm start                # development
npm run start:prod       # NODE_ENV=production
AGENCY_SEED=true npm start   # force reseed of demo data
```

The server auto-seeds demo data (six sample businesses) when the database is empty and `NODE_ENV !== "production"`.

## API Reference (Agency)

All agency endpoints are mounted under `/api/agency`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard` | Agency KPIs |
| GET/POST/PUT/DELETE | `/clients` , `/clients/:id` | Client CRM |
| GET/PUT | `/clients/:id/tenant` | Tenant & branding |
| POST | `/clients/:id/scanner` | Scan a website |
| GET | `/clients/:id/scanner` | Scan history |
| POST | `/clients/:id/scanner/:rid/apply` | Apply scan to config |
| POST | `/clients/:id/onboarding/init` | Init onboarding |
| GET | `/clients/:id/onboarding` | Onboarding progress |
| POST | `/onboarding/:tid/toggle` | Toggle task |
| POST | `/clients/:id/proposals` | Generate proposal |
| PUT | `/proposals/:id/status` | Update proposal |
| POST | `/clients/:id/invoices` | Create invoice |
| PUT | `/invoices/:id/status` | Update invoice |
| GET | `/clients/:id/deployment` | Readiness + snippet |
| POST | `/clients/:id/deployment/config` | Save config |

## Database Maintenance

The SQLite file is `agency.db` (with `-wal`/`-shm` companions). To reset demo data, stop the server and delete `agency.db*`, then restart.

## Monitoring

- `GET /api/health` returns uptime, memory, fuzzer status, and active session count.
- Logs are JSON; in production pipe to your log aggregator.
- The System Health page in the console summarizes this.

## Backups

SQLite is a single file. Back it up by copying `agency.db` (stop writes or use `.backup` via the sqlite CLI) during low-traffic windows.
