# Implementation Sequence — CP1.5

**Date:** 2026-07-21
**Status:** Planning (pre-implementation)
**Purpose:** Define the safest and most efficient order to build the customer product

---

## 1. Executive Summary

### Implementation Strategy

The customer product is built in **8 implementation phases** (CP2–CP9), preceded by a **design phase** (CP1.5b) executed by Claude.

The ordering follows one rule: **a page is built only after every API it needs is deployed and tested.** This prevents the most common failure mode in SaaS products — frontend blocking on missing backend endpoints.

### Why This Order Minimizes Risk

| Risk | Mitigation |
|------|-----------|
| Frontend blocks on missing API | All APIs for a phase are built and tested in the **previous** phase |
| Auth gaps block all authenticated pages | Authentication (APIs + frontend) is Phase CP2 — first implementation work |
| Widget breaks on customer site | Widget JS is built as a standalone deliverable after all chat APIs are stable |
| Launch delay from untested billing | Billing is self-contained (Stripe integration), built early enough to test payment flows |
| Rework from accessibility gaps | WCAG work is continuous from CP2, not left to the end |
| Knowledge pipeline stalls on document format issues | Knowledge upload + processing tested in CP5 before widget is built in CP6 |

### Dependency Chain

```
Claude Design (CP1.5b)
    │
    ▼
CP2: Authentication ───────────────────────────────────────────────────┐
    │                                                                  │
    ▼                                                                  │
CP3: Public Website ──────────────────────────────────────────────────┤│
    │                                                                  ││
    ▼                                                                  ││
CP4: Customer Dashboard ──────────────────────────────────────────────┤││
    │                                                                  │││
    ▼                                                                  │││
CP5: Knowledge UX ────────────────────────────────────────────────────┤│││
    │                                                                  ││││
    ▼                                                                  ││││
CP6: Widget UX ───────────────────────────────────────────────────────┤││││
    │                                                                  │││││
    ▼                                                                  │││││
CP7: Billing ─────────────────────────────────────────────────────────┤│││││
    │                                                                  ││││││
    ▼                                                                  ││││││
CP8: Analytics ───────────────────────────────────────────────────────┤││││││
    │                                                                  │││││││
    ▼                                                                  │││││││
CP9: Launch Preparation ──────────────────────────────────────────────┘│││││││
                                                                       ▼▼▼▼▼▼▼
                                                          Every phase validates that
                                                          the chain behind it still holds
```

---

## 2. Dependency Graph

### Full Dependency Graph

```
CP1.5b: Product Design (Claude)
  Branding, copy, wireframes, design tokens — consumed by ALL frontend phases
        │
        ▼
CP2 ─── CP3 ─── CP4 ─── CP5 ─── CP6 ─── CP7 ─── CP8 ─── CP9
│       │       │       │       │       │       │       │
│       │       │       │       │       │       │       └── WCAG audit
│       │       │       │       │       │       │       └── Load test
│       │       │       │       │       │       │       └── Production deployment
│       │       │       │       │       │       │       └── Monitoring
│       │       │       │       │       │       │
│       │       │       │       │       │       └── Analytics API
│       │       │       │       │       │       └── Usage data pipeline
│       │       │       │       │       │       └── Charts library
│       │       │       │       │       │
│       │       │       │       │       └── Stripe integration
│       │       │       │       │       └── Billing API
│       │       │       │       │       └── Plan enforcement
│       │       │       │       │
│       │       │       │       └── Widget config API
│       │       │       │       └── Widget JS (standalone)
│       │       │       │       └── Domain verification
│       │       │       │       └── Conversations API (existing)
│       │       │       │
│       │       │       └── Knowledge pipeline (existing)
│       │       │       └── Upload endpoints (existing)
│       │       │       └── Publish endpoints (existing)
│       │       │       └── Processing status (existing)
│       │       │
│       │       └── Session management
│       │       └── Usage API (existing)
│       │       └── Tenant API (existing)
│       │
│       └── Public pages: Landing, Features, Pricing, Docs, Legal
│       └── Auth pages: Signup, Login, Forgot/Reset Password, Verify
│       └── JWT cookie management
│
└── Auth APIs (forgot password, reset, verify)
└── Widget config API
└── Team management APIs
└── Billing APIs
└── Analytics aggregation APIs
```

### Dependency Table (All Pairs)

| Phase | Depends On | Reason |
|-------|-----------|--------|
| CP2 | CP1.5b | Auth page designs, microcopy for error messages |
| CP3 | CP1.5b | Landing page wireframes, marketing copy, pricing plan names |
| CP3 | CP2 | Signup/login forms reuse CP2's auth API integration |
| CP4 | CP3 | AppLayout reuses Navbar/Footer patterns from public site |
| CP4 | CP2 | Dashboard requires auth session |
| CP5 | CP4 | Knowledge pages share AppLayout and sidebar |
| CP6 | CP5 | Widget installer needs published knowledge to preview |
| CP6 | CP5 | Widget config API must be built (CP2 milestone) |
| CP6 | CP2 | Widget chat endpoint is existing CP2 infrastructure |
| CP7 | CP4 | Billing page shares AppLayout |
| CP7 | CP2 | Auth session required for billing |
| CP7 | CP1.5b | Plan names and prices from design phase |
| CP8 | CP7 | Analytics may show billing data (usage vs plan limits) |
| CP8 | CP4 | Analytics shares Dashboard chart infrastructure |
| CP8 | CP2 | Auth session required |
| CP9 | All | Full system must exist to polish and deploy |

### No Circular Dependencies

The graph is a directed acyclic graph (DAG). Every dependency flows forward. There are no cycles. If a cycle is discovered during implementation, it must be broken by:
- Extracting a shared dependency into an earlier phase
- Building a stub/mock for the forward reference

---

## 3. Phase Breakdown

### 3.1 Design Phase — CP1.5b

**Not part of implementation.** Executed by Claude as a separate engagement. Consumed by all implementation phases.

| Deliverable | Consumed By | Format |
|-------------|-------------|--------|
| Brand identity (logo, colors, typography) | CP3, CP4 | Design token file (CSS custom properties) |
| Landing page wireframes + hero concepts | CP3 | Wireframe screenshots + annotations |
| Features page layout + copy | CP3 | Wireframe + copy deck |
| Pricing page layout + plan names/prices | CP3, CP7 | Wireframe + pricing table |
| Documentation page layout | CP3 | Wireframe |
| Auth page layouts (signup, login, forgot/reset, verify) | CP3 | Wireframes |
| App layout (sidebar, top bar, workspace switcher) | CP4 | Wireframe |
| Dashboard page layout + stat cards | CP4 | Wireframe |
| Knowledge page layouts (list, detail, upload, publish) | CP5 | Wireframes |
| Widget preview + installer page design | CP6 | Wireframe |
| Conversation page layouts | CP6 | Wireframes |
| Team management page design | CP6 | Wireframe |
| Billing page layout + invoice design | CP7 | Wireframe |
| Analytics dashboard layout + chart types | CP8 | Wireframe |
| Marketing copy (all public pages) | CP3 | Copy deck (Google Doc) |
| UX microcopy (forms, errors, empty states) | All | Copy deck |
| Loading state designs (skeletons, spinners) | All | Visual specs |
| Error state designs (404, 403, 500, network) | All | Visual specs |
| Empty state illustrations | All | SVG assets |
| Mobile responsive adaptations | All | Breakpoint annotations |
| Accessibility notes per page | CP9 | Per-page annotation |

---

### 3.2 CP2 — Authentication (2 weeks)

**Goal:** Build all missing authentication backend APIs and their corresponding frontend pages. Every user must be able to sign up, log in, verify their email, reset their password, and manage their profile.

**Deliverables:**

| # | Item | Type | Backend/Frontend |
|---|------|------|-----------------|
| 1 | `POST /api/auth/forgot-password` | API | Backend |
| 2 | `POST /api/auth/reset-password/:token` | API | Backend |
| 3 | `GET /api/auth/verify-email/:token` | API | Backend |
| 4 | `POST /api/auth/resend-verification` | API | Backend |
| 5 | `POST /api/auth/refresh` | API | Backend |
| 6 | Email sender service (SMTP) | Service | Backend |
| 7 | Email templates (welcome, verify, reset, invite) | Service | Backend |
| 8 | Verification/reset token tables | Schema | Backend |
| 9 | Sign Up page | Page | Frontend |
| 10 | Login page | Page | Frontend |
| 11 | Forgot Password page | Page | Frontend |
| 12 | Reset Password page | Page | Frontend |
| 13 | Email Verification page | Page | Frontend |
| 14 | Profile page | Page | Frontend |
| 15 | JWT cookie management (set, refresh, clear) | Utility | Frontend |

**Dependencies:** CP1.5b (auth page wireframes, microcopy)
**Estimated effort:** 10 engineer-days
**Risks:**
- Token expiry edge cases (token expires between email send and click)
- Email delivery failures (SPF/DKIM not configured)
- Password hashing cost under load (bcrypt 12 rounds)

**Exit criteria:**
- All 5 new API endpoints return correct responses in integration tests
- Email delivery verified (welcome, verification, reset emails received)
- Full auth flow works end-to-end: signup → verify email → login → profile edit → password change → logout
- JWT refresh extends session correctly
- 401s redirect to login page
- All form validation works (empty fields, invalid email, weak password, mismatched passwords)
- Error states render correctly (network error, server error, rate limited)

---

### 3.3 CP3 — Public Website (2.5 weeks)

**Goal:** Build all public-facing pages including marketing content, documentation, legal pages, and the auth pages from CP2 integrated into the public layout.

**Deliverables:**

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | Frontend project setup (Vite + framework + routing) | Infrastructure | Consumes CP1.5b design tokens |
| 2 | PublicLayout (Navbar, Footer) | Layout | Responsive, accessible |
| 3 | Landing Page (Hero, FeatureGrid, TrustBar, Testimonials, FAQ, CTA) | Page | From CP1.5b wireframes |
| 4 | Features Page | Page | Alternating feature sections |
| 5 | Pricing Page (PricingCards, monthly/yearly toggle, FAQ) | Page | Plan names from CP1.5b |
| 6 | Documentation Pages (getting started, API ref, widget guide, FAQ) | Pages | Static, markdown-rendered |
| 7 | Legal Pages (Privacy, Terms, Cookies, DPA) | Pages | Static |
| 8 | Integrate CP2 auth pages into PublicLayout | Integration | Signup, Login, Forgot/Reset, Verify |
| 9 | SEO setup (meta tags, OG, sitemap, robots.txt, structured data) | Infrastructure | Required before any public traffic |
| 10 | Performance optimization (Lighthouse audit, lazy loading, fonts) | Infrastructure | Core Web Vitals |

**Dependencies:** CP1.5b (all wireframes, copy, brand identity), CP2 (auth page components)
**Estimated effort:** 13 engineer-days
**Risks:**
- SEO issues not caught until Google indexes
- Copy changes requested after implementation
- Lighthouse performance fails due to unused JS/CSS

**Exit criteria:**
- All 8 pages render correctly at all breakpoints (mobile, tablet, desktop)
- Lighthouse scores ≥ 90 for Performance, Accessibility, SEO, Best Practices
- Auth pages function correctly within PublicLayout
- Pricing page matches CP1.5b wireframes
- Documentation pages have correct content (proofread)
- Legal pages reviewed by legal counsel
- Sitemap.xml and robots.txt accessible
- Structured data validates (Schema.org Product, SoftwareApplication)

---

### 3.4 CP4 — Customer Dashboard (1.5 weeks)

**Goal:** Build the authenticated application shell and main dashboard. This is the post-login home that every user sees.

**Deliverables:**

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | AppLayout (Sidebar, TopBar, content slot) | Layout | Responsive (collapsible sidebar), workspace switcher |
| 2 | Breadcrumb component | Component | Auto-generated from route |
| 3 | Workspace switcher | Component | Dropdown, create new workspace |
| 4 | Dashboard page (StatCards, RecentConversations, QuickActions) | Page | Uses existing usage + conversations + knowledge APIs |
| 5 | Workspace Settings page (branding form, delete workspace) | Page | Uses existing tenant API |
| 6 | Upgrade Banner | Component | Shown on free plan, dismissible |
| 7 | Toast notification system | Component | Success, error, warning, info |

**Dependencies:** CP3 (AppLayout builds on PublicLayout patterns), CP2 (auth session), CP1.5b (dashboard wireframes)
**Estimated effort:** 8 engineer-days
**Risks:**
- Sidebar navigation patterns conflict with existing admin portal (separate app)
- Workspace switcher performance with many workspaces

**Exit criteria:**
- AppLayout renders correctly at all breakpoints
- Sidebar navigation works, collapses on mobile
- Workspace switcher loads and switches workspaces
- Dashboard shows real data from existing APIs (usage stats, recent conversations)
- Dashboard empty state renders when no data exists
- Workspace settings save correctly
- Danger zone (delete workspace) shows confirmation dialog
- Toast notifications appear and auto-dismiss
- All sidebar links navigate to correct routes (even if pages show "Coming Soon")

---

### 3.5 CP5 — Knowledge UX (3 weeks)

**Goal:** Build the complete knowledge management experience — creating knowledge bases, uploading documents, monitoring processing, and publishing the widget.

**Deliverables:**

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | Knowledge Bases list page | Page | KBTable, CreateKBModal, EmptyState |
| 2 | Knowledge Detail page | Page | DocumentTable, StatusBadges, stats |
| 3 | Upload modal (Files, URL, FAQ tabs) | Component | UploadZone, UrlCrawlInput, FaqEditor |
| 4 | Processing status polling | Utility | Poll source status, update UI |
| 5 | Knowledge search | Component | SearchBar, result list |
| 6 | Publish flow (Configure → Publish → Install) | Feature | PublishStepper, WidgetConfigPanel |
| 7 | Onboarding Wizard (5 steps, first-time user) | Feature | Stepper, BrandingForm, Upload, Processing, Install |
| 8 | Widget config panel (position, theme, auto-open, custom CSS) | Component | Reused in publish + onboarding |

**Dependencies:** CP4 (AppLayout, sidebar navigation), CP2 (auth session, team permissions for role checks), CP1.5b (knowledge wireframes)
**Estimated effort:** 15 engineer-days
**Risks:**
- Knowledge pipeline processing latency confuses users (async status polling)
- Large uploads (>5MB) hit size limit with unclear error message
- Crawl fails on JavaScript-heavy sites (document in FAQ)
- Publish version conflicts if two users publish simultaneously

**Exit criteria:**
- All knowledge CRUD operations work (create, read, delete KBs)
- Document upload works for all 5 source types (pdf, docx, text, url, faq)
- Upload progress bar displays correctly
- Processing status updates in real-time (polling)
- Knowledge search returns relevant results
- Publish creates new version and widget config updates
- Onboarding wizard saves progress and is resumable
- Error states for all failure modes (upload fail, pipeline fail, publish fail)
- Empty states for no KBs, no documents, no published version

---

### 3.6 CP6 — Widget UX (3 weeks)

**Goal:** Build the customer-facing chat widget, the widget installer experience, conversation browsing, and team management.

**Deliverables:**

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | Widget JS (standalone vanilla JS) | Deliverable | ~15KB gzipped, no framework |
| 2 | Widget config endpoint `GET /api/widget/:tenantId/config` | API | Returns branding + settings + API key |
| 3 | Widget Installer page (snippet, verify, test) | Page | SnippetDisplay, DomainVerificationInput, WidgetPreview |
| 4 | Domain verification (meta tag, DNS, file) | Feature | 3 methods, verification status |
| 5 | Conversations list page | Page | ConversationTable, SearchInput, Pagination |
| 6 | Conversation Detail page | Page | MessageList, InfoPanel |
| 7 | API Keys page | Page | ApiKeyTable, CreateApiKeyModal, KeyRevealDialog |
| 8 | Team management APIs (invite, accept, remove, role change) | APIs | Backend |
| 9 | Team Members page | Page | MemberTable, InviteMemberModal |

**Dependencies:** CP5 (published knowledge for widget preview, config API), CP2 (chat endpoint, auth), CP1.5b (widget installer wireframes)
**Estimated effort:** 18 engineer-days
**Risks:**
- Widget JS conflicts with customer site's existing JS (use Shadow DOM, scoped CSS)
- Widget doesn't render in iframe preview due to CORS/SameSite
- Domain verification is confusing for non-technical users
- Streaming chat responses have inconsistent behavior across browsers

**Exit criteria:**
- Widget JS loads on a clean HTML page with no errors
- Widget sends message and receives response via chat endpoint
- Widget respects theme, position, auto-open settings
- Widget JS passes Playwright cross-browser tests (Chrome, Firefox, Safari, Edge)
- Installer snippet copies correctly and is valid HTML
- Domain verification succeeds via at least one method
- Test message in installer receives correct response
- Conversations list paginates correctly
- Conversation detail shows full transcript with user/assistant formatting
- API keys can be created, viewed once, and revoked
- Team members can be invited, accept, removed

---

### 3.7 CP7 — Billing (2.5 weeks)

**Goal:** Integrate Stripe for subscription management. Build the billing page, plan change flow, and enforce usage limits.

**Deliverables:**

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | Stripe product/price configuration | Configuration | Products + prices in Stripe dashboard |
| 2 | `POST /api/billing/create-checkout-session` | API | Stripe Checkout Session creation |
| 3 | `POST /api/billing/create-portal-session` | API | Stripe Customer Portal session |
| 4 | `POST /api/billing/webhook` | API | Stripe event handler |
| 5 | `GET /api/billing/current` | API | Current subscription + usage summary |
| 6 | `GET /api/billing/invoices` | API | Invoice history |
| 7 | `GET /api/billing/plans` | API | Plan definitions with Stripe price IDs |
| 8 | Plan enforcement middleware | Middleware | Reject requests over plan limits |
| 9 | Usage cap integration (pipeline rate limit, upload rejection) | Feature | Hard enforcement at backend |
| 10 | Billing page (CurrentPlanCard, UsageMeter, PlanChangePanel, InvoiceTable) | Page | Frontend |

**Dependencies:** CP4 (AppLayout), CP2 (auth), CP1.5b (plan names, price points, billing page design)
**Estimated effort:** 14 engineer-days
**Risks:**
- Stripe webhook delivery failures (retry logic needed)
- Proration math is incorrect (edge cases in partial months)
- Plan enforcement gaps (some APIs bypass limit checks)
- Customer enters payment details but subscription activation webhook is delayed

**Exit criteria:**
- Stripe Checkout session creates correct subscription with trial
- Customer Portal returns session URL
- Webhook processes all 5 required event types
- Subscription status transitions correctly through lifecycle (trialing → active → past_due → cancelled → expired)
- Invoices sync and display correctly
- Plan enforcement blocks over-limit requests with appropriate error code
- Plan change (upgrade/downgrade) works end-to-end
- Cancellation flow ends subscription at period end
- Stripe webhook secret is validated on every request

---

### 3.8 CP8 — Analytics (2 weeks)

**Goal:** Build the analytics dashboard showing usage trends, conversation metrics, and plan utilization.

**Deliverables:**

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | `GET /api/analytics/messages/daily` | API | Daily message counts |
| 2 | `GET /api/analytics/conversations/daily` | API | Daily conversation counts |
| 3 | `GET /api/analytics/tokens/daily` | API | Daily token usage |
| 4 | Analytics dashboard page | Page | StatCards, UsageCharts, DateRangePicker |
| 5 | Message volume chart | Component | Line chart (daily messages) |
| 6 | Conversation trend chart | Component | Line chart (daily conversations) |
| 7 | Token usage chart | Component | Area chart (daily tokens) |
| 8 | Plan usage bar | Component | Usage vs limit, color-coded |
| 9 | Date range picker | Component | Presets + custom range |
| 10 | CSV export | Feature | Download analytics as CSV |

**Dependencies:** CP4 (AppLayout, dashboard pattern), CP7 (plan limit data for usage bars), CP2 (auth), CP1.5b (analytics wireframes)
**Estimated effort:** 10 engineer-days
**Risks:**
- SQLite aggregation queries are slow with large datasets (add indexes)
- Chart library choice causes bundle size increase
- Analytics data is uninteresting if customer has few conversations

**Exit criteria:**
- All 3 aggregation endpoints return correct data for seeded test data
- Charts render with correct data for selected date range
- Date range presets work (7d, 30d, 90d, custom)
- Plan usage bar shows correct percentages and colors
- Empty state renders when no data exists
- CSV export downloads correctly formatted file
- Analytics page loads within 3 seconds with 10K records

---

### 3.9 CP9 — Launch Preparation (2 weeks)

**Goal:** Polish, accessibility, production deployment, and launch verification.

**Deliverables:**

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | WCAG Level AA compliance pass | Audit | Full automated + manual audit |
| 2 | Keyboard navigation pass | Audit | Skip links, focus order, modal traps |
| 3 | Screen reader pass | Audit | Labels, ARIA, live regions |
| 4 | Color contrast verification | Audit | 4.5:1 text, 3:1 large text |
| 5 | Mobile responsive pass | Audit | All pages, all breakpoints |
| 6 | Error state audit | Audit | All pages, all error modes |
| 7 | Loading state audit | Audit | All pages, skeleton screens |
| 8 | Empty state audit | Audit | All pages, no-data scenarios |
| 9 | Cross-browser testing | Audit | Chrome, Firefox, Safari, Edge |
| 10 | Production deployment | Ops | Docker compose on production VPS |
| 11 | SSL/TLS configuration | Ops | Let's Encrypt, auto-renewal |
| 12 | CDN configuration | Ops | Widget JS, static assets |
| 13 | Domain configuration | Ops | DNS, custom domains |
| 14 | Monitoring setup | Ops | Prometheus, alerts, uptime |
| 15 | Email delivery verification | Ops | SPF, DKIM, DMARC |
| 16 | Backup configuration | Ops | Database, file storage |
| 17 | Load test on production hardware | Test | Validate latency targets |
| 18 | Soak test (1 hour) | Test | Validate memory stability |
| 19 | Rollback procedure test | Ops | Verify documented rollback |

**Dependencies:** All CP2–CP8 complete and stable
**Estimated effort:** 10 engineer-days
**Risks:**
- WCAG issues found late require significant rework
- Production environment differs from development (package versions, OS)
- SSL certificate provisioning delays
- DNS propagation delays

**Exit criteria:**
- WCAG Level AA pass for all public pages, AA target for authenticated pages
- All pages render correctly in Chrome, Firefox, Safari, Edge (last 2 major versions)
- All pages render correctly on mobile (320px+), tablet (768px+), desktop (1024px+)
- Load test passes: P50 < 1000ms, P95 < 3000ms, error rate < 5%
- Soak test passes: no memory leak over 1 hour, error rate < 10%
- SSL certificate valid, HSTS enabled, HTTPS enforced
- Monitoring alerts configured and tested
- Database backups running and verified restorable
- Deployment checklist fully signed off

---

## 4. API Implementation Order

### 4.1 Missing API Inventory

Every API listed here is **new** — it does not exist in the RC1 backend. All existing RC1 APIs are considered frozen.

### Milestone A: Auth APIs (CP2, Priority: Critical)

| Order | API | Priority | Reason | Depends On | Blocks | Complexity |
|-------|-----|----------|--------|-----------|--------|------------|
| A1 | `POST /api/auth/forgot-password` | Critical | Users cannot reset passwords without this | Email service | Forgot Password page, Reset Password page | Medium (token gen, email, rate limit) |
| A2 | `POST /api/auth/reset-password/:token` | Critical | Users cannot complete password reset without this | A1 | Reset Password page | Medium (token verify, hash update) |
| A3 | `GET /api/auth/verify-email/:token` | Critical | Email verification link goes nowhere without this | Email service | Email Verification page | Low (set flag, return status) |
| A4 | `POST /api/auth/resend-verification` | High | Users stuck with unverified email | A3 | Email Verification page | Low (generate token, resend) |
| A5 | `POST /api/auth/refresh` | Medium | JWT expires after 7 days with no refresh | None | None directly (UX improvement) | Low (verify, reissue) |

**Milestone A total complexity:** Low-Medium. All are standard auth patterns with well-known implementations.

### Milestone B: Widget APIs (CP6, Priority: High)

| Order | API | Priority | Reason | Depends On | Blocks | Complexity |
|-------|-----|----------|--------|-----------|--------|------------|
| B1 | `GET /api/widget/:tenantId/config` | High | Widget JS needs configuration to render | None (uses existing tenant/knowledge APIs) | Widget Installer page, Widget JS | Low (aggregate existing data) |

**Milestone B total complexity:** Low. Single aggregation endpoint.

### Milestone C: Team APIs (CP6, Priority: High)

| Order | API | Priority | Reason | Depends On | Blocks | Complexity |
|-------|-----|----------|--------|-----------|--------|------------|
| C1 | `POST /api/tenants/:id/invite` | High | No way to add team members | Email service | Team Members page | Medium (token gen, email, role checks) |
| C2 | `POST /api/tenants/invitations/:token/accept` | High | Invited user cannot join workspace | C1 | Team Members page | Low (token verify, add member) |
| C3 | `DELETE /api/tenants/:id/members/:userId` | High | Cannot remove team members | C2 (members exist) | Team Members page | Low (DB delete, permission check) |
| C4 | `PUT /api/tenants/:id/members/:userId/role` | Medium | Cannot change member roles | C2 (members exist) | Team Members page | Low (DB update, role validation) |

**Milestone C total complexity:** Low-Medium. Standard CRUD with permission enforcement.

### Milestone D: Billing APIs (CP7, Priority: High)

| Order | API | Priority | Reason | Depends On | Blocks | Complexity |
|-------|-----|----------|--------|-----------|--------|------------|
| D1 | `POST /api/billing/create-checkout-session` | High | Cannot start subscription | Stripe SDK configured | Billing page | Medium (Stripe session creation) |
| D2 | `POST /api/billing/create-portal-session` | High | Cannot manage payment method | Stripe SDK configured | Billing page | Low (Stripe portal creation) |
| D3 | `POST /api/billing/webhook` | High | Cannot process subscription events | Stripe webhook secret | All billing lifecycle | Medium (event handling, status transitions) |
| D4 | `GET /api/billing/current` | High | Cannot show current plan on dashboard/billing | D3 (subscription status) | Billing page, Dashboard | Low (aggregate query) |
| D5 | `GET /api/billing/invoices` | Medium | Cannot show invoice history | D3 (invoice sync) | Billing page | Low (in-memory cache query) |
| D6 | `GET /api/billing/plans` | Low | Plan definitions could be static config | None (can be hardcoded config) | Billing page, Pricing page | Low (static config endpoint) |

**Milestone D total complexity:** Medium. Stripe integration requires careful error handling and webhook signature verification.

### Milestone E: Analytics APIs (CP8, Priority: Medium)

| Order | API | Priority | Reason | Depends On | Blocks | Complexity |
|-------|-----|----------|--------|-----------|--------|------------|
| E1 | `GET /api/analytics/messages/daily` | Medium | No daily message trend data | None (uses existing messages table) | Analytics page | Medium (SQL aggregation by date) |
| E2 | `GET /api/analytics/conversations/daily` | Medium | No conversation trend data | None (uses existing conversations table) | Analytics page | Medium |
| E3 | `GET /api/analytics/tokens/daily` | Low | No token usage trend data | None (uses existing messages.token_count) | Analytics page | Medium |

**Milestone E total complexity:** Medium. SQL GROUP BY queries may need index tuning.

### 4.2 API Implementation Order Summary

```
Milestone A: Auth APIs (CP2) — 5 APIs, Critical Priority
    │
    ▼
Milestone B: Widget Config (CP6) — 1 API, High Priority
    │
    ▼
Milestone C: Team APIs (CP6) — 4 APIs, High Priority
    │
    ▼
Milestone D: Billing APIs (CP7) — 6 APIs, High Priority
    │
    ▼
Milestone E: Analytics APIs (CP8) — 3 APIs, Medium Priority

Total new APIs: 19
```

### 4.3 API Reuse Verification

Every existing API is reused before building a new one. The following table verifies no existing API is duplicated:

| Need | Existing API | Status |
|------|-------------|--------|
| User registration | `POST /api/auth/signup` | Exists, reuse |
| User login | `POST /api/auth/login` | Exists, reuse |
| Get current user | `GET /api/auth/me` | Exists, reuse |
| Update profile | `PUT /api/auth/me` | Exists, reuse |
| Change password | `PUT /api/auth/password` | Exists, reuse |
| List tenants | `GET /api/tenants/` | Exists, reuse |
| Get tenant | `GET /api/tenants/:id` | Exists, reuse |
| Create tenant | `POST /api/tenants/` | Exists, reuse |
| Update tenant | `PUT /api/tenants/:id` | Exists, reuse |
| Delete tenant | `DELETE /api/tenants/:id` | Exists, reuse |
| List API keys | `GET /api/api-keys` | Exists, reuse |
| Create API key | `POST /api/api-keys` | Exists, reuse |
| Revoke API key | `DELETE /api/api-keys/:id` | Exists, reuse |
| List conversations | `GET /api/conversations` | Exists, reuse |
| Get conversation | `GET /api/conversations/:id` | Exists, reuse |
| Get messages | `GET /api/conversations/:id/messages` | Exists, reuse |
| Get usage | `GET /api/usage/current` | Exists, reuse |
| List usage | `GET /api/usage` | Exists, reuse |
| List KBs | `GET /api/knowledge-bases` | Exists, reuse |
| Create KB | `POST /api/knowledge-bases` | Exists, reuse |
| Get KB | `GET /api/knowledge-bases/:id` | Exists, reuse |
| Delete KB | `DELETE /api/knowledge-bases/:id` | Exists, reuse |
| List documents | `GET /api/knowledge-bases/:id/documents` | Exists, reuse |
| Upload document | `POST /api/knowledge/upload` | Exists, reuse |
| Upload FAQ | `POST /api/knowledge/upload/faq` | Exists, reuse |
| Crawl URL | `POST /api/knowledge/crawl` | Exists, reuse |
| List sources | `GET /api/knowledge/sources` | Exists, reuse |
| Get source | `GET /api/knowledge/sources/:id` | Exists, reuse |
| Delete source | `DELETE /api/knowledge/sources/:id` | Exists, reuse |
| Reindex source | `POST /api/knowledge/sources/:id/reindex` | Exists, reuse |
| Publish knowledge | `POST /api/knowledge/publish` | Exists, reuse |
| Get versions | `GET /api/knowledge/versions` | Exists, reuse |
| Knowledge stats | `GET /api/knowledge/stats` | Exists, reuse |
| Search knowledge | `POST /api/knowledge/search` | Exists, reuse |
| Get context | `POST /api/knowledge/context` | Exists, reuse |
| Chat | `POST /api/chat` | Exists, reuse (pipeline) |
| Health check | `GET /api/health` | Exists, reuse |
| Tenant members | `GET /api/tenants/:id/members` | Exists, reuse |

**Verified:** No existing API is duplicated by a planned new API. All 19 new APIs serve genuinely missing functionality.

---

## 5. Frontend Implementation Order

### 5.1 Page Build Order

| Order | Page | Phase | Depends On | Reusable Components | Existing APIs | Missing APIs | Effort |
|-------|------|-------|-----------|---------------------|---------------|--------------|--------|
| 1 | Sign Up | CP3 | CP1.5b auth wireframes | Navbar, Footer, AuthLayout, SignUpForm, Toast | `POST /api/auth/signup` | — | 1d |
| 2 | Login | CP3 | CP1.5b auth wireframes | Navbar, Footer, AuthLayout, LoginForm, Toast | `POST /api/auth/login` | — | 1d |
| 3 | Forgot Password | CP3 | CP2 A1 (API) | Navbar, Footer, AuthLayout, EmailForm, Toast | — | `POST /api/auth/forgot-password` | 1d |
| 4 | Reset Password | CP3 | CP2 A2 (API) | Navbar, Footer, AuthLayout, ResetPasswordForm, Toast | — | `POST /api/auth/reset-password/:token` | 1d |
| 5 | Email Verification | CP3 | CP2 A3 (API) | Navbar, Footer, AuthLayout, VerificationStatus | — | `GET /api/auth/verify-email/:token` | 0.5d |
| 6 | Landing | CP3 | CP1.5b landing wireframes | Navbar, Footer, Hero, FeatureCard, FeatureGrid, TrustBar, Testimonials, FaqAccordion, CTA | — | — | 2d |
| 7 | Features | CP3 | CP1.5b features layout | Navbar, Footer, FeatureSection (alternating) | — | — | 1d |
| 8 | Pricing | CP3 | CP1.5b pricing wireframes | Navbar, Footer, PricingCard, PricingToggle, FaqAccordion, CTA | — | — | 1.5d |
| 9 | Documentation | CP3 | CP1.5b docs layout | Navbar, Footer, DocSidebar, DocContent, CodeBlock, SearchInput | — | — | 3d |
| 10 | Legal Pages | CP3 | Legal review | Navbar, Footer | — | — | 0.5d |
| 11 | Profile | CP3 | CP2 A5 (refresh) | AppLayout, ProfileForm, PasswordChangeForm, Toast | `GET /api/auth/me`, `PUT /api/auth/me`, `PUT /api/auth/password` | `POST /api/auth/refresh` | 1d |
| 12 | Dashboard | CP4 | CP3 (layout reuse) | AppLayout, Sidebar, TopBar, WorkspaceSwitcher, StatCard, UsageMeter, RecentConversations, QuickActions, UpgradeBanner, Toast, EmptyState, LoadingSkeleton | `GET /api/usage/current`, `GET /api/conversations?limit=5`, `GET /api/knowledge-bases` | — | 2d |
| 13 | Workspace Settings | CP4 | CP4 (AppLayout) | AppLayout, BrandingForm (color picker, logo upload, message inputs), DangerZone, Toast | `GET /api/tenants/:id`, `PUT /api/tenants/:id` | — | 1d |
| 14 | Knowledge Bases List | CP5 | CP4 (AppLayout) | AppLayout, KnowledgeTable, CreateKBModal, EmptyState, LoadingSkeleton, Toast | `GET /api/knowledge-bases`, `POST /api/knowledge-bases`, `DELETE /api/knowledge-bases/:id` | — | 1.5d |
| 15 | Knowledge Detail | CP5 | CP5 (KB list) | AppLayout, DocumentTable, StatusBadge, SearchBar, SourceStats, EmptyState, LoadingSkeleton | `GET /api/knowledge-bases/:id`, `GET /api/knowledge-bases/:id/documents`, `GET /api/knowledge/stats` | — | 2d |
| 16 | Upload Modal | CP5 | CP5 (KB detail) | UploadZone, UrlCrawlInput, FaqEditor, ProgressIndicator, Toast, DocumentTypeSelector | `POST /api/knowledge/upload`, `POST /api/knowledge/upload/faq`, `POST /api/knowledge/crawl`, `GET /api/knowledge/sources/:id` | — | 2d |
| 17 | Onboarding Wizard | CP5 | CP5 (knowledge + publish) | Stepper, WizardStep, BrandingForm (reuse), UploadZone (reuse), FaqEditor (reuse), ProcessingStatus (reuse), WidgetConfigPanel (reuse), WidgetPreview (reuse), SnippetDisplay (reuse), CompletionCelebration, Toast | Same as KB detail + upload + publish | — | 2.5d |
| 18 | Publish Page | CP5 | CP5 (upload complete) | PublishStepper, WidgetConfigPanel, WidgetPreview, VersionHistory, PublishButton, Toast | `POST /api/knowledge/publish`, `GET /api/knowledge/versions`, `PUT /api/tenants/:id` | — | 1.5d |
| 19 | Widget Installer | CP6 | CP5 (publish), CP6 (widget JS) | SnippetDisplay, DomainVerificationInput, WidgetPreview (reuse), InstallationStatus, Toast | — | `GET /api/widget/:tenantId/config` | 2d |
| 20 | Conversations List | CP6 | CP4 (AppLayout) | ConversationTable, SearchInput, DateRangePicker, Pagination, EmptyState, LoadingSkeleton | `GET /api/conversations?page=&limit=` | — | 1.5d |
| 21 | Conversation Detail | CP6 | CP6 (conversations) | MessageList, MessageMetadata, InfoPanel | `GET /api/conversations/:id`, `GET /api/conversations/:id/messages` | — | 1.5d |
| 22 | Widget JS | CP6 | CP2 (chat endpoint), CP6 B1 (config API) | (standalone — no framework components) | `POST /api/chat` | `GET /api/widget/:tenantId/config` | 5d |
| 23 | API Keys | CP6 | CP4 (AppLayout) | ApiKeyTable, CreateApiKeyModal, KeyRevealDialog, RevokeConfirmDialog, EmptyState, Toast | `GET /api/api-keys`, `POST /api/api-keys`, `DELETE /api/api-keys/:id` | — | 1d |
| 24 | Team Members | CP6 | CP6 (APIs C1-C4) | MemberTable, InviteMemberModal, RoleBadge, RemoveConfirmDialog, EmptyState, Toast | `GET /api/tenants/:id/members` | C1-C4 | 1.5d |
| 25 | Billing | CP7 | CP4 (AppLayout), CP7 (APIs D1-D6) | CurrentPlanCard, UsageMeter (reuse), PlanChangePanel, InvoiceTable, PaymentMethodCard, CancelSubscriptionDialog, EmptyState, Toast | — | D1-D6 | 2.5d |
| 26 | Analytics | CP8 | CP4 (AppLayout), CP8 (APIs E1-E3) | StatCard (reuse), UsageChart, DateRangePicker, PlanUsageBar, LoadingSkeleton, EmptyState | `GET /api/usage/current` | E1-E3 | 2.5d |

### 5.2 Page Count by Phase

| Phase | New Pages | Cumulative |
|-------|-----------|------------|
| CP3 | 11 (signup, login, forgot, reset, verify, landing, features, pricing, docs, legal, profile) | 11 |
| CP4 | 1 (dashboard) + workspace settings | 13 |
| CP5 | 5 (KB list, KB detail, upload modal, onboarding wizard, publish) | 18 |
| CP6 | 7 (installer, conversations list, conversation detail, widget JS, API keys, team, invite accept) | 25 |
| CP7 | 1 (billing) | 26 |
| CP8 | 1 (analytics) | 27 |

**Total unique pages:** 27

---

## 6. Component Build Order

### 6.1 Tier 1: Foundation Components (Built first, all pages depend on them)

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 1 | ThemeProvider / DesignTokenSetup | CP3 | CP1.5b brand tokens | Every component | 0.5d |
| 2 | Router setup (Vue Router / React Router) | CP3 | — | Every page | 0.5d |
| 3 | HTTP client (axios/fetch wrapper) | CP3 | — | Every API call | 0.5d |
| 4 | Auth context (JWT store, user state, login/logout) | CP3 | CP2 auth | Every authenticated page | 1d |
| 5 | Toast (notification system) | CP3 | — | Every interactive page | 0.5d |
| 6 | Modal (overlay dialog) | CP3 | — | Knowledge, billing, team, API keys | 0.5d |
| 7 | LoadingSkeleton (placeholder shapes) | CP3 | — | Every data-driven page | 0.5d |
| 8 | EmptyState (illustration + text + CTA) | CP3 | CP1.5b empty state designs | Every list page | 0.5d |

### 6.2 Tier 2: Layout Components (Built before any page content)

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 9 | Navbar (public) | CP3 | Tier 1 (Theme, Router) | Landing, Features, Pricing, Docs, Legal | 1d |
| 10 | Footer (public) | CP3 | Tier 1 | Landing, Features, Pricing, Docs, Legal | 0.5d |
| 11 | PublicLayout (Navbar + Footer + slot) | CP3 | Navbar, Footer | All public pages | 0.5d |
| 12 | AuthLayout (PublicLayout + centered form) | CP3 | PublicLayout | Signup, Login, Forgot, Reset, Verify | 0.5d |
| 13 | Sidebar | CP4 | Tier 1 | Dashboard, Knowledge, Conversations, Analytics, Settings, Billing | 1.5d |
| 14 | TopBar | CP4 | Tier 1 | All authenticated pages | 0.5d |
| 15 | AppLayout (Sidebar + TopBar + slot) | CP4 | Sidebar, TopBar | All authenticated pages | 0.5d |
| 16 | WorkspaceSwitcher | CP4 | AppLayout | Sidebar | 0.5d |
| 17 | Breadcrumb | CP4 | Router | All authenticated pages | 0.5d |

### 6.3 Tier 3: Marketing Components (Built for public pages)

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 18 | Hero | CP3 | PublicLayout, CP1.5b | Landing | 1d |
| 19 | FeatureCard | CP3 | — | Landing, Features | 0.5d |
| 20 | FeatureGrid | CP3 | FeatureCard | Landing, Features | 0.5d |
| 21 | PricingCard | CP3 | PublicLayout, CP1.5b | Pricing | 1d |
| 22 | PricingToggle | CP3 | PricingCard | Pricing | 0.5d |
| 23 | Testimonial | CP3 | — | Landing | 0.5d |
| 24 | TrustBar | CP3 | — | Landing | 0.5d |
| 25 | FaqAccordion | CP3 | — | Landing, Pricing, Support | 0.5d |
| 26 | CTA | CP3 | — | Landing, Pricing | 0.5d |
| 27 | DocSidebar | CP3 | PublicLayout | Documentation | 0.5d |
| 28 | DocContent | CP3 | — | Documentation | 0.5d |
| 29 | CodeBlock | CP3 | — | Documentation, Installer | 0.5d |

### 6.4 Tier 4: Auth Components (Built for auth pages)

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 30 | SignUpForm | CP3 | AuthLayout, Toast | Sign Up page | 1d |
| 31 | LoginForm | CP3 | AuthLayout, Toast | Login page | 0.5d |
| 32 | SocialLoginButtons | CP3 | — | Sign Up, Login (future OAuth) | 0.5d |
| 33 | ProfileForm | CP3 | AppLayout, Toast | Profile page | 0.5d |
| 34 | PasswordChangeForm | CP3 | AppLayout, Toast | Profile page | 0.5d |
| 35 | EmailForm | CP3 | AuthLayout, Toast | Forgot Password | 0.5d |
| 36 | ResetPasswordForm | CP3 | AuthLayout, Toast | Reset Password | 0.5d |
| 37 | VerificationStatus | CP3 | AuthLayout | Email Verification | 0.5d |

### 6.5 Tier 5: Dashboard Components (Built for authenticated home)

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 38 | StatCard | CP4 | AppLayout | Dashboard, Analytics | 0.5d |
| 39 | UsageMeter | CP4 | — | Dashboard, Billing | 0.5d |
| 40 | RecentConversations | CP4 | AppLayout, ConversationTable (Tier 7) | Dashboard | 1d |
| 41 | QuickActions | CP4 | AppLayout | Dashboard | 0.5d |
| 42 | UpgradeBanner | CP4 | — | Dashboard | 0.5d |
| 43 | BrandingForm | CP4 | AppLayout | Workspace Settings, Onboarding Wizard | 1d |
| 44 | DangerZone | CP4 | Modal | Workspace Settings, Billing | 0.5d |

### 6.6 Tier 6: Knowledge Components (Built for knowledge management)

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 45 | KnowledgeTable | CP5 | AppLayout, EmptyState, LoadingSkeleton | Knowledge Bases List | 1d |
| 46 | CreateKBModal | CP5 | Modal, Toast | Knowledge Bases List | 0.5d |
| 47 | DocumentTable | CP5 | AppLayout, StatusBadge | Knowledge Detail | 1d |
| 48 | StatusBadge | CP5 | — | Knowledge Detail, Sources, Upload | 0.5d |
| 49 | UploadZone | CP5 | Toast | Upload Modal, Onboarding Wizard | 1d |
| 50 | UrlCrawlInput | CP5 | Toast | Upload Modal, Onboarding Wizard | 0.5d |
| 51 | FaqEditor | CP5 | Toast | Upload Modal, Onboarding Wizard | 1d |
| 52 | ProgressIndicator | CP5 | — | Upload Modal, Onboarding Wizard | 0.5d |
| 53 | Stepper | CP5 | — | Onboarding Wizard, Publish | 0.5d |
| 54 | WizardStep | CP5 | Stepper | Onboarding Wizard | 0.5d |
| 55 | PublishStepper | CP5 | Stepper, WidgetConfigPanel, WidgetPreview | Publish Page | 1d |
| 56 | WidgetConfigPanel | CP5 | — | Publish Page, Onboarding Wizard | 0.5d |
| 57 | WidgetPreview | CP5 | — | Publish Page, Widget Installer | 1d |
| 58 | VersionHistory | CP5 | — | Publish Page | 0.5d |
| 59 | CompletionCelebration | CP5 | — | Onboarding Wizard | 0.5d |

### 6.7 Tier 7: Conversation Components (Built for chat history)

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 60 | ConversationTable | CP6 | AppLayout, EmptyState, LoadingSkeleton, Pagination, SearchInput | Conversations List, RecentConversations (Tier 5) | 1.5d |
| 61 | MessageList | CP6 | — | Conversation Detail | 1d |
| 62 | MessageMetadata | CP6 | — | Conversation Detail | 0.5d |
| 63 | InfoPanel | CP6 | — | Conversation Detail | 0.5d |

### 6.8 Tier 8: Widget Installer Components

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 64 | SnippetDisplay | CP6 | CodeBlock (Tier 3), Toast | Widget Installer, Onboarding Wizard | 0.5d |
| 65 | DomainVerificationInput | CP6 | Toast | Widget Installer | 1d |
| 66 | InstallationStatus | CP6 | — | Widget Installer | 0.5d |

### 6.9 Tier 9: Team Components

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 67 | MemberTable | CP6 | AppLayout, RoleBadge, EmptyState, LoadingSkeleton | Team Members | 1d |
| 68 | InviteMemberModal | CP6 | Modal, Toast | Team Members | 0.5d |
| 69 | RoleBadge | CP6 | — | Team Members, API Keys | 0.5d |
| 70 | ApiKeyTable | CP6 | AppLayout, EmptyState, LoadingSkeleton | API Keys | 1d |
| 71 | CreateApiKeyModal | CP6 | Modal, Toast | API Keys | 0.5d |
| 72 | KeyRevealDialog | CP6 | Modal | API Keys | 0.5d |
| 73 | RevokeConfirmDialog | CP6 | Modal | API Keys, Team Members | 0.5d |

### 6.10 Tier 10: Billing Components

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 74 | CurrentPlanCard | CP7 | AppLayout | Billing | 0.5d |
| 75 | PlanChangePanel | CP7 | PricingCard (Tier 3 redesign) | Billing | 1d |
| 76 | InvoiceTable | CP7 | AppLayout, EmptyState, LoadingSkeleton | Billing | 1d |
| 77 | PaymentMethodCard | CP7 | — | Billing | 0.5d |
| 78 | CancelSubscriptionDialog | CP7 | Modal | Billing | 0.5d |

### 6.11 Tier 11: Analytics Components

| Order | Component | Phase | Depends On | Used By | Effort |
|-------|-----------|-------|-----------|---------|--------|
| 79 | UsageChart | CP8 | Chart library (Chart.js) | Analytics | 1.5d |
| 80 | DateRangePicker | CP8 | — | Analytics | 0.5d |
| 81 | PlanUsageBar | CP8 | — | Analytics, Dashboard | 0.5d |

### 6.12 Tier 12: Utility Components (Shared across all tiers)

| Component | Phase | Used By | Notes |
|-----------|-------|---------|-------|
| Button | CP3 | Every form and action | Variants: primary, secondary, ghost, danger, disabled, loading |
| Input | CP3 | Every form | Variants: text, email, password, search, textarea, select |
| Checkbox / Toggle | CP3 | Multiple forms | Styled toggle switch |
| Avatar | CP3 | Profile, Sidebar, Team, TopBar | Initials fallback |
| Badge | CP3 | Status badges, notification counts | Color variants |
| Card | CP3 | Dashboard, Billing, Knowledge | Container with header + body |
| Pagination | CP3 | Conversations, Usage | Page numbers + prev/next |
| SearchInput | CP3 | Conversations, Documentation | Search icon + clear button |
| Table | CP3 | Conversations, Usage, API Keys, Team, Invoices | Sortable columns |
| Tabs | CP3 | Upload modal, Knowledge detail | Tab bar |
| Tooltip | CP3 | Forms, icons, truncated text | Hover/focus reveal |
| Dropdown | CP3 | Workspace switcher, user menu | Click/open |
| ProgressBar | CP3 | Plan usage, upload progress | Animated fill |
| Spinner | CP3 | Loading states | Size variants |
| Divider | CP3 | Section separation | — |
| Icon | CP3 | Navigation, actions, status | SVG sprite or icon library |

---

## 7. Backend Freeze Verification

### 7.1 Existing API Sufficiency Check

The following customer-facing pages require **zero new backend APIs**. All data comes from existing endpoints:

| Page | Existing APIs Used | Verification |
|------|-------------------|-------------|
| Landing | None | Static page, no API required |
| Features | None | Static page |
| Pricing | None | Static page (plan definitions are frontend config) |
| Documentation | None | Static pages |
| Legal Pages | None | Static pages |
| Sign Up | `POST /api/auth/signup` | Existing |
| Login | `POST /api/auth/login` | Existing |
| Profile | `GET /api/auth/me`, `PUT /api/auth/me`, `PUT /api/auth/password` | Existing |
| Dashboard | `GET /api/usage/current`, `GET /api/conversations?limit=5`, `GET /api/knowledge-bases`, `GET /api/tenants/:id` | All existing |
| Workspace Settings | `GET /api/tenants/:id`, `PUT /api/tenants/:id` | Existing |
| Knowledge Bases List | `GET /api/knowledge-bases`, `POST /api/knowledge-bases`, `DELETE /api/knowledge-bases/:id` | All existing |
| Knowledge Detail | `GET /api/knowledge-bases/:id`, `GET /api/knowledge-bases/:id/documents`, `GET /api/knowledge/stats` | All existing |
| Upload Modal | `POST /api/knowledge/upload`, `POST /api/knowledge/upload/faq`, `POST /api/knowledge/crawl`, `GET /api/knowledge/sources/:id` | All existing (5MB limit documented) |
| Publish | `POST /api/knowledge/publish`, `GET /api/knowledge/versions`, `PUT /api/tenants/:id` | All existing |
| Conversations List | `GET /api/conversations?page=&limit=` | Existing |
| Conversation Detail | `GET /api/conversations/:id`, `GET /api/conversations/:id/messages` | All existing |
| API Keys | `GET /api/api-keys`, `POST /api/api-keys`, `DELETE /api/api-keys/:id` | All existing |

### 7.2 Pages Requiring New APIs

| Page | Missing APIs Required | Count |
|------|---------------------|-------|
| Forgot Password | `POST /api/auth/forgot-password` | 1 |
| Reset Password | `POST /api/auth/reset-password/:token` | 1 |
| Email Verification | `GET /api/auth/verify-email/:token` | 1 |
| Widget Installer | `GET /api/widget/:tenantId/config` | 1 |
| Team Members | `POST /api/tenants/:id/invite`, `POST /api/tenants/invitations/:token/accept`, `DELETE /api/tenants/:id/members/:userId`, `PUT /api/tenants/:id/members/:userId/role` | 4 |
| Billing | `POST /api/billing/create-checkout-session`, `POST /api/billing/create-portal-session`, `POST /api/billing/webhook`, `GET /api/billing/current`, `GET /api/billing/invoices`, `GET /api/billing/plans` | 6 |
| Analytics | `GET /api/analytics/messages/daily`, `GET /api/analytics/conversations/daily`, `GET /api/analytics/tokens/daily` | 3 |

### 7.3 Total New APIs: 19

All are documented in Section 4. None duplicate existing functionality. None modify existing data models — they add new tables only where necessary (verification tokens, reset tokens, team members, invoices).

### 7.4 Backend Freeze Confirmation

The existing backend is **frozen** from this point forward. No changes to:
- Pipeline stages or execution flow
- Existing SaaS API endpoints or their response shapes
- Database schemas of existing tables
- Error code definitions
- Auth middleware behavior
- Store implementations

Only additions:
- New route files in `packages/saas-api/src/routes/`
- New repository methods in `packages/saas-core/src/db/repositories.ts`
- New tables in the saas-core SQLite database (verification_tokens, reset_tokens, tenant_members, invoices)
- New service files in `packages/saas-api/src/services/`

---

## 8. Testing Strategy

### 8.1 Per-Phase Testing Requirements

### CP2 — Authentication

| Test Type | Scope | Tool | Exit Criteria |
|-----------|-------|------|---------------|
| Unit | Forgot password token generation, expiry validation | Vitest | Token generates with correct format. Expired tokens are rejected. Rate limit enforced |
| Unit | Reset password token verification, hash update | Vitest | Valid token updates hash. Invalid/expired token rejected. Same token cannot be used twice |
| Unit | Email verification token flow, email_verified flag | Vitest | Token sets flag. Already-verified returns appropriate response |
| Integration | Full auth flow: signup → login → forgot → reset → login | Vitest (supertest) | End-to-end flow returns expected status codes at each step |
| Integration | Email sending (SMTP mock) | Vitest | Welcome, verification, reset emails contain correct links |
| E2E | Browser: signup → verify email → login → profile edit → logout | Playwright | Full user lifecycle works in browser |

### CP3 — Public Website

| Test Type | Scope | Tool | Exit Criteria |
|-----------|-------|------|---------------|
| Unit | Component rendering (Navbar, Footer, Hero, PricingCard, etc.) | Vitest (JSDOM) | All components render without errors. Props variations render correctly |
| Unit | Form validation (SignUpForm, LoginForm) | Vitest | Empty fields, invalid email, weak password, password mismatch all show correct errors |
| Integration | Auth pages wire to real APIs | Vitest (supertest) | Signup form submit → API call → correct response. Login form → API call → JWT cookie set |
| E2E | Full public site navigation | Playwright | All public pages load. Navbar links work. Pricing toggle works. Documentation search works |
| E2E | Auth flow in browser | Playwright | Sign up → verify → log in → profile update. All error states visible |
| Performance | Lighthouse audit | Lighthouse CI | Performance ≥ 90, Accessibility ≥ 90, SEO ≥ 90, Best Practices ≥ 90 |

### CP4 — Customer Dashboard

| Test Type | Scope | Tool | Exit Criteria |
|-----------|-------|------|---------------|
| Unit | Sidebar navigation + responsive behavior | Vitest (JSDOM) | Links render. Active state correct. Collapses on mobile |
| Unit | StatCard, UsageMeter, QuickActions rendering | Vitest | All data-bound components render with mock data. Loading skeleton shows while data loads |
| Unit | Workspace switcher | Vitest | Opens, shows workspaces, switches correctly |
| Integration | Dashboard data aggregation | Vitest | Real API calls return correct usage + conversation + KB data |
| E2E | Dashboard page load | Playwright | Page loads with real data. Stats display. Quick actions navigate correctly |

### CP5 — Knowledge UX

| Test Type | Scope | Tool | Exit Criteria |
|-----------|-------|------|---------------|
| Unit | KnowledgeTable, DocumentTable, StatusBadge rendering | Vitest | All states render correctly (loading, empty, populated, error) |
| Unit | UploadZone drag-and-drop, UrlCrawlInput validation, FaqEditor add/remove | Vitest | File selection works. URL validation works. FAQ add/remove works |
| Unit | Stepper navigation, PublishStepper flow | Vitest | Step forward/back works. Step completion validation |
| Integration | Upload → process → publish flow | Vitest | Upload document → poll status → publish → version created |
| E2E | Full knowledge lifecycle | Playwright | Create KB → upload file → wait for processing → search → publish |
| E2E | Onboarding wizard completion | Playwright | All 5 steps complete successfully. Branding saves. Upload works. Publish works |

### CP6 — Widget UX

| Test Type | Scope | Tool | Exit Criteria |
|-----------|-------|------|---------------|
| Unit | Widget JS config parsing, message formatting | Vitest (JSDOM) | Config loads correctly. Messages render. Domain matching logic works |
| Unit | SnippetDisplay copy-to-clipboard | Vitest | Clipboard API called correctly. "Copied" confirmation shown |
| Unit | DomainVerificationInput validation | Vitest | Valid domain accepted. Invalid domain shows error |
| Integration | Widget JS with real chat endpoint | Vitest (node fetch) | Widget sends message, receives response, renders in DOM |
| Integration | Team invite → accept → list → remove | Vitest | Full CRUD cycle works |
| E2E | Widget installation + chat | Playwright | Snippet copied. Widget renders in test page. Chat flow works end-to-end |
| E2E | Cross-browser widget | Playwright (3 browsers) | Widget renders and functions in Chrome, Firefox, Safari |

### CP7 — Billing

| Test Type | Scope | Tool | Exit Criteria |
|-----------|-------|------|---------------|
| Unit | Stripe webhook event parsing, signature verification | Vitest | All 5 event types parsed correctly. Invalid signature rejected |
| Unit | Subscription status transitions | Vitest | trialing → active → past_due → cancelled → expired transitions correct |
| Unit | Plan enforcement middleware | Vitest | Over-limit requests return correct error codes. Within-limit requests pass through |
| Integration | Checkout session creation (Stripe mock) | Vitest | Returns valid session URL. Trial period set correctly |
| Integration | Portal session creation (Stripe mock) | Vitest | Returns valid portal URL |
| E2E | Billing page UI | Playwright | Current plan displays. Invoice table renders. Plan change buttons visible |

### CP8 — Analytics

| Test Type | Scope | Tool | Exit Criteria |
|-----------|-------|------|---------------|
| Unit | Analytics aggregation queries | Vitest (SQLite) | Daily message counts correct. Date filtering works. Empty ranges return empty |
| Unit | Chart component rendering | Vitest | Line/bar/area charts render with data. Empty chart shows correct state |
| Integration | Analytics API returns correct data | Vitest | Seeded data produces expected chart response |
| E2E | Analytics page load | Playwright | Charts render. Date range picker changes data. CSV download works |

### CP9 — Launch

| Test Type | Scope | Tool | Exit Criteria |
|-----------|-------|------|---------------|
| E2E | Regression — full test suite | Vitest | All 964+ existing tests + new tests pass |
| E2E | Regression — E2E workflow | Vitest/Pipeline | All 45 E2E tests pass |
| Performance | Load test on production hardware | `tests/load/load-test.mjs` | P50 < 1000ms, P95 < 3000ms, P99 < 5000ms, error rate < 5% |
| Stability | Soak test on production hardware | `tests/stability/soak-test.mjs` | No memory leak, error rate < 10% over 1 hour |
| Manual | WCAG Level AA audit | axe-core + manual | Zero critical/severe violations |
| Manual | Cross-browser visual audit | Manual | Visual consistency across Chrome, Firefox, Safari, Edge |
| Manual | Mobile responsive audit | Manual | All pages functional at 375px, 768px, 1024px, 1440px |

### 8.2 Regression Testing Requirement

After every phase, run:
```
npm test                                  # All 964+ existing tests
npx vitest run packages/pipeline-orchestrator/src/__tests__/e2e.test.ts   # 45 E2E tests
npx vitest run tests/load/load-suite.test.ts       # Load tests
npx vitest run tests/failure/failure-injection.test.ts   # Failure tests
npx vitest run tests/stability/stability.test.ts   # Stability tests
```

If any existing test fails, investigate immediately. A regression means the phase introduced a breaking change.

### 8.3 Test Data Strategy

- Each phase creates its own test fixtures in `__tests__/__<phase>_data__/` directories
- Tests clean up fixtures in `afterAll` blocks
- Shared test utilities go in `packages/test-utils/src/` (currently empty — populate as needed)
- Stripe integration tests use mock Stripe SDK (never hit Stripe in CI)

---

## 9. Parallel Work Opportunities

### 9.1 Parallel Workstreams

```
Stream A (Frontend):    CP3 ── CP4 ── CP5 ── CP6 ── CP7 ── CP8 ── CP9
Stream B (Backend):     CP2 ─────── CP6 ──────────── CP7 ── CP8
Stream C (Widget JS):  ──────────── CP6
Stream D (Docs/SEO):              CP3 ──────────────────────── CP9
Stream E (A11y):       ───────────────────────────────────────── CP9
```

### 9.2 Parallelization Opportunities Table

| Work Item A | Work Item B | Can Parallelize? | Constraints |
|-------------|-------------|-----------------|-------------|
| CP2: Auth APIs | CP3: Public website frontend | **Yes** | Public landing/features/pricing/docs are static, no auth needed. Frontend doesn't need auth APIs until it builds auth pages |
| CP3: Public website | CP6: Widget JS | **Yes** | Widget JS is standalone, no dependency on public website |
| CP5: Knowledge UX frontend | CP6: Widget JS | **Yes** | Widget JS only needs chat endpoint (exists) + widget config API (CP6 milestone) |
| CP7: Billing APIs | CP5: Knowledge UX frontend | **Yes** | No dependency between billing and knowledge |
| CP7: Billing APIs | CP8: Analytics APIs | **Yes** | No dependency between billing and analytics (both depend on CP4 layout) |
| CP8: Analytics frontend | CP9: Accessibility audit | **Yes** | A11y audit can start on completed CP2-CP7 pages while CP8 finishes |
| CP6: Team APIs | CP5: Knowledge UX frontend | **Yes** | Team APIs are independent of knowledge |

### 9.3 Recommended Parallel Team Structure

**Team 1: Backend (2 engineers)**
```
CP2: Auth APIs (Week 1-2)
  → milestone: test auth APIs
  → CP6 Team APIs (Week 5-6)
  → CP7 Billing APIs (Week 8-10)
  → CP8 Analytics APIs (Week 11-12)
```

**Team 2: Frontend (2 engineers)**
```
CP3: Public website (Week 2-5)
  → CP4: Dashboard (Week 5-7)
  → CP5: Knowledge UX (Week 7-10)
  → CP6: Widget UX frontend (Week 10-13)
  → CP7: Billing frontend (Week 13-15)
  → CP8: Analytics frontend (Week 15-17)
```

**Team 3: Widget JS + Docs (1 engineer)**
```
CP6: Widget JS (Week 5-7)
  → CP3: Documentation pages (Week 3-5)
  → CP9: SEO + A11y contributions (Week 13-16)
```

### 9.4 Optimistic Timeline with Parallelization

```
Week:  1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16  17
      ─┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴──
CP2    [Auth APIs■■■]
CP3                     [Public Website■■■■■]
CP4                                  [Dashboard■■■■]
CP5                                            [Knowledge UX■■■■■■]
CP6                                                       [Widget UX■■■■■■]
CP7   [Billing APIs■■■■■■]                                       [Billing UI■■■]
CP8   [Analytics APIs■■]                                               [Analytics■■■]
CP9                                                                               [Polish■■■■]

Backend:  [Auth]     [Widget Config]     [Team]     [Billing APIs] [Analytics APIs]
Frontend:           [Public Site]   [Dashboard]  [Knowledge UX]  [Widget] [Billing][Analytics]
Widget:                                    [Widget JS]
Docs:                                                    [Documentation]
A11y:                                                                                       [Audit]
```

**Optimistic total:** ~14-16 weeks (3-4 months) with 2-3 parallel streams.

---

## 10. Release Milestones

### 10.1 Milestone Map

```
Internal Alpha    Private Alpha    Private Beta    Public Beta    RC2    Production v1
     │                 │               │               │           │          │
     ▼                 ▼               ▼               ▼           ▼          ▼
Week 6              Week 9          Week 12          Week 14      Week 15    Week 16-17
```

### 10.2 Internal Alpha (Week 6)

**Goal:** Core authentication and basic customer website functional. Team can sign up and see a dashboard.

**Required features:**
- CP2: All auth APIs complete (forgot password, reset, verify email, refresh)
- CP3: Public website landing, features, pricing, docs, legal pages
- CP3: Sign up, login, forgot/reset password, email verification, profile pages
- CP4: AppLayout, sidebar navigation, dashboard with real data
- All 19 new APIs implemented and tested (even if frontend for some is "Coming Soon")
- Email sending functional (welcome, verification, reset)

**Required testing:**
- All auth APIs integration tested
- All public pages render correctly
- Auth flow E2E tested
- Full test suite passes (regression)

**Required documentation:**
- Internal deployment guide (for the team)
- API changelog (what's been added since RC1)

**Go/No-Go Criteria:**
- [ ] All CP2 + CP3 + CP4 deliverables complete
- [ ] New user can sign up, verify email, log in, see dashboard
- [ ] Existing 964+ tests all pass
- [ ] All 19 new APIs have integration tests
- [ ] Email sending verified in staging environment

### 10.3 Private Alpha (Week 9)

**Goal:** Knowledge management functional. Selected alpha testers can upload documents and publish a widget.

**Required features:**
- CP5: All knowledge UX pages (KB list, detail, upload, publish, onboarding)
- CP5: Onboarding wizard (5 steps)
- CP6: Widget config API
- CP6: Widget JS (alpha — minimal styling, functional chat)
- CP6: Widget installer page (snippet copy, test widget)

**Required testing:**
- Knowledge upload → process → publish → widget chat E2E
- Widget JS cross-browser (Chrome, Firefox, Safari)
- Upload error handling (invalid file type, oversize, pipeline failure)

**Required documentation:**
- Widget installation guide (for alpha testers)
- Knowledge upload guide (for alpha testers)
- Known issues list

**Go/No-Go Criteria:**
- [ ] All CP5 + CP6 (widget JS + config) deliverables complete
- [ ] Full flow: signup → upload → publish → install → chat works
- [ ] Widget JS renders and functions in Chrome, Firefox, Safari
- [ ] No regression in existing tests
- [ ] Alpha tester feedback loop established

### 10.4 Private Beta (Week 12)

**Goal:** Team collaboration and billing ready. Invited beta testers can add team members and see their subscription.

**Required features:**
- CP6: Team management (invite, accept, remove, role change)
- CP6: Team members page
- CP6: API keys page
- CP6: Conversations list + detail pages
- CP7: All billing APIs complete
- CP7: Billing page (current plan, usage meter, upgrade/downgrade)
- Stripe integration tested end-to-end in staging

**Required testing:**
- Team invite → accept → permission enforcement E2E
- Stripe checkout → payment → subscription activation E2E
- Plan enforcement (over-limit rejection)
- Invoice generation and display

**Required documentation:**
- Team management guide
- Billing FAQ
- Stripe integration verified

**Go/No-Go Criteria:**
- [ ] All CP6 (except analytics) + CP7 deliverables complete
- [ ] Team management CRUD works end-to-end
- [ ] Billing subscription lifecycle works (checkout → active → cancel)
- [ ] Plan enforcement correctly blocks over-limit requests
- [ ] Widget JS is production-quality (styled, responsive, accessible)
- [ ] No regression in existing tests

### 10.5 Public Beta (Week 14)

**Goal:** Feature-complete. Public signups open with free plan. All monitoring and deployment ready.

**Required features:**
- CP8: All analytics APIs + dashboard
- CP8: Analytics page (charts, date range, CSV export)
- CP3: SEO setup (sitemap, meta tags, structured data) verified
- CP3: Legal pages reviewed and published
- CP9: WCAG Level AA compliance (critical issues fixed)
- CP9: Cross-browser testing complete
- CP9: Production deployment automated

**Required testing:**
- Full regression suite (964+ tests + all new tests)
- Load test on production hardware
- Soak test (1 hour)
- Backup restore test

**Required documentation:**
- Public API documentation
- Widget installation guide (public)
- Getting started guide (public)
- FAQ (public)
- Privacy policy, Terms of service, Cookie policy published
- Support contact info

**Go/No-Go Criteria:**
- [ ] All CP2-CP8 deliverables complete
- [ ] All 27 pages built and functional
- [ ] Full test suite passes
- [ ] Load test passes on production hardware
- [ ] Soak test passes (no memory leak)
- [ ] WCAG AA compliance for public pages
- [ ] SSL/TLS configured, HTTPS enforced
- [ ] Database backups configured and verified
- [ ] Monitoring dashboards operational
- [ ] Stripe integration live (not test mode)
- [ ] Email delivery verified (SPF, DKIM, DMARC)
- [ ] Legal pages reviewed and published

### 10.6 RC2 (Week 15)

**Goal:** Stabilization. Bug fixes from public beta. Performance optimization.

**Required features:**
- All critical and high-severity bugs from public beta fixed
- Performance bottlenecks identified and resolved
- Analytics data accuracy verified

**Required testing:**
- Full regression suite
- Load test meets or exceeds targets
- All error states manually verified

**Required documentation:**
- Release notes for RC2
- Known issues for v1

**Go/No-Go Criteria:**
- [ ] Zero P0/P1 bugs
- [ ] Load test passes at 2x expected traffic
- [ ] No memory leak over 4-hour soak test
- [ ] All WCAG AA issues resolved

### 10.7 Production v1 (Week 16-17)

**Goal:** Public launch.

**Required features:**
- Same as RC2, plus:
- Deployment checklist fully signed off
- Rollback plan documented and tested
- On-call rotation established

**Required documentation:**
- v1.0.0 release notes
- Production runbook
- Incident response plan

**Go/No-Go Criteria:**
- [ ] RC2 criteria all met
- [ ] Deployment checklist (Section 12) fully signed
- [ ] Production deployment tested in staging
- [ ] Rollback tested
- [ ] On-call team briefed
- [ ] Marketing materials ready
- [ ] Executive sign-off obtained

---

## 11. Risk Assessment

### 11.1 Per-Phase Risk Assessment

### CP2 — Authentication

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| Token expires before user clicks email link | Technical | Medium | Medium | Set token TTL to 24 hours. Resend option on expired token page. Clear "expired" error message |
| Email marked as spam | Technical | Medium | High | Use authenticated SMTP (SPF/DKIM/DMARC). Monitor email delivery rate. Provide "resend" button |
| bcrypt password hashing blocks login under load | Technical | Low | Medium | bcrypt 12 rounds is standard. Monitor login endpoint latency. Reduce rounds if > 500ms |
| User cannot complete flow due to validation edge case | UX | Medium | Medium | Client-side validation + server-side validation. Clear error messages for every field |

### CP3 — Public Website

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| Lighthouse performance fails | Technical | Medium | High | Lazy-load below-fold content. Optimize images. Minimize JS bundles. Font-display: swap |
| SEO issues not caught before launch | Product | Medium | Medium | Submit sitemap to Google Search Console. Validate structured data. Test with Google Rich Results |
| Copy changes requested late | Product | High | Low | Use CMS or config for copy. Avoid hardcoding text in components |
| Marketing pages look inconsistent with brand | Product | Medium | Medium | Design token system from CP1.5b. Component inventory enforces consistency |

### CP4 — Customer Dashboard

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| Sidebar navigation breaks on mobile | UX | Low | High | Test all breakpoints. Collapsible sidebar with hamburger. Touch targets ≥ 44px |
| Dashboard loads slowly with many conversations | Technical | Medium | Medium | Limit recent conversations to 5. Paginate API calls. Skeleton loading states |
| Workspace switcher is confusing with 1 workspace | UX | Medium | Low | Hide switcher if only 1 workspace. Show "Create workspace" button if 0 |

### CP5 — Knowledge UX

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| Knowledge pipeline processing takes > 30s | Technical | Medium | High | Async processing with polling. Show "processing in background" message. Notification when complete |
| User uploads incompatible file format | UX | Medium | Low | Client-side file type validation. Clear error message. List supported formats |
| Publish creates version 0 due to race condition | Technical | Low | High | Lock publish endpoint per tenant. Show "publishing" state. Poll for completion |
| Upload progress bar is inaccurate | UX | Medium | Low | Show indeterminate progress for processing phase. Use exact percentage for upload phase |

### CP6 — Widget UX

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| Widget JS conflicts with customer site's existing JS | Technical | High | High | IIFE wrapper. Shadow DOM for styles. No global scope pollution. No external dependencies |
| Widget doesn't load on IE11 | Technical | Medium | Low | Document browser support (last 2 major versions). Graceful degradation (hide widget, no errors) |
| Streaming chat response inconsistent across browsers | Technical | Medium | Medium | Fallback to non-streaming for fetch-only browsers. SSE with text/event-stream for modern browsers |
| Domain verification is too complex for non-technical users | UX | High | Medium | Make domain verification optional. Auto-detect DNS/meta tag. Provide step-by-step instructions |
| Team invites go to spam | Technical | Medium | Medium | Same mitigation as CP2 email. Provide resend option in team management |

### CP7 — Billing

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| Stripe webhook delivery fails | Technical | Medium | High | Stripe retries up to 3 times. Build idempotent webhook handler. Alert on webhook failure |
| Proration calculation is incorrect | Technical | Low | High | Use Stripe's proration calculation. Test all upgrade/downgrade scenarios in Stripe test mode |
| Plan enforcement has gaps (some APIs not checked) | Technical | Medium | High | Centralized rate limit middleware. All tenant-scoped APIs pass through usage check. Inventory all APIs |
| Customer enters payment but Stripe session creation fails | Technical | Low | Medium | Show clear error message. Redirect to retry. Log Stripe error for support |

### CP8 — Analytics

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| SQLite aggregation queries slow with 100K+ messages | Technical | Medium | Medium | Add composite indexes on (tenant_id, created_at). Consider summary table for daily aggregates |
| Charts display incorrect data due to timezone issues | Technical | Medium | Medium | All timestamps UTC. Date range picker converts to UTC. Document timezone handling |
| Analytics page has no useful data for new customers | UX | High | Medium | Show "no data yet" state with CTA to upload knowledge. Estimate when data will appear |

### CP9 — Launch Preparation

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| WCAG issues require significant rework | Technical | Medium | High | Start a11y work in CP5, not CP9. Automated aXe checks in CI from CP3 onward |
| Production environment differs from development | Technical | Medium | High | Docker consistency. Staging environment identical to production. CI/CD pipeline |
| SSL certificate provisioning delayed | Operational | Low | Medium | Start certificate process 2 weeks before launch. Use Let's Encrypt (free, auto-renewal) |
| DNS propagation delays domain verification | Operational | Medium | Low | Configure DNS at least 48 hours before launch. Use low TTL during launch window |

### 11.2 Cross-Cutting Risks

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| Scope creep (adding features during implementation) | Product | High | High | Freeze scope at CP1.5. All new feature requests go to "v1.1" backlog |
| Key person dependency (engineer leaves) | Business | Medium | High | Cross-train. Document architecture. Implement in small independent chunks |
| CP1.5b design deliverables delayed | Schedule | Medium | High | Start CP2 (backend APIs) in parallel with CP1.5b. Backend doesn't need design |
| Stripe account approval delayed | Business | Low | High | Start Stripe account setup during CP2. Don't wait until CP7 |
| Framework choice causes migration pain | Technical | Medium | Medium | Use same framework as existing admin portal (Vue) for consistency. Confirm in CP1.5b |

### 11.3 Risk Response Strategies

| Strategy | Applied To |
|----------|-----------|
| **Avoid** — Design to eliminate the risk | Widget JS: use IIFE + Shadow DOM to avoid JS conflicts |
| **Mitigate** — Reduce likelihood or impact | Auth tokens: 24-hour TTL + resend. Pipeline processing: async + polling |
| **Transfer** — Shift risk to third party | Payment processing: Stripe handles PCI compliance |
| **Accept** — Acknowledge and monitor | Framework churn risk (Vue is stable). Marketing copy changes (use CMS) |

---

## 12. Final Implementation Checklist

### 12.1 Phase Gate Checklist

### Gate 1: CP2 Complete
- [ ] `POST /api/auth/forgot-password` — integration tested, rate limited
- [ ] `POST /api/auth/reset-password/:token` — integration tested, token expiry verified
- [ ] `GET /api/auth/verify-email/:token` — integration tested, duplicate verification handled
- [ ] `POST /api/auth/resend-verification` — integration tested, rate limited
- [ ] `POST /api/auth/refresh` — integration tested, old token invalidated
- [ ] Email sender configured with SMTP — welcome, verification, reset templates
- [ ] Verification/reset token tables created with TTL index
- [ ] Auth API integration tests pass
- [ ] Regression: `npm test` passes

### Gate 2: CP3 Complete
- [ ] Frontend project initialized, theme system active
- [ ] PublicLayout renders correctly (Navbar + Footer)
- [ ] Landing page matches CP1.5b wireframes
- [ ] Features page renders correctly
- [ ] Pricing page renders with correct plans/toggle
- [ ] Documentation pages complete (getting started, API ref, widget guide, FAQ)
- [ ] Legal pages complete (Privacy, Terms, Cookies, DPA)
- [ ] Sign Up page functional — form validation, API integration, error states
- [ ] Login page functional — JWT cookie, redirect, error states
- [ ] Forgot Password page functional
- [ ] Reset Password page functional
- [ ] Email Verification page functional
- [ ] Profile page functional
- [ ] Lighthouse ≥ 90 all categories
- [ ] Sitemap.xml and robots.txt accessible
- [ ] Structured data validates (Product, SoftwareApplication)
- [ ] All 11 public/auth pages responsive at mobile, tablet, desktop
- [ ] Regression: `npm test` passes

### Gate 3: CP4 Complete
- [ ] AppLayout renders (Sidebar + TopBar + content slot)
- [ ] Sidebar navigation works at all breakpoints (collapsed on mobile)
- [ ] Breadcrumb component generates correct path
- [ ] Workspace switcher functional
- [ ] Dashboard page shows real data from existing APIs
- [ ] Dashboard stat cards correct (usage, conversations, KBs)
- [ ] Dashboard RecentConversations renders
- [ ] Dashboard EmptyState renders when no data
- [ ] Dashboard LoadingSkeleton renders during data fetch
- [ ] Workspace Settings page functional (branding, delete)
- [ ] UpgradeBanner shown on free plan, dismissible
- [ ] Toast notifications work (success, error, warning, info)
- [ ] Regression: `npm test` passes

### Gate 4: CP5 Complete
- [ ] Knowledge Bases list page functional (CRUD)
- [ ] Knowledge Detail page functional (documents, stats)
- [ ] Document upload modal functional (Files, URL, FAQ tabs)
- [ ] Upload progress indicator accurate
- [ ] Processing status polling works
- [ ] Knowledge search returns results
- [ ] Publish flow complete (configure → publish → install)
- [ ] WidgetConfigPanel functional (position, theme, auto-open)
- [ ] Onboarding Wizard 5 steps complete
- [ ] Onboarding progress saved and resumable
- [ ] Knowledge error states correct (upload fail, pipeline fail, publish fail)
- [ ] Knowledge empty states correct (no KBs, no documents, no publish)
- [ ] Regression: `npm test` passes

### Gate 5: CP6 Complete
- [ ] Widget JS loads on clean HTML page (no errors)
- [ ] Widget JS sends message to chat endpoint
- [ ] Widget JS receives and renders response
- [ ] Widget JS respects theme, position, auto-open config
- [ ] Widget JS renders in Chrome, Firefox, Safari, Edge (Playwright)
- [ ] Widget JS passes Playwright cross-browser tests
- [ ] Widget config API returns correct config
- [ ] Widget Installer page functional (snippet copy, domain verify, test)
- [ ] Snippet copy-to-clipboard works
- [ ] Domain verification works (meta tag method)
- [ ] Conversations List page functional (paginated, searchable)
- [ ] Conversation Detail page functional (messages, metadata)
- [ ] API Keys page functional (create, reveal once, revoke)
- [ ] Team Members page functional (invite, accept, remove, role change)
- [ ] Team invitation APIs integration tested
- [ ] Widget JS ~15KB gzipped or less
- [ ] Regression: `npm test` passes

### Gate 6: CP7 Complete
- [ ] Stripe products and prices created in live mode
- [ ] Stripe webhook endpoint registered and verified
- [ ] `POST /api/billing/create-checkout-session` — integration tested
- [ ] `POST /api/billing/create-portal-session` — integration tested
- [ ] `POST /api/billing/webhook` — all 5 event types handled
- [ ] Webhook signature verified on every request
- [ ] `GET /api/billing/current` — returns correct subscription + usage
- [ ] `GET /api/billing/invoices` — returns synced invoices
- [ ] `GET /api/billing/plans` — returns plan definitions
- [ ] Plan enforcement middleware blocks over-limit requests
- [ ] Billing page renders (CurrentPlanCard, UsageMeter, PlanChangePanel, InvoiceTable)
- [ ] Upgrade/downgrade flow works end-to-end
- [ ] Cancellation flow ends subscription at period end
- [ ] Subscription lifecycle tested (trialing → active → past_due → cancelled → expired)
- [ ] Regression: `npm test` passes

### Gate 7: CP8 Complete
- [ ] `GET /api/analytics/messages/daily` — integration tested
- [ ] `GET /api/analytics/conversations/daily` — integration tested
- [ ] `GET /api/analytics/tokens/daily` — integration tested
- [ ] Analytics page renders (StatCards, charts, date range picker)
- [ ] Message volume chart displays correct data
- [ ] Conversation trend chart displays correct data
- [ ] Token usage chart displays correct data
- [ ] Date range presets work (7d, 30d, 90d, custom)
- [ ] Plan usage bar shows correct percentages
- [ ] CSV export downloads correctly
- [ ] Analytics empty state renders when no data
- [ ] Regression: `npm test` passes

### Gate 8: CP9 Complete
- [ ] WCAG Level AA audit: zero critical/severe violations
- [ ] Keyboard navigation: all interactive elements reachable and operable
- [ ] Screen reader: all pages navigable with VoiceOver/NVDA
- [ ] Color contrast: 4.5:1 for text, 3:1 for large text
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge last 2 major versions
- [ ] Mobile responsive: all pages at 375px, 768px, 1024px, 1440px
- [ ] Error states: all pages verified for network error, 404, 403, 500, validation
- [ ] Loading states: all data-bound pages show skeleton/spinner
- [ ] Empty states: all list pages show correct empty state
- [ ] Load test: P50 < 1000ms, P95 < 3000ms, P99 < 5000ms, error rate < 5%
- [ ] Soak test: no memory leak, error rate < 10% over 1 hour
- [ ] Production deployment: Docker compose on production VPS
- [ ] SSL/TLS: Let's Encrypt, auto-renewal configured, HSTS enabled
- [ ] CDN: widget JS and static assets served via CDN
- [ ] Monitoring: Prometheus scraping, alert rules, uptime monitor
- [ ] Email: SPF, DKIM, DMARC configured, delivery verified
- [ ] Backups: database + file storage, daily, verified restore
- [ ] Rollback: documented and tested
- [ ] Regression: `npm test` passes

### 12.2 Master Task Checklist

### Phase CP2 — Authentication Backend
- [ ] Email sender service implemented (interface + SMTP)
- [ ] Email templates designed (welcome, verify, reset, invite)
- [ ] `forgot-password` endpoint implemented
- [ ] `reset-password` endpoint implemented
- [ ] `verify-email` endpoint implemented
- [ ] `resend-verification` endpoint implemented
- [ ] `refresh` endpoint implemented
- [ ] Token tables created (verification_tokens, reset_tokens)
- [ ] Rate limiting applied to password reset endpoints
- [ ] Integration tests pass for all new endpoints
- [ ] Regression tests pass

### Phase CP3 — Public Website
- [ ] Frontend project initialized
- [ ] Design tokens applied (colors, typography, spacing)
- [ ] PublicLayout component created (Navbar + Footer)
- [ ] Landing page MVP built
- [ ] Features page built
- [ ] Pricing page built (with plan toggle)
- [ ] Documentation pages built (getting started, API ref, widget guide, FAQ)
- [ ] Legal pages built (Privacy, Terms, Cookies, DPA)
- [ ] Sign Up page built and wired to API
- [ ] Login page built and wired to API
- [ ] Forgot Password page built and wired to API
- [ ] Reset Password page built and wired to API
- [ ] Email Verification page built and wired to API
- [ ] Profile page built and wired to API
- [ ] AuthLayout created (form container)
- [ ] Toast notification system implemented
- [ ] Form validation implemented for all auth forms
- [ ] JWT cookie management implemented (set, refresh, clear)
- [ ] SEO metadata configured (meta tags, OG, sitemap, robots.txt)
- [ ] Structured data implemented (Product, SoftwareApplication)
- [ ] Lighthouse audit passed (≥ 90 all categories)
- [ ] Responsive at all breakpoints
- [ ] Unit tests for all new components
- [ ] Integration tests for all auth flows
- [ ] Regression tests pass

### Phase CP4 — Customer Dashboard
- [ ] AppLayout created (Sidebar + TopBar + content slot)
- [ ] Sidebar navigation responsive (collapsible on mobile)
- [ ] Breadcrumb component implemented
- [ ] WorkspaceSwitcher component implemented
- [ ] StatCard component implemented
- [ ] UsageMeter component implemented
- [ ] RecentConversations component implemented
- [ ] QuickActions component implemented
- [ ] UpgradeBanner component implemented
- [ ] BrandingForm component implemented (color picker, logo, messages)
- [ ] DangerZone component implemented (delete confirmation)
- [ ] Dashboard page built and wired to APIs
- [ ] Workspace Settings page built and wired to APIs
- [ ] Empty states for dashboard (no conversations, no knowledge)
- [ ] Loading skeletons for dashboard components
- [ ] Error states for dashboard API failures
- [ ] Unit tests for all new components
- [ ] Integration tests for dashboard data loading
- [ ] Regression tests pass

### Phase CP5 — Knowledge UX
- [ ] KnowledgeTable component implemented
- [ ] CreateKBModal component implemented
- [ ] DocumentTable component implemented
- [ ] StatusBadge component implemented (processing, completed, failed, pending)
- [ ] UploadZone component implemented (drag-and-drop)
- [ ] UrlCrawlInput component implemented
- [ ] FaqEditor component implemented
- [ ] ProgressIndicator component implemented
- [ ] Stepper component implemented
- [ ] WizardStep component implemented
- [ ] PublishStepper component implemented
- [ ] WidgetConfigPanel component implemented
- [ ] WidgetPreview component implemented
- [ ] VersionHistory component implemented
- [ ] CompletionCelebration component implemented
- [ ] Knowledge Bases list page built
- [ ] Knowledge Detail page built
- [ ] Upload modal built
- [ ] Onboarding Wizard built (5 steps)
- [ ] Publish page built
- [ ] Knowledge search implemented
- [ ] Upload processing polling implemented
- [ ] Empty states for all knowledge pages
- [ ] Error states for all knowledge failure modes
- [ ] Unit tests for all new components
- [ ] Integration tests for upload → process → publish flow
- [ ] E2E test for full knowledge lifecycle
- [ ] Regression tests pass

### Phase CP6 — Widget UX
- [ ] Widget JS skeleton created (IIFE, no framework)
- [ ] Widget JS config loader implemented
- [ ] Widget JS chat button implemented (FAB)
- [ ] Widget JS chat window implemented (dialog/sheet)
- [ ] Widget JS message rendering implemented (user/assistant bubbles)
- [ ] Widget JS API integration implemented (POST /api/chat)
- [ ] Widget JS streaming support implemented (SSE)
- [ ] Widget JS auto-open logic implemented
- [ ] Widget JS domain verification implemented
- [ ] Widget JS error handling implemented (retry, fallback)
- [ ] Widget JS responsive (mobile bottom sheet, desktop dialog)
- [ ] Widget JS accessible (ARIA labels, focus trap, escape)
- [ ] Widget JS built and deployed (minified, ~15KB gzipped)
- [ ] Widget JS cross-browser tested (Playwright, 3 browsers)
- [ ] Widget config API `GET /api/widget/:tenantId/config` implemented
- [ ] SnippetDisplay component implemented
- [ ] DomainVerificationInput component implemented (meta tag method)
- [ ] InstallationStatus component implemented
- [ ] ConversationTable component implemented (sortable, paginated)
- [ ] MessageList component implemented (chat bubbles)
- [ ] MessageMetadata component implemented (token count, latency, flags)
- [ ] InfoPanel component implemented (metadata sidebar)
- [ ] ApiKeyTable component implemented (masked keys)
- [ ] CreateApiKeyModal component implemented (label, role)
- [ ] KeyRevealDialog component implemented (show once)
- [ ] RevokeConfirmDialog component implemented
- [ ] MemberTable component implemented
- [ ] InviteMemberModal component implemented
- [ ] RoleBadge component implemented
- [ ] Team APIs (invite, accept, remove, role change) implemented
- [ ] Widget Installer page built
- [ ] Conversations List page built
- [ ] Conversation Detail page built
- [ ] API Keys page built
- [ ] Team Members page built
- [ ] Empty states for installer, conversations, API keys, team
- [ ] Error states for widget, API key, team failures
- [ ] Unit tests for all new components
- [ ] Integration tests for team CRUD
- [ ] Integration tests for widget config API
- [ ] E2E tests for widget installation + chat
- [ ] Regression tests pass

### Phase CP7 — Billing
- [ ] Stripe products configured (Free, Starter, Professional, Enterprise)
- [ ] Stripe prices configured (monthly recurring)
- [ ] Checkout session endpoint implemented
- [ ] Portal session endpoint implemented
- [ ] Webhook endpoint implemented (5 event types)
- [ ] Webhook signature verification implemented
- [ ] Current subscription endpoint implemented
- [ ] Invoices endpoint implemented
- [ ] Plans endpoint implemented (or static config)
- [ ] Plan enforcement middleware implemented
- [ ] CurrentPlanCard component implemented
- [ ] PlanChangePanel component implemented
- [ ] InvoiceTable component implemented
- [ ] PaymentMethodCard component implemented
- [ ] CancelSubscriptionDialog component implemented
- [ ] Billing page built
- [ ] Subscription lifecycle tested (all transitions)
- [ ] Plan change tested (upgrade, downgrade)
- [ ] Cancellation tested (end of period)
- [ ] Over-limit enforcement tested
- [ ] Empty state for invoices
- [ ] Error states for billing failures
- [ ] Unit tests for all new components
- [ ] Integration tests for billing APIs (Stripe mock)
- [ ] E2E test for billing page
- [ ] Regression tests pass

### Phase CP8 — Analytics
- [ ] Daily messages aggregation API implemented
- [ ] Daily conversations aggregation API implemented
- [ ] Daily tokens aggregation API implemented
- [ ] UsageChart component implemented (line/bar/area)
- [ ] DateRangePicker component implemented (presets + custom)
- [ ] PlanUsageBar component implemented
- [ ] Analytics page built
- [ ] Chart data loaded from aggregation endpoints
- [ ] Date range changes refresh charts
- [ ] CSV export implemented
- [ ] Empty state when no data
- [ ] Unit tests for analytics components
- [ ] Integration tests for aggregation APIs
- [ ] E2E test for analytics page
- [ ] Regression tests pass

### Phase CP9 — Launch Preparation
- [ ] WCAG Level AA audit completed
- [ ] Keyboard navigation issues resolved
- [ ] Screen reader issues resolved
- [ ] Color contrast verified
- [ ] Cross-browser testing completed
- [ ] Mobile responsive testing completed
- [ ] Error states verified on all pages
- [ ] Loading states verified on all pages
- [ ] Empty states verified on all pages
- [ ] Load test passed on production hardware
- [ ] Soak test passed (1 hour)
- [ ] Production deployment completed
- [ ] SSL/TLS configured with auto-renewal
- [ ] CDN configured for static assets
- [ ] Monitoring and alerting active
- [ ] Email delivery verified (SPF, DKIM, DMARC)
- [ ] Database backups configured and tested
- [ ] Rollback procedure documented and tested
- [ ] Deployment checklist signed off
- [ ] Full regression suite passes

### 12.3 Launch Day Checklist

**12 hours before launch:**
- [ ] Final deploy to production
- [ ] Run full test suite against production
- [ ] Run load test against production
- [ ] Verify all health endpoints respond
- [ ] Verify Stripe webhook delivery
- [ ] Verify email delivery
- [ ] Verify monitoring dashboards show data
- [ ] Verify backup ran successfully
- [ ] Confirm rollback procedure with team

**Launch:**
- [ ] Enable public signups (remove allowlist)
- [ ] Verify signup flow end-to-end
- [ ] Verify Stripe checkout flow
- [ ] Verify widget JS loads on test site
- [ ] Monitor error rates for 30 minutes
- [ ] Announce on status page / social media

**Post-launch (24 hours):**
- [ ] Review error logs
- [ ] Review performance metrics
- [ ] Review Stripe transaction logs
- [ ] Review email delivery logs
- [ ] Address any P0/P1 issues
- [ ] Send launch report to team

---

## Appendix: File Map

All new files created during implementation, organized by phase.

```
CP2 — Authentication Backend
  packages/saas-core/src/email/
    EmailSender.ts
    SmtpEmailSender.ts
    templates/welcome.html
    templates/verify-email.html
    templates/reset-password.html
    templates/team-invite.html
  packages/saas-api/src/routes/auth.ts (append handlers)
  packages/saas-core/src/db/repositories.ts (append TokenRepository)

CP3 — Public Website
  src/ (frontend project root)
    theme.css (design tokens)
    layouts/PublicLayout.vue
    layouts/AuthLayout.vue
    pages/Landing.vue
    pages/Features.vue
    pages/Pricing.vue
    pages/docs/Index.vue
    pages/docs/GettingStarted.vue
    pages/docs/ApiReference.vue
    pages/docs/WidgetGuide.vue
    pages/docs/Faq.vue
    pages/legal/Privacy.vue
    pages/legal/Terms.vue
    pages/legal/Cookies.vue
    pages/legal/Dpa.vue
    pages/auth/Signup.vue
    pages/auth/Login.vue
    pages/auth/ForgotPassword.vue
    pages/auth/ResetPassword.vue
    pages/auth/VerifyEmail.vue
    pages/auth/Profile.vue
    components/Navbar.vue
    components/Footer.vue
    components/Hero.vue
    components/FeatureCard.vue
    components/FeatureGrid.vue
    components/PricingCard.vue
    components/PricingToggle.vue
    components/Testimonial.vue
    components/TrustBar.vue
    components/FaqAccordion.vue
    components/Cta.vue
    components/SignUpForm.vue
    components/LoginForm.vue
    components/Toast.vue
    components/Modal.vue
    components/LoadingSkeleton.vue
    components/EmptyState.vue

CP4 — Customer Dashboard
  components/Sidebar.vue
  components/TopBar.vue
  components/Breadcrumb.vue
  components/WorkspaceSwitcher.vue
  components/StatCard.vue
  components/UsageMeter.vue
  components/UpgradeBanner.vue
  components/BrandingForm.vue
  components/DangerZone.vue
  layouts/AppLayout.vue
  pages/Dashboard.vue
  pages/WorkspaceSettings.vue

CP5 — Knowledge UX
  components/KnowledgeTable.vue
  components/CreateKBModal.vue
  components/DocumentTable.vue
  components/StatusBadge.vue
  components/UploadZone.vue
  components/UrlCrawlInput.vue
  components/FaqEditor.vue
  components/ProgressIndicator.vue
  components/Stepper.vue
  components/WizardStep.vue
  components/PublishStepper.vue
  components/WidgetConfigPanel.vue
  components/WidgetPreview.vue
  components/VersionHistory.vue
  components/CompletionCelebration.vue
  pages/KnowledgeBases.vue
  pages/KnowledgeDetail.vue
  pages/OnboardingWizard.vue
  pages/Publish.vue

CP6 — Widget UX
  packages/widget/src/
    widget.js (standalone, no framework)
  packages/saas-api/src/routes/widget.ts
  packages/saas-api/src/routes/tenants.ts (append team handlers)
  components/SnippetDisplay.vue
  components/DomainVerificationInput.vue
  components/InstallationStatus.vue
  components/ConversationTable.vue
  components/MessageList.vue
  components/MessageMetadata.vue
  components/InfoPanel.vue
  components/ApiKeyTable.vue
  components/CreateApiKeyModal.vue
  components/KeyRevealDialog.vue
  components/MemberTable.vue
  components/InviteMemberModal.vue
  components/RoleBadge.vue
  components/RevokeConfirmDialog.vue
  pages/WidgetInstaller.vue
  pages/Conversations.vue
  pages/ConversationDetail.vue
  pages/ApiKeys.vue
  pages/Team.vue

CP7 — Billing
  packages/saas-api/src/routes/billing.ts
  packages/saas-api/src/services/StripeService.ts
  packages/saas-api/src/services/SubscriptionManager.ts
  packages/saas-api/src/middleware/requireActiveSubscription.ts
  packages/saas-core/src/db/repositories.ts (append InvoiceRepository)
  components/CurrentPlanCard.vue
  components/PlanChangePanel.vue
  components/InvoiceTable.vue
  components/PaymentMethodCard.vue
  components/CancelSubscriptionDialog.vue
  pages/Billing.vue

CP8 — Analytics
  packages/saas-api/src/routes/analytics.ts
  components/UsageChart.vue
  components/DateRangePicker.vue
  components/PlanUsageBar.vue
  pages/Analytics.vue

CP9 — Launch Preparation
  (no new source files — audits, config, ops)
```
