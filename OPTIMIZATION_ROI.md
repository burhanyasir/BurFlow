# Optimization ROI

## Objective
Estimate the relative ROI of candidate optimization efforts within the frozen Sales Playbook pipeline. No heuristic changes are made in this analysis.

## Candidate optimization targets

### 1. Fix `contact-sales` → `compare-plans` CTA errors
- Maximum benchmark improvement: high
- Expected benchmark improvement: high
- Implementation complexity: moderate
- Rationale: This is the most frequent real-world CTA error and appears in top failure cases. It directly impacts CTA accuracy and downstream next-step behavior.
- Pipeline components: `FunnelStage`, `ActionDecision`, `CTA Mapping`

### 2. Fix `continue_education` → `review_pricing` next-step errors
- Maximum benchmark improvement: high
- Expected benchmark improvement: high
- Implementation complexity: moderate
- Rationale: This is the largest next-step failure and correlates with premature pricing transitions. It also affects CTA accuracy when the system selects pricing-first CTAs.
- Pipeline components: `PricingReviewEligibility`, `FunnelStage`, `ActionDecision`

### 3. Fix `ask_qualification` → `none` qualification timing errors
- Maximum benchmark improvement: high
- Expected benchmark improvement: high
- Implementation complexity: moderate to high
- Rationale: Qualification timing is currently 0.0% in both synthetic and real-world reports. Correcting this can dramatically improve perceived conversational quality and likely next-step accuracy.
- Pipeline components: `Signal Extraction`, `Qualification Logic`, `FunnelStage`, `ActionDecision`

### 4. Improve `weak_personalization` signal extraction for high-value contexts
- Maximum benchmark improvement: medium
- Expected benchmark improvement: medium
- Implementation complexity: moderate
- Rationale: Many misclassifications cite weak personalization, which impacts plan, CTA, and next-step accuracy. Better signal extraction can improve multiple downstream decisions without architecture changes.
- Pipeline components: `extractSalesPlaybookSignals()`, `ActionDecision`

### 5. Improve `contact-sales` → `start-free-trial` CTA errors
- Maximum benchmark improvement: medium
- Expected benchmark improvement: medium
- Implementation complexity: low to moderate
- Rationale: A common CTA confusion in both synthetic and real-world data. This is a narrower CTA mapping issue than the `compare-plans` problem.
- Pipeline components: `ActionDecision`, `CTA Mapping`

### 6. Improve `recommend_trial` → `review_pricing` next-step errors
- Maximum benchmark improvement: medium
- Expected benchmark improvement: medium
- Implementation complexity: moderate
- Rationale: This affects perceived recommendation quality and is a strong signal of funnel stage misclassification. Fixing it should improve next-step accuracy in discount/high-value scenarios.
- Pipeline components: `FunnelStage`, `ActionDecision`

### 7. Improve low `trust signal usage` in synthetic data
- Maximum benchmark improvement: low to medium
- Expected benchmark improvement: low
- Implementation complexity: low
- Rationale: This impacts synthetic benchmark scores but not real-world performance, and trust usage is already strong in real-world data.
- Pipeline components: `Signal Extraction`, `ActionDecision`

## ROI ranking
1. `contact-sales` → `compare-plans` CTA fix
2. `continue_education` → `review_pricing` next-step fix
3. `ask_qualification` → `none` qualification timing fix
4. `weak_personalization` improvement
5. `contact-sales` → `start-free-trial` CTA fix
6. `recommend_trial` → `review_pricing` next-step fix
7. `trust signal usage` improvement in synthetic data

## Implementation guidance
- Focus first on the shared upstream cause: stage classification and pricing readiness gating.
- Then tune CTA mapping for consultative vs pricing-first contexts.
- Finally, ensure qualification timing is surfaced whenever `qualificationNeeded` is true.

## Expected maximum improvement
- Addressing the top three failure classes could improve CTA and next-step metrics significantly, and could raise overall benchmark accuracy by 5-10 points if the stage/qualification errors are corrected without introducing regressions.
- Qualification timing improvements alone could move the metric from 0.0% to a meaningful positive value, unlocking additional overall accuracy gains.
