# Visitor Intent Benchmark Expansion Plan

## Objective
Expand the evaluation beyond the initial small sample to a larger real-world benchmark that measures how well the engine performs across multiple industries and intent types.

## Proposed Benchmark Scope
- At least 250 pages
- Cover multiple industries such as SaaS, healthcare, education, hospitality, retail, and services
- Include both commercial and non-commercial pages
- Include pages with pricing, support, booking, contact, careers, and product research intent

## Metrics to Capture
- Accuracy
- Precision
- Recall
- F1 score
- Confusion matrix
- Per-industry accuracy
- Per-intent accuracy

## Evaluation Workflow
1. Collect a representative corpus of pages.
2. Label each page with the expected primary intent.
3. Run the engine against each page.
4. Record predictions and compare against labels.
5. Aggregate metrics by industry and intent.
6. Review failure cases and iterate on the scoring model.

## Current Status
The engine redesign has passed the focused regression suite. The larger benchmark run is the next step once the benchmark corpus is assembled.
