# Signal Ownership Matrix

This document defines the ownership and responsibilities of the sales playbook signals.

| Signal | Purpose | Inputs | Consumers |
| --- | --- | --- | --- |
| `PricingInterest` | Detect explicit user interest in pricing, cost, or plan details | `visitorIntent.primaryIntent` | `isPricingReady`, `buildSalesPlaybook` stage predicates, pricing branch decisions |
| `PricingReviewEligible` | Decide whether the conversation is eligible for pricing review at all | raw signals: `PricingInterest`, `isComparisonIntent`, `pageTypePricing`, `hasPricingInfo`, `atDecisionStage`, `isBuyingIntent`; supportive evidence flags | `FunnelStage` classification, `Pricing` stage branch, `readiness.pricingReady` |
| `FunnelStage` | Classify the conversation into Awareness / Education / Qualification / Pricing / Sales | raw signals, `PricingReviewEligible`, qualification and demo signals | `ActionDecision` layer, readiness boolean outputs, industry CTA overrides |
| `ActionDecision` | Choose the actual user-facing outputs | `FunnelStage`, `PricingReviewEligible`, `contactSalesPreferred`, `hasDemoPath`, `qualificationNeeded`, `industryTemplate`, raw feature flags | final `SalesPlaybookStrategy` outputs: `nextStep`, `cta`, `pricingStrategy`, `recommendationStrategy` |

## Current signal mapping

- `isPricingIntent` maps to the raw `PricingInterest` concept.
- `pricingReady` maps to the current `PricingReviewEligible` concept.
- `readiness.stage` maps to the current `FunnelStage` concept.

## Design implication

- `PricingInterest` should remain a pure signal detector.
- `PricingReviewEligible` should be a separate gate and not also serve as a stage label.
- `FunnelStage` should classify conversation state using signal scores.
- `ActionDecision` should select `nextStep`, `cta`, and `pricingStrategy` based on stage and eligibility.
