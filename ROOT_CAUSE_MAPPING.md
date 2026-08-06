# Root Cause Mapping

## Methodology
Each top confusion pair is mapped to the most likely primary source using the current frozen pipeline in `engine/packages/conversation-orchestrator/src/sales-playbook-engine.ts`.

## Primary sources
- Signal Extraction: errors in `extractSalesPlaybookSignals()` that fail to capture customer intent, pricing, or buying context.
- PricingReviewEligibility: errors in `evaluatePricingReviewEligibility()` that incorrectly gate pricing readiness.
- FunnelStage: errors in `classifyFunnelStage()` that assign the wrong funnel stage.
- ActionDecision: errors in `decideAction()` that choose the wrong high-level action from a correct stage.
- CTA Mapping: errors in the CTA selection branch inside `decideAction()`.
- Qualification Logic: errors in the qualification stage gating and `ask_qualification` decision path.

## Top confusion pairs and root causes

### 1. `contact-sales` expected → `compare-plans` predicted
- Primary source: `FunnelStage` and `CTA Mapping`
- Evidence: `decideAction()` only issues `compare-plans` when the readiness stage is `Pricing` and pricing review is eligible. If the expected outcome is `contact-sales`, the funnel stage should not be `Pricing` for these cases.
- Pipeline implication: either `classifyFunnelStage()` is elevating awareness/consideration traffic too early, or the CTA mapping in `decideAction()` is overly aggressive for `Pricing`-stage cases.

### 2. `continue_education` expected → `review_pricing` predicted
- Primary source: `FunnelStage`
- Evidence: `review_pricing` is generated from `readiness.stage === 'Pricing'` in `decideAction()`. The actual CTA and next-step mismatch indicates the stage classifier is moving the case into Pricing when it should remain in Education or Awareness.
- Pipeline implication: `evaluatePricingReviewEligibility()` and `classifyFunnelStage()` are the likely upstream causes.

### 3. `ask_qualification` expected → `none` predicted
- Primary source: `Qualification Logic` and `FunnelStage`
- Evidence: the current pipeline computes `qualificationNeeded` from budget, decision authority, timeline, and plan comparison signals, then only emits `ask_qualification` on Qualification stage or specific Pricing-stage conditions. The binary metric failure indicates this branch is never triggered for expected positives.
- Pipeline implication: either `extractSalesPlaybookSignals()` fails to surface qualification evidence, or `classifyFunnelStage()`/`decideAction()` suppresses the qualification path.

### 4. `contact-sales` expected → `start-free-trial` predicted
- Primary source: `CTA Mapping`
- Evidence: `start-free-trial` is selected in `decideAction()` when pricing readiness is insufficient and contact-sales is not preferred. If the correct outcome is `contact-sales`, the CTA branch logic is too permissive for consultative or high-value contexts.
- Pipeline implication: the action decision mapping needs to better separate consultative contact-sales opportunities from low-touch educational offers.

### 5. `recommend_trial` expected → `review_pricing` predicted
- Primary source: `FunnelStage`
- Evidence: `recommend_trial` should appear in cases that remain in Education/Qualification rather than Pricing. The current path only produces `review_pricing` when the stage transitions to Pricing, so the stage classifier is the key point of failure.

## Supporting evidence from the frozen pipeline
- `extractSalesPlaybookSignals()` defines `pricingInterest`, `comparisonInterest`, `hasPricingInfo`, `hasDemoPath`, `atDecisionStage`, and other signals.
- `evaluatePricingReviewEligibility()` returns `pricingReviewEligible` based on explicit pricing context, supportive evidence, and purchase momentum.
- `classifyFunnelStage()` uses `pricingReviewEligible` and `qualificationNeeded` to assign `Awareness`, `Education`, `Qualification`, `Pricing`, or `Sales`.
- `buildReadiness()` converts stage into readiness booleans; `pricingReady` is true only for `Pricing` or `Sales`.
- `decideAction()` selects `nextStep` and CTA primarily by stage, with specialized CTA branches for healthcare, e-commerce, and restaurants.

## Conclusion
The most actionable root causes are:
- `FunnelStage` over-classifying cases as `Pricing`
- `Qualification Logic` failing to produce `ask_qualification`
- `CTA Mapping` overly favoring `compare-plans` for cases that should be `contact-sales`

These conclusions are consistent with the current pipeline architecture and the observed top confusion pairs.
