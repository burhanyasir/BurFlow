# BurFlow Feature Inventory

This inventory audits the worktree at D:\Proj Chatbot.worktrees and lists features that could benefit BurFlow. The focus is on engine-level capabilities that directly support revenue generation for BurFlow customers.

## Evaluation Rule

Every recommended feature must answer this question:

"Will this directly help BurFlow customers generate more revenue?"

If the answer is no, the feature is marked as Postpone.

---

## Website Scanner

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Website crawl ingestion | Crawl a website and ingest public content into the knowledge system | High | URL validation, parser pipeline, tenant context | Present in worktree | Yes | P0 | Medium | stage-1-ingestion | Core for website-scan-first onboarding |
| Initial site scan | Extract key content from a homepage and linked pages | High | Crawl logic, content parser, normalization | Present in worktree | Yes | P0 | Medium | stage-1-ingestion | High value for first-time onboarding |
| Incremental re-scan | Re-ingest changed pages without reloading everything | High | Change detection, queueing, storage | Partial | Yes | P1 | Medium | stage-1-ingestion | Useful for continuously updated sites |
| Daily sync | Periodically refresh site knowledge | Medium | Scheduler, change detection, ingest pipeline | Partial | Yes | P1 | Medium | stage-1-ingestion | Good for sustained freshness |
| Manual re-scan | Allow users to trigger a re-scan | Medium | Ingestion queue, UI trigger | Partial | Yes | P1 | Small | stage-1-ingestion | Useful for operator control |
| Change detection | Detect which pages changed since the last scan | Medium | Crawl hash, page diffing | Partial | Yes | P1 | Medium | stage-1-ingestion | Helps reduce duplicate processing |
| Brand tone extraction | Infer tone and voice from website copy | Medium | NLP or heuristic parser | Partial | Yes | P2 | Medium | knowledge-pipeline | Useful for persona alignment |
| CTA extraction | Detect primary call-to-action copy and patterns | High | Site parsing, heuristics | Partial | Yes | P1 | Medium | knowledge-pipeline | Very relevant for conversion targeting |
| Location and language extraction | Detect geography and language preferences | Medium | Heuristics, content parsing | Partial | Yes | P2 | Small | knowledge-pipeline | Helpful for localization |

---

## Knowledge Engine

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Document parser pipeline | Parse text, markdown, HTML, FAQ, PDF, DOCX | High | Parsers, normalization | Present in worktree | Yes | P0 | Medium | knowledge-pipeline | Foundation for all knowledge intake |
| Chunking and normalization | Split content into retrievable chunks | High | Chunking strategy, metadata | Present in worktree | Yes | P0 | Medium | knowledge-pipeline | Necessary for relevant retrieval |
| Embedding pipeline | Generate embeddings for semantic retrieval | High | Embedder provider, vector store | Present in worktree | Yes | P0 | Medium | knowledge-pipeline | Critical for high-quality answers |
| Vector store | Store and retrieve chunks by similarity | High | DB or vector backend | Present in worktree | Yes | P0 | Medium | knowledge-pipeline | Core retrieval engine |
| Knowledge publishing and versioning | Publish knowledge snapshots and versions | Medium | Storage, metadata | Present in worktree | Yes | P1 | Medium | knowledge-pipeline | Helps maintain consistency |
| Retrieval router | Route queries to relevant knowledge pathways | High | Intent classifier, query routing | Present in worktree | Yes | P1 | Medium | conversation-orchestrator | Supports better answer quality |
| Knowledge source management | Track source documents and their status | Medium | Queue and persistence | Present in worktree | Yes | P1 | Small | knowledge-pipeline | Good for operations |

---

## Conversion Brain

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Buying intent detection | Detect if a visitor is likely to buy | High | Message analysis, session context | Present in worktree | Yes | P0 | Medium | conversation-orchestrator | Directly tied to revenue potential |
| Visitor persona detection | Estimate whether the visitor is a consumer, SMB, or enterprise account | High | Conversation history, message cues | Present in worktree | Yes | P0 | Medium | conversation-orchestrator | Helps tailor the experience |
| Funnel stage detection | Determine whether the visitor is in discovery, evaluation, or decision | High | Session state, visitor signals | Present in worktree | Yes | P0 | Medium | conversation-orchestrator | Critical for timing offers |
| Objection handling | Recognize objections and reply helpfully | High | Conversation state, knowledge retrieval | Present in worktree | Yes | P0 | Medium | conversation-orchestrator | Helps keep leads moving |
| Qualification engine | Ask relevant qualification questions | High | Visitor context, business rules | Present in worktree | Yes | P0 | Medium | conversation-orchestrator | Useful for lead capture |
| CTA selection | Choose the best next action for the visitor | High | Funnel stage, intent, persona | Present in worktree | Yes | P0 | Medium | conversation-orchestrator | Directly supports conversion |
| Confidence scoring | Score how sure the system is before acting | High | Signals and heuristics | Partial | Yes | P1 | Small | conversation-orchestrator | Helps avoid premature handoff |
| Lead scoring | Estimate potential value of a lead | Medium | Qualification, intent, engagement | Partial | Yes | P1 | Medium | conversation-orchestrator | Useful for sales prioritization |
| Human handoff recommendation | Recommend handoff if confidence is low or urgency is high | High | Signals and escalation rules | Partial | Yes | P1 | Medium | conversation-orchestrator | Important for high-value leads |

---

## AI Sales Agent

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Sales-oriented orchestration | Combine retrieval, intent, and CTA logic into a coherent response flow | High | Conversion brain, retrieval, memory | Present in worktree | Yes | P0 | Medium | pipeline-orchestrator | This is the core revenue-driving layer |
| Product recommendation | Recommend the right product or plan based on context | High | Knowledge and intent signals | Partial | Yes | P0 | Medium | conversation-orchestrator | Strong growth impact |
| Service recommendation | Recommend the best service offering | High | Knowledge base, visitor signals | Partial | Yes | P0 | Medium | conversation-orchestrator | Helpful for service businesses |
| Upsell and cross-sell | Offer complementary products or services | High | Intent, product catalog, context | Partial | Yes | P1 | Medium | conversation-orchestrator | Good monetization lever |
| Lead capture workflow | Collect contact details or next-step information | High | Conversation state, form integration | Partial | Yes | P0 | Medium | pipeline-orchestrator | Direct revenue-enablement path |
| Conversation memory | Maintain continuity across turns | High | Session store, memory model | Present in worktree | Yes | P1 | Small | session-store | Important for sales conversations |

---

## Widget

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Embedded sales widget | Deliver the AI sales agent on third-party websites | High | Widget runtime, token auth, config | Present in worktree | Yes | P0 | Medium | widget | Core product delivery path |
| Widget token auth | Secure widget access per tenant | Medium | Token generation and verification | Present in worktree | Yes | P1 | Small | widget | Important for deployment safety |
| Widget configuration endpoint | Supply branding and behavior settings to the widget | Medium | Config store, tenant context | Present in worktree | Yes | P1 | Small | widget | Supports reusability |
| Snippet generation | Generate install code for clients | Medium | Config and tenant metadata | Present in worktree | Yes | P1 | Small | widget | Useful for onboarding |

---

## Dashboard

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Knowledge manager dashboard | Show scanned sources and knowledge status | Medium | Knowledge pipeline, storage | Partial | No | P2 | Medium | dashboard | Useful but not core to revenue |
| Session dashboard | Review conversations and outcomes | Medium | Conversation storage | Partial | No | P2 | Medium | dashboard | Valuable later, not required for initial migration |
| Conversion insights dashboard | Show leads and conversion trends | High | Analytics, lead capture | Partial | Yes | P1 | Medium | dashboard | Useful if analytics are present |

---

## Analytics

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Conversation telemetry | Track how conversations progress | High | Conversation events, session store | Present in worktree | Yes | P1 | Medium | conversation-orchestrator | Helps optimize conversion behavior |
| Button and CTA telemetry | Measure which offers perform best | High | UI event pipeline | Present in worktree | Yes | P1 | Small | conversation-orchestrator | Strong for revenue optimization |
| Lead and conversion analytics | Measure lead capture, handoff, and bookable intent | High | Session state, lead capture events | Partial | Yes | P1 | Medium | analytics | Directly tied to growth |
| Usage metrics | Measure volume and adoption | Medium | Usage tracking | Present in worktree | No | P2 | Small | analytics | Useful but secondary |

---

## Billing

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Plan catalog | Show pricing options and plan features | Medium | Billing service | Present in worktree | No | P2 | Small | billing | Not engine-level |
| Checkout flow | Handle purchase of paid plans | Medium | Billing provider integration | Present in worktree | No | P2 | Medium | billing | Important commercially, but not core to engine migration |
| Subscription management | Manage renewal and changes | Medium | Billing provider | Present in worktree | No | P2 | Medium | billing | Postpone |

---

## Teams

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Team membership and access | Allow multiple users to work on one tenant | Medium | Auth, tenant model | Present in worktree | No | P3 | Medium | teams | Useful later, not engine-critical |
| Role-based permissions | Control who can configure or manage knowledge | Medium | Auth and tenant policies | Present in worktree | No | P3 | Medium | teams | Postpone |

---

## Admin

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Admin overview | Summarize tenant usage and health | Medium | Usage, analytics, conversation repos | Present in worktree | No | P3 | Medium | admin | Not engine-level |
| Document retry and deletion | Manage failed or obsolete documents | Medium | Knowledge queue, storage | Present in worktree | No | P3 | Small | admin | Operational support only |
| Session inspection | Review conversations for debugging | Medium | Conversation and message repos | Present in worktree | No | P3 | Medium | admin | Useful but not revenue-driving |

---

## Other

| Feature Name | Purpose | Business Value | Dependencies | Current Status | Should Migrate | Priority | Estimated Effort | Target Module | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Agency onboarding flow | Guide setup for clients and tenants | Medium | Onboarding repo, demo data | Present in worktree | No | P2 | Medium | onboarding | Helpful but should be deferred until core engine is stable |
| Proposal and invoice workflow | Create sales-facing deliverables | Low | Agency workflow, billing | Present in worktree | No | P3 | Large | other | Not a direct engine capability |
| Deployment workflow | Help roll out the widget to production | Low | Config and deployment tooling | Partial | No | P3 | Medium | other | Postpone |

---

## Summary Recommendation

The following capabilities should be prioritized for BurFlow migration because they most directly help customers generate revenue:

1. Website scanner ingestion and re-scan capability
2. Knowledge engine parsing, chunking, retrieval, and vector storage
3. Conversion brain signals for buying intent, funnel stage, objections, qualification, and CTA selection
4. Sales agent orchestration for recommendations, lead capture, and handoff
5. Widget delivery and telemetry
6. Analytics focused on conversion and lead progression

Everything else should be deferred or postponed until these engines are validated in production-like conditions.
