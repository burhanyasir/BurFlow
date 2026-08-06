# Conversation Context Audit

## Scope

This audit traces the live request path for a visitor message through the current implementation, with emphasis on how conversation context and qualification state flow into the response generator.

## End-to-end flow

```mermaid
flowchart TD
    A[Widget] --> B[/api/chat/stream]
    B --> C[createChatRoutes handleChatRequest]
    C --> D[executePipeline]
    D --> E[StateManager getOrCreate]
    D --> F[processRapportRepair / processPolicyEngine]
    D --> G[buildBrainInput]
    G --> H[processConversationBrain]
    H --> I[planConversation]
    I --> J[processConversationDirector]
    J --> K[buildStrategyResponse]
    K --> L[response generation]
```

## Stage-by-stage audit

| Stage | Input | Output | Conversation history available | Structured memory available | Qualification fields available |
|---|---|---|---|---|---|
| Widget | Visitor message, session token | HTTP POST to /api/chat/stream | None at this layer | None | None |
| /api/chat/stream | Raw message, sessionId, tenantId | Calls executePipeline | No transcript; only the current raw message | None | None |
| executePipeline | Message + session state | Pipeline result with response text | Uses session state only, not a full transcript | Uses orchestrator state object | Uses orchestrator state knownFacts and ledger |
| StateManager | Session id, tenant id | OrchestratorState | Stores last user and bot turns only | Stores summary fields and turn count | No full qualification map |
| pipeline.ts | Current message + state | Brain input object | Only one prior turn snapshot in legacyMemory.turns | Limited summary fields | Limited summary fields and knownFacts |
| orchestrator / conversation-brain | Brain input | Final response text + memory + plan | Built from legacyMemory.turns; not full history | ConversationMemoryData | Yes: companySize, useCase, monthlyConversations, qualificationFields, qualificationCollected |
| conversation-planner | Message + memory | Conversation plan | Uses memory.turns and memory fields | Yes | Yes, via inferQualificationSignals and missingQualification |
| qualification-engine | Message + qualification state | Updated qualification state | Uses only the current raw message | Yes, via extractedFields and top-level state | Yes, explicitly |
| response generation | Message + plan + memory | Final reply | Uses memory and current message, not a full transcript | Yes | Yes |

## What the current implementation actually passes

The current brain input is built in [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts) with a single prior-turn snapshot:

- message: current incoming message
- responseText: empty string
- legacyMemory.turns: one object containing the previous user message and prior bot response
- turnCount: current state.turnCount
- persona/funnelStage/qualification flags: derived summaries

This is not a full transcript. It is a reduced compatibility snapshot.

## Evidence summary

- The route in [engine/packages/saas-api/src/routes/chat.ts](engine/packages/saas-api/src/routes/chat.ts) forwards the current raw message into the pipeline.
- The pipeline in [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts) constructs the brain input from a one-turn snapshot.
- The brain in [engine/packages/conversation-orchestrator/src/conversation-brain.ts](engine/packages/conversation-orchestrator/src/conversation-brain.ts) consumes that legacy memory and turns it into a richer ConversationMemoryData object.
- The planner in [engine/packages/conversation-orchestrator/src/conversation-planner.ts](engine/packages/conversation-orchestrator/src/conversation-planner.ts) uses structured memory fields such as companySize and monthlyConversations.

## Conclusion

The live flow does reach the response generator, but the conversation context that reaches it is intentionally reduced and not equivalent to a full transcript.
