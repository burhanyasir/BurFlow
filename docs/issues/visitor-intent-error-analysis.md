# Visitor Intent Engine Error Analysis

## Summary
The first real-world evaluation of the visitor intent engine showed that shallow keyword matching was not sufficient for production-quality intent inference. The main failure mode was over-reliance on broad signals such as pricing, demo, and product keywords, which caused the engine to overfit to surface-level text rather than the visitor's actual intent context.

## Most Common Misclassifications
1. Product Research vs General Information
   - Weak product pages with descriptive copy were often classified as general information because the engine lacked enough product/service evidence.
   - The redesign now accumulates signals from title, headings, metadata, path, CTA context, and business profile knowledge.

2. Pricing vs Buying
   - Pages with pricing language often caused the engine to return Pricing even when the visitor was clearly ready to buy or book.
   - The redesign now uses explicit user-question boosts and industry-aware adjustments.

3. Booking vs Buying for Healthcare Appointment Flows
   - Appointment-based healthcare pages were frequently classified as Booking instead of Buying because booking terms and scheduling language were too dominant.
   - The redesign now biases healthcare appointment flows toward Buying when the user is trying to book an appointment.

## Root Causes
- Heuristic priority ordering was too brittle.
- Missing business context and industry context reduced accuracy.
- Confidence was not calibrated against evidence quality or ambiguity.
- The engine lacked a distribution output and did not preserve competing intents.

## Fixes Implemented
- Introduced a weighted evidence model that scores across multiple page signals.
- Added support for page title, headings, metadata, structured data, navigation, CTAs, forms, knowledge facts, and business profile context.
- Added industry-aware boosts for healthcare, SaaS, education, and other domains.
- Added intent distribution output for multi-intent reasoning.
- Calibrated confidence using evidence margin and explicit user-intent signals.

## Validation Status
The updated engine now passes the focused regression suite with 12/12 tests green.
