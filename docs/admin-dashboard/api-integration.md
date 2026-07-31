Admin Dashboard - API Integration Points

The Admin Dashboard will consume the following public APIs (best-effort, use dynamic require adapters):

- Telemetry / Analytics
  - endpoint: telemetry.summary(), telemetry.analytics()
  - Provides: daily/weekly/monthly counts, conversion rates, CTR, journey completion, top buttons

- Conversations API
  - endpoint: conversation.search({ q, filters })
  - Provides: transcript, AI decisions, citations, human takeover history

- Knowledge API
  - endpoint: ingestion.summary(), ingestion.list(), ingestion.status(id)
  - Provides: uploaded docs, crawl status, indexing, confidence metrics

- Universal Journey / Template loader
  - endpoint: template.getJourneyTemplateForProfile(profile)
  - Provides: journey structure, CTAs

- Installation / Tenant info (tenant-onboarding package)
  - endpoint: tenant-onboarding installation summaries and snippets

- Billing provider abstraction (mock Paddle provider)
  - endpoint: billing.summary(), billing.listSubscriptions()

- Audit logs
  - endpoint: audit.query({ limit, filters })
  - Provides: user actions, system events, timestamps

Integration design:
- Use src/services/integration.ts as single adapter layer. Attempt dynamic require of packages in the monorepo; if absent return safe stubs.
- Always include tenantId where applicable to preserve multi-tenant isolation.

