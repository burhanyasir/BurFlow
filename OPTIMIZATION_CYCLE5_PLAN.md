# Optimization Cycle 5 Plan

## Context
The Sales Playbook architecture is frozen. No changes may bypass the existing pipeline:
- `extractSalesPlaybookSignals()`
- `evaluatePricingReviewEligibility()`
- `classifyFunnelStage()`
- `buildReadiness()`
- `decideAction()`

This cycle is focused strictly on heuristic tuning inside those components.

## Baseline priorities
Based on the benchmark baseline and failure export, the highest-impact optimization targets are:
1. CTA accuracy
2. Next-step accuracy
3. Qualification timing

Low-impact areas are intentionally deprioritized for Cycle 5:
- Plan accuracy (strong in real-world, moderate but not critical)
- Booking timing (very high already)
- Objection handling (already perfect)
- Trust signal usage in real-world (strong)

## Current baseline
### Synthetic benchmark
- Overall: 71.5%
- Plan accuracy: 70.7%
- Next-step accuracy: 73.9%
- CTA accuracy: 52.2%
- CRM accuracy: 71.2%
- Booking timing: 100.0%
- Qualification timing: 43.5%
- Objection handling: 100.0%
- Trust accuracy: 60.9%

### Real-world benchmark
- Overall: 77.4%
- Plan accuracy: 99.2%
- Next-step accuracy: 44.6%
- CTA accuracy: 45.4%
- CRM accuracy: 100.0%
- Booking timing: 93.1%
- Qualification timing: 36.9%
- Objection handling: 100.0%
- Trust accuracy: 100.0%

## High-ROI target areas

### 1. CTA accuracy
Rationale: CTA is one of the weakest metrics and appears in all top failure cases.
- Primary levers:
  - `decideAction()` CTA mapping logic.
  - `extractSalesPlaybookSignals()` signals that influence CTA decisions: `hasPricingInfo`, `hasDemoPath`, `pricingInterest`, `comparisonInterest`, `bookingIntent`, `atDecisionStage`, `contactSalesPreferred`.
- Focused improvements:
  - Reduce overuse of `compare-plans` on awareness/consideration pages.
  - Increase `contact-sales` selection for consultative and trust-sensitive industries when appropriate.
  - Refine `request-quote` and `start-free-trial` triggers for E-commerce and low-touch buying patterns.

### 2. Next-step accuracy
Rationale: incorrect next-step assignment is the second most frequent failure mode.
- Primary levers:
  - `classifyFunnelStage()` stage scoring and priority order.
  - `evaluatePricingReviewEligibility()` gating for pricing readiness.
  - `decideAction()` translation from readiness stage to next step.
- Focused improvements:
  - Prevent early-stage traffic from being classified as `Pricing` when the expected outcome is `continue_education`.
  - Tighten the distinction between `Education`, `Qualification`, and `Pricing` stage thresholds.
  - Make `review_pricing` a more deliberate outcome only after strong pricing and buying signals are present.

### 3. Qualification timing
Rationale: qualification timing is very low in both benchmarks and a clear defect area.
- Primary levers:
  - `extractSalesPlaybookSignals()` extraction of qualification-related evidence.
  - `classifyFunnelStage()` and `decideAction()` handling when qualification is needed.
- Focused improvements:
  - Sharpen the `qualificationNeeded` logic: budget, decision authority, timeline, and comparison signals.
  - Ensure cases with incomplete buying context are not advanced prematurely to `review_pricing`.
  - Increase the consistency of `ask_qualification` when `qualificationNeeded` is true.

## Recommended heuristic tuning path
1. Audit the scoring logic in `classifyFunnelStage()` to ensure `Awareness` and `Education` are not underweighted relative to `Pricing`.
2. Review the `pricingReviewEligible` gate in `evaluatePricingReviewEligibility()` to reduce false positives on early-stage or low-commitment scenarios.
3. Adjust CTA selection rules in `decideAction()` for:
   - `contact-sales` vs `compare-plans`
   - `request-quote` vs `compare-plans` in E-commerce pricing contexts
   - `start-free-trial` in low-touch qualification opportunities
4. Improve the `weak_personalization` cases by adding more explicit industry or page-type signal differentiation in `extractSalesPlaybookSignals()`.

## Top failure focus areas
- `compare-plans` is frequently chosen instead of `contact-sales` or `start-free-trial`.
- `review_pricing` is frequently chosen instead of `continue_education` or `recommend_trial`.
- `ask_qualification` is frequently missed when expected.

## Success criteria for Cycle 5
- CTA accuracy improves noticeably without changing the current architecture.
- Next-step accuracy improves, especially by reducing premature `review_pricing` assignments.
- Qualification timing improves by moving more cases to `ask_qualification` where expected.
- No frozen-pipeline functions are bypassed.
- No benchmark contract or report structure changes are introduced.
