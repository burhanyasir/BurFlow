# Misclassification Ranking

## Ranking methodology
Each confusion pair is ranked by frequency using the latest benchmark confusion matrices and failure exports. Rankings are grouped by benchmark and component.

## Synthetic Benchmark

### CTA misclassifications
Total CTA errors: 352

1. Expected `contact-sales`, predicted `start-free-trial`: 160 (45.5% of synthetic CTA errors)
2. Expected `compare-plans`, predicted `contact-sales`: 128 (36.4%)
3. Expected `compare-plans`, predicted `start-free-trial`: 32 (9.1%)
4. Expected `request-quote`, predicted `compare-plans`: 32 (9.1%)

### Next-step misclassifications
Total next-step errors: 192

1. Expected `review_pricing`, predicted `contact_sales`: 96 (50.0% of synthetic next-step errors)
2. Expected `review_pricing`, predicted `continue_education`: 64 (33.3%)
3. Expected `recommend_trial`, predicted `review_pricing`: 32 (16.7%)

### Qualification timing misclassifications
Total qualification errors: 416

1. Expected `ask_qualification`, predicted `none`: 416 (100.0% of synthetic qualification errors)

## Real-World Benchmark

### CTA misclassifications
Total CTA errors: 71

1. Expected `contact-sales`, predicted `compare-plans`: 44 (62.0% of real-world CTA errors)
2. Expected `contact-sales`, predicted `start-free-trial`: 12 (16.9%)
3. Expected `contact-sales`, predicted `request-quote`: 8 (11.3%)
4. Expected `compare-plans`, predicted `request-quote`: 2 (2.8%)
5. Expected `compare-plans`, predicted `contact-sales`: 1 (1.4%)
6. Expected `start-free-trial`, predicted `compare-plans`: 1 (1.4%)
7. Expected `start-free-trial`, predicted `book-demo`: 1 (1.4%)
8. Expected `start-free-trial`, predicted `contact-sales`: 1 (1.4%)
9. Expected `request-quote`, predicted `compare-plans`: 1 (1.4%)

### Next-step misclassifications
Total next-step errors: 72

1. Expected `continue_education`, predicted `review_pricing`: 49 (68.1% of real-world next-step errors)
2. Expected `recommend_trial`, predicted `review_pricing`: 19 (26.4%)
3. Expected `continue_education`, predicted `schedule_demo`: 1 (1.4%)
4. Expected `continue_education`, predicted `contact_sales`: 2 (2.8%)
5. Expected `review_pricing`, predicted `continue_education`: 1 (1.4%)

### Qualification timing misclassifications
Total qualification errors: 82

1. Expected `ask_qualification`, predicted `none`: 82 (100.0% of real-world qualification errors)

## Key insights
- The largest confusion pair overall is `ask_qualification -> none` in qualification timing.
- The second-largest category is CTA misclassification from `contact-sales` to `compare-plans` in real-world data.
- The biggest next-step error is `continue_education -> review_pricing` in real-world data.
- These top misclassifications are the highest-value targets for Cycle 5.1.
