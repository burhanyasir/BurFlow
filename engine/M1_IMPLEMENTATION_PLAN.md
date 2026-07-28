# M1 Implementation Plan — Foundation

**Goal:** A request enters the pipeline, passes through stages 1→2→4→7→8, and a response is returned.

## Repository Structure

```
engine/
├── package.json                 # Workspace root
├── tsconfig.base.json           # Shared TS config
├── packages/
│   ├── core-types/              # Interfaces, error codes, TurnContext
│   ├── tenant-registry/         # Tenant identity + API key lookup (SQLite)
│   ├── session-store/           # Session CRUD + CAS commit (SQLite)
│   ├── config-store/            # Tenant config versioning (JSON file)
│   ├── dedup-store/             # Message dedup cache (SQLite)
│   ├── stage-1-ingestion/       # Auth, seq, dedup, rate-limit, safety sub-steps
│   ├── stage-2-tenant-context/  # Tenant identity validation, config load
│   ├── stage-4-context/         # Session load, history assembly
│   ├── stage-7-persistence/     # CAS commit
│   ├── stage-8-dispatch/        # Response delivery
│   ├── pipeline-orchestrator/   # Stage sequencer + health endpoint
│   └── test-utils/              # Shared test helpers, mocks, seed data
├── tests/
│   ├── unit/                    # Per-package unit tests (co-located preferred)
│   └── integration/             # Cross-package integration tests
└── scripts/
    └── seed-test-data.js        # Seeds tenant registry + config for dev/test
```

## Package Dependencies

```
core-types (zero deps)
  ├── tenant-registry
  ├── session-store
  ├── config-store
  ├── dedup-store
  ├── stage-1-ingestion  (depends: core-types, tenant-registry, dedup-store)
  ├── stage-2-tenant-context (depends: core-types, config-store, tenant-registry)
  ├── stage-4-context   (depends: core-types, session-store)
  ├── stage-7-persistence (depends: core-types, session-store)
  ├── stage-8-dispatch  (depends: core-types)
  ├── pipeline-orchestrator (depends: all stage packages, all store packages)
  └── test-utils        (devDependency only)
```

## Interfaces & Contracts

### Core Types (core-types/src/index.ts)
- `TurnContext` — mutable context passed through pipeline
- `StageInput` — `{ context: TurnContext, signal: AbortSignal }`
- `StageResult` — `{ success: boolean, error?: PipelineError, errorCode?: ErrorCode }`
- `StageHandler` — `(input: StageInput) => Promise<StageResult>`
- `PipelineRequest` — raw inbound request
- `PipelineResult` — final response + metadata
- `PipelineError` — `{ stage, errorCode, message, retryable }`
- `ErrorCode` — union type of all error codes from architecture docs
- Store interfaces: `Store` (with `health()`), `TenantRegistry`, `SessionStore`, `ConfigStore`, `DedupStore`

### Store Interfaces
See §4 of IMPLEMENTATION_GUIDE.md for the full contracts.

## Database Schemas

### Session Store (SQLite)
```sql
CREATE TABLE sessions (
    tenant_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    state TEXT NOT NULL DEFAULT '{}',
    state_machine TEXT NOT NULL DEFAULT 'initial',
    sequence_counter INTEGER NOT NULL DEFAULT 0,
    config_version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    ttl_minutes INTEGER NOT NULL DEFAULT 1440,
    grace_period_days INTEGER NOT NULL DEFAULT 7,
    legal_hold_days INTEGER NOT NULL DEFAULT 90,
    PRIMARY KEY (tenant_id, session_id)
);
```

### Dedup Store (SQLite)
```sql
CREATE TABLE dedup_cache (
    tenant_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    original_sequence INTEGER NOT NULL,
    response_hash TEXT,
    response_body TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    PRIMARY KEY (tenant_id, message_id)
);
```

### Tenant Registry (SQLite)
```sql
CREATE TABLE tenant_registry (
    tenant_id TEXT NOT NULL PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('active', 'deactivated')),
    created_at TEXT NOT NULL,
    deactivated_at TEXT,
    deactivation_reason TEXT
);
CREATE TABLE api_keys (
    key_hash TEXT NOT NULL PRIMARY KEY,
    key_prefix TEXT NOT NULL,
    salt TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    label TEXT,
    created_at TEXT NOT NULL,
    revoked_at TEXT
);
```

### Config Store (JSON files on disk)
```
configs/
  <tenantId>/
    v1.json
    v2.json
    latest.json     # symlink or copy of latest version
```

## External Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `typescript` | ^5.4 | TypeScript compiler |
| `better-sqlite3` | ^12.11 | SQLite bindings (same as existing demo-mode) |
| `uuid` | ^14.0 | UUID generation for event IDs, session IDs |
| `vitest` | ^2.0 | Test framework |
| `express` | ^4.18 | HTTP server for health endpoint |
| `pino` | ^10.3 | Logging |

## Test Plan

### Unit Tests (per package)
- **core-types**: Type correctness, error code exhaustiveness
- **tenant-registry**: Lookup active/deactivated/missing tenant, API key hash/validate, revoked key rejection
- **session-store**: Create, load, commit (success + version conflict), TTL expiry
- **config-store**: Save version, load version, latest version, missing version, corrupt file
- **dedup-store**: Set, check, TTL expiry, miss
- **stage-1-ingestion**: Valid auth, missing auth, deactivated tenant, sequence OK, sequence violation, dedup hit, dedup miss, rate limit under/over, crisis detection
- **stage-2-tenant-context**: Config loads, config missing, config corrupt, store unreachable
- **stage-4-context**: Session loads, session not found, session expired
- **stage-7-persistence**: Commit succeeds, CAS conflict, store error
- **stage-8-dispatch**: Response delivered, response too large
- **pipeline-orchestrator**: Full happy path, stage failure propagation, timeout, degraded stage tracking

### Integration Tests
1. **Happy path turn**: Full pipeline with valid tenant, new session → response returned
2. **Rate limited request**: Rate limit exceeded → 429, no downstream stages run
3. **Out-of-sequence**: Sequence violation → ERR_OUT_OF_SEQUENCE
4. **Duplicate message**: Same messageId within TTL → cached response returned
5. **Unknown tenant**: No matching API key → 401
6. **Deactivated tenant**: Active API key but tenant deactivated → 403
7. **Session CAS conflict**: Concurrent commit → conflict, retry, eventually succeeds
8. **Config version missing**: ConfigVersion in TurnContext not in store → error

## Deliverables

1. Monorepo with npm workspaces and all packages
2. All store packages with SQLite implementations
3. All stage packages (1, 2, 4, 7, 8) with stage handlers
4. Pipeline orchestrator with stage sequencing, timeout, error handling
5. Express server exposing POST /api/chat (pipeline entry) and GET /api/health
6. Seed script creating test tenant + API key
7. Unit test suite (passing, ≥85% coverage)
8. Integration test suite (passing, 8 scenarios)
9. ARCHITECTURE_TRACEABILITY_MATRIX.md
