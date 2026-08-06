# BurFlow Migration Blueprint

Status: Proposal only. Implementation should begin only after this blueprint is reviewed and approved.

## Scope

This plan covers only engine-level migration candidates that directly support the target architecture:

Website Scanner -> Knowledge Engine -> Conversion Brain -> AI Sales Agent -> Widget -> Analytics

## Explicit non-goals

Do not migrate the following as part of this phase:

- Duplicate UI pages and marketing surfaces
- Authentication, signup, and session flows
- Routing shell, app layout, and dashboards
- Admin dashboard screens and duplicate portal experiences
- Billing or subscription UI components

## Migration principles

- Prefer adapter-based porting over wholesale copy-and-paste.
- Preserve current BurFlow product positioning as an AI Website Sales Agent.
- Keep tenant isolation, storage boundaries, and knowledge-source ownership intact.
- Introduce new capabilities behind feature flags where possible.
- Keep rollback simple and reversible.

## Candidate 1 — Website Scanner

- Source location: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\knowledge.ts
- Target location: engine/packages/stage-1-ingestion/ and engine/packages/knowledge-pipeline/
- Dependencies:
  - Tenant context and request validation
  - URL validation and crawl configuration
  - Knowledge ingestion queue and document persistence
- Breaking changes:
  - The current BurFlow stack should treat website scanning as a first-class ingestion pathway rather than an optional add-on.
  - Crawl payloads must be normalized to BurFlow’s tenant and knowledge models.
- Estimated effort: Medium (4–6 days)
- Migration order: 1
- Tests required:
  - Unit tests for URL validation and crawl option normalization
  - Integration tests for enqueueing, processing, and status transitions
  - Regression tests for invalid/private URLs and oversized content
- Rollback strategy:
  - Keep the existing manual knowledge upload path as the default fallback.
  - Gate the new scanner behind a feature flag so it can be disabled without losing existing knowledge sources.

## Candidate 2 — Knowledge Engine

- Source location: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\knowledge-pipeline\src\pipeline.ts
- Target location: engine/packages/knowledge-pipeline/
- Dependencies:
  - Parsers and normalizers
  - Chunking and embedding providers
  - Vector store and knowledge publishing layer
  - Tenant-scoped database tables
- Breaking changes:
  - The pipeline must be adapted to BurFlow’s existing storage and runtime conventions.
  - The current repo likely needs a slimmer interface so the knowledge engine can be used without the larger SaaS stack.
- Estimated effort: Medium (4–6 days)
- Migration order: 2
- Tests required:
  - Unit tests for parser registration and queue deduplication
  - Integration tests for document processing end to end
  - Verification tests for chunking, indexing, and publish/versioning behavior
- Rollback strategy:
  - Keep the old knowledge ingestion path intact and swap to the migrated engine only after staging validation.
  - If processing quality regresses, disable the new engine and revert to the prior ingestion route.

## Candidate 3 — Conversion Brain

- Source location: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\conversation-brain.ts
- Target location: engine/packages/conversation-orchestrator/
- Dependencies:
  - Conversation memory state
  - Funnel-stage and persona detection
  - Buying-intent and objection detection
  - Retrieval and qualification context
- Breaking changes:
  - The logic should be re-scoped from generic support chat to conversion-oriented sales behavior.
  - Prompt and tone behavior must be adapted so the assistant behaves like a sales agent, not a support bot.
- Estimated effort: Medium to Large (6–8 days)
- Migration order: 3
- Tests required:
  - Unit tests for intention and funnel classification
  - Conversation tests for objections, qualification prompts, and CTA selection
  - Regression tests for fallback and low-confidence behavior
- Rollback strategy:
  - Keep the existing conversation engine as the fallback path.
  - Route traffic through the migrated conversion brain only when confidence and quality checks pass in staging.

## Candidate 4 — AI Sales Agent

- Source location: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\orchestrator.ts
- Target location: engine/packages/pipeline-orchestrator/ and engine/packages/conversation-orchestrator/
- Dependencies:
  - Conversion brain output
  - Knowledge retrieval context
  - Session memory and turn context
  - Response generation and policy rules
- Breaking changes:
  - The orchestrator should be tuned for lead capture, qualification, and next-step actions rather than general FAQ answering.
  - The current BurFlow experience should preserve its public-facing voice and not overfit to support-agent behavior.
- Estimated effort: Medium (4–5 days)
- Migration order: 4
- Tests required:
  - End-to-end conversation tests for qualification and handoff scenarios
  - Response quality checks against known sales prompts
  - Safety and grounding checks against retrieved knowledge
- Rollback strategy:
  - Ship the new orchestrator behind a feature flag and compare responses against the prior assistant until quality is stable.
  - If sales behavior degrades, switch back to the previous response path immediately.

## Candidate 5 — Widget

- Source location: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\widget\src\index.ts
- Target location: engine/packages/widget/
- Dependencies:
  - Widget token verification and config endpoints
  - Tenant-scoped widget configuration
  - Frontend script injection contract
- Breaking changes:
  - The widget should expose BurFlow’s sales-agent behavior rather than a generic support widget.
  - Embedded configuration must remain compatible with the current public embed flow.
- Estimated effort: Small to Medium (3–4 days)
- Migration order: 5
- Tests required:
  - Unit tests for config parsing and token verification
  - Integration tests for snippet generation and embed configuration
  - Browser smoke tests for the embedded widget experience
- Rollback strategy:
  - Keep the existing embed integration path available and disable the new widget build by toggling the script source.
  - If embed failures occur, revert to the prior widget asset or disable the new snippet.

## Candidate 6 — Analytics

- Source location: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\admin.ts and engine\packages\conversation-orchestrator\src\button-telemetry.ts
- Target location: engine/packages/saas-api/ and engine/packages/conversation-orchestrator/
- Dependencies:
  - Conversation event capture
  - Usage and session persistence
  - Tenant-scoped analytics sinks
- Breaking changes:
  - Telemetry should be focused on conversion signals, engagement quality, and lead progression rather than purely generic support metrics.
  - Analytics payloads must be kept lightweight to avoid coupling the engine to UI-specific dashboards.
- Estimated effort: Small to Medium (3–5 days)
- Migration order: 6
- Tests required:
  - Unit tests for event shape and metric aggregation
  - Integration tests for conversation telemetry persistence
  - Regression tests to confirm analytics events do not break the runtime path
- Rollback strategy:
  - Disable telemetry emission first if any event quality issues appear.
  - Preserve the existing event schema so analytics can be re-enabled without data loss.

## Recommended implementation sequence

1. Port the Website Scanner ingestion path.
2. Port the Knowledge Engine and validate retrieval quality.
3. Port the Conversion Brain and align it to sales-oriented conversation goals.
4. Port the AI Sales Agent orchestration layer.
5. Wire the Widget to the new engine path.
6. Add analytics and conversion telemetry last.

## Approval gate

No implementation should start until this plan is approved. The next step after approval should be a controlled porting effort with feature flags, staging validation, and rollback-ready releases.
