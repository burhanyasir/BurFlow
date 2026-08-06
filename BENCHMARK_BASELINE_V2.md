# Benchmark Baseline V2

## Source
Baseline derived from the current Sales Conversion Evaluation benchmark reports in `engine/packages/conversation-orchestrator`.

## Synthetic benchmark metrics
- Cases evaluated: 736
- Overall accuracy: 71.5%
- Recommended plan accuracy: 70.7%
- Next-step accuracy: 73.9%
- CTA accuracy: 52.2%
- CRM accuracy: 71.2%
- Booking timing accuracy: 100.0%
- Qualification timing accuracy: 43.5%
- Objection handling accuracy: 100.0%
- Trust signal usage accuracy: 60.9%

## Real-world benchmark metrics
- Cases evaluated: 130
- Overall accuracy: 77.4%
- Recommended plan accuracy: 99.2%
- Next-step accuracy: 44.6%
- CTA accuracy: 45.4%
- CRM accuracy: 100.0%
- Booking timing accuracy: 93.1%
- Qualification timing accuracy: 36.9%
- Objection handling accuracy: 100.0%
- Trust signal usage accuracy: 100.0%

## Comparative observations
- Plan accuracy is strong in real-world data and moderate in synthetic data.
- The largest gaps are in CTA accuracy, next-step accuracy, and qualification timing.
- Booking timing and objection handling are stable across both benchmarks.
- CRM accuracy is strong in the real-world report but only moderate in synthetic data.
- Trust usage is excellent in the real-world benchmark and needs improvement in synthetic.

## Baseline conclusion
This is the current optimization baseline for Cycle 5. All future heuristic improvements must preserve the frozen architecture and decision pipeline while addressing the quality gaps above.
