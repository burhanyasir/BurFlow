# DEPRECATED — `@conversation-engine/admin-portal`

**Status: deprecated — do not add new features here.**

This package is a stale, standalone React dashboard. It is **not** wired into any
runtime path of the product:

- Not referenced by `engine/tsconfig.json` project references (`tsc -b` skips it).
- Not built by `npm run build:all` (which explicitly builds only saas-core,
  conversation-orchestrator, widget, and saas-api).
- Not included in the vitest workspace, and no other package imports it.

## Canonical replacement

The **single canonical dashboard UI is `frontend/`** at the repository root
(a Vite + React 19 SPA). It is served by the `saas-api` Express server and is
what tenants actually use.

## Deployment caveat (before deleting)

`engine/Dockerfile.frontend` (used by the `frontend` service in
`engine/docker-compose.yml`) still builds this package and serves its `dist/`
via nginx. Before removing this folder:

1. Point `Dockerfile.frontend` at the canonical `frontend/` build, or
2. Remove the `frontend` service from `engine/docker-compose.yml` (the dashboard
   is already served by `saas-api`), then
3. Delete this directory and its workspace entry.

Once the Docker wiring is updated, this package can be deleted.
