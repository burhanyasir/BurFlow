# Memory Lifecycle Trace

## Objective
This report traces how conversation state moves through the runtime path from the chat route into the orchestrator and brain layers.

## Runtime path
The request path observed in the live run was:

1. [engine/packages/saas-api/src/routes/chat.ts](engine/packages/saas-api/src/routes/chat.ts)
   - Receives the incoming message.
   - Creates or reuses the conversation record.
   - Passes the turn into the orchestrator pipeline.

2. [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts)
   - Loads the previous state.
   - Builds a reduced brain input object.
   - Sends that object to the conversation brain.

3. [engine/packages/conversation-orchestrator/src/conversation-brain.ts](engine/packages/conversation-orchestrator/src/conversation-brain.ts)
   - Processes the turn.
   - Updates memory and planning state.
   - Returns a response or triggers fallback logic if the brain fails.

## What the runtime trace showed
The trace captured the following state transitions:
- The pipeline built a `brainInput` object containing one prior turn snapshot and a shallow `legacyMemory` object.
- The legacy memory still showed an incomplete qualification state.
- The conversation brain then threw an exception, which caused the pipeline to switch to the repair fallback path.

## Conclusion
The memory lifecycle is currently brittle. The runtime evidence shows that the engine is not carrying forward a durable, structured memory representation for qualification or context across turns. That is consistent with the observed repair fallback behavior.
