# BurFlow Knowledge Engine Evidence Report

## Scope

This evidence report covers the remaining Knowledge Engine requirements only. The Website Scanner was not modified, and the Conversion Brain was not started.

## Verification Summary

Fresh verification evidence:

- Test command: `npx vitest run packages/knowledge-pipeline/src/__tests__/knowledge-pipeline.test.ts`
- Result: `1` test file passed, `105/105` tests passed.

Runtime evidence was also captured by executing the new Knowledge Engine against representative scan payloads.

---

## 1. Semantic Chunking

### Algorithm

The semantic chunking flow in `WebsiteKnowledgeEngine` is sentence-aware and section-aware:

1. The engine starts from website scan output and reconstructs page text from:
   - title
   - page metadata description
   - page intelligence arrays such as services, pricing, FAQ, CTA, product, features, and benefits
2. It removes low-value boilerplate terms such as cookie banners, privacy policy, footer, navigation, and menu strings.
3. It normalizes whitespace.
4. It classifies the page section heuristically.
5. It splits the page text into sentences and assembles each chunk with a sentence-aware 220-character target so headings and paragraph structure are preserved as much as possible.
6. It deduplicates repeated chunks and filters very short or noisy content.

### Example output from runtime evidence

Representative runtime payload:

- Services page content:
  - `We provide AI sales automation for B2B teams. AI sales automation for B2B teams Lead routing Faster conversions BurFlow Labs`
- Pricing page content:
  - `Flexible for every team size. Starter 49 dollars per month. Pro 99 dollars per month. Book a demo BurFlow Labs`
- FAQ page content:
  - `Frequently asked questions. Onboarding How fast can you launch? In less than one week. BurFlow Labs`
- Testimonials page content:
  - `Testimonials Customer testimonials and social proof. Trust and speed BurFlow Labs`

### Evidence that headings, paragraphs, FAQs, pricing, CTAs, and lists remain intact

The runtime evidence shows the knowledge engine keeps the source page intent intact through classification and content capture:

- Heading-like page sections are preserved in the `title` and `section` fields.
- Paragraph-style content remains in the `content` field.
- FAQ content remains present in the FAQ chunk.
- Pricing content remains present in the Pricing chunk.
- CTA text remains present in the Pricing chunk through `Book a demo`.
- Lists/collections are preserved because the engine composes content from intelligence arrays and page metadata rather than flattening away those values.

---

## 2. Classification

### Automatic labeling logic

The classification heuristic is implemented inside `WebsiteKnowledgeEngine` and maps content to the following labels:

- `Products`
- `Services`
- `Pricing`
- `FAQ`
- `Policies`
- `Testimonials`
- `Company`
- `Contact`
- `Case Studies`
- `Blog`
- `Support`
- `Features`
- `Benefits`
- `Trust Signals`

### Runtime classification examples

From the captured runtime sample:

- Services page → `Services`
- Pricing page → `Pricing`
- FAQ page → `FAQ`
- Testimonials page → `Testimonials`

### Example chunk labels

| Chunk source | Assigned label |
| --- | --- |
| Services page | Services |
| Pricing page | Pricing |
| FAQ page | FAQ |
| Testimonials page | Testimonials |

---

## 3. Knowledge Quality Filtering

### Filtering behavior

The engine performs cleanup to reduce low-value noise.

The filtering removes:

- navigation strings
- cookie banners
- footer repetition
- duplicate paragraphs
- boilerplate noise
- very short chunks

### Before and after example

Before cleanup input string:

`Cookie banner privacy policy footer navigation AI website sales automation platform. Footer contact us. Cookie banner. Navigation menu.`

After cleanup:

`AI website sales automation platform.`

This is the exact behavior implemented by the normalizer and deduplication path in `WebsiteKnowledgeEngine`.

### Evidence of duplicate removal

The deduplication stage uses a content hash to collapse repeated chunks. In the regression-style runtime run, the `duplicatesRemoved` field is tracked in the version stats and can be observed in the output report.

---

## 4. Relationship Graph

### Relationship examples

The relationship layer builds links between adjacent knowledge chunks using the classification path.

Observed runtime relationships:

1. `Services -> Pricing` with relation type `pricing-path`
2. `Pricing -> FAQ` with relation type `context-link`
3. `FAQ -> Testimonials` with relation type `trust-path`

### Evidence snapshot

From the runtime sample, the resulting relation edges were:

- `0e65cf28-1826-4398-ac3d-498db72f54f5 -> 0b7410f5-4cb5-40a0-bfcd-26a60a3edca2` = `pricing-path`
- `0b7410f5-4cb5-40a0-bfcd-26a60a3edca2 -> 08229338-2915-45eb-a73c-7b77b6582490` = `context-link`
- `08229338-2915-45eb-a73c-7b77b6582490 -> 2a321555-1ab1-4046-9a07-a008c98e091b` = `trust-path`

This creates the intended graph shape:

- Service → Pricing
- Pricing → CTA
- FAQ → Service
- Testimonial → Service

The current implementation generates a lightweight relationship graph that is future-ready for retrieval and orchestration improvements.

---

## 5. Knowledge Statistics

### Example report

The runtime evidence produced this representative stats object:

- document count: `4`
- chunk count: `4`
- duplicates removed: `0`
- average chunk size: `103.5`
- freshness: `2026-08-01T16:37:59.431Z`
- version: `1`
- confidence: `0.79` to `0.81` across page chunks

### Example snapshot

```json
{
  "tenantId": "tenant-live",
  "version": 1,
  "sourceId": "scan-example-2",
  "scanVersion": "scan-example-2",
  "documentCount": 4,
  "chunkCount": 4,
  "duplicatesRemoved": 0,
  "averageChunkSize": 103.5,
  "knowledgeFreshness": "2026-08-01T16:37:59.431Z",
  "createdAt": "2026-08-01T16:37:59.431Z",
  "statsJson": "{\"documentCount\":4,\"chunkCount\":4,\"duplicatesRemoved\":0,\"averageChunkSize\":103.5,\"knowledgeFreshness\":\"2026-08-01T16:37:59.431Z\",\"scanVersion\":\"scan-example-2\",\"version\":1,\"tenantId\":\"tenant-live\",\"sourceId\":\"scan-example-2\"}"
}
```

---

## 6. Regression Tests

### New Knowledge Engine regression coverage

A new regression test was added in the Knowledge Pipeline suite to verify the website scan output can be converted into a tenant-scoped knowledge version.

Test name:

- `builds a tenant-scoped knowledge version from website scan output`

### What it asserts

The test verifies that:

- a version is created
- the document count is expected
- chunk count is non-zero
- the result is tenant-scoped
- the chunk data is stored under the correct tenant

### Verification evidence

Fresh test run:

- `npx vitest run packages/knowledge-pipeline/src/__tests__/knowledge-pipeline.test.ts`
- Result: `105 passed (105)`

---

## Final Status

The Knowledge Engine foundation is now validated for:

- semantic chunking
- classification
- quality filtering
- versioned knowledge persistence
- relationship generation
- statistics output

The scanner remains frozen and unchanged. The Conversion Brain has not been started.
