# BurFlow Implementation Backlog

Status: Planning only. No implementation. No code changes.

This backlog is derived from the source-of-truth planning documents and is limited to the features that should be built for BurFlow.

---

## Milestone 1 — MVP

### 1. BurFlow Branding
- Feature Name: BurFlow Branding
- Business Goal: Establish a clear product identity that positions BurFlow as an AI Website Sales Agent rather than a generic chatbot.
- Customer Value: Improves trust, product clarity, and conversion at the first customer touchpoint.
- Priority: P0
- Dependencies: Public marketing and product surfaces, copy system, theme configuration
- Source Module: frontend/src/pages/landing, frontend/src/config/landing-content, frontend/src/layouts/PublicLayout
- Target Module: frontend/src/pages/landing, frontend/src/config/landing-content, frontend/src/layouts/PublicLayout
- Estimated Hours: 16
- Risk: Low
- Acceptance Criteria:
  - BurFlow branding is visible across public marketing and product surfaces.
  - Messaging consistently describes BurFlow as an AI Website Sales Agent.
  - Existing frontend structure remains intact and unchanged.
- Testing Strategy:
  - Visual regression review of public pages and marketing content.
  - Content sanity checks for brand consistency.
- Rollback Strategy:
  - Revert to the prior branding copy and layout configuration if the rebrand creates confusion or regressions.

### 2. Website Scanner
- Feature Name: Website Scanner
- Business Goal: Turn a customer website into structured business knowledge for the AI agent.
- Customer Value: Enables the product to understand a business’s offers, services, pricing, FAQs, and positioning.
- Priority: P0
- Dependencies: Ingestion pipeline, URL validation, content parsing, knowledge persistence
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\knowledge.ts
- Target Module: engine/packages/stage-1-ingestion/, engine/packages/knowledge-pipeline/
- Estimated Hours: 80
- Risk: High
- Acceptance Criteria:
  - A website can be scanned successfully from a provided URL.
  - Core page content is ingested into the knowledge system.
  - The scanner produces structured output for downstream use.
- Testing Strategy:
  - Unit tests for crawl configuration and validation.
  - Integration tests for ingestion and content normalization.
  - End-to-end smoke tests for a representative website.
- Rollback Strategy:
  - Keep manual knowledge ingestion available as a fallback path and disable the scanner behind a feature flag if quality is poor.

### 3. Business Intelligence Scanner
- Feature Name: Business Intelligence Scanner
- Business Goal: Extract revenue-relevant business context from the website beyond simple FAQ content.
- Customer Value: Gives the AI agent a grounded understanding of products, services, pricing, audience, tone, and conversion paths.
- Priority: P0
- Dependencies: Website Scanner, document parsing, normalization, knowledge model
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\knowledge-pipeline\src\parsers
- Target Module: engine/packages/knowledge-pipeline/
- Estimated Hours: 72
- Risk: High
- Acceptance Criteria:
  - Products, services, FAQs, pricing, and related business information are extracted.
  - The extracted data is available to the knowledge engine in a normalized structure.
  - The output is useful for downstream sales conversations.
- Testing Strategy:
  - Unit tests for extraction rules and normalization.
  - Integration tests with representative websites.
  - Quality review against known business pages.
- Rollback Strategy:
  - Disable advanced extraction if accuracy is too low and fall back to the base scanner output.

### 4. Knowledge Engine
- Feature Name: Knowledge Engine
- Business Goal: Store, retrieve, and ground responses in website-derived knowledge.
- Customer Value: Enables accurate and relevant recommendations instead of generic answers.
- Priority: P0
- Dependencies: Parsers, chunking, embeddings, vector store, tenant-aware persistence
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\knowledge-pipeline\src\pipeline.ts
- Target Module: engine/packages/knowledge-pipeline/
- Estimated Hours: 96
- Risk: High
- Acceptance Criteria:
  - Content is chunked and indexed for retrieval.
  - Queries return grounded and relevant context.
  - The system can serve knowledge to the conversion layer.
- Testing Strategy:
  - Unit tests for chunking and indexing behavior.
  - Integration tests for retrieval quality.
  - Regression tests for duplicate and stale content.
- Rollback Strategy:
  - Keep the previous retrieval path available and switch back if the new engine produces poor results.

### 5. Conversion Brain
- Feature Name: Conversion Brain
- Business Goal: Determine the visitor’s intent, funnel stage, objections, and the best next action.
- Customer Value: Helps the assistant steer visitors toward action rather than only answering questions.
- Priority: P0
- Dependencies: Session memory, knowledge retrieval, signal analysis, conversation state
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\conversation-brain.ts
- Target Module: engine/packages/conversation-orchestrator/
- Estimated Hours: 120
- Risk: High
- Acceptance Criteria:
  - The system can classify buying intent and funnel stage.
  - Objections and qualification signals are recognized.
  - The engine produces a structured next-best action.
- Testing Strategy:
  - Unit tests for signal classification.
  - Conversation scenario tests for objections and qualification.
  - Regression tests for fallback behavior.
- Rollback Strategy:
  - Keep the legacy conversation flow as a fallback and disable the new conversion logic behind a feature flag.

### 6. AI Website Sales Agent
- Feature Name: AI Website Sales Agent
- Business Goal: Orchestrate knowledge, conversion signals, and response generation into a sales-oriented assistant.
- Customer Value: Gives visitors a useful, revenue-focused interaction rather than a generic chatbot experience.
- Priority: P0
- Dependencies: Conversion Brain, Knowledge Engine, session memory, response policy
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\orchestrator.ts
- Target Module: engine/packages/pipeline-orchestrator/, engine/packages/conversation-orchestrator/
- Estimated Hours: 96
- Risk: High
- Acceptance Criteria:
  - The assistant produces grounded sales-oriented responses.
  - It can recommend a relevant product or service and suggest a CTA.
  - It can support lead capture and human handoff rules.
- Testing Strategy:
  - End-to-end conversation tests for qualification and conversion scenarios.
  - Grounding and safety checks against retrieved knowledge.
  - Scenario-based regression tests.
- Rollback Strategy:
  - Route traffic to the legacy assistant path if the new agent underperforms or produces unsafe behavior.

### 7. Chat Widget
- Feature Name: Chat Widget
- Business Goal: Deliver the BurFlow sales agent on third-party websites.
- Customer Value: Enables deployment to real customer sites and provides the primary product experience surface.
- Priority: P0
- Dependencies: Widget runtime, configuration endpoint, token auth, embed contract
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\widget\src\index.ts
- Target Module: engine/packages/widget/
- Estimated Hours: 64
- Risk: Medium
- Acceptance Criteria:
  - The widget can be embedded on a test website.
  - It connects to the sales agent backend.
  - It renders a usable chat experience with branded appearance.
- Testing Strategy:
  - Unit tests for widget configuration and token handling.
  - Browser smoke tests for script loading and chat rendering.
- Rollback Strategy:
  - Disable the new widget script and revert to the prior embed path if runtime issues occur.

### 8. Widget Installation
- Feature Name: Widget Installation
- Business Goal: Provide a straightforward installation path for customers to add BurFlow to their website.
- Customer Value: Reduces deployment friction and improves time to value.
- Priority: P0
- Dependencies: Widget runtime, snippet generation, tenant config
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\widget\src\index.ts
- Target Module: engine/packages/widget/
- Estimated Hours: 32
- Risk: Medium
- Acceptance Criteria:
  - A customer can generate and use an install snippet.
  - The widget can be configured from the tenant context.
  - Installation instructions are clear and consistent.
- Testing Strategy:
  - Integration tests for snippet generation and configuration payloads.
  - Manual install verification on a test page.
- Rollback Strategy:
  - Keep the previous install process available while the new snippet is rolled out gradually.

### 9. Website Re-Scan
- Feature Name: Website Re-Scan
- Business Goal: Keep knowledge fresh by allowing the site to be re-scanned after content changes.
- Customer Value: Prevents stale information and improves trust in the assistant.
- Priority: P0
- Dependencies: Website Scanner, ingestion queue, change detection
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\knowledge.ts
- Target Module: engine/packages/stage-1-ingestion/, engine/packages/knowledge-pipeline/
- Estimated Hours: 40
- Risk: Medium
- Acceptance Criteria:
  - A customer can trigger a re-scan manually.
  - Updated content is reflected in the knowledge layer.
  - The system can avoid unnecessary reprocessing when content is unchanged.
- Testing Strategy:
  - Unit tests for re-scan triggers.
  - Integration tests for update and refresh behavior.
- Rollback Strategy:
  - Disable re-scan support and retain the existing static knowledge state if issues arise.

### 10. Dashboard
- Feature Name: Dashboard
- Business Goal: Give operators visibility into scans, knowledge health, conversations, and key outcomes.
- Customer Value: Makes the system usable and measurable for early adopters.
- Priority: P0
- Dependencies: Analytics, knowledge status, conversation state
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\admin.ts
- Target Module: frontend/src/pages/admin, engine/packages/saas-api/
- Estimated Hours: 64
- Risk: Medium
- Acceptance Criteria:
  - Key data such as scan status, knowledge health, and recent conversations are visible.
  - The dashboard helps the operator understand the current system state.
- Testing Strategy:
  - UI smoke tests for dashboard views.
  - Integration tests for data retrieval and rendering.
- Rollback Strategy:
  - Keep the dashboard behind a feature flag and remove it from the default experience if it causes instability.

### 11. Lead Capture
- Feature Name: Lead Capture
- Business Goal: Convert promising conversations into qualified leads.
- Customer Value: Directly supports revenue generation and customer follow-up.
- Priority: P0
- Dependencies: Conversion Brain, sales agent flow, session memory
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\orchestrator.ts
- Target Module: engine/packages/pipeline-orchestrator/
- Estimated Hours: 56
- Risk: Medium
- Acceptance Criteria:
  - The agent can request and store lead information in a structured way.
  - The captured data is associated with the correct session and tenant.
  - The experience remains lightweight and low-friction.
- Testing Strategy:
  - End-to-end tests for lead capture scenarios.
  - Validation tests for required fields and persistence.
- Rollback Strategy:
  - Disable lead capture prompts if they reduce conversation quality or create compliance issues.

### 12. Analytics
- Feature Name: Analytics
- Business Goal: Measure engagement, conversion signals, and agent effectiveness.
- Customer Value: Helps teams improve the assistant and prove its business impact.
- Priority: P0
- Dependencies: Telemetry events, session state, conversation logging
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\button-telemetry.ts
- Target Module: engine/packages/conversation-orchestrator/, engine/packages/saas-api/
- Estimated Hours: 48
- Risk: Medium
- Acceptance Criteria:
  - Core conversation and conversion events are recorded.
  - Metrics are available for dashboard review and future optimization.
- Testing Strategy:
  - Unit tests for event payloads.
  - Integration tests for analytics persistence.
- Rollback Strategy:
  - Disable telemetry emission if metrics become unreliable or too expensive to maintain.

---

## Milestone 2 — Commercial Readiness

### 13. Billing
- Feature Name: Billing
- Business Goal: Support plan-based monetization and subscription management.
- Customer Value: Enables the business to monetize the platform.
- Priority: P1
- Dependencies: Subscription model, tenant context, billing provider integration
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\billing.ts
- Target Module: engine/packages/saas-api/
- Estimated Hours: 64
- Risk: Medium
- Acceptance Criteria:
  - Plan information and checkout flows are available.
  - Subscription state can be managed for a tenant.
- Testing Strategy:
  - Unit tests for plan validation and billing actions.
  - Integration tests for checkout flow and subscription state changes.
- Rollback Strategy:
  - Disable billing flows if external provider behavior is unstable and keep the product in a free trial mode.

### 14. Subscriptions
- Feature Name: Subscriptions
- Business Goal: Track and manage recurring revenue for customer accounts.
- Customer Value: Supports predictable revenue and account lifecycle management.
- Priority: P1
- Dependencies: Billing, tenant repository, subscription repository
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\billing.ts
- Target Module: engine/packages/saas-api/
- Estimated Hours: 40
- Risk: Medium
- Acceptance Criteria:
  - Subscription status can be viewed and updated.
  - Renewal and cancellation flows are represented in the system.
- Testing Strategy:
  - Unit and integration tests for plan change and cancellation actions.
- Rollback Strategy:
  - Keep the product usable without billing enforcement if subscription updates fail.

### 15. Teams
- Feature Name: Teams
- Business Goal: Allow multiple users to collaborate within one BurFlow tenant.
- Customer Value: Improves customer adoption for businesses with multiple stakeholders.
- Priority: P1
- Dependencies: Tenant model, permissions, authentication context
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\team.ts
- Target Module: engine/packages/saas-api/
- Estimated Hours: 48
- Risk: Medium
- Acceptance Criteria:
  - Multiple users can be associated with a tenant.
  - Basic ownership and access roles are represented.
- Testing Strategy:
  - Unit tests for role assignment and validation.
  - Integration tests for tenant access behavior.
- Rollback Strategy:
  - Restrict team management to single-owner mode if collaboration logic creates issues.

### 16. API Keys
- Feature Name: API Keys
- Business Goal: Give customers and developers programmatic access to BurFlow capabilities.
- Customer Value: Expands integrations and enables platform use cases.
- Priority: P1
- Dependencies: Tenant context, permission model, key management
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\api-keys.ts
- Target Module: engine/packages/saas-api/
- Estimated Hours: 32
- Risk: Medium
- Acceptance Criteria:
  - API keys can be created and rotated.
  - Access is scoped to the appropriate tenant.
- Testing Strategy:
  - Unit tests for key generation and validation.
  - Integration tests for access control.
- Rollback Strategy:
  - Disable API access if key management proves unstable.

### 17. Admin
- Feature Name: Admin
- Business Goal: Give internal operators visibility into tenant health and system operation.
- Customer Value: Improves support, troubleshooting, and operational oversight.
- Priority: P1
- Dependencies: Analytics, tenant state, admin route logic
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\admin.ts
- Target Module: engine/packages/saas-api/
- Estimated Hours: 48
- Risk: Medium
- Acceptance Criteria:
  - Admin users can review tenant-level overview and relevant operational data.
  - Basic support workflows are available.
- Testing Strategy:
  - Integration tests for admin access and route behavior.
- Rollback Strategy:
  - Keep admin access limited if operational routes become unstable.

---

## Milestone 3 — Expansion

### 18. Enterprise
- Feature Name: Enterprise
- Business Goal: Support larger organizations with more control, scale, and governance.
- Customer Value: Opens the product to higher-value accounts and larger deployments.
- Priority: P2
- Dependencies: Teams, Admin, API, analytics, security controls
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\saas-api\src\routes\admin.ts
- Target Module: engine/packages/saas-api/
- Estimated Hours: 80
- Risk: High
- Acceptance Criteria:
  - Enterprise-specific deployment and governance requirements are represented in the design.
  - The system supports the needs of larger organizations without breaking core flows.
- Testing Strategy:
  - Scenario-based validation of enterprise-specific requirements.
- Rollback Strategy:
  - Keep enterprise capabilities disabled unless explicitly required.

### 19. Agency
- Feature Name: Agency
- Business Goal: Support agency-style client setup and multi-client operations.
- Customer Value: Expands BurFlow into agency workflows and partner-led deployments.
- Priority: P2
- Dependencies: Onboarding, tenant management, dashboard workflows
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\docs\client-onboarding-guide.md
- Target Module: engine/packages/tenant-onboarding/
- Estimated Hours: 64
- Risk: Medium
- Acceptance Criteria:
  - Agency onboarding steps are represented in the platform design.
  - Multi-client setup can be supported without changing the core engine.
- Testing Strategy:
  - Workflow and process validation for agency-style onboarding.
- Rollback Strategy:
  - Keep the feature isolated behind a separate configuration path if it creates unnecessary complexity.

### 20. White Label
- Feature Name: White Label
- Business Goal: Allow customers to deploy BurFlow under their own branding and experience.
- Customer Value: Improves customer adoption and premium positioning.
- Priority: P2
- Dependencies: Branding, widget configuration, tenant settings
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\widget\src\index.ts
- Target Module: engine/packages/widget/
- Estimated Hours: 48
- Risk: Medium
- Acceptance Criteria:
  - Branding and appearance can be customized per tenant.
  - White-label behavior is supported without altering the core engine.
- Testing Strategy:
  - Configuration and rendering tests for branded experiences.
- Rollback Strategy:
  - Disable white-label customization if it introduces instability.

### 21. Advanced Analytics
- Feature Name: Advanced Analytics
- Business Goal: Provide deeper reporting on conversion performance and visitor behavior.
- Customer Value: Helps customers optimize campaigns and proves ROI.
- Priority: P2
- Dependencies: Analytics, conversion telemetry, dashboard
- Source Module: D:\Proj Chatbot.worktrees\dynamic-choice-engine-enhancements\engine\packages\conversation-orchestrator\src\button-telemetry.ts
- Target Module: engine/packages/conversation-orchestrator/, engine/packages/saas-api/
- Estimated Hours: 56
- Risk: Medium
- Acceptance Criteria:
  - Trend and performance insights are available beyond basic event capture.
  - Advanced reporting is usable without breaking the core analytics layer.
- Testing Strategy:
  - Aggregation and reporting tests.
- Rollback Strategy:
  - Keep advanced analytics optional and disable it if it causes performance issues.

---

## Summary

The backlog is intentionally constrained to the features required to launch BurFlow and the next layers of operational and expansion readiness.

No coding, migration, or frontend/backend modification is included in this document.

Approval is required before any implementation begins.
