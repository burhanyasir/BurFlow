# Sales Reasoning Engine

Status: Design only. No implementation. No migration.

## 1. Objective

The Sales Reasoning Engine governs how BurFlow thinks commercially during a conversation. It converts raw visitor input into a structured sales posture that can drive product recommendations, objections handling, urgency, and CTA selection.

## 2. Core Signals

The engine should maintain the following signals:

- visitor intent
- buying stage
- persona
- urgency
- confidence
- objection category
- product/service interest
- conversion risk

## 3. Visitor Intent Detection

Intent categories:

- browse-information
- compare-offers
- pricing-inquiry
- product-interest
- service-interest
- demo-request
- booking-intent
- objection
- support-request
- handoff-request

Detection rules:

- If the visitor asks about cost, plan tiers, or pricing, classify as pricing-inquiry.
- If the visitor asks about features, differences, or comparisons, classify as compare-offers.
- If the visitor requests a meeting, walkthrough, or schedule, classify as demo-request.
- If the visitor explicitly says they want to get started or buy, classify as booking-intent.
- If the visitor raises friction such as budget, trust, timing, or complexity, classify as objection.

Confidence should be derived from:
- direct lexical evidence,
- prior conversation state,
- page context,
- session behavior,
- and known business profile constraints.

## 4. Buying-Stage Detection

Supported stages:

- Awareness
- Discovery
- Qualification
- Consideration
- Decision
- Booking
- Conversion

Stage heuristics:

- Awareness: visitor is just exploring and asking broad questions.
- Discovery: visitor is learning about offerings and capabilities.
- Qualification: visitor shares goals, size, urgency, timeline, or fit constraints.
- Consideration: visitor compares options or asks for a recommendation.
- Decision: visitor narrows to one option and requests final confirmation.
- Booking: visitor is ready to schedule or enter an action path.
- Conversion: visitor indicates purchase, commitment, or lead capture intent.

## 5. Qualification Logic

Qualification should be progressive and low-friction.

Minimum qualification fields:
- contact intent,
- basic business profile,
- budget range or urgency,
- timeline,
- decision authority,
- and problem fit.

Qualification should happen in phases:

1. Soft qualification
   - ask only one or two lightweight questions.

2. Mid qualification
   - request business context if a recommendation is needed.

3. Hard qualification
   - for high-value opportunities, request a lead capture form or handoff.

BurFlow should never ask more than necessary before offering a CTA.

## 6. Objection Handling

Primary objection families:

- price
- trust
- complexity
- timing
- fit
- competitor comparison
- support risk

Handling approach:

- acknowledge the concern,
- reframe it using grounded knowledge,
- provide a relevant value argument,
- and then shift to a next-step CTA.

Examples:
- price objection → anchor to ROI, package fit, or starter plan
- trust objection → surface testimonials, case studies, support posture, or proof
- timing objection → highlight quick launch path or onboarding pathway

## 7. Urgency Creation

Urgency is not just detected; it can also be created by the assistant. The engine should determine whether the visitor is:

- low urgency: browsing and gathering information
- medium urgency: evaluating and comparing options
- high urgency: actively requesting next-step action or pressuring for a response

Urgency should increase when:
- a visitor requests cost immediately,
- asks about launch time,
- wants a demo today,
- signals limited time,
- or demands a response.

Urgency should also be balanced with user experience so that the assistant does not become aggressive.

## 8. CTA Selection

CTA selection should be driven by:
- intent,
- stage,
- urgency,
- persona,
- page context,
- and confidence.

Recommended CTA behavior:

- early browsing → guide to pricing or compare
- middle consideration → recommend demo or consultation
- decision stage → offer booking or direct quote
- high-confidence high-intent → trigger lead capture or booking
- low-confidence → answer safely and ask a clarifying question

## 9. Escalation Rules

Escalation should occur when:

- the visitor is high-value and shows strong purchase intent,
- confidence in the recommendation is low,
- the visitor is clearly comparing offers and needs a human,
- or the conversation enters a commercial deadlock.

Escalation triggers:

- implement handoff to human support or sales,
- present a direct contact path,
- or request a lead-capture form if the visitor is ready to move.

## 10. Decision Output Contract

The Sales Reasoning Engine should output a structured decision object including:
- intent
- stage
- urgency
- persona
- objections
- confidence
- recommended product/service bundle
- CTA
- escalation requirement

## 11. Interaction Model

The Sales Reasoning Engine should work in conjunction with:
- Persona Engine for visitor type
- Product Matching Engine for offer fit
- CTA Engine for next-step behavior
- Memory Engine for continuity
- Conversation State Machine for turn validity

## 12. Design Guardrails

- Do not invent facts not grounded in the Knowledge Engine.
- Do not over-ask qualification questions.
- Favor low-friction next steps.
- Preserve a professional sales posture rather than a generic chatbot tone.
