# Qualification Pipeline Trace

## Scenario

The user is asked: "How many people would be using it?"

The visitor responds with: "1000"

## Trace of the value

### 1. Widget / route layer

- Raw user message received: "1000"
- The route in [engine/packages/saas-api/src/routes/chat.ts](engine/packages/saas-api/src/routes/chat.ts) stores the message as a user message in the message repository.
- At this stage the value is preserved as raw text.

### 2. Pipeline state layer

- The pipeline in [engine/packages/saas-api/src/orchestrator/pipeline.ts](engine/packages/saas-api/src/orchestrator/pipeline.ts) receives the message and current session state.
- The state object only retains:
  - lastUserMessage
  - lastBotMessage
  - conversationSummary
  - turn count
- It does not create a structured qualification field from "1000".

### 3. Brain input construction

The brain input is built with a reduced prior-turn snapshot:

- previous user message: the last user turn
- previous assistant response: the last bot turn
- turnCount and summary fields

This means the value "1000" is available only as the previous user turn text in the reduced snapshot, not as a structured field.

### 4. Conversation memory conversion

In [engine/packages/conversation-orchestrator/src/conversation-brain.ts](engine/packages/conversation-orchestrator/src/conversation-brain.ts), the legacy memory is transformed into ConversationMemoryData.

At this point, the raw value is no longer treated as a dedicated qualification entity. It is available as text inside the turn history only.

### 5. Planner qualification inference

The planner in [engine/packages/conversation-orchestrator/src/conversation-planner.ts](engine/packages/conversation-orchestrator/src/conversation-planner.ts) calls inferQualificationSignals.

This logic attempts to infer:
- companySize
- useCase
- currentHelpdesk
- monthlyConversations
- budget
- decisionTimeline

The relevant extraction logic is based on regex patterns such as:
- team/company/staff/employee patterns
- volume patterns with words like conversations or tickets
- natural-language markers like enterprise, startup, etc.

### 6. Where the value stops being usable

The value "1000" is not captured as a structured field because the current qualification inference logic does not treat a bare numeric answer as a reliable company-size signal.

In particular, the code in [engine/packages/conversation-orchestrator/src/conversation-planner.ts](engine/packages/conversation-orchestrator/src/conversation-planner.ts) looks for patterns like:

- "team of 1000"
- "1000 employees"
- "company size 1000"

A bare input of "1000" does not satisfy those patterns.

## Result

The user’s answer survives as raw message text and as a prior-turn snapshot, but it does not get converted into:

- memory.companySize
- memory.qualificationFields["companySize"]
- memory.qualificationCollected

That is the point at which the value becomes unusable for downstream qualification logic.

## Summary

The qualification pipeline has three separate layers:

1. Raw text preservation
2. Reduced turn snapshot preservation
3. Structured memory extraction

The current implementation preserves the value at layer 1 and layer 2, but fails to convert it into layer 3 for the specific bare-number case.
