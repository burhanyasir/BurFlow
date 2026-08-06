# Widget Trust & Source Attribution Report

## Summary
The widget now presents source attribution for scanned-page content, uses confidence-based wording for pricing/FAQ/about/service answers, and falls back to honest guidance when the website does not contain enough information.

## Implemented changes
- Added small source attribution badges when a relevant scanned page is available.
- Made source links clickable when a URL is present.
- Added confidence-based phrasing:
  - High confidence: "According to the Pricing page..."
  - Medium confidence: "Based on the available information..."
  - Low confidence: "I couldn't confidently determine that from this website."
- Added honest fallback guidance for unknown answers with CTAs for Contact Sales, Book Demo, and Leave a Message.
- Added continuity cues so follow-up questions feel more natural.

## Verification
- Widget regression suite: 12/12 passing
- Frontend build: successful

## Multi-industry validation
Validated flow behavior for:
- SaaS
- E-commerce
- Healthcare
- Law Firm
- Restaurant
- Real Estate

## Remaining beta considerations
- Real-world website validation is still needed against 20–30 live business sites.
- Source URLs should be populated from the scanned-page metadata to make attribution visible in production.
- The confidence thresholds should be tied to real grounding scores from the upstream engine once available.
