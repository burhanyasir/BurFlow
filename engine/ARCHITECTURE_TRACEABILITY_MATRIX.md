# Architecture Traceability Matrix

Maps architectural requirements from the 12 frozen specification documents to implementation packages and their tests.

## Core Types & Contracts

| Requirement | Source Doc | Package | Tests |
|---|---|---|---|
| TurnContext interface | CONVERSATION_ENGINE.md §3.1 | core-types/src/types.ts:39 | core-types errors.test.ts |
| PipelineRequest/Result | CONVERSATION_ENGINE.md §3.2 | core-types/src/types.ts:3-17 | — |
| ErrorCodes enum | FAILURE_AND_RECOVERY.md §2 | core-types/src/errors.ts | core-types errors.test.ts (3 tests) |
| Store interfaces | SESSION_AND_PERSISTENCE.md §4 | core-types/src/types.ts:162 | — |
| SessionState shape | SESSION_AND_PERSISTENCE.md §5.2 | core-types/src/types.ts:125 | — |
| TenantConfig shape | TENANT_ISOLATION.md §3 | core-types/src/types.ts:87 | — |
| SafetyVerdict shape | SAFETY.md §6 | core-types/src/types.ts:143 | — |
| StageInput/Result | CONVERSATION_ENGINE.md §3.3 | core-types/src/types.ts:26-35 | — |

## Store Implementations

| Requirement | Source Doc | Package | Tests |
|---|---|---|---|
| Tenant lookup & API key resolution | TENANT_ISOLATION.md §4.1 | tenant-registry | 6 tests |
| Tenant deactivation check | TENANT_ISOLATION.md §4.3 | tenant-registry/src/index.ts | tenant-registry.test.ts |
| Session CRUD + CAS commit | SESSION_AND_PERSISTENCE.md §5.3 | session-store | 7 tests |
| Session sequence counter | SESSION_AND_PERSISTENCE.md §5.4 | session-store/src/index.ts:114 | session-store.test.ts |
| Versioned config storage | TENANT_ISOLATION.md §5 | config-store | 6 tests |
| Default tenant config factory | TENANT_ISOLATION.md §3.1 | config-store/src/index.ts | config-store.test.ts |
| Idempotency/dedup check-and-set | MESSAGING_AND_CONSISTENCY.md §4 | dedup-store | 5 tests |
| TTL-based dedup expiry | MESSAGING_AND_CONSISTENCY.md §4.3 | dedup-store/src/index.ts | dedup-store.test.ts |

## Pipeline Stages

| Requirement | Source Doc | Package | Tests |
|---|---|---|---|
| Stage 1: Message validation | CONVERSATION_ENGINE.md §4.1 | stage-1-ingestion | 4 tests |
| Stage 1: Rate limiting | SAFETY.md §3.2 | stage-1-ingestion/src/index.ts:35 | stage-1-ingestion.test.ts |
| Stage 1: Abort signal | FAILURE_AND_RECOVERY.md §3.2 | stage-1-ingestion/src/index.ts:63 | stage-1-ingestion.test.ts |
| Stage 2: Tenant lookup | TENANT_ISOLATION.md §4 | stage-2-tenant-context | 4 tests |
| Stage 2: Config loading | TENANT_ISOLATION.md §5 | stage-2-tenant-context | stage-2-tenant-context.test.ts |
| Stage 2: Deactivation check | TENANT_ISOLATION.md §4.3 | stage-2-tenant-context/src/index.ts:26 | stage-2-tenant-context.test.ts |
| Stage 4: Session loading | SESSION_AND_PERSISTENCE.md §5.2 | stage-4-context | 3 tests |
| Stage 4: Context assembly | CONVERSATION_ENGINE.md §4.4 | stage-4-context/src/index.ts | stage-4-context.test.ts |
| Stage 7: CAS session commit | SESSION_AND_PERSISTENCE.md §5.3 | stage-7-persistence | 2 tests |
| Stage 7: Version conflict handling | FAILURE_AND_RECOVERY.md §4 | stage-7-persistence/src/index.ts | stage-7-persistence.test.ts |
| Stage 8: Response dispatch | CONVERSATION_ENGINE.md §4.8 | stage-8-dispatch | 2 tests |
| Stage 8: Latency tracking | ANALYTICS.md §3 | stage-8-dispatch/src/index.ts | stage-8-dispatch.test.ts |

## Orchestration & Server

| Requirement | Source Doc | Package | Tests |
|---|---|---|---|
| Pipeline execution order | CONVERSATION_ENGINE.md §3.4 | pipeline-orchestrator/src/pipeline.ts | 2 tests |
| Stage timeouts | FAILURE_AND_RECOVERY.md §3.2 | pipeline-orchestrator/src/pipeline.ts:58 | pipeline.test.ts |
| Error-to-status-code mapping | CONVERSATION_ENGINE.md §5 | pipeline-orchestrator/src/pipeline.ts:99 | pipeline.test.ts |
| Health endpoint | FAILURE_AND_RECOVERY.md §5 | pipeline-orchestrator/src/server.ts | — |
| Store health checks | FAILURE_AND_RECOVERY.md §5.2 | All store packages | Store-specific tests |
| API key auth (Express) | SECURITY.md §4.2 | pipeline-orchestrator/src/server.ts | — |
| Data seed for dev/test | — | pipeline-orchestrator/src/seed.ts | — |

## Coverage Summary

| Metric | Count |
|---|---|
| Architecture documents (frozen) | 12 |
| Implementation packages | 11 |
| Test files | 11 |
| Total tests | 44 |
| Requirements traced | 32+ |
