# BurFlow Architecture Review

Status: Design review only. No implementation. No code changes.

## Review Summary

The planning documents are directionally consistent and share a clear product thesis:

BurFlow should evolve from a generic assistant into an AI Website Sales Intelligence platform that turns website content into grounded sales behavior.

The architecture is coherent at a high level, but it needs tighter definition around data ownership, evaluation, and the boundary between the conversion brain and the sales agent layer.

---

## 1. Missing Features

The current documents do not yet fully cover several important capabilities that would be required for a production-ready launch.

### Missing capabilities

1. Lead capture persistence
   - The documents mention lead capture, but they do not define how leads are stored, validated, or handed off.
   - This is a critical gap because lead capture is a core revenue action.

2. Human handoff workflow
   - The design mentions human handoff, but not the workflow, routing rules, escalation triggers, or ownership model.

3. Knowledge quality evaluation
   - The docs describe retrieval and grounding, but they do not define how answer quality, relevance, and hallucination risk will be measured.

4. Guardrails and safety controls
   - The first version needs clear rules for avoiding unsafe or misleading sales claims.

5. Feedback loop from conversations to knowledge improvement
   - The system should learn from failed conversations and missed intents, but this is not fully specified.

6. Content confidence scoring and trust calibration
   - The scanner and knowledge engine need a model for stating how confident the system is in a piece of extracted information.

7. Tenant-level knowledge governance
   - The docs mention tenant isolation, but not who can approve, override, or update extracted knowledge.

8. Multi-language and localization support
   - The scanner and conversion brain should eventually support multilingual websites, but this is not yet planned.

9. Analytics event schema definition
   - The analytics plan is present, but the actual event contract and metric definitions are not yet formalized.

10. Fallback and recovery behavior
   - The system needs defined behavior when the scanner fails, retrieval returns weak results, or the conversion brain has low confidence.

---

## 2. Duplicate Features

Several systems overlap and should be merged into a smaller set of implementation units to reduce duplication and complexity.

### Overlapping systems to merge

1. Website Scanner + Knowledge Engine ingestion path
   - The scanner and knowledge engine both handle content intake, normalization, and persistence.
   - These should be treated as one ingestion pipeline with a shared contract.

2. Conversion Brain + AI Sales Agent
   - The current documents split decision-making and orchestration across two layers.
   - In practice, these should be combined into one decision orchestration flow with clear responsibilities:
     - conversion brain: interpret signals and choose intent/action
     - sales agent: execute the chosen response and next step
   - They should not be implemented as two fully separate competing engines.

3. Knowledge retrieval + response generation
   - The system should not treat retrieval and answer generation as independent silos.
   - They should be linked through a single grounded-response pipeline.

4. Analytics + telemetry + conversion insights
   - Analytics, CTA telemetry, and conversion insights are related and should share a common event model.

5. Widget configuration + visitor experience state
   - Widget configuration and runtime state handling should be unified so the widget does not carry separate logic paths for the same concepts.

---

## 3. Architecture Risks

The current design is strong conceptually, but several implementation choices would create technical debt if followed as-is.

### Key risks

1. Overloading the conversation orchestrator
   - If the orchestrator takes on scanning, retrieval, memory, analytics, lead capture, and response construction all at once, it will become brittle.
   - This should be split into smaller services or modules with clear contracts.

2. Weak separation between product logic and platform logic
   - The documents increasingly describe revenue behavior, but the architecture still needs clear boundaries between:
     - ingestion
     - reasoning
     - orchestration
     - storage
     - telemetry

3. Risk of a monolithic “smart assistant” implementation
   - The current vision is powerful, but a single large engine would make testing, rollback, and iteration harder.
   - The design should favor adapter-based, feature-flagged modules.

4. Unclear evaluation before launch
   - If the system is shipped without a benchmark suite covering grounding quality, conversion behavior, and handoff quality, it will be hard to improve.

5. Excessive scope for V1
   - The current documents include many capabilities that are valuable but not essential for initial launch.
   - Implementing too much too early will delay the core product.

6. Potential mismatch between product positioning and implementation depth
   - If the system is designed as a general chatbot with an added widget, it will not deliver the differentiated experience the documents promise.
   - The architecture must stay focused on website intelligence and conversion behavior.

7. Knowledge freshness and source trust are under-defined
   - Website scanning will only be valuable if the system knows when content is stale, which sources are authoritative, and how much confidence to assign to each item.

---

## 4. Recommended Product Vision

BurFlow should be positioned as:

An AI Website Sales Intelligence Platform that turns a business’s website into a grounded, revenue-oriented sales agent.

It should help businesses:

- understand their own offers and positioning,
- respond to visitors with grounded recommendations,
- qualify leads in real time,
- capture interest with low-friction next steps,
- and escalate to humans when the opportunity is strong enough to justify it.

### What BurFlow is

BurFlow is not a chatbot.

BurFlow is a revenue intelligence layer for websites.

It combines:

- website scanning,
- knowledge grounding,
- conversion reasoning,
- sales-oriented conversation behavior,
- and embedded deployment.

---

## 5. Core Competitive Advantages

### Ranked differentiators

1. Business Intelligence Scanner
   - The ability to turn a website into structured business knowledge is BurFlow’s clearest moat.

2. Conversion Brain
   - The system’s ability to interpret intent, funnel stage, objections, and urgency gives it a strong business-value advantage over generic assistants.

3. AI Website Sales Agent
   - BurFlow is not just answering questions; it is helping the business move visitors toward action.

4. Continuous Website Sync
   - Keeping the knowledge base fresh over time makes the system more useful and more durable than a static setup.

5. Retrieval Knowledge Engine
   - Grounding responses in verified site content improves trust, accuracy, and business relevance.

---

## 6. MVP Definition

### Version 1 features

The following are the only features required for Version 1:

- Initial website scan
- Basic knowledge ingestion and parsing
- Basic retrieval-based answer generation
- Buying intent detection
- Funnel stage detection
- Objection recognition
- CTA selection
- Basic lead capture
- Basic human handoff recommendation
- Embedded sales widget
- Minimal conversion telemetry

### Post-MVP

The following should be marked Post-MVP:

- Daily sync
- Incremental scan optimization
- Advanced change detection
- Brand tone extraction
- Advanced localization
- Upsell and cross-sell logic beyond basic heuristics
- Advanced knowledge management dashboard
- Billing and subscription management
- Teams and role management
- Full admin experience
- Enterprise governance features
- Proposal and invoice workflows

---

## 7. Final Migration Order

### Recommended implementation sequence

| Step | Feature | Source location | Target location | Dependencies | Estimated complexity | Risk level |
|---|---|---|---|---|---|---|
| 1 | Website Scanner foundation | D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\knowledge.ts | engine/packages/stage-1-ingestion/ | Tenant context, URL validation, ingestion queue, content persistence | Medium | Medium |
| 2 | Knowledge Engine core | D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\knowledge-pipeline\src\pipeline.ts | engine/packages/knowledge-pipeline/ | Parsers, chunking, embeddings, vector store, tenant storage | Medium | Medium |
| 3 | Retrieval grounding and memory | D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\knowledge-pipeline\src\retrieval/ and session-store concepts | engine/packages/knowledge-pipeline/ and engine/packages/session-store/ | Knowledge engine, conversation state, tenant context | Medium | Medium |
| 4 | Conversion Brain signals | D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\conversation-brain.ts | engine/packages/conversation-orchestrator/ | Session memory, intent signals, knowledge context, funnel rules | High | High |
| 5 | Sales Agent orchestration | D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\orchestrator.ts | engine/packages/pipeline-orchestrator/ and engine/packages/conversation-orchestrator/ | Conversion brain, retrieval, memory, response policy | High | High |
| 6 | Lead capture and handoff | D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\types.ts and related orchestration logic | engine/packages/pipeline-orchestrator/ | Conversion signals, tenant context, response policy | Medium | Medium |
| 7 | Widget delivery | D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\widget\src\index.ts | engine/packages/widget/ | Token auth, config delivery, embed contract | Medium | Medium |
| 8 | Conversion analytics | D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\button-telemetry.ts and admin route patterns | engine/packages/conversation-orchestrator/ and engine/packages/saas-api/ | Event model, persistence, session context | Medium | Low to Medium |

### Implementation rule

Do not begin implementation until this sequence is approved and the MVP definition is locked.

---

## 8. Production Readiness

These readiness estimates are directional and based on the current planning state.

- Backend readiness: 72%
- Frontend readiness: 48%
- AI readiness: 68%
- Product readiness: 60%
- Overall readiness: 62%

### Readiness interpretation

The architecture is reasonably strong at the engine level, but it is not yet fully ready for production because:

- evaluation and guardrails are not fully specified,
- lead capture and handoff workflows are under-defined,
- and the product story needs to be sharpened around revenue outcomes rather than generic assistant behavior.
