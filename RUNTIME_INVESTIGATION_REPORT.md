# Runtime Investigation Report

## Scope
This report documents one complete live widget conversation end to end without changing production logic. The conversation traced was:

1. Assistant: “How many people would be using it?”
2. User: “1000”
3. User: “Can it integrate with Salesforce?”

## Verified execution path

### 1) Incoming HTTP request
- Request path: POST /api/chat/stream
- Runtime evidence: the live stream request returned HTTP 200 and emitted SSE events.
- Example output from the runtime run:
  - First turn: token stream followed by ui_state and complete
  - Second turn: repair_confusion response
  - Third turn: repair_confusion response

### 2) Route layer: /api/chat/stream
- Entry point: [engine/packages/saas-api/src/routes/chat.ts](engine/packages/saas-api/src/routes/chat.ts)
- Input received: request body with the current message and sessionId.
- Output produced: a conversation record, persisted user message, pipeline invocation, and an SSE response.
- Conversation history present: Yes. The route reuses the same sessionId and conversationId for subsequent turns.
- Structured qualification memory present: No at this stage.
- Object passed to next stage: the request context and the current message are passed to the pipeline executor.

### 3) Execute pipeline
- Entry point: [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts)
- Input received: the current user message, sessionId, tenantId, and the brain function.
- Output produced: a final response, policy decision, stage, and state update.
- Conversation history present: Yes, through the persisted StateManager state.
- Structured qualification memory present: No at this stage; the state has only shallow fields such as last user message and ledger values.
- Object passed to next stage: a built brain input object.

### 4) StateManager
- Entry point: [engine/packages/saas-api/src/orchestrator/state-manager.ts](engine/packages/saas-api/src/orchestrator/state-manager.ts)
- Input received: the current session state.
- Output produced: the in-memory state object for the session.
- Conversation history present: Yes. The state tracks turnCount, lastUserMessage, lastBotMessage, conversationSummary, and ledger values.
- Structured qualification memory present: No. The state does not store a structured field for the prior answer “1000”.
- Object passed to next stage: the same state object is used to build the next input.

### 5) Pipeline brain input construction
- Exact function: [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts)
- Input received: the current state and current message.
- Output produced: a reduced brain input object.
- Conversation history present: Yes, but only as one prior turn snapshot and a shallow legacy memory object.
- Structured qualification memory present: No. The legacy memory contains qualificationState with completed=false and questionsAskedCount=0.
- Object passed to next stage: the brain input object.

### 6) Conversation Brain
- Entry point: [engine/packages/conversation-orchestrator/src/conversation-brain.ts](engine/packages/conversation-orchestrator/src/conversation-brain.ts)
- Input received: the brain input object.
- Output produced: a response text plus updated memory.
- Conversation history present: Yes, via the input’s turns and legacy memory.
- Structured qualification memory present: No for the second and third turns; the memory still shows incomplete qualification state.
- Object passed to next stage: the updated legacy memory and response text to the pipeline.

### 7) Planner
- Entry point: [engine/packages/conversation-orchestrator/src/conversation-planner.ts](engine/packages/conversation-orchestrator/src/conversation-planner.ts)
- Input received: the current message and the conversation memory.
- Output produced: plan data such as customerIntent, goal, missingQualification, and topicsToDiscuss.
- Conversation history present: Yes, through the memory state.
- Structured qualification memory present: No for the affected turns.
- Object passed to next stage: the conversation plan object.

### 8) Qualification Engine
- Entry point: [engine/packages/conversation-orchestrator/src/qualification-engine.ts](engine/packages/qualification-engine.ts)
- Input received: the current message text and the current qualification state.
- Output produced: either no change or a weak update depending on the regex match.
- Conversation history present: Not directly; it only sees the current message and prior state.
- Structured qualification memory present: No for the “1000” case.
- Object passed to next stage: an updated qualification state object.

### 9) Final response
- Runtime evidence: the stream response for the second and third turns was:
  - “Let me think about that differently. Could you rephrase your question?”
- Conversation history present: Yes in the session and state, but not enough to continue the conversation meaningfully.
- Structured qualification memory present: No; qualification remained incomplete.
- Object passed to next stage: none; the response is returned to the widget.

## Evidence for the second and third turns

### Turn 2: user says “1000”
Runtime evidence captured from the live pipeline trace:
- The pipeline received the new message as the current input.
- The trace showed the incoming message as “1000”.
- The state before processing showed:
  - stage = awareness
  - turnCount = 2
  - lastUserMessage = “How many people would be using it?”
  - qualificationAttempts = 0
  - repeatedQuestionCount = 0
- The brain input contained:
  - message = “1000”
  - legacyMemory.qualificationState = completed=false, questionsAskedCount=0
- The pipeline then failed in the brain path and fell back to the repair response.

### Turn 3: user says “Can it integrate with Salesforce?”
Runtime evidence captured from the live pipeline trace:
- The pipeline received the new message as the current input.
- The state before processing still showed the earlier question and no meaningful qualification state.
- The brain input contained the new message and legacy memory with the same incomplete qualification state.
- The response again fell back to the repair response.

## Was “1000” preserved?

### 1) Is “1000” present in pipeline state?
- Runtime evidence says no, not as a preserved prior answer in the session state.
- The state shown before the second turn contained the earlier question, not the answer “1000”.

### 2) Is “1000” present in legacyMemory?
- Runtime evidence says no.
- The brain input carried the current message “1000”, but the legacy memory only carried the prior turn snapshot and an incomplete qualification state.
- It did not contain the literal value “1000” as a persisted memory field.

### 3) Is “1000” converted into companySize or another structured qualification field?
- Runtime evidence says no.
- The qualification parser in [engine/packages/conversation-orchestrator/src/qualification-engine.ts](engine/packages/conversation-orchestrator/src/qualification-engine.ts) only recognizes values when the text includes phrases such as “employees”, “people”, or “staff”, or other explicit patterns.
- A bare number by itself does not match that logic.

## Exact location where information is lost

### First loss point: state construction
The first point of loss is in [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts), where the pipeline builds the brain input from the current state. The state only carries a previous turn snapshot and shallow memory fields. It does not preserve the literal prior answer “1000” in a durable field.

### Second loss point: qualification extraction
The answer “1000” is not converted into a structured field in [engine/packages/conversation-orchestrator/src/qualification-engine.ts](engine/packages/conversation-orchestrator/src/qualification-engine.ts). The heuristic requires patterns such as “1000 people” or “1000 employees”; a bare number is not recognized as team size.

## Knowledge source determination
The running widget is not using a real tenant knowledge base for the demo tenant.

Evidence:
- The runtime database query returned zero rows for the demo tenant in the topic response template table.
- The SaaS route is using the database-backed provider at [engine/packages/saas-api/src/orchestrator/knowledge-base-db-provider.ts](engine/packages/saas-api/src/orchestrator/knowledge-base-db-provider.ts).
- When there are no tenant rows, that provider falls back to the default provider at [engine/packages/conversation-orchestrator/src/knowledge-base-provider.ts](engine/packages/conversation-orchestrator/src/knowledge-base-provider.ts).
- The response content from the live run matched the built-in template wording, confirming fallback knowledge was used rather than tenant-specific content.

## Root cause classification
The live runtime evidence points to a combination of the above:

- Context loss: confirmed. The prior answer “1000” is not preserved in the pipeline state or legacy memory for the next turn.
- Qualification extraction failure: confirmed. The value is not transformed into companySize or another structured field because the parser is too narrow.
- Knowledge fallback: confirmed. The current tenant has no stored topic templates, so the runtime falls back to generic built-in templates.

## Final conclusion
The first point in the live runtime where information is lost is the combination of:

1. the pipeline’s reduced state construction, which does not preserve the prior user answer in a durable field; and
2. the qualification parser, which fails to interpret a bare numeric answer such as “1000” as structured qualification data.

This is the earliest point where the live runtime stops carrying the user’s meaning forward.
