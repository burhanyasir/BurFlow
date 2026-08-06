# BurFlow Conversion Brain Design

Status: Design only. No implementation.

## Purpose

BurFlow's conversion brain is the intelligence layer that turns website content, retrieved knowledge, and visitor interaction signals into high-quality sales responses. Its job is not to behave like a generic support bot. Its job is to help visitors move toward a purchase, a qualified lead, or a human handoff.

## Core objective

The conversion brain should increase revenue by:

- identifying buyer intent early,
- recommending the right product or service,
- selecting the best CTA,
- capturing qualified leads,
- and escalating to a human when the opportunity is strong or the confidence is low.

---

## Inputs

### 1. Website content

Source: website scan and knowledge ingestion pipeline.

Examples:
- products
- services
- pricing
- FAQs
- about information
- contact details
- policies
- team information
- testimonials
- case studies
- industries served
- customer types
- brand tone
- target CTAs
- locations
- languages

Purpose:
- Provide grounded context for the assistant.
- Help the system align its language with the business’s brand and offer structure.

### 2. Retrieved knowledge

Source: knowledge engine retrieval layer.

Examples:
- product specs
- service descriptions
- pricing policy
- FAQs
- testimonials and case-study references
- support or policy answers

Purpose:
- Provide the assistant with rich, grounded context for accurate recommendations.

### 3. Conversation history

Source: session memory and prior turns.

Examples:
- prior questions
- previously expressed interests
- objections raised
- previously asked qualification questions
- previous recommendations shown

Purpose:
- Maintain continuity and avoid repetitive behavior.
- Help the assistant personalize the next step.

### 4. Visitor behavior

Source: interaction signals and browsing context.

Examples:
- pages visited
- time spent
- clicks on offers or CTAs
- repeated questions
- abandonment signals
- input patterns
- prior conversions or lead-capture attempts

Purpose:
- Detect intent and urgency from behavior rather than only words.

---

## Signals

### Buying intent

Definition:
- The visitor appears ready to evaluate, purchase, or request a quote.

Examples:
- “How much does this cost?”
- “Can I book a demo?”
- “I want to get started today.”

### Visitor persona

Definition:
- The type of visitor or buyer the system believes it is handling.

Possible values:
- individual consumer
- small business
- mid-market buyer
- enterprise buyer
- returning customer

### Funnel stage

Definition:
- The current stage of the visitor’s journey.

Possible stages:
- awareness
- discovery
- evaluation
- decision
- purchase intent
- post-conversion

### Objections

Definition:
- Concerns that may block conversion.

Examples:
- price concerns
- trust concerns
- timing concerns
- complexity concerns
- availability concerns

### Product interest

Definition:
- The visitor appears interested in a specific product or offering.

### Service interest

Definition:
- The visitor appears interested in a particular service or solution.

### Urgency

Definition:
- The visitor’s immediate need or time sensitivity.

Possible values:
- low
- medium
- high

### Confidence score

Definition:
- The confidence that the assistant’s current interpretation is correct.

Purpose:
- Helps decide whether to answer directly, ask a clarification question, or hand off to a human.

---

## Outputs

### 1. Best response

The assistant should generate the most useful answer for the current context.

It should:
- ground answers in retrieved knowledge,
- reflect the business’s brand tone,
- and remain concise and action-oriented.

### 2. Product recommendation

When the visitor shows product-level interest, the system should recommend the best-fit offering.

### 3. Service recommendation

When the visitor shows service-level interest, the system should recommend the most relevant service or solution.

### 4. CTA selection

The assistant should choose the most appropriate CTA based on the signal and funnel stage.

Examples:
- book a demo
- get a quote
- start free
- talk to sales
- view pricing
- schedule a call
- capture lead information

### 5. Lead capture

When confidence and intent are strong, the system should offer a lead-capture step.

Examples:
- name and email
- phone number
- company name
- preferred contact method

### 6. Human handoff

If the visitor appears high-value, highly urgent, or the assistant lacks confidence, the system should recommend a human handoff.

### 7. Upsell

When a visitor already shows interest in one offering, the assistant can suggest a higher-value or premium version.

### 8. Cross-sell

When relevant, the assistant can suggest complementary products or services.

---

## Suggested decision flow

1. Ingest website context and retrieve relevant knowledge.
2. Analyze conversation history and behavioral signals.
3. Detect intent, persona, funnel stage, objections, and urgency.
4. Build a ranked set of candidate actions.
5. Select the best response and CTA.
6. If lead quality is strong, offer capture.
7. If confidence is low or urgency is high, recommend human handoff.

---

## Design principles

- Be grounded in website knowledge.
- Be helpful, not pushy.
- Prioritize revenue-driving next steps.
- Prefer low-friction lead capture over long interrogations.
- Escalate when the signal is strong enough to justify a human follow-up.

---

## Out of scope for this design phase

- UI implementation
- Routing or dashboard work
- Full live deployment behavior
- Production telemetry integration
