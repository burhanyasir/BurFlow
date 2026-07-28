# Ticket B: Fallback-Logging Gap — `console.warn` Has No Aggregation

## Origin
Item 9 of ticket-a: added `console.warn` at `buildTopicResponse()` return-null point to surface unanswered topics. The conversation-orchestrator package has no structured logger — it uses bare `console.*` calls.

## Current State
- `console.warn(`[buildTopicResponse] no response available for topic="..."`)` in `conversation-brain.ts:707`
- Output goes to stdout only (visible in dev terminal, captured by whatever the runtime does with stdout, but never routed to a structured logging pipeline)
- The `saas-api` and `pipeline-orchestrator` packages have `pino` available, but `conversation-orchestrator` has no logger dependency or instance

## Acceptance Criteria
- [ ] Either: Wire `pino` into `conversation-orchestrator` and replace all `console.*` calls with a structured logger
- [ ] Or: Remove the `console.warn` and verify the gap is acceptable (e.g. for a demo/POC, stdout may be sufficient)

## Impact
- Low: Fallback detection is still visible in dev logs
- Without aggregation, cannot query historical trends like "customers keep asking about X and we have no answer"
