# CTA Engine

Status: Design only. No implementation. No migration.

## 1. Purpose

The CTA Engine decides which call to action BurFlow should present next, based on commercial context and conversation state.

## 2. Inputs

CTA selection should use:
- confidence score
- visitor intent
- industry or persona
- buying stage
- page context
- urgency
- prior recommendations

## 3. CTA Decision Rules

### 3.1 Based on Confidence
- High confidence, clear intent → direct CTA such as Book a Demo or Get a Quote
- Medium confidence → compare or ask one follow-up question
- Low confidence → provide explanation and then offer a safe next path

### 3.2 Based on Visitor Intent
- pricing-inquiry → View Pricing
- demo-request → Book a Demo
- compare-offers → Compare Plans
- support-request → Talk to Support
- booking-intent → Start a Conversation / Schedule a Call

### 3.3 Based on Industry
- enterprise → Talk to Sales / Book Enterprise Consultation
- agency → See Agency Plans / Get Strategy Call
- ecommerce owner → View Growth Plan / Talk to Conversion Expert
- healthcare / legal → Book a Trust & Compliance Call
- manufacturing → Talk to Operations Consultant

### 3.4 Based on Buying Stage
- Awareness → Learn More / Explore Plans
- Discovery → Compare Solutions
- Qualification → Get a Quote
- Decision → Book Demo / Checkout
- Booking → Confirm Appointment

### 3.5 Based on Page Context
- pricing page → View Pricing / Choose Plan
- product page → See Product Details / Book Demo
- FAQ page → Ask Support / Compare Options
- home page → Start with Product Fit Assessment

## 4. CTA Priority

The engine should prefer the single highest-value CTA at each turn.

Priority order:
1. next cheapest friction step
2. most grounded commercial action
3. highest confidence next step
4. lowest user effort

## 5. CTA Output Contract

The CTA Engine should return:
- primary CTA
- secondary CTA fallback
- confidence for the CTA choice
- rationale
- any required lead-capture fields

## 6. Guardrails

- Do not present a booking CTA too early if confidence is low.
- Do not ask for payment details before qualifying the user.
- Do not skip a comparison step when the user is still evaluating.
