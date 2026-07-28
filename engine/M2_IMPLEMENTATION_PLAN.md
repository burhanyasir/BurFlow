# M2 Implementation Plan: Response Generation

**Milestone:** Stage 5 — LLM Response Generation
**Depends on:** M1 (Core Pipeline: stages 1,2,4,7,8 + orchestrator)
**Architecture docs:** CONVERSATION_ENGINE.md §Stage 5, TENANT_ISOLATION.md §llm config, FAILURE_AND_RECOVERY.md §Stage 5 failure mode

---

## Goal

Pipeline runs stages 1→2→4→5→7→8. Stage 5 takes the assembled context (session state, conversation history, tenant config, system prompt), calls an LLM provider, and produces `generatedResponse` on `TurnContext`. On LLM failure, the tenant-configured fallback response is used and the pipeline degrades gracefully.

---

## Packages

### stage-5-response-generation (new)

**Location:** `packages/stage-5-response-generation/`

**Architecture references:**
- CONVERSATION_ENGINE.md §Stage 5: "Generate LLM response with context and system prompt", timeout 10s
- FAILURE_AND_RECOVERY.md §Stage 5: "LLM inference failure or timeout → Degrade: return fallback response"
- TENANT_ISOLATION.md §llm: `model`, `temperature`, `maxTokens`, `systemPrompt`

**Structure:**

```
src/
  index.ts          — execute(input, deps): StageResult
  llm/
    provider.ts         — LLMProvider interface, ChatMessage, LLMConfig, LLMResponse
    openai-provider.ts  — OpenAI Chat Completions API impl
    noop-provider.ts    — Test double
    prompt-builder.ts   — Assembles messages from TurnContext
    resolver.ts         — createProvider(modelName, apiKey)
  __tests__/
    stage-5.test.ts     — 4 tests
```

### Error codes added to core-types

| Code | Meaning |
|------|---------|
| `ERR_LLM_TIMEOUT` | LLM provider did not respond within timeout |
| `ERR_LLM_INFERENCE_FAILURE` | LLM returned error or malformed response |
| `ERR_LLM_OVERLOADED` | LLM provider returned 429 |
| `ERR_LLM_PROVIDER_UNAVAILABLE` | LLM provider returned 5xx |
| `ERR_CONTEXT_TOO_LARGE` | Prompt exceeds max tokens |

---

## Implementation Steps

### Step 1: Core types

- [x] Add error codes to `core-types/src/errors.ts`
- [x] Add `llmApiKey` field to `PipelineDeps` in pipeline-orchestrator

### Step 2: LLM provider abstraction

- [x] Define `LLMProvider` interface with `generate(messages, config, signal)`
- [x] Define `ChatMessage`, `LLMConfig`, `LLMResponse` types
- [x] Implement `NoopProvider` returning constant response (for testing)
- [x] Implement `OpenAIChatProvider` using fetch API
- [x] Implement `createProvider()` resolver

### Step 3: Prompt builder

- [x] `buildPrompt(context)`: system message → conversation history → user message

### Step 4: Stage 5 execute

- [x] Check abort signal
- [x] Handle missing tenantConfig (degrade)
- [x] Build prompt from context
- [x] Call LLM provider
- [x] Handle success: set `context.generatedResponse`
- [x] Handle LLM error: set fallback, flag degraded
- [x] Handle finish_reason = 'length': flag degraded but accept truncated response

### Step 5: Pipeline integration

- [x] Import stage-5 in pipeline-orchestrator
- [x] Add stage definition with 10s timeout
- [x] Pass llmApiKey from deps
- [x] Pass `LLM_API_KEY` env var from server

### Step 6: Tests

- [x] Stage 5 unit tests: noop provider, fallback on error, abort signal, prompt assembly
- [x] Pipeline-orchestrator tests still pass (stage 5 uses NoopProvider)

---

## Success Criteria

| Criterion | Verification |
|-----------|-------------|
| Stage 5 produces `generatedResponse` from LLM | Integration test with NoopProvider |
| LLM timeout returns fallback, pipeline degrades | Unit test (mock that hangs + AbortSignal) |
| LLM error returns tenant fallback response | Unit test (mock that throws) |
| Provider resolves based on model name | `createProvider('gpt-4', key)` → OpenAI |
| Prompt correctly assembles system + history + user | Unit test inspecting buildPrompt output |
| Pipeline runs 1→2→4→5→7→8 successfully | Pipeline-orchestrator integration test |
| All existing tests still pass | `npm test` |
| Build clean | `tsc --build` |

---

## Files Changed/Added

| File | Action |
|------|--------|
| `packages/core-types/src/errors.ts` | Add 5 LLM error codes |
| `packages/stage-5-response-generation/` (directory) | New package |
| `packages/stage-5-response-generation/package.json` | New |
| `packages/stage-5-response-generation/tsconfig.json` | New |
| `packages/stage-5-response-generation/src/index.ts` | New |
| `packages/stage-5-response-generation/src/llm/provider.ts` | New |
| `packages/stage-5-response-generation/src/llm/openai-provider.ts` | New |
| `packages/stage-5-response-generation/src/llm/noop-provider.ts` | New |
| `packages/stage-5-response-generation/src/llm/prompt-builder.ts` | New |
| `packages/stage-5-response-generation/src/llm/resolver.ts` | New |
| `packages/stage-5-response-generation/src/__tests__/stage-5.test.ts` | New |
| `packages/pipeline-orchestrator/src/pipeline.ts` | Add stage-5, add llmApiKey to PipelineDeps |
| `packages/pipeline-orchestrator/src/server.ts` | Pass LLM_API_KEY env var |
| `packages/pipeline-orchestrator/package.json` | Add stage-5 dep |
| `packages/pipeline-orchestrator/tsconfig.json` | Add stage-5 reference |
| `docs/conversation-engine/IMPLEMENTATION_GUIDE.md` | Updated milestones |
