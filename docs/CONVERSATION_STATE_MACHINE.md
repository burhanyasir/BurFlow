# Conversation State Machine

Status: Design only. No implementation. No migration.

## 1. Purpose

The Conversation State Machine defines the expected dialogue lifecycle for BurFlow’s sales assistant. It keeps the assistant coherent, measurable, and suitable for guided conversion behavior.

## 2. States

The machine should support the following states:

- Greeting
- Discovery
- Qualification
- Recommendation
- Objection
- Comparison
- Decision
- Booking
- Checkout
- Handoff

## 3. State Definitions

### Greeting
Purpose:
- open the conversation clearly and professionally
- establish intent and page context

Typical behavior:
- acknowledge the visitor
- offer a path to help

### Discovery
Purpose:
- gather initial business and need context

Typical behavior:
- ask what the visitor is looking for
- infer likely current page intent

### Qualification
Purpose:
- confirm fit without creating friction

Typical behavior:
- ask for company size, timeline, urgency, or current challenge

### Recommendation
Purpose:
- suggest the most relevant product, service, or plan

Typical behavior:
- explain fit with evidence from the Knowledge Engine

### Objection
Purpose:
- handle concerns that may block conversion

Typical behavior:
- acknowledge, answer, and move toward a CTA or qualification step

### Comparison
Purpose:
- compare the current recommendation against alternatives

Typical behavior:
- highlight differences in fit, price, and value

### Decision
Purpose:
- help the visitor commit to the next step

Typical behavior:
- confirm confidence and present clear action choices

### Booking
Purpose:
- capture interest in a meeting or consultation

Typical behavior:
- offer calendar or firm booking CTA

### Checkout
Purpose:
- support a transaction or configured lead capture step

Typical behavior:
- gather final intent and conversion fields

### Handoff
Purpose:
- escalate to a live sales or support path when warranted

Typical behavior:
- provide the escalation route and preserve context

## 4. Transition Rules

### Greeting → Discovery
Trigger:
- user sends first message or opens the widget

### Discovery → Qualification
Trigger:
- the assistant has enough context to ask a follow-up fit question

### Discovery → Recommendation
Trigger:
- the visitor is clearly specific about the need and the assistant has evidence

### Qualification → Recommendation
Trigger:
- fit signals are strong enough to recommend a product or plan

### Recommendation → Objection
Trigger:
- the visitor raises price, trust, timing, or fit resistance

### Recommendation → Comparison
Trigger:
- the visitor asks how it differs from alternatives

### Comparison → Decision
Trigger:
- the visitor indicates a clear preference or asks to finalize the best option

### Decision → Booking
Trigger:
- the assistant has adequate confidence and the visitor is ready to act

### Decision → Checkout
Trigger:
- the offer is a direct purchase or self-serve action

### Decision → Handoff
Trigger:
- the visitor is high-value, highly urgent, or the confidence is too low

### Objection → Recommendation
Trigger:
- the objection is addressed and the assistant can reframe the offer

### Objection → Handoff
Trigger:
- the user’s concern is unresolved and a human is needed

## 5. State Safety Rules

- Avoid jumping from Greeting directly to Checkout.
- Avoid repeated recommendation loops without new evidence.
- If there is a strong objection, do not keep pushing the same offer.
- If confidence is low, prefer clarification or handoff over riskier persuasion.

## 6. State Output Contract

Each state transition should yield:
- current state
- next possible states
- needed evidence for next move
- recommended action
- escalation flag

## 7. State Machine Design Principle

The state machine should be deterministic, human-readable, and easy to QA. It should behave like a revenue conversation flow, not an unconstrained open chat.
