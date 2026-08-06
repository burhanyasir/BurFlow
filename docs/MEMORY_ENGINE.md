# Memory Engine

Status: Design only. No implementation. No migration.

## 1. Objective

The Memory Engine maintains long-lived context so BurFlow behaves coherently across a conversation and across repeated visits. It is responsible for storing the information that helps the assistant remain contextual, helpful, and commercially aware.

## 2. Memory Layers

### 2.1 Short-Term Memory
Purpose:
- maintain current turn context
- keep recent dialogue in working memory

Contents:
- latest visitor statement
- current intent
- current state
- current offer under discussion
- immediate objections or constraints

Retention:
- one active conversation session

### 2.2 Conversation Memory
Purpose:
- maintain the evolving sales narrative across turns

Contents:
- previously discussed goals
- prior recommendations
- unresolved objections
- qualification progress
- accepted or rejected CTAs

Retention:
- active conversation until the session is closed or explicitly reset

### 2.3 Session Memory
Purpose:
- correlate multiple interactions within a single browsing or engagement session

Contents:
- page journey
- time spent on pages
- CTA responses
- events such as demo request or quote request
- session TTL and session state

Retention:
- bounded to session lifecycle

### 2.4 Customer Memory
Purpose:
- preserve the visitor’s profile and history across sessions when the identity or contact data is known

Contents:
- name or known identifier
- previous lead capture data
- prior priorities
- email or contact channel
- previous outcomes

Retention:
- subject to consent and storage policy

### 2.5 Business Memory
Purpose:
- preserve commercial knowledge about the business being represented

Contents:
- business profile
- offer structure
- pricing policies
- industry positioning
- preferred CTA patterns
- validated business facts

Retention:
- persistent business-level context

## 3. Memory Access Rules

- Short-term memory should be the fastest, most immediate layer.
- Conversation memory should be used for continuity and follow-up.
- Session memory should be used to understand browsing behavior and urgency.
- Customer memory should be used only when identity is verified or intentionally captured.
- Business memory should be read-only for most conversation-time decisions and sourced from stable business profile data.

## 4. Memory Governance

BurFlow should:
- avoid storing sensitive information that is not required for sales flow,
- keep memory usage scoped to the minimum needed for continuity,
- and maintain a clear difference between session context and persistent customer profile data.

## 5. Output Contract

The Memory Engine should provide the conversion pipeline with a normalized memory snapshot including:
- current conversation status
- known visitor attributes
- known business attributes
- prior objections
- current recommended path
- memory confidence

## 6. Design Guardrails

- Do not let memory override clear evidence from the current turn.
- Do not overreach into unrelated user history.
- Respect consent and privacy boundaries.
- Keep memory retrieval deterministic and explainable.
