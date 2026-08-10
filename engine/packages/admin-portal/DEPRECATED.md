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

## Deployment caveat (resolved)

`engine/Dockerfile.frontend` (used by the `frontend` service in
`engine/docker-compose.yml`) previously built this package. It now builds the
canonical `frontend/` dashboard instead (build context is the repository root;
see the header comment in that Dockerfile). The `frontend` nginx service serves
only the canonical dashboard and proxies `/api` to `saas-api:3000`.

This package can now be deleted outright — nothing in the repository depends on
it (not referenced by `tsc -b`, `build:all`, vitest, or any package import).
Delete this directory and, if present, any workspace/tsconfig entry referencing it.
