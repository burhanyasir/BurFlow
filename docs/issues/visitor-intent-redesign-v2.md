# Visitor Intent Engine Redesign v2

## Goal
Replace the original heuristic-first classifier with a weighted evidence model that better reflects real-world visitor behavior.

## Design Principles
- Use multiple weak signals rather than a single rule.
- Favor explicit user intent over generic page copy.
- Incorporate business profile and industry context.
- Preserve ambiguity by returning a primary intent, a secondary intent, and a full distribution.
- Calibrate confidence using evidence strength and disagreement between top intents.

## New Scoring Approach
1. Gather signals from:
   - Current URL and path
   - Page title and headings
   - Metadata and structured data
   - CTA and form text
   - Navigation and breadcrumb structure
   - Knowledge-engine facts and business profile context
2. Score each intent across these signals.
3. Apply domain-specific boosts for known patterns such as healthcare appointments and SaaS demo flows.
4. Produce:
   - Primary intent
   - Secondary intent
   - Confidence
   - Supporting evidence
   - Intent distribution

## Expected Benefits
- Better handling of ambiguous commercial pages
- Better distinction between Pricing, Buying, and Booking
- Improved robustness on healthcare, SaaS, and service-led flows
- More useful downstream actions for the conversation engine

## Validation
The redesign is now validated against 12 regression scenarios and passes all of them.
