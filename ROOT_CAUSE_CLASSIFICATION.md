# Root Cause Classification

## Classification

This appears to be a combination of multiple independent issues, not a single bug.

### Primary classification: E. Multiple independent issues

## Evidence for each issue

### 1. Compatibility layer limitation

The pipeline passes a reduced legacy snapshot into the brain via [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts).

Evidence:
- the input contains only one prior turn
- the implementation comment implies richer context, but the runtime code does not provide it

This is a compatibility-layer limitation because the runtime path is carrying a shallow representation even though the system has richer memory concepts.

### 2. Orchestrator / orchestration bug

The current runtime path does not preserve the full conversation history into the brain input, despite the architecture implying continuity and memory-driven decisioning.

Evidence:
- [docs/MEMORY_ENGINE.md](docs/MEMORY_ENGINE.md) specifies conversation memory for continuity
- [docs/CONVERSION_BRAIN_ARCHITECTURE.md](docs/CONVERSION_BRAIN_ARCHITECTURE.md) specifies a memory layer for conversation continuity
- the live implementation only passes one prior turn

This can be characterized as an orchestration or integration gap between the documented memory architecture and the current implementation.

### 3. Qualification extraction bug

The system has dedicated memory fields for qualification, but the current inference logic does not reliably extract a bare numeric answer like "1000".

Evidence:
- [engine/packages/conversation-orchestrator/src/conversation-planner.ts](engine/packages/conversation-orchestrator/src/conversation-planner.ts) uses regex-based inference
- [engine/packages/conversation-orchestrator/src/conversation-memory.ts](engine/packages/conversation-orchestrator/src/conversation-memory.ts) defines companySize and qualificationFields as structured memory fields
- bare numeric input is not matched by the current heuristic

This is a qualification-extraction bug in the current heuristics.

## Conclusion

The issue is not just one thing. It is a layered problem:

- the runtime context handed to the brain is too shallow,
- the current qualification inference heuristics are too narrow,
- and the architecture expects richer conversation memory than the current path provides.

## Severity

High. The issue affects core qualification flows and downstream actions such as recommendations, buying-stage inference, and CTA selection.
