# BurFlow Website Scanner Specification

Status: Design only. No implementation.

## Purpose

The BurFlow Website Scanner is the entry point for turning a customer’s website into structured knowledge that powers the AI sales agent. It should extract the business’s offers, positioning, audience, tone, and conversion signals so the assistant can respond intelligently and guide visitors toward revenue-generating outcomes.

## Primary goals

The scanner should help BurFlow:

- understand the customer’s products and services,
- identify pricing and policy information,
- detect audience and market positioning,
- capture conversion-related messaging,
- and provide a rich knowledge base for the AI sales agent.

---

## Extracted content

The scanner should extract the following categories:

- Products
- Services
- Pricing
- FAQs
- About
- Contact
- Policies
- Team
- Testimonials
- Case studies
- Industries
- Customer types
- Brand tone
- CTAs
- Locations
- Languages

## Extraction behavior

### Initial scan

When a customer first connects a website, the scanner should:

- crawl the site starting from the homepage,
- collect page content from relevant pages,
- extract structured business information,
- normalize the data for the knowledge engine,
- and publish an initial knowledge snapshot.

### Incremental scan

After the initial scan, the system should:

- revisit changed pages only when possible,
- update the knowledge store without reprocessing everything,
- and preserve prior knowledge where changes are minor or irrelevant.

### Daily sync

A scheduled daily sync should:

- refresh content for known pages,
- detect new pages and remove stale ones,
- and update the knowledge base quickly with minimal duplication.

### Manual re-scan

Users should be able to trigger a re-scan manually when:

- the site structure changes,
- new offers are added,
- branding changes significantly,
- or the knowledge base should be refreshed immediately.

### Change detection

The scanner should compare:

- page hashes,
- updated timestamps,
- content deltas,
- and link structure.

If significant changes are detected, the scanner should schedule an update rather than always reprocessing unchanged content.

---

## Output schema

The scanner should produce a normalized knowledge record for each extracted area, including:

- category
- title
- summary
- source URL
- confidence score
- last scanned timestamp
- content hash
- related entities or keywords
- recommended usage in conversation generation

---

## Targeted information extraction

### Products

Capture:
- product names
- descriptions
- differentiators
- pricing tiers
- availability

### Services

Capture:
- service names
- descriptions
- process or outcomes
- target audience

### Pricing

Capture:
- prices
- plans
- packages
- free vs paid options
- billing terms if visible

### FAQs

Capture:
- common questions
- answers
- terminology

### About

Capture:
- mission
- story
- values
- founding details
- company positioning

### Contact

Capture:
- phone
- email
- address
- hours
- booking links

### Policies

Capture:
- returns
- privacy
- terms
- shipping
- cancellations

### Team

Capture:
- staff names
- roles
- titles
- confidence and relevance

### Testimonials

Capture:
- customer quotes
- company names
- proof points

### Case studies

Capture:
- client names
- results
- relevant outcomes

### Industries

Capture:
- verticals served
- niche positioning

### Customer types

Capture:
- SMB
- enterprise
- consumer
- nonprofit
- public sector

### Brand tone

Capture:
- formal vs conversational
- premium vs approachable
- technical vs plain-English
- friendly vs authoritative

### CTAs

Capture:
- book demo
- request quote
- contact us
- start free
- get started

### Locations

Capture:
- cities
- regions
- countries
- service areas

### Languages

Capture:
- primary language
- alternate language signals

---

## Scanner quality requirements

The scanner should:

- preserve source attribution,
- avoid hallucination,
- be resilient to incomplete or messy markup,
- and prioritize conversion-relevant information over decorative content.

---

## Design principles

- Use the website as the primary source of truth.
- Prefer structured extraction over free-form guessing.
- Support continuous improvement via re-scan and sync.
- Focus on knowledge that improves sales conversations and lead conversion.

---

## Out of scope for this phase

- UI implementation
- Full dashboard integration
- Live publishing workflows
- Frontend scanner experience
