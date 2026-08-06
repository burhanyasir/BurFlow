# Phase 3 Implementation Plan

Status: Design only. No implementation. No migration.

## 1. Phase 3 Objective

Phase 3 introduces the Conversion Brain Architecture as the revenue decision layer for BurFlow. The work should be executed in small, verifiable milestones that preserve the frozen Phase 2 production components.

## 2. Milestone 1 — Conversion Brain Contract Definition

Purpose:
- define the request and response contract between the widget, the Conversion Brain, the Knowledge Engine, and the business profile.

Dependencies:
- frozen scanner
- frozen business intelligence extraction
- frozen Knowledge Engine
- approved architecture documents

Estimated hours:
- 8 hours

Tests:
- contract schema validation tests
- end-to-end payload verification tests
- negative-path checks for missing fields

Rollback strategy:
- hold the design contract as a documented interface and do not expose it to runtime until validation passes

## 3. Milestone 2 — Signal Interpretation Layer

Purpose:
- formalize visitor intent, buying-stage, urgency, objection, and confidence inference.

Dependencies:
- milestone 1 contract
- session and widget event metadata

Estimated hours:
- 10 hours

Tests:
- classification regression suite
- toy conversation tests
- confidence bucket validation

Rollback strategy:
- keep signal extraction isolated behind a separate adapter layer that can be disabled without affecting the widget

## 4. Milestone 3 — Persona Engine

Purpose:
- classify the visitor into one of the supported personas and attach confidence scores.

Dependencies:
- milestone 2 signal layer
- persona classification categories

Estimated hours:
- 8 hours

Tests:
- persona recognition sample suite
- confidence threshold validation
- mixed-intent ambiguity tests

Rollback strategy:
- default to an unclassified persona when confidence falls below threshold

## 5. Milestone 4 — Product and Offer Matching

Purpose:
- map visitor signals to the best-fit product, service, plan, bundle, pricing, upsell, or cross-sell.

Dependencies:
- milestone 1 contract
- Knowledge Engine retrieval access
- persona engine outputs

Estimated hours:
- 12 hours

Tests:
- product match ranking tests
- bundle recommendation tests
- rejection tests for unsupported offer recommendation

Rollback strategy:
- fall back to safe informational response when matching confidence is insufficient

## 6. Milestone 5 — CTA Engine

Purpose:
- select the appropriate CTA based on confidence, stage, persona, and page context.

Dependencies:
- milestone 2 signal layer
- milestone 4 matching outputs

Estimated hours:
- 6 hours

Tests:
- CTA selection matrix tests
- page-context decision tests
- guardrail tests for premature booking or checkout prompts

Rollback strategy:
- return a low-friction informational next step instead of an aggressive CTA

## 7. Milestone 6 — Conversation State Machine

Purpose:
- define valid conversation progression and deterministic transition rules.

Dependencies:
- milestone 2 signal layer
- milestone 5 CTA output

Estimated hours:
- 8 hours

Tests:
- state transition validation tests
- dead-end and loop prevention tests
- handoff trigger tests

Rollback strategy:
- preserve the previous state when a transition cannot be justified and request clarification

## 8. Milestone 7 — Memory Engine

Purpose:
- establish short-term, conversation, session, customer, and business memory behavior.

Dependencies:
- milestone 1 contract
- state machine outputs
- consent and storage policy alignment

Estimated hours:
- 8 hours

Tests:
- memory persistence and retrieval tests
- privacy boundary tests
- session isolation tests

Rollback strategy:
- disable persistence for customer memory until privacy and consent review is complete

## 9. Milestone 8 — Full Decision Pipeline Validation

Purpose:
- validate that the Conversion Brain can coordinate intent, persona, matching, memory, and CTA behavior into a coherent sales response path.

Dependencies:
- all prior milestones

Estimated hours:
- 10 hours

Tests:
- end-to-end conversation scenario tests
- high-intent conversion tests
- low-confidence fallback tests
- handoff and escalation tests

Rollback strategy:
- keep the widget on a safe informational mode until this milestone passes

## 10. Phase 3 Exit Criteria

Phase 3 is ready to proceed to implementation only when:
- all architecture documents are approved,
- decision contracts are stable,
- all major engines are documented,
- and the state machine and handoff rules are deterministic.
