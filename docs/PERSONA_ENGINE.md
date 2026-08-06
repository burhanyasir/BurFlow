# Persona Engine

Status: Design only. No implementation. No migration.

## 1. Goal

The Persona Engine identifies the kind of visitor BurFlow is speaking with and assigns a confidence score. This enables the system to tailor language, problem framing, recommended products, and CTA choices.

## 2. Supported Personas

BurFlow must be able to recognize these personas:

- homeowner
- agency
- enterprise
- student
- SaaS buyer
- ecommerce owner
- healthcare
- legal
- manufacturing

## 3. Persona Recognition Criteria

### 3.1 Homeowner
Signals:
- mentions house, renovation, repair, home improvement, property, maintenance
- asks for local service or local availability

Typical intent pattern:
- service lookup
- local provider discovery
- urgency around immediate need

### 3.2 Agency
Signals:
- mentions marketing, lead generation, campaign, retainer, client acquisition, optimization
- appears to evaluate growth or automation tooling

Typical intent pattern:
- agency growth tools
- lead-gen automation
- recurring service offers

### 3.3 Enterprise
Signals:
- mentions multiple locations, compliance, security, procurement, enterprise rollout, integration, budget approvals

Typical intent pattern:
- high-value custom solution
- sales discussion
- security, governance, and integration concerns

### 3.4 Student
Signals:
- mentions education, coursework, school, tuition, research, study assistance

Typical intent pattern:
- lower-cost plan
- educational use-case
- lighter feature set

### 3.5 SaaS Buyer
Signals:
- mentions software, subscriptions, onboarding, product-led growth, integrations, API, analytics

Typical intent pattern:
- product fit
- recurring revenue model
- operational efficiency

### 3.6 Ecommerce Owner
Signals:
- mentions online store, checkout, conversion rates, cart abandonment, products, shipping, fulfillment

Typical intent pattern:
- conversion lift
- merchandising or journey optimization
- upsell pathways

### 3.7 Healthcare
Signals:
- mentions patient experience, compliance, scheduling, records, clinical workflows, privacy

Typical intent pattern:
- trust-sensitive evaluation
- high-compliance expectations
- process-oriented recommendations

### 3.8 Legal
Signals:
- mentions attorneys, cases, legal ops, compliance, documents, intake, billing, client onboarding

Typical intent pattern:
- trust-heavy evaluation
- clarity in process and compliance

### 3.9 Manufacturing
Signals:
- mentions operations, supply chain, inventory, production, maintenance, plant, facilities, vendor management

Typical intent pattern:
- efficiency or operational performance
- more complex evaluation and rollout

## 4. Confidence Scoring Model

The engine should produce a confidence score in the range $0.0$ to $1.0$.

Suggested model:

$$
confidence = 0.45 \times intent\_match + 0.25 \times business\_context + 0.20 \times lexical\_evidence + 0.10 \times behavioral\_evidence
$$

Where:
- intent_match: how strongly the message matches the persona’s known intent patterns
- business_context: how strongly the business profile or page context supports the persona
- lexical_evidence: how many direct persona cues appear in the conversation
- behavioral_evidence: page visits, prior actions, time patterns, or repeated product interest

## 5. Persona Output Contract

The engine should return:
- primary persona
- secondary persona candidates
- confidence score
- evidence summary
- confidence threshold for safe recommendation

## 6. Persona Interaction Rules

- If confidence is high, tailor recommendations and CTA language directly.
- If confidence is low, avoid overfitting and ask one lightweight clarifier.
- If multiple personas are plausible, weigh the strongest commercial intent rather than the most literal keyword match.

## 7. Guardrails

- Do not force a persona classification when evidence is weak.
- Prefer a confidence threshold before making persona-sensitive recommendations.
- Keep persona inference human-readable for debugging and QA.
