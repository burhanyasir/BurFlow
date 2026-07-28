# CP2 Preparation — Engineering-to-Design Bridge

**Date:** 2026-07-21
**Status:** Pre-design, pre-implementation
**Purpose:** Define what engineering requires from the Claude design phase and verify readiness for CP2 implementation

---

## 1. Backend Readiness

### 1.1 Existing APIs Verified

Every API listed below exists in the RC1 monorepo (`engine/packages/saas-api/src/`) and is frozen — no changes permitted:

| Endpoint | Status | Used By |
|----------|--------|---------|
| `POST /api/auth/signup` | Verified | Sign Up page |
| `POST /api/auth/login` | Verified | Login page |
| `GET /api/auth/me` | Verified | Profile page, auth context |
| `PUT /api/auth/me` | Verified | Profile page |
| `PUT /api/auth/password` | Verified | Profile page (password change) |
| `GET /api/tenants/` | Verified | Workspace switcher |
| `GET /api/tenants/:id` | Verified | Dashboard, Workspace Settings, Widget Installer |
| `POST /api/tenants/` | Verified | Onboarding wizard (workspace creation) |
| `PUT /api/tenants/:id` | Verified | Workspace Settings, Publish, Onboarding |
| `DELETE /api/tenants/:id` | Verified | Workspace Settings (danger zone) |
| `GET /api/tenants/:id/members` | Verified | Team Members page |
| `GET /api/knowledge-bases` | Verified | Dashboard, Knowledge Bases list |
| `POST /api/knowledge-bases` | Verified | Knowledge Bases list, Onboarding |
| `GET /api/knowledge-bases/:id` | Verified | Knowledge Detail |
| `DELETE /api/knowledge-bases/:id` | Verified | Knowledge Bases list |
| `GET /api/knowledge-bases/:id/documents` | Verified | Knowledge Detail |
| `POST /api/knowledge/upload` | Verified | Upload modal, Onboarding |
| `POST /api/knowledge/upload/faq` | Verified | Upload modal, Onboarding |
| `POST /api/knowledge/crawl` | Verified | Upload modal, Onboarding |
| `GET /api/knowledge/sources` | Verified | Knowledge Detail (processing status) |
| `GET /api/knowledge/sources/:id` | Verified | Upload modal (poll status) |
| `DELETE /api/knowledge/sources/:id` | Verified | Knowledge Detail |
| `POST /api/knowledge/sources/:id/reindex` | Verified | Knowledge Detail |
| `POST /api/knowledge/publish` | Verified | Publish page, Onboarding |
| `GET /api/knowledge/versions` | Verified | Publish page |
| `GET /api/knowledge/stats` | Verified | Knowledge Detail, Dashboard |
| `POST /api/knowledge/search` | Verified | Knowledge Detail (search) |
| `POST /api/knowledge/context` | Verified | Widget chat pipeline |
| `GET /api/api-keys` | Verified | API Keys page |
| `POST /api/api-keys` | Verified | API Keys page |
| `DELETE /api/api-keys/:id` | Verified | API Keys page |
| `GET /api/conversations` | Verified | Conversations list, Dashboard |
| `GET /api/conversations/:id` | Verified | Conversation Detail |
| `GET /api/conversations/:id/messages` | Verified | Conversation Detail |
| `GET /api/usage/current` | Verified | Dashboard, Billing |
| `GET /api/usage` | Verified | Analytics, Billing |
| `POST /api/chat` | Verified | Widget chat (pipeline) |
| `GET /api/health` | Verified | Health checks |

**Total existing APIs available for customer product: 35**

### 1.2 Missing APIs (19 total)

Grouped into implementation milestones as defined in IMPLEMENTATION_SEQUENCE.md:

#### Milestone A — Auth APIs (CP2, Priority: Critical)

| # | API | Blocks | Complexity |
|---|-----|--------|------------|
| A1 | `POST /api/auth/forgot-password` | Forgot Password page | Medium — token generation, email, rate limit |
| A2 | `POST /api/auth/reset-password/:token` | Reset Password page | Medium — token verification, hash update |
| A3 | `GET /api/auth/verify-email/:token` | Email Verification page | Low — set flag, return status |
| A4 | `POST /api/auth/resend-verification` | Email Verification page | Low — generate token, resend email |
| A5 | `POST /api/auth/refresh` | Profile page (UX), all pages (session continuity) | Low — verify token, reissue |

**Milestone A total:** 5 APIs — all required before CP3 auth pages can be wired.

#### Milestone B — Widget Config API (CP6, Priority: High)

| # | API | Blocks | Complexity |
|---|-----|--------|------------|
| B1 | `GET /api/widget/:tenantId/config` | Widget Installer page, Widget JS | Low — aggregate existing tenant + knowledge data |

#### Milestone C — Team Management APIs (CP6, Priority: High)

| # | API | Blocks | Complexity |
|---|-----|--------|------------|
| C1 | `POST /api/tenants/:id/invite` | Team Members page | Medium — token gen, email, role checks |
| C2 | `POST /api/tenants/invitations/:token/accept` | Team Members page | Low — token verify, add member |
| C3 | `DELETE /api/tenants/:id/members/:userId` | Team Members page | Low — DB delete, permission check |
| C4 | `PUT /api/tenants/:id/members/:userId/role` | Team Members page | Low — DB update, role validation |

#### Milestone D — Billing APIs (CP7, Priority: High)

| # | API | Blocks | Complexity |
|---|-----|--------|------------|
| D1 | `POST /api/billing/create-checkout-session` | Billing page | Medium — Stripe session creation |
| D2 | `POST /api/billing/create-portal-session` | Billing page | Low — Stripe portal session |
| D3 | `POST /api/billing/webhook` | All billing lifecycle | Medium — event handling, status transitions |
| D4 | `GET /api/billing/current` | Billing page, Dashboard | Low — aggregate query |
| D5 | `GET /api/billing/invoices` | Billing page | Low — query invoices |
| D6 | `GET /api/billing/plans` | Billing page, Pricing page | Low — static config endpoint |

#### Milestone E — Analytics APIs (CP8, Priority: Medium)

| # | API | Blocks | Complexity |
|---|-----|--------|------------|
| E1 | `GET /api/analytics/messages/daily` | Analytics page | Medium — SQL aggregation by date |
| E2 | `GET /api/analytics/conversations/daily` | Analytics page | Medium — SQL aggregation by date |
| E3 | `GET /api/analytics/tokens/daily` | Analytics page | Medium — SQL aggregation by date |

### 1.3 Backend Freeze Confirmation

The following are **frozen** — no changes permitted:
- Pipeline stages or execution flow
- Existing SaaS API endpoints or their response shapes
- Database schemas of existing tables
- Error code definitions (all 35 codes mapped in Phase 2)
- Auth middleware behavior (3→1 deduplication completed in Phase 2)
- Store implementations (dedup TTL fix, config-store path traversal fix, secrets-vault startup validation completed)

**Only additions permitted:**
- New route files in `engine/packages/saas-api/src/routes/`
- New repository methods in `engine/packages/saas-core/src/db/repositories.ts`
- New tables (verification_tokens, reset_tokens, invitations, invoices — SQLite)
- New service files in `engine/packages/saas-api/src/services/`

---

## 2. Frontend Readiness

### 2.1 Current State

The `frontend/` directory is an empty scaffold:
- Directory structure exists: `src/api/`, `src/components/`, `src/features/`, `src/hooks/`, `src/services/`, `src/stores/`, `src/types/`, `src/utils/`, `src/public/`, `src/deployment/`, `src/e2e/`, `docs/`
- **Zero files** — all directories are empty
- No package.json, no framework configuration, no routing, no components
- Framework choice is not yet confirmed (IMPLEMENTATION_SEQUENCE.md suggests Vue to match existing admin portal)

### 2.2 Page-to-API Dependency Table

Every frontend page, its backend dependencies, and whether those APIs exist:

| Page | Route | Phase | Existing APIs | Missing APIs | Design Required? |
|------|-------|-------|---------------|--------------|------------------|
| Landing | `/` | CP3 | None | None | **Yes** — hero, feature grid, CTA, testimonial layout |
| Features | `/features` | CP3 | None | None | **Yes** — alternating feature section layout |
| Pricing | `/pricing` | CP3 | None | None | **Yes** — pricing card layout, plan names/prices |
| Sign Up | `/signup` | CP3 | `POST /api/auth/signup` | — | **Yes** — form layout, error states, validation style |
| Login | `/login` | CP3 | `POST /api/auth/login` | — | **Yes** — form layout |
| Forgot Password | `/forgot-password` | CP3 | — | A1 `POST /api/auth/forgot-password` | **Yes** — form layout, success message |
| Reset Password | `/reset-password/:token` | CP3 | — | A2 `POST /api/auth/reset-password/:token` | **Yes** — form layout, expired token state |
| Email Verification | `/verify-email/:token` | CP3 | — | A3 `GET /api/auth/verify-email/:token`, A4 `POST /api/auth/resend-verification` | **Yes** — success/error/expired states |
| Dashboard | `/dashboard` | CP4 | `GET /api/usage/current`, `GET /api/conversations?limit=5`, `GET /api/knowledge-bases`, `GET /api/tenants/:id` | — | **Yes** — stat card layout, recent conversations, quick actions |
| Onboarding Wizard | `/onboarding` | CP5 | All KB + tenant + publish APIs | — | **Yes** — 5-step wizard design critical |
| Workspace Settings | `/workspace` | CP4 | `GET /api/tenants/:id`, `PUT /api/tenants/:id` | — | **Yes** — branding form, danger zone |
| Knowledge Bases | `/knowledge` | CP5 | All KB CRUD APIs | — | **Yes** — table layout, create modal |
| Knowledge Detail | `/knowledge/:id` | CP5 | All document + source APIs | — | **Yes** — document table, search, stats |
| Document Upload | `/knowledge/:id/upload` | CP5 | All upload APIs | — | **Yes** — upload zone, tabs, progress |
| Publish Widget | `/publish` | CP5 | Publish + version APIs, tenant settings | — | **Yes** — stepper, config panel, preview |
| Widget Installer | `/publish/install` | CP6 | Published knowledge, tenant config | B1 `GET /api/widget/:tenantId/config` | **Yes** — snippet display, domain verification |
| Conversations | `/conversations` | CP6 | `GET /api/conversations` | — | **Yes** — table layout, filters |
| Conversation Detail | `/conversations/:id` | CP6 | `GET /api/conversations/:id`, messages | — | **Yes** — message bubble layout, metadata panel |
| Analytics | `/analytics` | CP8 | `GET /api/usage/current` | E1-E3 | **Yes** — chart types, date range picker |
| API Keys | `/api-keys` | CP6 | All API key APIs | — | **Yes** — table, create modal, reveal dialog |
| Team Members | `/team` | CP6 | `GET /api/tenants/:id/members` | C1-C4 | **Yes** — member table, invite modal |
| Billing | `/billing` | CP7 | — | D1-D6 | **Yes** — plan card, invoice table, payment method |
| Profile | `/profile` | CP3 | `GET /api/auth/me`, `PUT /api/auth/me`, `PUT /api/auth/password` | A5 (refresh) | **Yes** — form layout |
| Support | `/support` | CP4 | None | None | **Yes** — FAQ accordion, contact form |
| Documentation | `/docs` | CP3 | None | None | **Yes** — sidebar nav, content layout, code blocks |
| Privacy/Terms | `/privacy`, `/terms` | CP3 | None | None | Minimal — legal text, basic layout |
| Logout | `/logout` | CP3 | None | None | None — action-only, no page needed |

**Key insight:** Every page except Logout requires design input. 27 of 28 pages need wireframes or visual specs.

### 2.3 Pages That Cannot Begin Without Claude Design

| Dependency | Pages Blocked |
|------------|---------------|
| Brand identity (colors, typography, logo) | All 27 pages — no theme system without brand tokens |
| Hero + FeatureGrid + Testimonial wireframes | Landing page |
| Pricing card layout + plan names/prices | Pricing page, Billing page |
| Auth page wireframes (form layout, error state design) | Sign Up, Login, Forgot Password, Reset Password, Email Verification, Profile |
| Dashboard wireframes | Dashboard |
| 5-step wizard wireframes | Onboarding Wizard |
| Knowledge page wireframes (list, detail, upload, publish) | Knowledge Bases, Knowledge Detail, Upload modal, Publish |
| Widget installer wireframes | Widget Installer |
| Conversation page wireframes | Conversations list, Conversation Detail |
| Chart type selection (line, bar, area) | Analytics |
| API key management wireframes | API Keys |
| Team management wireframes | Team Members |
| Billing page wireframes | Billing |

**Pages that can partially start before design:** None — all need at minimum the design token file (colors, typography, spacing) to begin component work.

### 2.4 Reusable Components Required

81 components organized into 12 tiers (from IMPLEMENTATION_SEQUENCE.md):

**Tier 1 — Foundation (8 components):** ThemeProvider, Router, HTTP client, Auth context, Toast, Modal, LoadingSkeleton, EmptyState
**Tier 2 — Layout (9 components):** Navbar, Footer, PublicLayout, AuthLayout, Sidebar, TopBar, AppLayout, WorkspaceSwitcher, Breadcrumb
**Tier 3 — Marketing (12 components):** Hero, FeatureCard, FeatureGrid, PricingCard, PricingToggle, Testimonial, TrustBar, FaqAccordion, CTA, DocSidebar, DocContent, CodeBlock
**Tier 4 — Auth (8 components):** SignUpForm, LoginForm, SocialLoginButtons, ProfileForm, PasswordChangeForm, EmailForm, ResetPasswordForm, VerificationStatus
**Tier 5 — Dashboard (7 components):** StatCard, UsageMeter, RecentConversations, QuickActions, UpgradeBanner, BrandingForm, DangerZone
**Tier 6 — Knowledge (15 components):** KnowledgeTable, CreateKBModal, DocumentTable, StatusBadge, UploadZone, UrlCrawlInput, FaqEditor, ProgressIndicator, Stepper, WizardStep, PublishStepper, WidgetConfigPanel, WidgetPreview, VersionHistory, CompletionCelebration
**Tier 7 — Conversations (4 components):** ConversationTable, MessageList, MessageMetadata, InfoPanel
**Tier 8 — Widget Installer (3 components):** SnippetDisplay, DomainVerificationInput, InstallationStatus
**Tier 9 — Team (7 components):** MemberTable, InviteMemberModal, RoleBadge, ApiKeyTable, CreateApiKeyModal, KeyRevealDialog, RevokeConfirmDialog
**Tier 10 — Billing (5 components):** CurrentPlanCard, PlanChangePanel, InvoiceTable, PaymentMethodCard, CancelSubscriptionDialog
**Tier 11 — Analytics (3 components):** UsageChart, DateRangePicker, PlanUsageBar
**Tier 12 — Utility (15 components):** Button, Input, Checkbox/Toggle, Avatar, Badge, Card, Pagination, SearchInput, Table, Tabs, Tooltip, Dropdown, ProgressBar, Spinner, Divider, Icon

---

## 3. Design Handoff Checklist

This section defines what engineering expects to receive from the Claude design phase. Mark items as delivered or not.

### 3.1 Brand Identity

- [ ] **Logo** — SVG format, horizontal and stacked variants, monochrome version, favicon (32x32, 16x16), apple-touch-icon (180x180)
- [ ] **Brand name** — Approved product name (tentative: "Conversation Engine" or brand name assigned by Claude)
- [ ] **Tagline** — 5-8 word value proposition for hero section
- [ ] **Tone of voice** — Adjectives describing copy style (e.g., "professional, friendly, technical")
- [ ] **Brand personality** — 3-5 words describing brand character

### 3.2 Color System

- [ ] **Primary palette** — Hex values for primary, primary-hover, primary-light, primary-dark (minimum 4 shades)
- [ ] **Neutral palette** — Hex values for white, background, surface, border, text-primary, text-secondary, text-disabled (minimum 7 shades of gray)
- [ ] **Semantic colors** — Hex values for success, warning, error, info (base + light variant each)
- [ ] **Dark mode palette** — Equivalent primary + neutral + semantic values for dark theme (if supporting dark mode)
- [ ] **Usage mapping** — Which color maps to which CSS custom property (e.g., `--color-primary: #2563EB`)

### 3.3 Typography

- [ ] **Font family** — Primary font (headings + body), monospace font (code), fallback stacks for each
- [ ] **Font sizes** — Complete scale: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px), 4xl (36px), 5xl (48px), 6xl (60px)
- [ ] **Font weights** — Regular (400), medium (500), semibold (600), bold (700)
- [ ] **Line heights** — Tight (1.2), normal (1.5), relaxed (1.75) — or per-size values
- [ ] **Font sources** — Google Fonts URL, @font-face declarations, or system font stack decision

### 3.4 Design System (Design Tokens)

The design system must be delivered as a **CSS custom properties file** (`theme.css`) that engineers can import directly. Minimum tokens required:

- [ ] `--color-*` — All color tokens from Section 3.2
- [ ] `--font-*` — All typography tokens from Section 3.3
- [ ] `--spacing-*` — Spacing scale (see Section 3.6)
- [ ] `--border-radius-*` — sm (4px), md (8px), lg (12px), xl (16px), full (9999px)
- [ ] `--shadow-*` — sm, md, lg, xl elevation shadows (box-shadow values)
- [ ] `--breakpoint-*` — sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- [ ] `--container-*` — Max-width for content containers (e.g., --container-sm: 640px, --container-lg: 1024px)
- [ ] `--transition-*` — Duration and easing for common animations (--transition-fast: 150ms, --transition-normal: 300ms)
- [ ] `--z-*` — Z-index scale (dropdown, sticky, modal, toast, tooltip)

### 3.5 Iconography

- [ ] **Icon set decision** — Use an existing library (Lucide, Heroicons, Phosphor) or custom icons
- [ ] **Icon style** — Outline vs filled, stroke width, corner radius (rounded vs sharp)
- [ ] **Icon size scale** — sm (16px), md (20px), lg (24px), xl (32px)
- [ ] **Required icons list** — Minimum set needed for MVP:
  - Navigation: dashboard, knowledge, conversations, analytics, settings, team, billing, api-key, profile, support, logout
  - Actions: plus, edit, delete, copy, search, filter, upload, download, publish, close, menu, chevron-down, chevron-left, chevron-right, check, x, alert-circle, info, external-link
  - Status: check-circle, alert-triangle, x-circle, clock, loading/spinner
  - Social: github, twitter/linkedin (for footer)
  - Misc: star, home, message-circle, file-text, link, eye, eye-off, lock, mail, user, users, credit-card, invoice, chart-bar

### 3.6 Spacing

- [ ] **Spacing scale** — Delivered as CSS custom properties:
  - `--spacing-0`: 0px
  - `--spacing-1`: 4px
  - `--spacing-2`: 8px
  - `--spacing-3`: 12px
  - `--spacing-4`: 16px
  - `--spacing-5`: 20px
  - `--spacing-6`: 24px
  - `--spacing-8`: 32px
  - `--spacing-10`: 40px
  - `--spacing-12`: 48px
  - `--spacing-16`: 64px
  - `--spacing-20`: 80px
  - `--spacing-24`: 96px
- [ ] **Layout grid** — Column count (12), gutter width (24px), margin (16px mobile, 32px desktop)

### 3.7 Landing Page

- [ ] **Hero section** — Wireframe showing: headline, subtitle, CTA button(s), hero visual/illustration, layout (text-left vs centered)
- [ ] **Feature grid section** — Wireframe showing: 3-6 feature cards, grid layout (2-col vs 3-col), card content structure (icon + title + description)
- [ ] **Trust bar section** — Wireframe showing: customer logos or stats, layout (scrolling vs static row)
- [ ] **Testimonials section** — Wireframe showing: quote card layout, author info (avatar, name, title, company), carousel vs grid
- [ ] **FAQ section** — Wireframe showing: accordion style, single vs multi-open behavior
- [ ] **CTA section** — Wireframe showing: background treatment, headline, button(s)
- [ ] **Footer** — Wireframe showing: column layout, link groups, social icons, legal text
- [ ] **Mobile adaptation** — How hero/features/testimonials stack on mobile (single column, collapsed sections)
- [ ] **Hero visual** — Illustration or abstract graphic asset for the hero section (SVG preferred)

### 3.8 Pricing Page

- [ ] **Pricing card layout** — Wireframe showing: card content structure (plan name, price, features list, CTA button), cards per row (4-col desktop, 2-col tablet, 1-col mobile)
- [ ] **Pricing toggle** — Monthly/yearly toggle design
- [ ] **Plan names and prices** — Finalized names (e.g., Free, Starter, Professional, Enterprise) and monthly prices ($0, $29, $99, Custom)
- [ ] **Feature comparison** — Table layout showing features across all plans
- [ ] **Highlighted plan** — Which plan is "recommended" (Professional), visual treatment (border, badge, shadow)
- [ ] **Enterprise CTA** — "Contact Sales" treatment (button vs link vs form)
- [ ] **FAQ section** — Common billing/pricing questions

### 3.9 Dashboard Layouts

- [ ] **App layout** — Wireframe showing: sidebar (width, nav items, workspace switcher, upgrade CTA), top bar (breadcrumb, search, avatar with dropdown), content area
- [ ] **Sidebar** — Expanded and collapsed states, active link indicator, icon + label layout, section headers, mobile hamburger
- [ ] **Top bar** — Breadcrumb placement, user avatar dropdown menu items (Profile, Billing, Logout), notification bell (if applicable)
- [ ] **Dashboard page** — Wireframe showing: stat cards row (usage, KB count, conversations today), recent conversations widget, quick actions cards, upgrade banner placement
- [ ] **Workspace settings page** — Wireframe showing: branding form (logo upload, color picker, welcome message, offline message), save button, danger zone (delete workspace with confirmation)

### 3.10 Widget Installation Flow

- [ ] **Widget preview** — Wireframe showing: embedded iframe with live widget, size and positioning within the installer page
- [ ] **Snippet display** — Wireframe showing: code block with syntax highlighting, copy button, "copied" confirmation state
- [ ] **Domain verification** — Wireframe showing: input field for domain, verify button, verification status (pending, verified, failed), three methods (meta tag, DNS, file upload)
- [ ] **Installation status** — Wireframe showing: step indicators (configure → install → verify → done), current step content

### 3.11 Mobile Layouts

- [ ] **Breakpoint behavior** — Annotations for each page showing how it adapts at 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (wide)
- [ ] **Mobile navigation** — Hamburger menu, bottom tab bar (if used), or other mobile nav pattern
- [ ] **Touch targets** — Minimum 44x44px for all interactive elements on mobile
- [ ] **Mobile dashboard** — Simplified stat cards (single column), stacked layout

### 3.12 Empty States

For each of the following scenarios, deliver a visual mockup or description:

- [ ] **Dashboard** — No conversations yet, no knowledge uploaded, no usage data
- [ ] **Knowledge Bases list** — No knowledge bases created
- [ ] **Knowledge Detail** — No documents uploaded to this KB
- [ ] **Conversations list** — No conversations yet
- [ ] **API Keys** — No API keys created
- [ ] **Team Members** — Only owner, no other members
- [ ] **Billing** — No invoices yet (new account)
- [ ] **Analytics** — No usage data yet
- [ ] **Widget Installer** — No knowledge published yet

Each empty state should include: illustration (or guidance on illustration style), title text, description text, CTA button text.

### 3.13 Error States

For each of the following error types, deliver a visual mockup or description:

- [ ] **404 Not Found** — Page-level: illustration, "Page not found" title, "Go home" button
- [ ] **403 Forbidden** — Page-level: illustration, "Access denied" message, "Go to dashboard" button
- [ ] **500 Server Error** — Page-level: illustration, "Something went wrong" message, "Try again" button
- [ ] **Network Error** — Toast/alert: "No internet connection" or "Request failed"
- [ ] **Rate Limited (429)** — Toast: "Too many requests. Please wait."
- [ ] **Form validation errors** — Inline: red border on invalid field, error message below field, field label turns red
- [ ] **API error messages** — Inline or toast: field-level (e.g., "Email already in use") and form-level (e.g., "Login failed. Check your credentials.")
- [ ] **Upload failures** — Inline: file too large, invalid file type, upload failed, processing failed

### 3.14 Loading States

For each of the following, deliver a visual mockup or description:

- [ ] **Skeleton cards** — Dashboard stat cards (rectangle placeholders with shimmer animation)
- [ ] **Skeleton table** — Knowledge list, conversation list, API keys, team members (table row placeholders)
- [ ] **Skeleton chart** — Analytics (chart area placeholder with axis lines)
- [ ] **Button loading** — Spinner replacing button text, button disabled during request
- [ ] **Form submission** — Submit button spinner, form fields disabled
- [ ] **Page transition** — Optional: top-of-page loading bar or content fade-in
- [ ] **Upload progress** — Progress bar with percentage, indeterminate spinner for processing phase
- [ ] **Widget loading** — Pulsing chat button, shimmer in chat window before messages load

---

## 4. Component Mapping

Every planned UI component mapped to its engineering implementation details:

### 4.1 Foundation Components (Tier 1)

| Component | React/Vue Equivalent | Key Props | States | Engineering Notes |
|-----------|---------------------|-----------|--------|-------------------|
| ThemeProvider | Context/Provider | designTokens (object) | — | Wraps app root, sets CSS custom properties from design token file |
| Router | React Router / Vue Router | routes[], layout | — | Existing pattern from admin portal to follow |
| HTTP client | axios / fetch wrapper | baseURL, interceptors | — | JWT interceptor: attach token, 401 → redirect login |
| Auth context | Context/Provider | user, login, logout, refresh | loading, authenticated, unauthenticated | Uses JWT cookie, not localStorage |
| Toast | Portal-based | message, type, duration, onDismiss | success, error, warning, info | Auto-dismiss at 5s, stack multiple |
| Modal | Portal-based | isOpen, title, children, onClose | open, closed, closing | Trap focus, close on Escape, close on backdrop click |
| LoadingSkeleton | CSS-only | variant (card, table, chart, text), rows, width | — | Shimmer animation via CSS gradient |
| EmptyState | Composable | icon, title, description, ctaText, ctaAction | — | Illustration from CP1.5b SVG assets |

### 4.2 Layout Components (Tier 2)

| Component | Key Props | States | Responsive Behavior | Engineering Notes |
|-----------|-----------|--------|---------------------|-------------------|
| Navbar | links[], logo, ctaButton | scrolled, mobile | Stacks nav links behind hamburger below md breakpoint | Sticky top, backdrop blur on scroll |
| Footer | linkGroups[], socialLinks | — | Stacks columns vertically below md | Bottom of every public page |
| PublicLayout | children | — | — | Wraps Navbar + main slot + Footer |
| AuthLayout | children, title, subtitle | — | Centered card layout, full-width on mobile | Contains PublicLayout, centers form card |
| Sidebar | navItems[], workspace, upgradeCta | expanded, collapsed, mobile | Collapsed below lg, full-width overlay on mobile | Semi-transparent overlay when mobile, close on nav |
| TopBar | breadcrumb, avatar, dropdownItems | — | — | Sticky top, z-index above sidebar |
| AppLayout | children, sidebar, topBar | — | Sidebar collapses on mobile | Flex layout: sidebar (fixed width) + content (flex 1) |
| WorkspaceSwitcher | workspaces[], currentId, onCreate | open, closed | Full-width on mobile | Dropdown or modal on mobile |
| Breadcrumb | path[] (label + route) | — | — | Generates from current route, last item not linked |

### 4.3 Marketing Components (Tier 3)

| Component | Key Props | Variants | Dependencies | Notes |
|-----------|-----------|----------|-------------|-------|
| Hero | headline, subtitle, cta, image | text-left, centered | ThemeProvider | Image can be illustration or screenshot |
| FeatureCard | icon, title, description, link | default, large | — | Animate on scroll (optional) |
| FeatureGrid | features[] (FeatureCard props), columns | 2-col, 3-col | FeatureCard | CSS Grid, responsive columns |
| PricingCard | name, price, features[], cta, highlighted | default, featured, disabled | — | Highlighted plan has prominent border/shadow |
| PricingToggle | options[], active | monthly, yearly | — | Switch or button group |
| Testimonial | quote, author, role, company, avatar | default, compact | — | Star rating optional |
| TrustBar | logos[] or stats[] | row, grid | — | Gray logos or colored |
| FaqAccordion | items[] (question, answer) | single-open, multi-open | — | Animate height transition |
| CTA | headline, description, buttonText, buttonLink | default, dark-bg | — | Background gradient |
| DocSidebar | sections[], activeSection | — | — | Sticky on desktop, full-width accordion on mobile |
| DocContent | content (markdown/HTML) | — | — | Prose styling, table of contents |
| CodeBlock | code, language | with-line-numbers, without | — | Syntax highlighting via Prism.js or Shiki |

### 4.4 Auth Components (Tier 4)

| Component | Key Props | Validation | Error States | Notes |
|-----------|-----------|-----------|-------------|-------|
| SignUpForm | onSubmit | email format, password 8-128, name ≤100, password match | inline field errors, form-level API error | Loading spinner on submit |
| LoginForm | onSubmit | email format, password required | invalid credentials, account deactivated | "Remember me" checkbox optional |
| SocialLoginButtons | providers[] | — | — | Placeholder for future OAuth — show disabled or hidden if not MVP |
| EmailForm | onSubmit | email format, rate limited | "email not found" → generic "check inbox" | Single field form, success message |
| ResetPasswordForm | onSubmit, token | password 8-128, password match | token expired, token invalid, weak password | Token in URL, validated on mount |
| VerificationStatus | token (from URL) | token validated on mount | expired, already verified, invalid | Auto-verify on page load, show result |
| ProfileForm | user, onSubmit | name ≤100, email read-only | save failed, email taken | Avatar upload (file picker), save button |
| PasswordChangeForm | onSubmit | current password, new 8-128, confirm match | current password wrong | Three-field form |

### 4.5 Dashboard Components (Tier 5)

| Component | Key Props | States | Data Source | Notes |
|-----------|-----------|--------|-------------|-------|
| StatCard | icon, label, value, trend, color | loading, loaded, error | GET /api/usage/current, conversations, KBs | Skeleton while loading |
| UsageMeter | used, limit, unit, warningAt, dangerAt | normal, warning, danger | GET /api/usage/current | Progress bar with percentage and label |
| RecentConversations | conversations[] (limited to 5) | loading, empty, populated | GET /api/conversations?limit=5 | Mini table, avatar + name + preview + time |
| QuickActions | actions[] (icon + label + route) | — | Static links | Grid of action cards |
| UpgradeBanner | plan, usagePercent, onDismiss | visible, dismissed | Current plan from usage API | Dismissed state persists (localStorage or API) |
| BrandingForm | branding, onSave | loading, saved, error | PUT /api/tenants/:id | Color picker (native or custom), logo upload, message inputs |
| DangerZone | onDelete, warning | confirm hidden, confirm visible | DELETE /api/tenants/:id | Type "DELETE" to confirm, warning text |

### 4.6 Knowledge Components (Tier 6)

| Component | Key Props | States | Notes |
|-----------|-----------|--------|-------|
| KnowledgeTable | kbs[] | loading, empty, populated, error | Sortable by name, date, document count |
| CreateKBModal | onCreate | open, submitting | Name + description form |
| DocumentTable | documents[] | loading, empty, populated, error | Sortable by name, status, date |
| StatusBadge | status | processing, completed, failed, pending | Color-coded: blue, green, red, gray |
| UploadZone | onFilesSelected, accept, maxSize | empty, dragging, uploading, error, success | Drag-and-drop or click to browse |
| UrlCrawlInput | onSubmit, onValidate | idle, validating, invalid, submitting | URL input + crawl depth selector |
| FaqEditor | pairs[], onAdd, onRemove | empty, populated | Key-value pair rows, add/remove |
| ProgressIndicator | progress, status, label | determinate, indeterminate, completed, failed | Bar or circle variant |
| Stepper | steps[], currentStep | — | Circles + labels + connector lines |
| WizardStep | title, description, children | active, completed, future | Content container for step |
| PublishStepper | phases[] (configure, publish, install) | — | Extends Stepper with phase-specific content |
| WidgetConfigPanel | config, onChange | — | Position dropdown, theme toggle, auto-open settings, custom CSS textarea |
| WidgetPreview | config | loading, loaded | iframe with embedded widget |
| VersionHistory | versions[] | empty, populated | Version number, date, published by |
| CompletionCelebration | — | — | Confetti animation (canvas-confetti or CSS), success message |

### 4.7 Conversation Components (Tier 7)

| Component | Key Props | States | Notes |
|-----------|-----------|--------|-------|
| ConversationTable | conversations[], onSelect | loading, empty, populated, error | Paginated, sortable by date/status |
| MessageList | messages[], streaming | empty, populated, streaming | User bubbles (right) vs assistant bubbles (left) |
| MessageMetadata | tokens, latency, safetyFlags | — | Small text below each assistant message |
| InfoPanel | conversation (metadata) | — | Sidebar: started, ended, message count, session ID, IP |

### 4.8 Widget Installer Components (Tier 8)

| Component | Key Props | States | Notes |
|-----------|-----------|--------|-------|
| SnippetDisplay | snippet (code), language | default, copied | Syntax-highlighted code block, copy button |
| DomainVerificationInput | domain, onVerify | idle, verifying, verified, failed | 3 methods (meta tag, DNS, file), tabbed |
| InstallationStatus | status, details | pending, in-progress, complete, failed | Visual flow of install steps |

### 4.9 Team Components (Tier 9)

| Component | Key Props | States | Notes |
|-----------|-----------|--------|-------|
| MemberTable | members[], onRemove, onRoleChange | loading, empty, populated, error | Avatar + name + email + role badge + actions |
| InviteMemberModal | onInvite | open, submitting, sent | Email input + role selector |
| RoleBadge | role | admin, operator, member | Color-coded: red, blue, green |
| ApiKeyTable | keys[] | loading, empty, populated, error | Masked key, label, role, last used, revoke |
| CreateApiKeyModal | onCreate | open, submitting | Label + role selector |
| KeyRevealDialog | key | open, closed | Shows full key once, copy button, "close" to dismiss |
| RevokeConfirmDialog | onConfirm, itemName | open, confirming | Confirm text, warning, type name to confirm |

### 4.10 Billing Components (Tier 10)

| Component | Key Props | States | Notes |
|-----------|-----------|--------|-------|
| CurrentPlanCard | plan, status, renewalDate | loading, populated | Plan name, price, status badge, renewal info |
| PlanChangePanel | plans[], currentPlan, onChange | loading, populated | PricingCard grid, upgrade/downgrade flow |
| InvoiceTable | invoices[] | loading, empty, populated, error | Date, amount, status, PDF download link |
| PaymentMethodCard | method (brand, last4, expiry) | loading, populated, empty | Card icon, details, update button → portal session |
| CancelSubscriptionDialog | onConfirm, plan, periodEnd | open, confirming | Consequences list, confirm button |

### 4.11 Analytics Components (Tier 11)

| Component | Key Props | States | Notes |
|-----------|-----------|--------|-------|
| UsageChart | data[], type, dateRange | loading, populated, empty, error | Chart.js wrapper, line/bar/area configurable |
| DateRangePicker | range, onChange, presets | — | Presets (7d, 30d, 90d) + custom calendar range |
| PlanUsageBar | used, limit, unit | normal, warning, exceeded | Same as UsageMeter but shown in analytics context |

### 4.12 Utility Components (Tier 12)

| Component | Variants | Props | Notes |
|-----------|----------|-------|-------|
| Button | primary, secondary, ghost, danger, disabled, loading | children, onClick, type, size (sm, md, lg) | Consistent across all forms |
| Input | text, email, password, search, textarea, select | label, value, onChange, error, disabled, placeholder | Label above, error below, help text optional |
| Checkbox/Toggle | checkbox, toggle-switch | checked, onChange, label, disabled | Styled toggle |
| Avatar | sm, md, lg | src, alt, name (initials fallback), size | Initials from name if no image |
| Badge | default, success, warning, error, info | children, variant | Color-coded |
| Card | default, clickable | children, header, footer, padding | Content container |
| Pagination | — | currentPage, totalPages, onChange | Prev/next + page numbers |
| SearchInput | — | value, onChange, placeholder | Search icon left, clear button right |
| Table | sortable | columns[], data[], onSort | Sort indicator on column header |
| Tabs | — | tabs[] (label + content), activeTab | Horizontal tab bar |
| Tooltip | — | content, position (top, bottom, left, right) | Hover/focus reveal |
| Dropdown | — | trigger, items[], onSelect | Click to open, click outside to close |
| ProgressBar | determinate, indeterminate | progress, max, color | Animated fill |
| Spinner | sm, md, lg | — | CSS-only spinning animation |
| Divider | — | orientation (horizontal, vertical) | Line separator |
| Icon | — | name, size, color | SVG sprite or icon library component |

---

## 5. Implementation Risks from Design Decisions

### 5.1 Risk Matrix

| # | Risk | Source | Likelihood | Impact | Mitigation |
|---|------|--------|-----------|--------|------------|
| R1 | Design specifies too many unique colors/gradients, increasing CSS maintenance | Color system | Medium | Medium | Limit palette to defined tokens. Reject ad-hoc colors in review |
| R2 | Typography uses custom web fonts that increase bundle size or cause CLS | Typography | High | Medium | Use `font-display: swap`, preload, subset fonts. Set fallback size matching |
| R3 | Design includes animations that require JS libraries (GSAP, Framer Motion) | Loading states, interactions | Medium | Medium | Prefer CSS animations. Verify library bundle impact before adding |
| R4 | Wireframes include components not in the 81-component inventory | All pages | Medium | High | Raise deviation during handoff review. Either add to inventory or simplify |
| R5 | Mobile layouts differ significantly from desktop (different navigation pattern) | Mobile layouts | Medium | High | Confirm mobile nav pattern early. Breakpoint testing must be in CI |
| R6 | Empty state illustrations require custom SVG creation per state | Empty states | High | Low | Accept — illustrations are expected. Engineer provides placeholder until delivery |
| R7 | Design uses dark mode, doubling color token and component effort | Color system | Medium | High | Decide dark mode is post-MVP or allocate extra time in CP3 |
| R8 | Copy changes after implementation require component refactoring | All pages | High | Medium | Extract all text to i18n or config files. Avoid hardcoding in components |
| R9 | Dashboard stat card layout doesn't accommodate 4+ metrics on mobile | Dashboard | Low | Medium | Use 2-col grid mobile, 4-col desktop. Max 6 stat cards |
| R10 | Pricing page toggle (monthly/yearly) changes pricing card height, breaking grid alignment | Pricing | Low | Medium | Fixed-height cards. Price change only, card structure stays same |
| R11 | Widget JS design requires interactive elements that conflict with Shadow DOM | Widget Installer | Medium | Medium | Confirm Shadow DOM scope before widget design finalization |
| R12 | Onboarding wizard step count changes after implementation | Onboarding Wizard | Medium | High | Freeze step count in design phase. Any change requires re-approval |

### 5.2 Decision Points Requiring Early Confirmation

| Decision | Impact | Deadline |
|----------|--------|----------|
| Dark mode support (yes/no) | Doubles color tokens, adds theme toggle UI | Before CP3 frontend start |
| OAuth social login (MVP vs post-MVP) | SocialLoginButtons component scope | Before CP3 auth pages |
| Animation library (CSS-only vs GSAP/Framer) | Bundle size, dependency | Before CP3 marketing components |
| Chart library (Chart.js vs Recharts vs custom) | Bundle size, chart component architecture | Before CP8 (can defer) |
| i18n (yes/no for v1) | All text extraction pattern | Before CP3 starts |
| Framework confirmation (Vue vs React) | Entire frontend architecture | Before any implementation begins |

---

## 6. Design Freeze Requirements

The following must be finalized and delivered before CP2 implementation can begin. Engineering cannot start any frontend work until these items are received.

### 6.1 Hard Freeze (Blocking — CP2 cannot start without these)

- [ ] **Design token file** (`theme.css`) — Complete set of CSS custom properties covering colors, typography, spacing, border-radius, shadows, breakpoints, transitions, z-index
- [ ] **Brand identity** — Logo (all formats), product name, favicon
- [ ] **Auth page wireframes** — Sign Up, Login, Forgot Password, Reset Password, Email Verification, Profile — at minimum form layout, input styles, error state visual, success state visual
- [ ] **Auth form microcopy** — All form labels, placeholders, validation error messages, success messages, button text, confirmation messages
- [ ] **HTTP error state designs** — 401, 403, 404, 500, network error, rate limited — page-level and toast-level
- [ ] **Framework decision** — Confirmed choice (Vue or React) matching either existing admin portal or new scaffold
- [ ] **Typography** — Font family, size scale, weight scale, line heights, font source/import method
- [ ] **Color palette** — Hex values for all brand, neutral, and semantic colors (light mode minimum)

### 6.2 Soft Freeze (Required before CP3 starts — can proceed with CP2 backend without these)

- [ ] **Landing page wireframes** — Hero, feature grid, trust bar, testimonials, FAQ, CTA, footer
- [ ] **Pricing page wireframes** — Pricing cards, toggle, feature comparison
- [ ] **Documentation page layout** — Sidebar navigation, content area, code block style
- [ ] **Marketing copy** — All public-facing text (headlines, descriptions, CTAs, feature descriptions, FAQ content)
- [ ] **Empty state specifications** — All 9 empty states (illustration style, title, description, CTA)

### 6.3 Future Freeze (Required before CP4-CP8 starts — block respective phases)

- [ ] **Dashboard page wireframes** — Stat cards, recent conversations, quick actions, upgrade banner
- [ ] **Workspace settings wireframes** — Branding form, danger zone
- [ ] **Knowledge page wireframes** — List, detail, upload modal, publish, onboarding wizard (all 5 steps)
- [ ] **Widget installer wireframes** — Snippet display, domain verification, installation status
- [ ] **Conversation page wireframes** — List table, detail message bubbles, metadata panel
- [ ] **Analytics wireframes** — Chart types, date range picker, plan usage bar
- [ ] **API key management wireframes** — Table, create modal, reveal dialog
- [ ] **Team management wireframes** — Member table, invite modal, role badge
- [ ] **Billing page wireframes** — Current plan card, invoice table, payment method, plan change panel
- [ ] **Loading state designs** — Skeleton screens for all data-bound components
- [ ] **Mobile responsive adaptations** — Breakpoint behavior for all authenticated pages

### 6.4 Freeze Agreement

Once the Hard Freeze items are delivered and reviewed:
1. No color, typography, or spacing token changes are permitted without a design token PR
2. No copy changes are permitted without an i18n/config update
3. No new component types beyond the 81 in the inventory
4. No changes to the 5-step onboarding structure
5. All page count and route structure is frozen (27 pages, routes as defined in CUSTOMER_PRODUCT_PLAN.md Section 3.2)

---

## 7. CP2 Readiness Checklist

This checklist confirms the project is ready to start implementation immediately after the design phase.

### 7.1 Design Handoff Complete

- [ ] Hard freeze items (Section 6.1) delivered and reviewed
- [ ] Design token file imported into frontend project
- [ ] All form microcopy received
- [ ] Error state designs received
- [ ] All ad-hoc color values eliminated (only token values used)
- [ ] Component inventory checked against wireframes — no missing or extra components
- [ ] Framework decision confirmed and project scaffold created

### 7.2 Backend Ready

- [ ] Backend freeze confirmed — no changes to existing architecture
- [ ] All 35 existing APIs verified and available
- [ ] `engine/packages/saas-api` builds cleanly (`npm run build` or `tsc -b`)
- [ ] All 964 existing tests pass (`npm test`)
- [ ] All 45 E2E tests pass
- [ ] Token tables (verification_tokens, reset_tokens) schema designed (not yet created)
- [ ] Email sender interface designed (not yet implemented)
- [ ] Email templates outlined (welcome, verify, reset, invite)

### 7.3 Development Environment Ready

- [ ] `D:\Proj Chatbot\frontend\` — frontend project scaffold complete with:
  - [ ] Build tool configured (Vite or equivalent)
  - [ ] Router configured with all 27 routes (placeholders)
  - [ ] HTTP client configured with JWT interceptor
  - [ ] Auth context/provider scaffolded
  - [ ] Theme system applied (design tokens)
- [ ] `D:\Proj Chatbot\engine\` — backend development workflow verified:
  - [ ] Hot reload working for saas-api package
  - [ ] Database migrations runnable
  - [ ] Test suite runnable with single command
- [ ] C: drive full workaround documented and available (`$env:npm_config_cache = "D:\npm-cache"` prefix)

### 7.4 Process Ready

- [ ] Phase gate checklist printed (IMPLEMENTATION_SEQUENCE.md Section 12.1, Gate 1 — CP2)
- [ ] Testing checklist for CP2 defined (Section 8 of IMPLEMENTATION_SEQUENCE.md)
- [ ] Merge strategy defined (feature branches per endpoint/page)
- [ ] Review cycle defined (PR required per deliverable)
- [ ] Team roles assigned (backend/frontend split from Section 9.3)
- [ ] Stripe account creation initiated (if not done — can run in parallel with CP2)

### 7.5 Risk Mitigations in Place

- [ ] CP1.5b design delay contingency: backend CP2 can start without design
- [ ] Email delivery risk: SMTP credentials ready, SPF/DKIM setup planned
- [ ] Token expiry risk: 24-hour TTL, resend option in design
- [ ] bcrypt load risk: monitor login endpoint, lower rounds if >500ms

### 7.6 Final Go/No-Go

- [ ] All above items checked
- [ ] Design freeze acknowledged by engineering and design stakeholders
- [ ] Implementation sequence acknowledged (CP2 → CP3 → CP4 → CP5 → CP6 → CP7 → CP8 → CP9)
- [ ] No outstanding blockers from RC1 validation
- [ ] Decision: **Proceed to CP2 implementation**

---

## Appendix: Quick Reference

### A.1 Ports

| Service | Port |
|---------|------|
| Pipeline | 3456 |
| SaaS API | 8080 |
| Frontend (Vite dev) | 3000 |

### A.2 Key Files

| File | Purpose |
|------|---------|
| `engine/IMPLEMENTATION_SEQUENCE.md` | Authoritative build order |
| `engine/CUSTOMER_PRODUCT_PLAN.md` | Complete product architecture |
| `engine/DEPLOYMENT_CHECKLIST.md` | 63-item launch checklist |
| `engine/PRODUCTION_VALIDATION_REPORT.md` | RC1 readiness report |
| `engine/vitest.config.ts` | Test configuration (concurrent: false) |
| `frontend/` | Customer frontend (empty scaffold) |
| `engine/packages/saas-api/src/routes/` | Backend route files (new routes go here) |
| `engine/packages/saas-core/src/db/repositories.ts` | DB repository (new methods go here) |

### A.3 C: Drive Workaround

All npm/npx commands in this project require:

```powershell
$env:npm_config_cache = "D:\npm-cache"; npx <command>
```
