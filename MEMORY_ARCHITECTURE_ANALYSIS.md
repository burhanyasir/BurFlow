# Memory Architecture Analysis

## Objective

This document analyzes where conversation state exists in the current implementation and whether each layer stores a full transcript, recent context, or structured facts.

## Layer-by-layer inventory

| Component | Stores full transcript? | Stores only last turn? | Stores summarized history? | Stores structured qualification facts? |
|---|---|---|---|---|
| Widget / browser | No | No | No | No |
| /api/chat/stream route | No | No | No | No |
| ConversationRepository | No | No | No | No |
| MessageRepository | Yes, persisted transcript | No | No | No |
| StateManager / OrchestratorState | No | Yes, effectively for the immediate prior turn | Yes, summary fields and conversationSummary | Limited |
| legacyMemory.turns | No | Yes, one prior turn snapshot | Limited | Limited |
| ConversationMemoryData | No | No | Yes, turns array and summarized fields | Yes |
| qualificationFields | No | No | No | Yes, structured field map |
| qualificationCollected | No | No | No | Yes, state object |
| MessageRepository database rows | Yes | No | No | No |

## Where the full conversation really exists

The full transcript exists in the persisted message store via [engine/packages/saas-core/src/db/repositories.ts](engine/packages/saas-core/src/db/repositories.ts). Each user and assistant turn is stored as a message row with sequence_number.

However, the active response pipeline does not retrieve and pass the full message history into the brain. Instead, the pipeline builds a reduced compatibility object in [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts).

## What each runtime layer contains

### 1. MessageRepository

- Stores the full turn-by-turn transcript in order.
- This is the most complete transcript representation in the system.
- It is not used as the input to the current brain path.

### 2. OrchestratorState

- Contains the current session state.
- Stores lastUserMessage and lastBotMessage.
- Stores conversationSummary and metrics.
- Does not store the full conversation transcript.

### 3. legacyMemory.turns

- Holds a single previous turn object.
- This is the compatibility layer passed to the conversation brain.
- It is not a full transcript and not a rich memory object.

### 4. ConversationMemoryData

- This is the richer in-brain memory structure.
- It contains turns, qualification fields, topics, sales signals, and conversation state.
- It is populated from the reduced legacy snapshot and the current message.

## Architectural interpretation

The implementation currently appears to use a hybrid model:

- persisted transcript exists in the database,
- runtime orchestration uses a reduced state snapshot,
- the brain uses a richer in-memory object.

That hybrid approach is functional, but the current compatibility layer is too shallow for robust multi-turn qualification and continuity.

## Architectural conclusion

The system is not using the full transcript as the primary brain input. The current implementation is closer to a summarized state-plus-last-turn model than a true full-conversation memory model.
