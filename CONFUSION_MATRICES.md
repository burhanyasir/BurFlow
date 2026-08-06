# Confusion Matrices

## Synthetic Benchmark — CTA Selection
Total cases: 736

| Expected \ Predicted | compare-plans | book-demo | start-free-trial | contact-sales | Total | % of total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| compare-plans | 160 | 0 | 32 | 128 | 320 | 43.5% |
| book-demo | 0 | 160 | 0 | 0 | 160 | 21.7% |
| start-free-trial | 0 | 0 | 32 | 0 | 32 | 4.3% |
| contact-sales | 0 | 0 | 160 | 32 | 192 | 26.1% |
| request-quote | 32 | 0 | 0 | 0 | 32 | 4.3% |
| **Total** | 192 | 160 | 224 | 160 | 736 | 100.0% |

## Synthetic Benchmark — Next Best Action
Total cases: 736

| Expected \ Predicted | review_pricing | schedule_demo | continue_education | contact_sales | recommend_trial | Total | % of total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| review_pricing | 160 | 0 | 64 | 96 | 0 | 320 | 43.5% |
| schedule_demo | 0 | 160 | 0 | 0 | 0 | 160 | 21.7% |
| continue_education | 0 | 0 | 128 | 0 | 0 | 128 | 17.4% |
| contact_sales | 0 | 0 | 0 | 0 | 0 | 0 | 0.0% |
| recommend_trial | 32 | 0 | 0 | 0 | 96 | 128 | 17.4% |
| **Total** | 192 | 160 | 192 | 96 | 96 | 736 | 100.0% |

## Synthetic Benchmark — Qualification Timing (Inferred)
Total cases: 736

The binary metrics report 0.0% precision, recall, and F1 for qualification timing, implying that the benchmark system predicted no positive qualification prompts.

| Expected \ Predicted | ask_qualification | none | Total | % of total |
| --- | ---: | ---: | ---: | ---: |
| ask_qualification | 0 | 416 | 416 | 56.5% |
| no qualification prompt | 0 | 320 | 320 | 43.5% |
| **Total** | 0 | 736 | 736 | 100.0% |

## Real-World Benchmark — CTA Selection
Total cases: 130

| Expected \ Predicted | compare-plans | book-demo | contact-sales | start-free-trial | request-quote | Total | % of total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| compare-plans | 26 | 0 | 1 | 0 | 2 | 29 | 22.3% |
| book-demo | 0 | 12 | 0 | 0 | 0 | 12 | 9.2% |
| contact-sales | 44 | 0 | 20 | 12 | 8 | 84 | 64.6% |
| start-free-trial | 1 | 1 | 1 | 1 | 0 | 4 | 3.1% |
| request-quote | 1 | 0 | 0 | 0 | 0 | 1 | 0.8% |
| **Total** | 72 | 13 | 22 | 13 | 10 | 130 | 100.0% |

## Real-World Benchmark — Next Best Action
Total cases: 130

| Expected \ Predicted | review_pricing | schedule_demo | continue_education | recommend_trial | contact_sales | Total | % of total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| review_pricing | 13 | 0 | 1 | 0 | 0 | 14 | 10.8% |
| schedule_demo | 0 | 12 | 0 | 0 | 0 | 12 | 9.2% |
| continue_education | 49 | 1 | 20 | 0 | 2 | 72 | 55.4% |
| recommend_trial | 19 | 0 | 0 | 13 | 0 | 32 | 24.6% |
| contact_sales | 0 | 0 | 0 | 0 | 0 | 0 | 0.0% |
| **Total** | 81 | 13 | 21 | 13 | 2 | 130 | 100.0% |

## Real-World Benchmark — Qualification Timing (Inferred)
Total cases: 130

From the reported qualification timing accuracy of 36.9% and 0.0% precision/recall, the classifier appears to have predicted no positive qualification prompts.

| Expected \ Predicted | ask_qualification | none | Total | % of total |
| --- | ---: | ---: | ---: | ---: |
| ask_qualification | 0 | 82 | 82 | 63.1% |
| no qualification prompt | 0 | 48 | 48 | 36.9% |
| **Total** | 0 | 130 | 130 | 100.0% |
