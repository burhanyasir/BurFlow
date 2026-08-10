# DEPRECATED — `@platform/admin-dashboard`

**Status: deprecated — do not add new features here.**

This package is a leftover Express Router dashboard stub with **no consumers**:

- Not referenced by `engine/tsconfig.json` project references (`tsc -b` skips it).
- Not built by `npm run build:all`.
- Not mounted by `saas-api`, not imported by any package, and not included in
  the vitest workspace.

## Canonical replacement

The **single canonical dashboard UI is `frontend/`** at the repository root
(a Vite + React 19 SPA, served by the `saas-api` Express server). All admin UI
lives there.

## Cleanup

This package can be deleted outright — nothing in the repository depends on it.
Remove its directory and, if present, any workspace/tsconfig entry referencing it.
