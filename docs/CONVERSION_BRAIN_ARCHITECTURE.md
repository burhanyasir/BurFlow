# Conversion Brain Architecture

Status: Design only. No implementation. No migration.

## 1. Purpose

The Conversion Brain is the revenue orchestration layer for BurFlow. It sits above the stable website scanner, business intelligence extraction, and Knowledge Engine and translates visitor signals into the next-best action for conversion.

Its responsibilities are to:
- interpret visitor intent,
- identify persona and buying stage,
- select the best-fit product or service recommendation,
- choose CTA and escalation behavior,
- maintain conversation continuity,
- and drive structured lead capture or human handoff.

## 2. System Positioning

BurFlow runtime stack:

1. Website Scanner
   - scans pages and extracts business context.
   - treated as frozen production ingestion input.

2. Business Intelligence Extraction
   - builds normalized business profile signals.
   - treated as frozen production context input.

3. Knowledge Engine
   - stores structured website knowledge and retrieval-ready facts.
   - treated as frozen production retrieval source.

4. Conversion Brain
   - consumes stable inputs and produces decision logic, conversation state transitions, and revenue actions.

5. Widget / Frontend
   - renders assistant interactions and captures visitor input.

## 3. High-Level Architecture

The Conversion Brain contains six major layers:

- Input Adapters
  - Widget event stream
  - Session and browser context
  - Business profile metadata
  - Knowledge Engine retrieval responses

- Signal Interpretation Layer
  - visitor intent detection
  - persona recognition
  - buying-stage inference
  - urgency estimation
  - objection classification

- Decision Layer
  - product/service matching
  - plan and bundle selection
  - CTA engine
  - escalation decision

- Memory Layer
  - short-term memory
  - conversation memory
  - session memory
  - customer memory
  - business memory

- Response Planning Layer
  - message selection
  - recommendation framing
  - objection handling
  - next-step proposal

- Execution Layer
  - emits widget-visible responses
  - triggers data capture or handoff workflows

## 4. Core Modules

### 4.1 Visitor Intent Engine
Detects whether a visitor is browsing, comparing, asking pricing, requesting demo, seeking support, or ready to convert.

### 4.2 Persona Engine
Classifies the visitor into one of the supported persona buckets and assigns a confidence score.

### 4.3 Sales Reasoning Engine
Builds a commercial reasoning posture from the conversation and current context.

### 4.4 Product Matching Engine
Selects the best product, plan, bundle, or upsell using Knowledge Engine retrieval results.

### 4.5 CTA Engine
Determines the proper CTA based on confidence, intent, industry, stage, and page context.

### 4.6 Memory Engine
Maintains continuity across turns and sessions.

### 4.7 Conversation State Machine
Tracks and enforces valid dialogue progression.

## 5. Data Flow

1. The widget sends a visitor message and page context.
2. Session and page context are enriched with known business profile facts.
3. The Conversion Brain queries the Knowledge Engine for grounded product, pricing, service, FAQ, and policy information.
4. Signal interpreters derive intent, persona, stage, urgency, and objection state.
5. The decision engines rank candidate responses, offers, and CTAs.
6. The response planner assembles a grounded recommendation with the right evidence and next action.
7. The widget renders the answer and captures the next user action.

## 6. Decision Pipeline

The decision pipeline should run in this order:

1. Normalize input
   - message
   - current page
   - historical context
   - previous intents

2. Retrieve context
   - business profile
   - relevant knowledge chunks from the Knowledge Engine

3. Interpret signals
   - intent
   - persona
   - stage
   - urgency
   - objection

4. Score candidate actions
   - product fit
   - service fit
   - plan fit
   - urgency fit
   - conversion potential

5. Choose action path
   - answer only
   - recommend a product
   - request qualification data
   - provide comparison
   - trigger booking CTA
   - escalate to human

6. Return response contract
   - response text
   - recommendations
   - one CTA
   - confidence
   - escalation flag

## 7. Interaction with the Knowledge Engine

The Conversion Brain is not a knowledge authoring system. It is a consumer of knowledge.

The Knowledge Engine provides:
- products and services
- plans and pricing
- FAQ answers
- policies and support information
- business capabilities and constraints

BurFlow should request only the minimal relevant knowledge slice required for the current state.

Contract expectations:
- tenant-scoped retrieval
- version-aware context
- confidence-bearing chunks
- document and chunk citations for grounded response generation

## 8. Interaction with the Business Profile

The Business Profile describes the company’s identity, offer structure, and commercial context.

Examples:
- company name
- website
- core offer set
- industries served
- pricing bands
- CTA priorities
- brand tone
- geographic coverage

The Conversion Brain uses this profile to:
- stay on-brand,
- recommend valid offers,
- avoid recommending irrelevant products,
- and tailor CTA language to the visited business.

## 9. Interaction with the Widget

The widget is the transport and rendering boundary.

It provides:
- the visitor message
- page URL and context
- session token
- page metadata
- UI affordances for form collection, booking prompts, and handoff actions

The Conversion Brain returns a structured decision payload for the widget, not just raw text.

## 10. Response Contract

The Conversion Brain should return a normalized response object containing:
- reply message
- inferred intent
- inferred persona
- buying stage
- urgency
- confidence
- recommended product/service/plan bundle
- CTA
- escalation recommendation
- capture requirements

## 11. Design Principles

- Grounded: response should reference stable, trusted knowledge.
- Revenue-aware: optimize for qualification and conversion.
- Low-friction: minimize unnecessary questions.
- Safe escalation: escalate when intent is strong or confidence is weak.
- Stateful: retain memory but avoid overfitting the conversation.

## 12. Out of Scope for Phase 3

This document intentionally does not define implementation details such as:
- code structure,
- database migrations,
- widget SDK specifics,
- or production deployment patterns.

## 13. Success Criteria

Phase 3 architecture is complete when:
- the decision pipeline is explicit,
- memory responsibilities are defined,
- persona classification is structured,
- state transitions are deterministic,
- and the Conversion Brain’s interaction contract with the widget and Knowledge Engine is stable.
