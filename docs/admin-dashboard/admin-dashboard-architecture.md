Admin Dashboard - Iteration 1 Architecture

Overview:
- Extension-only admin dashboard package that consumes public APIs from existing engine packages.
- No modification of frozen engines. All upstream interfaces are accessed via best-effort dynamic requires.
- Backend: Express router exposing JSON endpoints under /admin-dashboard/* that the frontend will consume.
- Frontend: Component-based SPA (separate repo or workspace) that calls these endpoints.

Components:
- Routes (src/routes/dashboard.ts): HTTP surface for pages (home, analytics, conversations, knowledge, widget, billing, api-keys, settings, audit-logs)
- Integration service (src/services/integration.ts): Best-effort adapters to telemetry, conversation-engine, knowledge ingestion, billing abstraction, audit logs.
- Tests (src/__tests__): Lightweight smoke tests for integration adapters.

Data flow:
- Frontend -> /admin-dashboard/* endpoints -> integration adapters -> upstream public API modules (if present) or local stubs.

Security & multi-tenant:
- Endpoints should be mounted behind platform auth in next iterations. For now endpoints are read-only and return aggregated data.
- Ensure tenant scoping in calls to upstream services (pass tenantId where applicable).

Deployment notes:
- Package is self-contained; add to monorepo build pipeline when front-end is ready.
- No DB changes required.

Diagram (text):
[Admin UI] -> [Admin Dashboard Router] -> [Integration Adapters] -> [Telemetry, Conversation Engine, Knowledge, Billing, Audit]

