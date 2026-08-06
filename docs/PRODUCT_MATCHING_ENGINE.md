# Product Matching Engine

Status: Design only. No implementation. No migration.

## 1. Objective

The Product Matching Engine selects the most relevant commercial offering from the company’s knowledge graph. It should choose between products, services, plans, bundles, pricing structures, upsells, and cross-sells using grounded knowledge from the Knowledge Engine.

## 2. Inputs

The engine should consume:
- visitor intent
- visitor persona
- buying stage
- page context
- business profile
- Knowledge Engine retrieval results
- session memory and conversation memory

## 3. Matching Logic

### 3.1 Products
A product is a standalone offering or software capability.

Selection criteria:
- direct fit to stated need,
- relevance to page context,
- confidence and knowledge support,
- and compatibility with persona or industry.

### 3.2 Services
A service is a delivery, onboarding, implementation, or consulting capability.

Selection criteria:
- urgency or implementation timeline,
- complexity of the problem,
- previous unresolved needs,
- and whether the visitor may require assisted onboarding.

### 3.3 Plans
A plan is a tiered commercial structure.

Selection criteria:
- budget signal,
- size or maturity of visitor,
- expected complexity,
- and whether the offer should be entry-level, growth, or premium.

### 3.4 Bundles
A bundle combines products and services for a more complete solution.

Selection criteria:
- multiple needs present in the same conversation,
- strong commercial intent,
- or vertical-specific complexity requiring integrated support.

### 3.5 Pricing
Pricing selection should be guided by:
- visitor budget signal,
- plan fit,
- value framing,
- and available promotional or onboarding constraints.

### 3.6 Upsells
Upsells should be suggested only when:
- the visitor already demonstrated clear fit for a baseline offer,
- a premium feature is meaningfully valuable,
- and the conversation context supports expansion.

### 3.7 Cross-sells
Cross-sells should be suggested only when:
- there is obvious complementarity,
- the visitor’s context supports adjacent need coverage,
- and the recommendation remains grounded.

## 4. Ranking Model

The engine should rank candidate offers using a weighted score:

$$
match\_score = 0.35 \times intent\_fit + 0.20 \times persona\_fit + 0.15 \times stage\_fit + 0.15 \times price\_fit + 0.15 \times knowledge\_grounding
$$

## 5. Output Contract

The engine should emit:
- top ranked product
- secondary product or service candidates
- recommended plan or bundle
- pricing position
- upsell suggestion
- cross-sell suggestion
- rationale summary

## 6. Guardrails

- Never recommend a plan or bundle that is not supported by the Knowledge Engine.
- Do not upsell aggressively in the first reply.
- Prefer the simplest valid offer if confidence is moderate.
- Escalate to human review if the recommendation is high-value and confidence is uncertain.
