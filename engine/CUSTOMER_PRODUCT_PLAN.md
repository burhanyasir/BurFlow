# Customer Product Plan — CP1

**Date:** 2026-07-21
**Status:** Architecture & Planning (pre-implementation)
**Codebase:** RC1 (stable)

---

## 1. Executive Summary

### Product Vision
Conversation Engine is a white-label AI customer support platform that lets businesses embed an intelligent, knowledge-aware chatbot into their website in under 10 minutes. Upload your documentation, configure your brand, copy a script tag, and your visitors get instant answers.

### Target Users

| Persona | Description | Goal |
|---------|-------------|------|
| **Business Owner** | Non-technical, runs a SaaS/e-commerce site | Reduce support tickets, answer FAQs automatically |
| **Developer** | Technical lead integrating customer support | Low-effort embed, full API control, analytics |
| **Support Manager** | Oversees support operations | Monitor conversations, improve knowledge base, track satisfaction |
| **Visitor** | End-user chatting with the widget | Get fast, accurate answers without waiting |

### Value Proposition
- **10-minute setup** — Upload docs, copy snippet, done
- **Knowledge-powered** — Answers drawn from your content, not generic LLM hallucination
- **White-label** — Your brand, your domain, your widget
- **Multi-tenant** — Serve multiple clients from a single instance
- **No lock-in** — Self-hosted, full data ownership

### Supported Customer Types

| Type | Plan | Key Feature |
|------|------|-------------|
| **Free** | Free | 100 msgs/mo, 1 KB, 10 docs, Community support |
| **Starter** | Starter | 1,000 msgs/mo, 3 KBs, 100 docs, Email support |
| **Professional** | Professional | 10,000 msgs/mo, 10 KBs, 500 docs, Priority support, Analytics |
| **Enterprise** | Enterprise | Unlimited, custom SLA, SSO, dedicated infra, on-premise option |

---

## 2. Customer Journey

### 2.1 Journey Map

```
LANDING ──→ FEATURES ──→ PRICING ──→ SIGNUP ──→ EMAIL VERIFICATION
                                                          │
                                                          ▼
                                               CREATE WORKSPACE
                                                          │
                                                          ▼
                                               ONBOARDING WIZARD
                                                          │
                                                          ▼
                                               UPLOAD KNOWLEDGE
                                                          │
                                                          ▼
                                               PROCESS & REVIEW
                                                          │
                                                          ▼
                                               PUBLISH WIDGET
                                                          │
                                                          ▼
                                               COPY WIDGET SNIPPET
                                                          │
                                                          ▼
                                               INSTALL ON WEBSITE
                                                          │
                                                          ▼
                                               VISITOR CHAT (TEST)
                                                          │
                                                          ▼
                                               DASHBOARD / ANALYTICS
                                                          │
                                                          ▼
                                               MANAGE / BILLING / ACCOUNT
```

### 2.2 Complete Page Inventory

| # | Page | URL | Audience | Auth | Purpose |
|---|------|-----|----------|------|---------|
| 1 | Landing | `/` | Visitor | No | Product intro, CTA, feature highlights |
| 2 | Features | `/features` | Visitor | No | Detailed capability showcase |
| 3 | Pricing | `/pricing` | Visitor | No | Plan comparison, tier selection |
| 4 | Sign Up | `/signup` | Visitor | No | Account registration |
| 5 | Login | `/login` | User | No | Returning user authentication |
| 6 | Forgot Password | `/forgot-password` | User | No | Password reset request |
| 7 | Reset Password | `/reset-password/:token` | User | No | Password reset execution |
| 8 | Email Verification | `/verify-email/:token` | User | Token | Email confirmation |
| 9 | Dashboard | `/dashboard` | User | Yes | Post-login home, overview stats, quick actions |
| 10 | Onboarding Wizard | `/onboarding` | New user | Yes | Guided first-time setup |
| 11 | Workspace Settings | `/workspace` | Owner | Yes | Workspace name, slug, branding, delete |
| 12 | Knowledge Bases | `/knowledge` | Member | Yes | List, create, delete KBs |
| 13 | Knowledge Detail | `/knowledge/:id` | Member | Yes | Documents, upload, reindex, status |
| 14 | Document Upload | `/knowledge/:id/upload` | Member | Yes | Upload files, URLs, FAQ entries |
| 15 | Publish Widget | `/publish` | Owner | Yes | Widget config, publishing workflow |
| 16 | Widget Installer | `/publish/install` | Owner | Yes | Copy snippet, domain verification, test |
| 17 | Conversations | `/conversations` | Member | Yes | Chat history, search, filter |
| 18 | Conversation Detail | `/conversations/:id` | Member | Yes | Full message transcript, metadata |
| 19 | Analytics | `/analytics` | Owner | Yes | Usage charts, trends, satisfaction |
| 20 | API Keys | `/api-keys` | Member | Yes | Create, revoke, label API keys |
| 21 | Team Members | `/team` | Owner | Yes | Invite, manage roles, remove members |
| 22 | Billing | `/billing` | Owner | Yes | Plan, payment method, invoices, usage |
| 23 | Profile | `/profile` | User | Yes | Name, email, avatar, password change |
| 24 | Support | `/support` | User | Yes | FAQ, docs, contact, ticket status |
| 25 | Documentation | `/docs` | Developer | No | API reference, widget guide |
| 26 | Privacy Policy | `/privacy` | Visitor | No | Legal |
| 27 | Terms of Service | `/terms` | Visitor | No | Legal |
| 28 | Logout | `/logout` | User | Yes | Session termination |

### 2.3 User Flow Diagrams

**New Customer:**
```
Landing → Features → Pricing → Signup
                                 │
                          ┌──────┴──────┐
                          │              │
                    Verify Email    Skip Verify
                          │              │
                          └──────┬──────┘
                                 ▼
                          Create Workspace
                                 ▼
                       Onboarding Wizard (Step 1/5)
                           - Name widget
                           - Set brand colors
                           - Upload logo
                           - Set welcome message
                                 ▼
                       Onboarding Wizard (Step 2/5)
                           - Create knowledge base
                           - Upload first document(s)
                                 ▼
                       Onboarding Wizard (Step 3/5)
                           - Wait for processing
                           - Review chunks
                                 ▼
                       Onboarding Wizard (Step 4/5)
                           - Configure widget
                           - Position, theme, auto-open
                                 ▼
                       Onboarding Wizard (Step 5/5)
                           - Copy embed snippet
                           - Test widget in preview
                           - Success celebration
                                 ▼
                           → Dashboard
```

**Returning Owner:**
```
Login → Dashboard
   ├── Knowledge (manage content)
   │     └── Upload → Process → Review
   ├── Publish (update widget)
   │     └── Configure → Publish → Copy snippet
   ├── Conversations (review chats)
   │     └── Select → Read transcript
   ├── Analytics (view metrics)
   ├── Billing (manage plan)
   ├── Team (manage members)
   ├── API Keys (manage integration)
   └── Profile (account settings)
```

**Visitor Chat:**
```
Visitor lands on customer site
         │
         ▼
Widget loads (JS snippet)
         │
         ▼
Visitor clicks/auto-opens
         │
         ▼
Widget sends POST /api/chat to pipeline
         │
         ▼
Pipeline auth → stages 1-8 → response
         │
         ▼
Widget displays answer
         │
         ▼
Conversation recorded in SaaS API DB
```

---

## 3. Information Architecture

### 3.1 Navigation Hierarchy

**Public (Unauthenticated)**
```
Top Nav: [Logo] [Features] [Pricing] [Docs] [Sign In] [Get Started → /signup]
Footer:  [Product] [Platform] [Company] [Legal]
         Features   API Docs    Blog      Privacy
         Pricing    Widget      About     Terms
         Changelog              Contact   Cookies
```

**Authenticated — Owner/Admin**
```
Sidebar (primary):
  ┌──────────────────────────────┐
  │ [Workspace Switcher ▾]       │
  ├──────────────────────────────┤
  │ ◉ Dashboard                  │
  │ 📚 Knowledge                 │
  │ 💬 Conversations             │
  │ 📊 Analytics                 │
  ├──────────────────────────────┤
  │ ⚙ Settings                   │
  │   ├ Workspace                │
  │   ├ Publish / Widget         │
  │   ├ Team                     │
  │   └ API Keys                 │
  │ 💳 Billing                   │
  │ 👤 Profile                   │
  │ ❓ Support                   │
  ├──────────────────────────────┤
  │ [Upgrade ▾]                  │
  └──────────────────────────────┘

Top Bar: [Breadcrumb] [Search] [Notifications] [Avatar ▾]
         [Profile] [Billing] [Logout]
```

**Authenticated — Member (no billing/workspace settings)**
```
Sidebar (same as Owner minus Settings/Billing):
  ┌──────────────────────────────┐
  │ [Workspace Switcher ▾]       │
  ├──────────────────────────────┤
  │ ◉ Dashboard                  │
  │ 📚 Knowledge                 │
  │ 💬 Conversations             │
  ├──────────────────────────────┤
  │ 👤 Profile                   │
  │ ❓ Support                   │
  └──────────────────────────────┘
```

### 3.2 Route Structure

```
/                              → Landing (public)
/features                      → Features (public)
/pricing                       → Pricing (public)
/docs                          → Documentation (public)
/docs/*                        → API reference pages (public)
/privacy                       → Privacy policy (public)
/terms                         → Terms of service (public)

/signup                        → Registration (public)
/login                         → Login (public)
/forgot-password               → Password reset request (public)
/reset-password/:token         → Password reset (public)
/verify-email/:token           → Email verification (public w/ token)

/dashboard                     → Workspace home (auth)
/onboarding                    → First-time wizard (auth, new user)

/workspace                     → Workspace settings (owner)
/workspace/branding            → Brand customisation (owner)

/knowledge                     → KB list (auth, tenant)
/knowledge/:id                 → KB detail (auth, tenant)
/knowledge/:id/upload          → Upload documents (auth, tenant)

/publish                       → Widget publish overview (owner)
/publish/install               → Widget installation/snippet (owner)

/conversations                 → Conversation list (auth, tenant)
/conversations/:id             → Conversation detail (auth, tenant)

/analytics                     → Analytics dashboard (owner)

/api-keys                      → API key management (auth, tenant)

/team                          → Team members (owner)
/team/invite                   → Invite member (owner)

/billing                       → Billing & plan (owner)
/billing/invoices              → Invoice history (owner)
/billing/payment-method        → Payment method (owner)

/profile                       → User profile (auth)
/profile/password              → Change password (auth)

/support                       → Support center (auth)

/logout                        → Logout (auth)
```

### 3.3 Sitemap

```
sitemap.xml
├── / (Landing)
├── /features
├── /pricing
├── /docs
│   ├── /docs/api
│   ├── /docs/widget
│   ├── /docs/getting-started
│   └── /docs/faq
├── /privacy
├── /terms
│
├── /signup
├── /login
├── /forgot-password
├── /reset-password/:token
├── /verify-email/:token
│
└── [auth-wall]
    ├── /dashboard
    ├── /onboarding
    ├── /workspace
    │   └── /workspace/branding
    ├── /knowledge
    │   ├── /knowledge/:id
    │   └── /knowledge/:id/upload
    ├── /publish
    │   └── /publish/install
    ├── /conversations
    │   └── /conversations/:id
    ├── /analytics
    ├── /api-keys
    ├── /team
    │   └── /team/invite
    ├── /billing
    │   ├── /billing/invoices
    │   └── /billing/payment-method
    ├── /profile
    │   └── /profile/password
    ├── /support
    └── /logout
```

### 3.4 Owner Flow vs Member Flow vs Admin Flow

| Action | Owner | Admin/Operator | Member | End-User (API) |
|--------|-------|---------------|--------|-----------------|
| View dashboard | ✓ | ✓ | ✓ | — |
| Manage workspace | ✓ | — | — | — |
| Delete workspace | ✓ | — | — | — |
| Manage knowledge | ✓ | ✓ | ✓ | — |
| Delete knowledge | ✓ | ✓ | — | — |
| Publish widget | ✓ | ✓ | — | — |
| Manage API keys | ✓ | ✓ | — | — |
| Revoke API keys | ✓ | ✓ | — | — |
| View conversations | ✓ | ✓ | ✓ | — |
| View analytics | ✓ | ✓ | — | — |
| Manage billing | ✓ | — | — | — |
| Manage team | ✓ | — | — | — |
| Invite members | ✓ | — | — | — |
| Remove members | ✓ | — | — | — |
| Send chat (via widget) | — | — | — | ✓ |
| Send chat (via API) | ✓ | ✓ | ✓ | ✓ |

**Notes:**
- Role hierarchy: `owner > admin > operator > member > end-user`
- `owner` inherits all permissions from all lower roles
- `admin` inherits from `operator`, `member`, `end-user`
- The existing backend uses API key roles (`admin`, `operator`, `service`, `end-user`) — these map to team member roles

---

## 4. Page Specifications

### 4.1 Landing Page
| Field | Value |
|-------|-------|
| **Purpose** | First impression, explain product, drive signups |
| **User** | Visitor (anonymous) |
| **Backend Data** | None (static content) |
| **Actions** | "Get Started" → /signup, "See Features" → /features, "View Pricing" → /pricing, scroll to sections |
| **Permissions** | None |
| **Error States** | N/A (static page) |
| **Empty States** | N/A |
| **Loading States** | N/A |
| **Dependencies** | None |
| **Components** | Navbar, Hero, FeatureGrid, TrustBar, Testimonials, FAQ, PricingPreview, Footer, CTA |
| **SEO** | Meta title, description, OG tags, structured data (Product, SoftwareApplication) |

### 4.2 Features Page
| Field | Value |
|-------|-------|
| **Purpose** | Detailed capability showcase |
| **User** | Visitor (anonymous) |
| **Backend Data** | None (static content) |
| **Actions** | "Start Free Trial" → /signup |
| **Permissions** | None |
| **Components** | Navbar, FeatureSections (alternating layout), ComparisonTable, CTA, Footer |

### 4.3 Pricing Page
| Field | Value |
|-------|-------|
| **Purpose** | Plan comparison, select tier |
| **User** | Visitor (anonymous) |
| **Backend Data** | None (static plan definitions; could be CMS-driven) |
| **Actions** | "Start Free Trial" → /signup, "Contact Sales" → mailto |
| **Permissions** | None |
| **Components** | Navbar, PricingCards (Free/Starter/Professional/Enterprise), FAQs, FeatureComparison, Footer |

### 4.4 Sign Up Page
| Field | Value |
|-------|-------|
| **Purpose** | Account registration |
| **User** | Visitor (anonymous) |
| **Backend Data** | User email/password, optional company name |
| **Actions** | Submit form → `POST /api/auth/signup` → set JWT cookie → redirect to `/onboarding` or `/dashboard` |
| **Permissions** | None (public) |
| **Error States** | Email taken (409), weak password, network error |
| **Empty States** | N/A |
| **Loading States** | Submit button spinner, disabled during request |
| **Dependencies** | `POST /api/auth/signup` |
| **Components** | SignUpForm, SocialLoginButtons, LinkToLogin, LinkToForgotPassword |
| **Validation** | Email format, password length 8-128, name <= 100 chars |

### 4.5 Login Page
| Field | Value |
|-------|-------|
| **Purpose** | Returning user authentication |
| **User** | Returning user |
| **Backend Data** | Email + password |
| **Actions** | Submit → `POST /api/auth/login` → set JWT → redirect to `/dashboard` |
| **Permissions** | None (public) |
| **Error States** | Invalid credentials (401), account deactivated |
| **Dependencies** | `POST /api/auth/login` |
| **Components** | LoginForm, SocialLoginButtons, LinkToSignup, LinkToForgotPassword |

### 4.6 Forgot Password Page
| Field | Value |
|-------|-------|
| **Purpose** | Request password reset email |
| **User** | User who forgot password |
| **Backend Data** | Email |
| **Actions** | Submit → backend sends reset email |
| **Permissions** | None (public) |
| **Error States** | Email not found (show generic "check inbox") |
| **Dependencies** | `POST /api/auth/forgot-password` (missing — needs implementation) |
| **Components** | EmailForm, SuccessMessage, LinkToLogin |

### 4.7 Reset Password Page
| Field | Value |
|-------|-------|
| **Purpose** | Execute password reset |
| **User** | User with valid reset token |
| **Backend Data** | Token + new password |
| **Actions** | Submit → `POST /api/auth/reset-password/:token` |
| **Permissions** | Token-based (ephemeral) |
| **Error States** | Token expired, token invalid, password too weak |
| **Dependencies** | `POST /api/auth/reset-password/:token` (missing) |
| **Components** | ResetPasswordForm, ExpiredTokenError |

### 4.8 Email Verification Page
| Field | Value |
|-------|-------|
| **Purpose** | Verify email address |
| **User** | New user clicking verification link |
| **Backend Data** | Verification token |
| **Actions** | Auto-verify on page load with token → `GET /api/auth/verify-email/:token` |
| **Permissions** | Token-based |
| **Error States** | Token expired, already verified, invalid token |
| **Dependencies** | `GET /api/auth/verify-email/:token` (missing — `email_verified` column exists, no flow) |
| **Components** | SuccessMessage, ErrorMessage, LinkToDashboard |

### 4.9 Dashboard Page
| Field | Value |
|-------|-------|
| **Purpose** | Post-login home, system status, quick actions |
| **User** | Any authenticated user |
| **Backend Data** | `GET /api/usage/current`, `GET /api/conversations?limit=5`, chat widget status, recent documents |
| **Actions** | Quick links to upload knowledge, view conversations, publish widget, invite team |
| **Permissions** | Tenant-scoped |
| **Error States** | API unavailable, tenant deactivated |
| **Empty States** | No conversations yet, no knowledge uploaded |
| **Loading States** | Skeleton cards while data loads |
| **Dependencies** | `GET /api/usage/current`, `GET /api/conversations?limit=5`, `GET /api/knowledge-bases`, `GET /api/tenants/:id` |
| **Components** | StatCard (messages used), StatCard (KB count), StatCard (conversations today), RecentConversations, QuickActions, KnowledgeStatus, PublishStatus, UpgradeBanner |

### 4.10 Onboarding Wizard Page
| Field | Value |
|-------|-------|
| **Purpose** | Guide first-time user through setup |
| **User** | New user (no KBs published yet) |
| **Backend Data** | Steps: create workspace → upload doc → process → configure widget → install |
| **Actions** | Step 1: Set widget name, brand colors, logo, welcome message; Step 2: Create KB, upload first document; Step 3: Wait for processing (poll status); Step 4: Widget position, theme, auto-open; Step 5: Copy snippet, test preview, mark complete |
| **Permissions** | Owner only (creator) |
| **Error States** | Upload fails, processing error |
| **Empty States** | N/A (guided flow) |
| **Loading States** | Processing spinner during document ingestion |
| **Dependencies** | `POST /api/knowledge-bases`, `POST /api/knowledge/upload`, `PUT /api/tenants/:id` (update settings), `POST /api/knowledge/publish` |
| **Components** | Stepper, WizardStep, BrandingForm, UploadZone, ProcessingStatus, WidgetPreview, SnippetDisplay, CompletionCelebration |
| **Show when** | User has zero knowledge bases or first login after signup |

### 4.11 Workspace Settings Page
| Field | Value |
|-------|-------|
| **Purpose** | Manage workspace name, slug, branding, delete |
| **User** | Owner |
| **Backend Data** | `GET /api/tenants/:id`, `PUT /api/tenants/:id` |
| **Actions** | Update name, update branding (colors, logo, welcome message, offline message), view slug, delete workspace (confirm) |
| **Permissions** | Owner only |
| **Error States** | Slug taken, delete fails due to active subscription |
| **Empty States** | N/A |
| **Dependencies** | `GET /api/tenants/:id`, `PUT /api/tenants/:id` |
| **Components** | WorkspaceNameForm, BrandingSettings (color picker, logo upload, message inputs), DangerZone (delete workspace) |

### 4.12 Knowledge Bases Page
| Field | Value |
|-------|-------|
| **Purpose** | List, create, delete knowledge bases |
| **User** | Any tenant member |
| **Backend Data** | `GET /api/knowledge-bases` |
| **Actions** | Create new KB → `POST /api/knowledge-bases`, click KB → navigate to detail, delete KB → `DELETE /api/knowledge-bases/:id` |
| **Permissions** | All members can view; admin/operator can delete |
| **Error States** | KB not found (404), delete fails |
| **Empty States** | "No knowledge bases yet. Create your first one to get started." → create CTA |
| **Loading States** | Skeleton list while loading |
| **Dependencies** | `GET /api/knowledge-bases`, `POST /api/knowledge-bases`, `DELETE /api/knowledge-bases/:id` |
| **Components** | KBTable, CreateKBModal, EmptyState, DeleteConfirmDialog |

### 4.13 Knowledge Detail Page
| Field | Value |
|-------|-------|
| **Purpose** | View knowledge base contents, upload documents, monitor processing |
| **User** | Any tenant member |
| **Backend Data** | `GET /api/knowledge-bases/:id`, `GET /api/knowledge-bases/:id/documents`, `GET /api/knowledge/stats` |
| **Actions** | Upload documents → modal, view document status, delete document, reindex document, search within KB |
| **Permissions** | All members can view; admin/operator can upload/delete |
| **Error States** | KB not found (404), upload fails (file too large, unsupported type) |
| **Empty States** | "No documents uploaded. Add your first document." → upload CTA |
| **Loading States** | Skeleton detail while loading |
| **Dependencies** | All KB + document + knowledge endpoints |
| **Components** | DocumentTable, UploadButton, UploadModal (file picker, URL input, FAQ form), StatusBadge, SearchBar, SourceStats |

### 4.14 Document Upload Page/Modal
| Field | Value |
|-------|-------|
| **Purpose** | Upload documents to knowledge base |
| **User** | Any tenant member |
| **Backend Data** | `POST /api/knowledge/upload`, `POST /api/knowledge/upload/faq`, `POST /api/knowledge/crawl` |
| **Actions** | Drag-and-drop files (pdf, docx, txt, md), paste URL to crawl, enter FAQ Q&A pairs |
| **Permissions** | Admin/operator |
| **Error States** | Invalid file type, file > 5MB, URL unreachable, crawl fails |
| **Empty States** | N/A |
| **Loading States** | Upload progress bar, processing indicator, success toast |
| **Dependencies** | Knowledge pipeline endpoints |
| **Components** | UploadZone (drag-and-drop), UrlCrawlInput, FaqEditor, ProgressIndicator, DocumentTypeSelector |

### 4.15 Publish Widget Page
| Field | Value |
|-------|-------|
| **Purpose** | Configure and publish the chat widget |
| **User** | Owner/admin |
| **Backend Data** | `GET /api/knowledge/versions`, `POST /api/knowledge/publish`, `PUT /api/tenants/:id` (update widget settings) |
| **Actions** | Configure widget (position, theme, auto-open, custom CSS), publish knowledge, view published status |
| **Permissions** | Owner/admin |
| **Error States** | No knowledge published, publish fails |
| **Empty States** | "Upload knowledge before publishing" → link to knowledge |
| **Loading States** | Publish progress |
| **Dependencies** | Knowledge pipeline publish endpoints, tenant settings |
| **Components** | PublishStepper (Configure → Publish → Install), WidgetPreview, PublishButton, VersionHistory, ConfigPanel (position, theme, auto-open, custom CSS) |

### 4.16 Widget Installer Page
| Field | Value |
|-------|-------|
| **Purpose** | Copy embed snippet, verify installation |
| **User** | Owner/admin |
| **Backend Data** | Tenant ID, published knowledge version (determines widget config) |
| **Actions** | Copy snippet to clipboard, test widget in preview, verify installation on domain |
| **Permissions** | Owner/admin |
| **Error States** | Widget not published, snippet malformed |
| **Empty States** | "Publish your knowledge first" |
| **Dependencies** | Published knowledge version |
| **Components** | SnippetDisplay (copy button, syntax highlighted), DomainVerificationInput, TestWidgetPreview (iframe), InstallationStatus |

### 4.17 Conversations Page
| Field | Value |
|-------|-------|
| **Purpose** | Browse chat history |
| **User** | Any tenant member |
| **Backend Data** | `GET /api/conversations?page=&limit=` |
| **Actions** | Filter by date, search by content, click to view transcript |
| **Permissions** | Tenant-scoped |
| **Error States** | API unavailable |
| **Empty States** | "No conversations yet. Once visitors start chatting, their conversations will appear here." |
| **Loading States** | Skeleton table |
| **Dependencies** | `GET /api/conversations` |
| **Components** | ConversationTable, SearchInput, DateRangeFilter, Pagination, StatusBadge |

### 4.18 Conversation Detail Page
| Field | Value |
|-------|-------|
| **Purpose** | View full message transcript |
| **User** | Any tenant member |
| **Backend Data** | `GET /api/conversations/:id`, `GET /api/conversations/:id/messages` |
| **Actions** | View messages, copy transcript, flag for review |
| **Permissions** | Tenant-scoped (404 if mismatch) |
| **Error States** | Conversation not found (404) |
| **Empty States** | N/A (if conversation exists, it has messages) |
| **Dependencies** | Conversation + message endpoints |
| **Components** | MessageList (user/assistant bubbles), MessageMetadata (token count, latency, safety flags), InfoPanel (started, ended, message count, session ID) |

### 4.19 Analytics Page
| Field | Value |
|-------|-------|
| **Purpose** | Usage insights and trends |
| **User** | Owner/admin |
| **Backend Data** | `GET /api/usage/current`, `GET /api/usage?page=&limit=` (historical), `GET /api/conversations` (counts) |
| **Actions** | Select date range, view charts, export data |
| **Permissions** | Owner/admin |
| **Error States** | API unavailable |
| **Empty States** | "No usage data yet. Data will appear after visitors start chatting." |
| **Loading States** | Chart skeleton while loading |
| **Dependencies** | Usage endpoints, conversation endpoints |
| **Components** | StatCard (messages this month), StatCard (tokens used), StatCard (active conversations), UsageChart (line chart, daily messages), TokenChart, PlanUsageBar (usage vs limit), DateRangePicker |

### 4.20 API Keys Page
| Field | Value |
|-------|-------|
| **Purpose** | Manage API keys for direct API access |
| **User** | Owner/admin/operator |
| **Backend Data** | `GET /api/api-keys`, `POST /api/api-keys`, `DELETE /api/api-keys/:id` |
| **Actions** | Create key (with label + role), copy on creation, revoke key |
| **Permissions** | Owner/admin/operator (all can view; only owner can create/revoke) |
| **Error States** | Create fails (limit reached), revoke fails |
| **Empty States** | "No API keys yet. Create one to integrate directly with the API." |
| **Loading States** | Skeleton table |
| **Dependencies** | API key endpoints |
| **Components** | ApiKeyTable, CreateApiKeyModal (label selector, role selector), KeyRevealDialog (show key once), RevokeConfirmDialog, EmptyState |
| **Note** | Key must be shown only once after creation; store in clipboard + display as masked after |

### 4.21 Team Members Page
| Field | Value |
|-------|-------|
| **Purpose** | Invite and manage team members |
| **User** | Owner |
| **Backend Data** | `GET /api/tenants/:id/members`, invite (missing), remove (missing) |
| **Actions** | Invite by email, assign role, remove member |
| **Permissions** | Owner only |
| **Error States** | Invite fails (invalid email, already member), remove fails |
| **Empty States** | "You're the only member. Invite your team to collaborate." |
| **Loading States** | Skeleton list |
| **Dependencies** | Team member management endpoints (need implementation: invite, accept, remove, list) |
| **Components** | MemberTable (avatar, name, email, role, joined date), InviteMemberModal (email input, role selector), RemoveConfirmDialog, RoleBadge |
| **Roles** | Owner, Admin, Operator, Member |

### 4.22 Billing Page
| Field | Value |
|-------|-------|
| **Purpose** | Manage subscription, view invoices, update payment method |
| **User** | Owner |
| **Backend Data** | Current plan, usage, invoices, payment method (via Stripe or similar) |
| **Actions** | Change plan, update payment method, view invoice history, cancel subscription |
| **Permissions** | Owner only |
| **Error States** | Payment fails, plan change fails |
| **Empty States** | "No invoices yet." |
| **Loading States** | Skeleton billing summary |
| **Dependencies** | Requires Stripe integration (missing): `GET /api/billing`, `POST /api/billing/portal`, `POST /api/billing/webhook` |
| **Components** | CurrentPlanCard, UsageMeter, PlanChangePanel, InvoiceTable, PaymentMethodCard, CancelSubscriptionDialog |
| **See Section 8 for full billing architecture** |

### 4.23 Profile Page
| Field | Value |
|-------|-------|
| **Purpose** | Update personal account info |
| **User** | Any authenticated user |
| **Backend Data** | `GET /api/auth/me`, `PUT /api/auth/me`, `PUT /api/auth/password` |
| **Actions** | Update name, avatar, email; change password |
| **Permissions** | Self-only |
| **Error States** | Current password incorrect (401), email already taken (409) |
| **Dependencies** | Auth endpoints |
| **Components** | ProfileForm (name, email read-only, avatar upload), PasswordChangeForm |

### 4.24 Support Page
| Field | Value |
|-------|-------|
| **Purpose** | Get help, contact support |
| **User** | Any authenticated user |
| **Backend Data** | None (static FAQ) or ticket system |
| **Actions** | Browse FAQ, search docs, contact form → email |
| **Permissions** | Authenticated |
| **Components** | FaqAccordion, SearchInput, ContactForm, DocLinks |

### 4.25 Documentation Page
| Field | Value |
|-------|-------|
| **Purpose** | API reference, widget guide, getting started |
| **User** | Developer (public) |
| **Backend Data** | None (static content) |
| **Actions** | Browse topics, search, view code examples |
| **Permissions** | None (public) |
| **Components** | DocSidebar, DocContent, CodeBlock (syntax highlighted), SearchBar |
| **Dependencies** | None (static site or markdown-rendered) |

### 4.26 Logout
| Field | Value |
|-------|-------|
| **Purpose** | End session |
| **User** | Any authenticated user |
| **Backend Data** | None |
| **Actions** | Clear JWT cookie/token → redirect to `/` |
| **Permissions** | Authenticated |
| **Components** | (No page — action only) |

---

## 5. Backend Mapping

### 5.1 Page-to-API Mapping Table

| Page | Existing API | Missing API | Required Data | Notes |
|------|-------------|-------------|---------------|-------|
| Landing | None | None | None | Static page |
| Features | None | None | None | Static page |
| Pricing | None | None | None | Static page |
| Sign Up | `POST /api/auth/signup` | — | `{email, password, name, companyName?}` | Returns JWT + tenant |
| Login | `POST /api/auth/login` | — | `{email, password}` | Returns JWT |
| Forgot Password | — | `POST /api/auth/forgot-password` | `{email}` | Sends reset email |
| Reset Password | — | `POST /api/auth/reset-password/:token` | `{token, password}` | Updates password |
| Email Verification | — | `GET /api/auth/verify-email/:token` | Token in URL | Sets `email_verified=true` |
| Dashboard | `GET /api/usage/current`, `GET /api/conversations?limit=5`, `GET /api/knowledge-bases`, `GET /api/tenants/:id` | — | Usage stats, recent conversations, KB list | Aggregate in frontend |
| Workspace Settings | `GET /api/tenants/:id`, `PUT /api/tenants/:id` | — | Tenant record | Settings JSON includes branding |
| Knowledge Bases | `GET /api/knowledge-bases`, `POST /api/knowledge-bases`, `DELETE /api/knowledge-bases/:id` | — | KB list | All exist |
| Knowledge Detail | `GET /api/knowledge-bases/:id`, `GET /api/knowledge-bases/:id/documents`, `GET /api/knowledge/stats` | — | KB + documents + stats | All exist |
| Document Upload | `POST /api/knowledge/upload`, `POST /api/knowledge/upload/faq`, `POST /api/knowledge/crawl` | — | File/URL/FAQ content | All exist (5MB limit) |
| Publish Widget | `POST /api/knowledge/publish`, `GET /api/knowledge/versions`, `PUT /api/tenants/:id` | — | Publish action, version list | Widget config stored in `TenantSettings.widget` |
| Widget Installer | `GET /api/tenants/:id` | Widget JS snippet endpoint | Tenant ID, widget settings | Need: `GET /api/widget/snippet` or serve `.js` file with tenant config |
| Conversations | `GET /api/conversations`, `GET /api/conversations/:id` | — | Conversation list + detail | All exist |
| Conversation Detail | `GET /api/conversations/:id`, `GET /api/conversations/:id/messages` | — | Messages + metadata | All exist |
| Analytics | `GET /api/usage`, `GET /api/usage/current` | — | Usage records | Basic; may need aggregation endpoints for charts |
| API Keys | `GET /api/api-keys`, `POST /api/api-keys`, `DELETE /api/api-keys/:id` | — | Keys + create + revoke | All exist; key shown once |
| Team Members | `GET /api/tenants/:id/members` | `POST /api/tenants/:id/invite`, `DELETE /api/tenants/:id/members/:userId`, `PUT /api/tenants/:id/members/:userId/role` | Member list | Need team management CRUD |
| Billing | — | `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook`, `GET /api/billing/invoices` | Stripe session URLs | Full Stripe integration needed |
| Profile | `GET /api/auth/me`, `PUT /api/auth/me`, `PUT /api/auth/password` | — | User profile | All exist |
| Profile/Password | `PUT /api/auth/password` | — | Password change | All exist |
| Support | None | — | None | Static FAQ or ticket system |
| Documentation | None | — | None | Static pages |
| Privacy/Terms | None | — | None | Static pages |
| Logout | None | — | None | Client-side only |

### 5.2 Missing APIs Summary

| API | Priority | Reason |
|-----|----------|--------|
| `POST /api/auth/forgot-password` | **High** | Required for password reset flow |
| `POST /api/auth/reset-password/:token` | **High** | Required for password reset flow |
| `GET /api/auth/verify-email/:token` | **Medium** | Email_verified column exists but no endpoint |
| `POST /api/auth/resend-verification` | **Medium** | Resend verification email |
| `GET /api/widget/:tenantId.js` | **High** | Serve dynamic widget JS with tenant config |
| `GET /api/widget/:tenantId/config` | **Medium** | Widget configuration JSON endpoint |
| `POST /api/billing/create-checkout-session` | **High** | Stripe checkout |
| `POST /api/billing/create-portal-session` | **High** | Stripe customer portal |
| `POST /api/billing/webhook` | **High** | Stripe webhook handler |
| `GET /api/billing/invoices` | **Medium** | Invoice history |
| `GET /api/billing/current` | **Medium** | Current subscription with usage |
| `POST /api/tenants/:id/invite` | **High** | Team member invitation |
| `DELETE /api/tenants/:id/members/:userId` | **High** | Team member removal |
| `PUT /api/tenants/:id/members/:userId/role` | **Medium** | Role change |
| `POST /api/tenants/:id/invitations/:token/accept` | **Medium** | Accept invitation |
| `GET /api/analytics/messages/daily` | **Medium** | Daily message counts for charts |
| `GET /api/analytics/conversations/satisfaction` | **Low** | Satisfaction ratings |

### 5.3 Reuse Strategy

To avoid duplicate functionality:

- **Auth session:** Use JWT tokens stored as HTTP-only cookies (`sameSite: lax`) — no server-side session store needed. Existing `verifyToken`/`generateToken` utilities suffice.
- **Tenant scoping:** All SaaS API routes already enforce `req.user.tenantId` — frontend sends JWT with tenantId claim.
- **Rate limiting:** Auth endpoints already rate-limited. Chat rate limiting is per-tenant config in the pipeline — no frontend changes needed.
- **Widget authentication:** The widget JS serves as a public asset. Visitors chat via the pipeline's `/api/chat` endpoint using a tenant API key embedded in the widget config. Widget config endpoint should return the key scoped to end-user role.
- **Knowledge pipeline:** All processing is async (publish returns immediately). Frontend polls `GET /api/knowledge/sources/:id` for status or uses the existing stats endpoint.

---

## 6. Reusable Components

### 6.1 Component Inventory

| Component | Page(s) | Description | State Variants |
|-----------|---------|-------------|----------------|
| `Navbar` | All public pages | Logo, nav links, auth buttons | Scrolled variant, mobile hamburger |
| `Sidebar` | All authenticated pages | Workspace switcher, nav links, upgrade CTA | Collapsed on mobile |
| `Footer` | All public pages | Links, legal, social | — |
| `Breadcrumb` | All authenticated pages | Current page path | — |
| `Hero` | Landing | Headline, subtitle, CTA, hero image | — |
| `FeatureCard` | Landing, Features | Icon, title, description | — |
| `FeatureGrid` | Landing, Features | 2/3-column responsive grid of FeatureCards | — |
| `PricingCard` | Pricing | Plan name, price, features list, CTA | Featured (Professional highlighted), disabled (Enterprise CTA) |
| `PricingToggle` | Pricing | Monthly/yearly toggle | — |
| `Testimonial` | Landing | Quote, author, company | — |
| `FaqAccordion` | Landing, Pricing, Support | Expandable Q&A items | Single/multi open |
| `TrustBar` | Landing | Company logos, stats | — |
| `CTA` | Multiple | Call-to-action section with headline + button | — |
| `SignUpForm` | Sign Up | Email, password, name, company fields | Validation errors inline |
| `LoginForm` | Login | Email, password, remember me | Error state, disabled state |
| `SocialLoginButtons` | Sign Up, Login | OAuth provider buttons | — |
| `StatCard` | Dashboard, Analytics | Icon, label, value, trend | Loading skeleton, error |
| `StatRow` | Dashboard | Row of StatCards | — |
| `UsageMeter` | Dashboard, Billing | Progress bar: used / limit | Normal (green), warning (yellow), exceeded (red) |
| `RecentConversations` | Dashboard | Mini table, last 5 conversations | Empty state, loading |
| `QuickActions` | Dashboard | Action cards: Upload, Publish, Invite | — |
| `UpgradeBanner` | Dashboard | Upgrade prompt (shown on free plan near limits) | Dismissible |
| `KnowledgeTable` | Knowledge | List of knowledge bases | Empty, loading, error |
| `CreateKBModal` | Knowledge | Name + description form | — |
| `DocumentTable` | Knowledge Detail | Document list with status badges | Empty, loading, error |
| `StatusBadge` | Multiple | Color-coded status indicator | processing (blue), completed (green), failed (red), pending (gray) |
| `UploadZone` | Document Upload | Drag-and-drop file upload area | Empty, dragging, uploading, error, success |
| `UrlCrawlInput` | Document Upload | URL input + crawl depth select | Validating, invalid URL |
| `FaqEditor` | Document Upload | Q&A pair list editor | Empty, add row, remove row |
| `ProgressIndicator` | Document Upload | Upload progress bar | Percentage, indeterminate for processing |
| `PublishStepper` | Publish | Multi-step: Configure → Publish → Install | Step indicator, current step content |
| `WidgetPreview` | Publish, Installer | Live widget preview in iframe | — |
| `WidgetConfigPanel` | Publish | Position, theme, auto-open, custom CSS inputs | — |
| `SnippetDisplay` | Installer | Syntax-highlighted code block with copy button | Copied confirmation |
| `DomainVerificationInput` | Installer | Domain input + verify button | Verified, not verified, verifying |
| `ConversationTable` | Conversations | Paginated conversation list | Empty, loading, error |
| `MessageList` | Conversation Detail | Chat bubbles, alternating user/assistant | Streaming state, empty |
| `MessageMetadata` | Conversation Detail | Token count, latency, safety flags | — |
| `InfoPanel` | Conversation Detail | Metadata sidebar | — |
| `UsageChart` | Analytics | Line/bar chart (daily messages) | Loading, no data, error |
| `PlanUsageBar` | Analytics, Dashboard | Usage vs plan limit | Normal, warning, exceeded |
| `DateRangePicker` | Analytics | Range selection | — |
| `ApiKeyTable` | API Keys | Key list (masked), label, role, last used | Empty, loading, error |
| `CreateApiKeyModal` | API Keys | Label + role form | — |
| `KeyRevealDialog` | API Keys | Shows full key once | Copy confirmation |
| `RevokeConfirmDialog` | Multiple | Confirm destructive action | — |
| `MemberTable` | Team | Member list: avatar, name, email, role | Empty, loading, error |
| `InviteMemberModal` | Team | Email + role form | Sent confirmation |
| `RoleBadge` | Team, API Keys | Colored role indicator | admin (red), operator (blue), member (green) |
| `CurrentPlanCard` | Billing | Plan name, price, status, features | — |
| `InvoiceTable` | Billing | Invoice list: date, amount, status, PDF link | Empty, loading |
| `PaymentMethodCard` | Billing | Card brand, last 4, expiry | Update button |
| `PlanChangePanel` | Billing | Available plans, upgrade/downgrade | Current plan highlighted |
| `CancelSubscriptionDialog` | Billing | Confirm cancellation, show consequences | — |
| `ProfileForm` | Profile | Name, email (read-only), avatar upload | Saved confirmation |
| `PasswordChangeForm` | Profile | Current + new + confirm password | Validation errors |
| `Stepper` | Onboarding, Publish | Step indicator | Step circles + labels + connector lines |
| `WizardStep` | Onboarding | Single step content container | — |
| `BrandingForm` | Onboarding, Workspace | Color picker, logo upload, message inputs | — |
| `CompletionCelebration` | Onboarding | Success animation, confetti, next steps | — |
| `Modal` | Multiple | Overlay dialog with title + content + actions | Variants: confirm, form, fullscreen |
| `Toast` | Multiple | Notification toast | success, error, warning, info; auto-dismiss, dismissible |
| `EmptyState` | Multiple | Illustration + title + description + CTA | — |
| `LoadingSkeleton` | Multiple | Placeholder shapes for loading content | Variants: card, table, chart |
| `SearchInput` | Conversations, Docs | Text input with search icon + clear button | — |
| `Pagination` | Conversations | Page numbers, prev/next | — |
| `UserAvatar` | Multiple | Initials or image avatar | Size variants: sm, md, lg |
| `WorkspaceSwitcher` | Sidebar | Dropdown to switch between owned workspaces | Create new option |
| `CodeBlock` | Installer, Docs | Syntax-highlighted code with copy button | — |
| `Table` | Multiple | Data table with sortable columns | Sort indicators |

### 6.2 Component Hierarchy

```
Layout
├── PublicLayout
│   ├── Navbar
│   ├── Footer
│   └── <slot> (page content)
│
├── AuthLayout
│   └── AuthForm (SignUpForm / LoginForm / ResetForm)
│
└── AppLayout
    ├── Sidebar
    │   ├── WorkspaceSwitcher
    │   ├── NavLinks
    │   └── UpgradeBanner
    ├── TopBar
    │   ├── Breadcrumb
    │   ├── SearchInput
    │   └── UserAvatar (dropdown: Profile, Billing, Logout)
    └── <slot> (page content)
        ├── DashboardPage
        │   ├── StatRow (StatCard[])
        │   ├── RecentConversations (Table)
        │   ├── KnowledgeStatus (StatusBadge[])
        │   └── QuickActions
        │
        ├── KnowledgePage
        │   ├── KnowledgeTable (or EmptyState)
        │   └── CreateKBModal
        │
        ├── KnowledgeDetailPage
        │   ├── KBHeader (name, description, stats)
        │   ├── UploadButton
        │   ├── DocumentTable (StatusBadge[])
        │   └── UploadModal
        │       ├── UploadZone
        │       ├── UrlCrawlInput
        │       └── FaqEditor
        │
        ├── PublishPage
        │   ├── PublishStepper
        │   │   ├── WidgetConfigPanel
        │   │   ├── WidgetPreview
        │   │   ├── SnippetDisplay
        │   │   └── DomainVerificationInput
        │
        ├── ConversationsPage
        │   ├── SearchInput + DateRangePicker
        │   ├── ConversationTable (or EmptyState)
        │   └── Pagination
        │
        ├── ConversationDetailPage
        │   ├── MessageList
        │   │   └── MessageMetadata
        │   └── InfoPanel
        │
        ├── AnalyticsPage
        │   ├── DateRangePicker
        │   ├── StatRow (StatCard[])
        │   ├── UsageChart (×2: messages, tokens)
        │   └── PlanUsageBar
        │
        ├── ApiKeysPage
        │   ├── ApiKeyTable (or EmptyState)
        │   ├── CreateApiKeyModal
        │   └── KeyRevealDialog
        │
        ├── TeamPage
        │   ├── MemberTable (or EmptyState)
        │   └── InviteMemberModal
        │
        ├── BillingPage
        │   ├── CurrentPlanCard
        │   ├── UsageMeter
        │   ├── InvoiceTable (or EmptyState)
        │   ├── PaymentMethodCard
        │   └── PlanChangePanel
        │
        └── ProfilePage
            ├── ProfileForm
            └── PasswordChangeForm
```

---

## 7. Customer Onboarding

### 7.1 Onboarding Flow

The onboarding wizard appears on first login after signup. It is accessible anytime via `/onboarding` until at least one widget is published.

**Step 1: Brand Your Widget** (`/onboarding?step=1`)
- Widget name (default: company name)
- Primary color (color picker)
- Logo upload (optional)
- Welcome message (placeholder: "Hi! How can I help you?")
- Offline message (placeholder: "We're not available right now, but leave a message and we'll get back to you.")
- Preview panel shows real-time widget preview
- "Continue" → saves to `TenantSettings.branding`

**Step 2: Add Knowledge** (`/onboarding?step=2`)
- Create first KB (name: "Website Help" or similar)
- Upload options tab bar:
  - **Files** — Drag-and-drop PDF, DOCX, TXT, MD
  - **URL** — Enter website URL to crawl
  - **FAQ** — Enter Q&A pairs manually
- Can add multiple sources
- "Continue" → processes documents

**Step 3: Review Knowledge** (`/onboarding?step=3`)
- Processing status for each document (polling)
- Document count, chunk count
- Can proceed while processing (processing continues in background)
- "Continue" → navigate to step 4

**Step 4: Configure Widget** (`/onboarding?step=4`)
- Widget position: Bottom-right / Bottom-left
- Theme: Light / Dark / Auto (match site)
- Auto-open: On load / After delay / Manual only
- "Continue" → saves to `TenantSettings.widget`

**Step 5: Install & Celebrate** (`/onboarding?step=5`)
- Publish knowledge
- Show embed snippet with copy button
- Test widget in preview iframe
- Domain verification input (optional)
- **Success milestone:** Confetti animation, "Your chatbot is live!" message
- Suggested next steps: "View Dashboard", "Add More Knowledge", "Customize Widget"
- "Go to Dashboard" → `/dashboard`

### 7.2 Success Milestones

| Milestone | Trigger | Celebration |
|-----------|---------|-------------|
| Account created | Signup form submitted | Welcome email |
| Email verified | Click verification link | Confirmation page |
| First document uploaded | Upload completes | Toast: "Document added" |
| Knowledge published | First publish | Step 5 confetti |
| Widget installed | Domain verified (or snippet copied) | Dashboard badge |
| First visitor chat | First message received | Email notification: "Your first conversation!" |
| 10 conversations | Conversation count hits 10 | Dashboard stat badge |

### 7.3 Saved State & Resumability

- Onboarding progress saved to `localStorage` (current step, completed steps)
- Can close and resume from same step
- Workspace settings persist immediately (saved on each step "Continue")
- Knowledge uploads persist once submitted
- If onboarding is dismissed, user lands on dashboard with "Complete Setup" banner

---

## 8. Billing Architecture

### 8.1 Subscription Plans

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| **Price** | $0 | $29/mo | $99/mo | Custom |
| **Messages/mo** | 100 | 1,000 | 10,000 | Unlimited |
| **Tokens/mo** | 10K | 100K | 1M | Custom |
| **Knowledge Bases** | 1 | 3 | 10 | Unlimited |
| **Documents** | 10 | 100 | 500 | Unlimited |
| **Storage** | 100MB | 1GB | 5GB | Custom |
| **Team Members** | 1 (owner) | 3 | 10 | Unlimited |
| **API Access** | Yes | Yes | Yes | Yes |
| **Analytics** | Basic | Basic | Advanced | Custom |
| **Widget Customization** | Basic | Full | Full + CSS | Full + CSS |
| **Custom Domain** | — | — | ✓ | ✓ |
| **SSO** | — | — | — | ✓ |
| **SLA** | — | — | 99.9% | 99.99% |
| **Support** | Community | Email | Priority | Dedicated |

### 8.2 Feature Limits (Enforced by Backend)

Limits tracked via `UsageRecord`:

| Resource | DB Column | Enforcement Point |
|----------|-----------|-------------------|
| Messages/mo | `messages_used` vs `messages_limit` | Pipeline rate-limit check fails with `ERR_RATE_LIMIT_EXCEEDED` |
| Tokens/mo | `tokens_used` vs `tokens_limit` | Stage 5 response generation |
| Storage | `storage_used_mb` vs `storage_limit_mb` | Document upload rejection |
| Knowledge Bases | Count query vs plan limit | KB creation rejection |
| Team Members | Count query vs plan limit | Invite rejection |

### 8.3 Subscription Lifecycle

```
Trial Start (14 days)
    │
    ├── Subscribe → Active
    │                 │
    │                 ├── Renew (monthly) → Active
    │                 ├── Upgrade → Active (new plan)
    │                 ├── Downgrade → Active (pending change at period end)
    │                 ├── Payment fails → Past Due (3 days grace)
    │                 │                    │
    │                 │                    ├── Payment success → Active
    │                 │                    └── Payment fails → Expired
    │                 │
    │                 └── Cancel → Cancelled (end of period)
    │                                        │
    │                                        └── Period end → Expired
    │
    └── Trial ends → Expired (no payment method)
```

### 8.4 Plan Change Rules

| From → To | Immediate or End of Period? | Proration | Data Retention |
|-----------|---------------------------|-----------|----------------|
| Trial → Paid | Immediate | N/A | Full |
| Free → Starter | Immediate | N/A | Full |
| Starter → Professional | Immediate | Prorated credit | Full |
| Professional → Starter | End of period | No refund | Full (features locked) |
| Any → Free | End of period | N/A | 30-day data retention then archive |
| Any → Cancel | End of period | N/A | 90-day grace, then permanent delete |

### 8.5 Invoice Flow

1. Subscription created → Stripe invoice generated
2. Invoice paid → Webhook updates `UsageRecord.limits` to new plan
3. Invoice payment fails → Webhook sets `subscription_status = 'past_due'`
4. Customer retries payment via billing portal or manual retry
5. Invoice list served from Stripe (or synced to local DB for caching)

### 8.6 Stripe Integration

Required Stripe objects:
- **Products** — One per plan (Free, Starter, Professional, Enterprise)
- **Prices** — Monthly recurring prices per product
- **Subscriptions** — Linked to customer, references price
- **Checkout Sessions** — For initial subscription and plan changes
- **Customer Portal** — For self-service payment method and invoice management
- **Webhooks** — `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`

Backend endpoints needed:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/billing/create-checkout-session` | Creates Stripe Checkout Session, returns URL |
| `POST /api/billing/create-portal-session` | Creates Stripe Customer Portal session, returns URL |
| `POST /api/billing/webhook` | Stripe event webhook handler |
| `GET /api/billing/current` | Returns current subscription + usage data |
| `GET /api/billing/invoices` | Returns synced invoice list |
| `GET /api/billing/plans` | Returns plan definitions with prices |

### 8.7 Over-limit Behavior

| Scenario | API Response | User Facing |
|----------|-------------|-------------|
| Messages exceeded | `ERR_RATE_LIMIT_EXCEEDED` (429) | Widget returns fallback response |
| Storage exceeded | Upload rejected (413) | "Storage limit reached. Upgrade to continue uploading." |
| KB limit reached | KB creation rejected (403) | "Knowledge base limit reached." |
| Document limit reached | Document upload rejected (403) | "Document limit reached." |
| Team member limit | Invite rejected (403) | "Team member limit reached." |

---

## 9. Widget Installation

### 9.1 Installation Flow

```
Customer copies snippet
         │
         ▼
Customer pastes into website <head>
         │
         ▼
Widget script loads (external JS or inline):
  - Creates <iframe> or injects chat UI
  - Reads config from GET /api/widget/:tenantId/config
  - Renders chat button in corner
         │
         ▼
Domain Verification (optional):
  - Customer enters domain in dashboard
  - Widget pings backend with domain
  - Backend stores in TenantSettings.widget.allowedDomains[]
  - Widget only loads on verified domains
  - (Or skip verification — widget works everywhere)
         │
         ▼
Test Widget:
  - Dashboard shows preview iframe with widget
  - Customer can send test message
  - Message goes through pipeline (flagged as test)
         │
         ▼
Publish:
  - Customer clicks "Publish" in dashboard
  - Knowledge version is created
  - Widget uses latest published knowledge
```

### 9.2 Embed Snippet

```html
<!-- Conversation Engine Widget -->
<script>
  (function(w,d,s,o,f,g){w['CEWidget']=f;w[f]=w[f]||function(){
  (w[f].q=w[f].q||[]).push(arguments)};g=d.createElement(s),
  s=d.getElementsByTagName(s)[0];g.async=1;g.src=o+
  '?v='+Date.now();s.parentNode.insertBefore(g,s)
  })(
    window,document,'script','https://your-domain.com/widget.js','ce'
  );
  ce('init', { tenant: 'TENANT_ID', position: 'bottom-right' });
</script>
<!-- End Conversation Engine Widget -->
```

### 9.3 Widget Configuration (from backend)

`GET /api/widget/:tenantId/config`
```json
{
  "tenantId": "uuid",
  "apiKey": "sk_...",          // scoped to end-user role
  "pipelineUrl": "https://pipeline.example.com",
  "branding": {
    "primaryColor": "#4F46E5",
    "logoUrl": "https://...",
    "companyName": "Acme Inc",
    "welcomeMessage": "Hi! How can I help you?",
    "offlineMessage": "We're not available right now."
  },
  "widget": {
    "position": "bottom-right",
    "theme": "light",
    "autoOpen": false,
    "customCss": null
  },
  "pipelineVersion": 3,
  "published": true
}
```

### 9.4 Domain Verification

- Optional security measure
- Customer adds domain to `TenantSettings.widget.allowedDomains`
- Widget JS verifies `document.location.hostname` against allowed list
- If not in allowed list, widget does not render (or renders in "offline/preview" mode with warning)
- Verification methods:
  1. **DNS TXT record** — Customer adds `_ce-verify=TOKEN` to their DNS
  2. **Meta tag** — Customer adds `<meta name="ce-verify" content="TOKEN">` to their page head
  3. **File upload** — Customer places `ce-verify-TOKEN.txt` at root of their domain

### 9.5 Published Status

| Status | Meaning | Widget Behavior |
|--------|---------|-----------------|
| Not published | No knowledge published | Shows offline message |
| Published | Knowledge published | Responds from knowledge |
| Outdated | Knowledge updated since publish | Shows "knowledge updated" badge in dashboard |
| Processing | Knowledge being re-indexed | Continues serving previous version |

---

## 10. Mobile Strategy

### 10.1 Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | < 640px | Phone portrait |
| Tablet | 640px – 1023px | Phone landscape, tablet portrait |
| Desktop | 1024px – 1279px | Tablet landscape, small desktop |
| Wide | >= 1280px | Desktop, widescreen |

### 10.2 Navigation Behavior

| Viewport | Sidebar | Top Bar | Content |
|----------|---------|---------|---------|
| Mobile | Hidden behind hamburger menu (overlay, full-width) | Logo + hamburger + avatar | Full-width, single column |
| Tablet | Collapsible (icon-only icons, text hidden) | Breadcrumb + avatar | Full-width, single column |
| Desktop | Expanded (250px) | Breadcrumb + search + avatar | Sidebar + content |
| Wide | Expanded (300px) | Breadcrumb + search + avatar | Sidebar + content (max-width 1440px centered) |

### 10.3 Page Adaptations

| Page | Mobile Adaptation |
|------|-------------------|
| Landing | Single column stack, reduced hero text, stacked feature cards |
| Pricing | Cards stack vertically, horizontal scroll for comparison |
| Dashboard | Stat cards stack 2×2 grid, recent conversations truncated to 3 |
| Knowledge | Table converts to card list |
| Knowledge Detail | Sidebar tabs become top tabs |
| Document Upload | Full-screen upload zone on tap, file picker opens native |
| Conversations | Table → card list, swipe to view details |
| Conversation Detail | Info panel hidden behind "Details" toggle |
| Analytics | Charts full-width, stacked vertically |
| API Keys | Table → card list |
| Team | Table → card list |
| Billing | Stacked layout |
| Profile | Single column |

### 10.4 Touch Targets

- All interactive elements: min 44×44px
- Sidebar toggle: 48×48px
- Form inputs: min 44px height
- Pagination: prev/next min 44px
- Modal close: 44×44px

### 10.5 Responsive Widget

The visitor-facing widget is inherently responsive:
- On mobile: bottom sheet (full-width, 60% height) instead of dialog
- Chat button: 56×56px (per Material guidelines)
- Text input: auto-grows, enter to send
- Messages: max-width 85% of container

---

## 11. Accessibility

### 11.1 WCAG Compliance Target

**Level AA** minimum for all public-facing pages. **Level AAA** where feasible (contrast, focus indicators).

### 11.2 Keyboard Navigation

| Feature | Requirement |
|---------|-------------|
| Skip link | "Skip to content" link at top of every page |
| Tab order | Logical, matches visual layout |
| Focus indicators | Visible outline (3px, high contrast) on all interactive elements |
| Focus trap | Modals and sidebars trap focus when open |
| Escape key | Closes modals, dropdowns, sidebars |
| Enter/Space | Activates buttons, toggles |
| Arrow keys | Tab navigation within tables, radio groups, carousels |
| Command palette | Ctrl+K opens search on all authenticated pages |

### 11.3 Screen Readers

| Feature | Requirement |
|---------|-------------|
| Semantic HTML | Use `<nav>`, `<main>`, `<aside>`, `<section>`, `<article>`, `<header>`, `<footer>` |
| Headings | Hierarchical h1-h6, one h1 per page |
| Labels | All form inputs have associated `<label>` or `aria-label` |
| Live regions | `aria-live="polite"` for dynamic updates (notifications, loading states) |
| Status announcements | Toast messages use `role="status"` |
| Tables | `<caption>`, `scope` on headers, `aria-sort` on sortable columns |
| Images | All decorative images `alt=""`, all informative images have descriptive `alt` |
| Icons | All icon-only buttons have `aria-label` |
| Landmarks | `role="navigation"`, `role="banner"`, `role="contentinfo"`, `role="complementary"` |

### 11.4 Color & Contrast

| Requirement | Ratio |
|-------------|-------|
| Normal text (< 24px) | 4.5:1 minimum |
| Large text (≥ 24px) | 3:1 minimum |
| UI components / graphical objects | 3:1 minimum |
| Focus indicator | 3:1 against adjacent colors |
| Error state | Not conveyed by color alone (add icon + text) |

### 11.5 Focus States

- All interactive elements: visible focus ring (3px solid, high-contrast color)
- Focus ring color: current primary color or a high-contrast yellow/blue
- Never `outline: none` without providing a custom focus indicator
- Focus order matches DOM order (no arbitrary `tabindex > 0`)

### 11.6 ARIA

| Pattern | ARIA Usage |
|---------|------------|
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` referencing title |
| Tab panel | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls` |
| Accordion | `role="button"` on trigger, `aria-expanded`, `aria-controls` on panel |
| Alert | `role="alert"` for error messages |
| Progress | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Navigation | `<nav>` with `aria-label` |
| Table sort | `aria-sort="ascending"` or `"descending"` on header |
| Tooltip | `aria-describedby` |
| Toast | `role="status"`, `aria-live="polite"` |

---

## 12. Production Launch Checklist

| # | Category | Item | Owner | Complete |
|---|----------|------|-------|----------|
| 1 | **Deployment** | Docker images configured and tested | [ ] | [ ] |
| 2 | **Deployment** | `docker-compose.yml` verified in production env | [ ] | [ ] |
| 3 | **Deployment** | Database migration process documented | [ ] | [ ] |
| 4 | **Deployment** | Database backup strategy configured (daily SQLite backups) | [ ] | [ ] |
| 5 | **Deployment** | File system backups configured (config store, uploaded docs) | [ ] | [ ] |
| 6 | **Deployment** | Zero-downtime deployment process documented | [ ] | [ ] |
| 7 | **Deployment** | Rollback procedure documented | [ ] | [ ] |
| 8 | **Monitoring** | Health check endpoints verified (`/api/healthz`, `/api/ready`) | [ ] | [ ] |
| 9 | **Monitoring** | Prometheus metrics scraping configured | [ ] | [ ] |
| 10 | **Monitoring** | Alert rules configured (high error rate, low disk, service down) | [ ] | [ ] |
| 11 | **Monitoring** | Log aggregation configured (stdout for container, file for PM2) | [ ] | [ ] |
| 12 | **Monitoring** | Uptime monitoring configured (Pingdom, UptimeRobot, or self-hosted) | [ ] | [ ] |
| 13 | **Billing** | Stripe account configured | [ ] | [ ] |
| 14 | **Billing** | Stripe products and prices created | [ ] | [ ] |
| 15 | **Billing** | Stripe webhook endpoints registered | [ ] | [ ] |
| 16 | **Billing** | Checkout session flow tested end-to-end | [ ] | [ ] |
| 17 | **Billing** | Customer portal flow tested | [ ] | [ ] |
| 18 | **Billing** | Webhook handlers tested (payment success, failure, subscription update) | [ ] | [ ] |
| 19 | **Billing** | Invoice generation tested | [ ] | [ ] |
| 20 | **Billing** | Plan change / upgrade / downgrade tested | [ ] | [ ] |
| 21 | **Billing** | Cancellation flow tested | [ ] | [ ] |
| 22 | **Billing** | Trial period logic verified | [ ] | [ ] |
| 23 | **Emails** | SMTP server configured | [ ] | [ ] |
| 24 | **Emails** | Welcome email template created | [ ] | [ ] |
| 25 | **Emails** | Email verification email template created | [ ] | [ ] |
| 26 | **Emails** | Password reset email template created | [ ] | [ ] |
| 27 | **Emails** | Team invitation email template created | [ ] | [ ] |
| 28 | **Emails** | Billing invoice email template created | [ ] | [ ] |
| 29 | **Emails** | Email delivery tested (send to multiple providers) | [ ] | [ ] |
| 30 | **Security** | SSL/TLS certificate installed (Let's Encrypt or paid) | [ ] | [ ] |
| 31 | **Security** | HTTPS enforced (HSTS header configured) | [ ] | [ ] |
| 32 | **Security** | CORS configured with specific origins | [ ] | [ ] |
| 33 | **Security** | Rate limiting verified on auth endpoints | [ ] | [ ] |
| 34 | **Security** | JWT_SECRET rotated from default (32+ bytes) | [ ] | [ ] |
| 35 | **Security** | INTERNAL_SYNC_KEY rotated from default (16+ bytes) | [ ] | [ ] |
| 36 | **Security** | SQL injection testing passed | [ ] | [ ] |
| 37 | **Security** | XSS testing passed (widget input) | [ ] | [ ] |
| 38 | **Security** | API key hashing verified (bcrypt) | [ ] | [ ] |
| 39 | **Domains** | Primary domain registered and DNS configured | [ ] | [ ] |
| 40 | **Domains** | CDN configured (static assets, widget JS) | [ ] | [ ] |
| 41 | **Domains** | Custom domains for customer widgets tested | [ ] | [ ] |
| 42 | **Documentation** | API reference documentation published | [ ] | [ ] |
| 43 | **Documentation** | Widget installation guide published | [ ] | [ ] |
| 44 | **Documentation** | Getting started guide published | [ ] | [ ] |
| 45 | **Documentation** | FAQ published | [ ] | [ ] |
| 46 | **Legal** | Privacy policy page published | [ ] | [ ] |
| 47 | **Legal** | Terms of service page published | [ ] | [ ] |
| 48 | **Legal** | Cookie policy page published | [ ] | [ ] |
| 49 | **Legal** | Data processing agreement (DPA) available | [ ] | [ ] |
| 50 | **Legal** | GDPR compliance checklist completed | [ ] | [ ] |
| 51 | **Support** | Support email / ticketing system configured | [ ] | [ ] |
| 52 | **Support** | In-app support page published | [ ] | [ ] |
| 53 | **Support** | SLA response times documented | [ ] | [ ] |
| 54 | **Infrastructure** | Database connection pooling verified | [ ] | [ ] |
| 55 | **Infrastructure** | Connection limits tested (SQLite WAL mode) | [ ] | [ ] |
| 56 | **Infrastructure** | Error tracking configured (Sentry or similar) | [ ] | [ ] |
| 57 | **Infrastructure** | Performance baseline established (load test results) | [ ] | [ ] |
| 58 | **Validation** | Load test passes with production hardware targets | [ ] | [ ] |
| 59 | **Validation** | Soak test passes (no memory leak over 1 hour) | [ ] | [ ] |
| 60 | **Validation** | Full test suite passes | [ ] | [ ] |
| 61 | **Validation** | E2E workflow passes | [ ] | [ ] |
| 62 | **Validation** | Failure injection tests pass | [ ] | [ ] |
| 63 | **Validation** | Backup restore tested | [ ] | [ ] |

---

## 13. Risks

### 13.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SQLite concurrency under load | Medium | High | WAL mode already configured; monitor connection pool; plan Postgres migration if needed |
| Knowledge pipeline processing latency | Medium | Medium | Async processing with status polling; 30s sync timeout for simple docs |
| Widget JS bundle size | Low | Medium | Lazy-load; tree-shake; CDN hosting with cache headers |
| Cross-origin widget issues | Low | Medium | CORS headers on widget config endpoint; postMessage for iframe communication |
| JWT token expiry UX | Medium | Low | 7-day expiry; refresh token flow; silent refresh on page load |

### 13.2 Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Customers don't complete onboarding | High | High | Resumable wizard; email nudges; "Complete Setup" persistent banner |
| Knowledge quality insufficient | Medium | High | Encourage multiple document types; FAQ editor for common questions |
| Widget not visible on customer site | Medium | Medium | Domain verification; installation status check; embed validation tool |
| LLM response quality varies | Medium | Medium | Configurable system prompt; temperature setting; content filter thresholds |

### 13.3 UX Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Widget overlaps site content | Low | High | Configurable position; custom CSS support; preview mode |
| Onboarding feels too long | Medium | Medium | 5 steps but skippable; processing in background; progress saved |
| Analytics not useful | Medium | Low | Start with basic usage stats; expand based on feedback |
| Mobile widget usability | Low | Medium | Bottom sheet on mobile; tested against common viewports |
| Password reset loop | Low | High | Rate-limit reset emails; clear error messages; support contact |

### 13.4 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Free tier cannibalizes paid | Low | Medium | Usage limits enforced; upgrade prompts at 80% of limit |
| LLM API costs exceed revenue | Medium | High | Per-token billing; usage caps; caching common questions |
| Customer churn due to quality | Medium | High | Knowledge quality metrics; manual override to human handoff |
| Competitive pressure | Medium | Medium | White-label, self-hosted differentiator vs Intercom/Zendesk |

### 13.5 Deployment Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Configuration drift between services | Medium | High | Docker compose single source of truth; env validation script |
| SQLite data loss on host crash | Medium | High | WAL mode; daily backups to separate volume; documented restore procedure |
| Secret exposure in env files | Low | High | .env in .gitignore; production secrets from Docker secrets or vault |

### 13.6 Customer Onboarding Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Customer uploads incompatible document | Medium | Low | Supported formats listed; clear error on invalid file; 5MB limit enforced |
| Crawl fails on JavaScript-heavy site | Medium | Low | Document limitation documented; suggest PDF export instead |
| Widget doesn't work on IE/old browsers | Low | Medium | Support last 2 major browser versions; polyfill for widget |
| Knowledge not immediately available after publish | Low | Medium | Sync publish; status indicator; estimated completion time |

### 13.7 Support Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Customers can't install widget | Medium | Medium | Step-by-step guide; video tutorial; email support |
| LLM-generated inappropriate content | Low | High | Content filters; crisis detection; configurable thresholds |
| Abuse/automated spam via widget | Medium | Medium | Rate limiting per tenant; dedup; API key rotation |

---

## 14. Implementation Roadmap

### 14.1 Phase Overview

| Phase | Name | Focus | Effort | Dependencies |
|-------|------|-------|--------|-------------|
| CP2 | Customer Website | Landing, Features, Pricing, Docs, Legal pages | 2 weeks | None (static) |
| CP3 | Authentication UX | Signup, Login, Forgot/Reset Password, Email Verification, Profile | 2 weeks | CP2 (layout) |
| CP4 | Knowledge & Workspace | Dashboard, Workspace Settings, Knowledge CRUD, Upload, Processing, Publish | 3 weeks | CP3 (auth) |
| CP5 | Widget & Conversations | Widget JS, Widget Installer, Conversations, API Keys, Team | 3 weeks | CP4 (knowledge) |
| CP6 | Analytics & Billing | Analytics dashboard, Stripe integration, Plan enforcement | 3 weeks | CP3 (auth), CP4 (knowledge) |
| CP7 | Polish & Accessibility | WCAG audit, responsive fixes, edge cases, error states | 2 weeks | CP2-CP6 |
| CP8 | Launch | Production deployment, monitoring, documentation, legal pages | 1 week | CP7 |

### 14.2 Detailed Phase Breakdown

#### CP2 — Customer Website (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Set up frontend project (Vite + React/Vue/Svelte) | 1d | Use existing admin portal patterns |
| Create layout components (Navbar, Footer, PublicLayout) | 2d | Responsive, accessible |
| Build Landing page | 2d | Hero, FeatureGrid, Testimonials, TrustBar, FAQ, CTA |
| Build Features page | 1d | Alternating feature sections |
| Build Pricing page | 1d | PricingCards, toggle, FAQ |
| Build Documentation pages | 3d | API reference, widget guide, getting started |
| Build Legal pages (Privacy, Terms, Cookies, DPA) | 1d | Static content |
| SEO setup (meta tags, Open Graph, structured data, sitemap) | 1d | Robots.txt, sitemap.xml, canonical URLs |
| Performance optimization (Core Web Vitals) | 1d | Lighthouse audit, lazy loading, image optimization |

**CP2 Effort:** 2 weeks

#### CP3 — Authentication UX (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Build Sign Up page + form | 2d | Client validation, error states, loading |
| Build Login page + form | 1d | JWT cookie handling, redirect logic |
| Implement `POST /api/auth/forgot-password` | 1d | Backend: generate token, send email |
| Implement `POST /api/auth/reset-password/:token` | 1d | Backend: verify token, update password |
| Build Forgot Password page | 1d | Email input, success message |
| Build Reset Password page | 1d | Token validation, new password form |
| Implement email verification flow | 2d | Backend: `GET /api/auth/verify-email/:token`, resend endpoint. Frontend: verification page |
| Build Profile page (name, avatar, email, password change) | 1d | Using existing `PUT /api/auth/me`, `PUT /api/auth/password` |
| Email service integration (SMTP, templates) | 2d | Welcome, verification, reset, invitation templates |
| Create AuthLayout (wrapping auth pages) | 1d | Consistent look across auth pages |
| Implement session persistence (JWT cookie + auto-refresh) | 1d | HTTP-only cookie, refresh mechanism |

**CP3 Effort:** 2 weeks

#### CP4 — Knowledge & Workspace (3 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Create AppLayout (Sidebar, TopBar, content area) | 2d | Responsive sidebar, workspace switcher |
| Build Dashboard page | 2d | StatCards, RecentConversations, QuickActions, KnowledgeStatus |
| Build Onboarding Wizard (5 steps) | 3d | Stepper, brand form, upload, processing, install |
| Build Workspace Settings page | 1d | Branding form, delete workspace |
| Build Knowledge Bases list page | 1d | KB table, create modal, empty state |
| Build Knowledge Detail page | 2d | Document table, status badges, upload button |
| Build Upload modal (file, URL, FAQ) | 2d | UploadZone, UrlCrawlInput, FaqEditor, progress |
| Build Publish page | 2d | PublishStepper, WidgetConfigPanel, version list |
| Build Widget Installer page | 1d | SnippetDisplay, DomainVerification, TestWidget |
| Build API Keys page | 1d | Key table, create modal, reveal dialog |
| Implement knowledge polling (document status) | 1d | Poll status after upload, update UI |
| Error states, loading states, empty states for all pages | 2d | Skeleton loaders, empty state components |

**CP4 Effort:** 3 weeks

#### CP5 — Widget & Conversations (3 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Build widget JS (chat UI injected into customer site) | 5d | Chat bubble, message window, API integration. Vanilla JS, no framework dependency |
| Build widget config endpoint `GET /api/widget/:tenantId/config` | 1d | Returns tenant branding + widget settings + API key |
| Implement domain verification (meta tag, DNS, file) | 2d | Three methods, verification status endpoint |
| Build Conversations list page | 1d | Table, search, date filter, pagination |
| Build Conversation Detail page | 1d | MessageList, InfoPanel, transcript copy |
| Build Team Members page | 2d | MemberTable, InviteMemberModal, RemoveConfirmDialog |
| Implement team invitation endpoints | 2d | Backend: invite, accept, remove, role change |
| Build Support page | 1d | FAQ accordion, contact form |
| Widget preview in dashboard (iframe) | 1d | Live widget preview with tenant config |
| Widget testing flow | 1d | Send test message, verify response |
| CI/CD for widget.js | 1d | CDN deployment, cache invalidation, versioning |

**CP5 Effort:** 3 weeks

#### CP6 — Analytics & Billing (3 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| Implement Stripe product/price configuration script | 1d | Create products + prices for all plans |
| Implement `POST /api/billing/create-checkout-session` | 1d | Creates Stripe Checkout, handles trial |
| Implement `POST /api/billing/create-portal-session` | 1d | Stripe Customer Portal integration |
| Implement `POST /api/billing/webhook` | 2d | Handle all relevant Stripe events |
| Implement `GET /api/billing/current` | 1d | Current subscription + usage data |
| Implement `GET /api/billing/invoices` | 1d | Sync invoice list from Stripe |
| Implement plan enforcement (usage limits) | 2d | Over-limit rejection in pipeline + API |
| Build Billing page | 2d | CurrentPlanCard, PlanChangePanel, InvoiceTable, PaymentMethodCard |
| Build Analytics page | 2d | StatCards, UsageChart, DateRangePicker, PlanUsageBar |
| Implement daily/weekly usage aggregation for charts | 1d | `GET /api/analytics/...` endpoints |
| Dashboard integration (usage meter, upgrade prompts) | 1d | UpgradeBanner at 80% usage |

**CP6 Effort:** 3 weeks

#### CP7 — Polish & Accessibility (2 weeks)

| Task | Effort | Notes |
|------|--------|-------|
| WCAG Level AA audit | 2d | Automated + manual testing |
| Keyboard navigation pass | 2d | Focus order, skip links, modal focus trap |
| Screen reader pass | 2d | Labels, ARIA, live regions, announcements |
| Color contrast audit | 1d | 4.5:1 normal text, 3:1 large text |
| Mobile responsive pass | 2d | Test all pages at all breakpoints |
| Error state audit | 1d | Network errors, validation, 404, 403, 500 |
| Loading state audit | 1d | Skeleton screens, spinners, progress bars |
| Empty state audit | 1d | All pages with no data |
| Toast notification system | 1d | Success, error, warning, info |
| Performance optimization | 1d | Bundle size, lazy loading, caching |
| Cross-browser testing | 1d | Chrome, Firefox, Safari, Edge (last 2 major) |

**CP7 Effort:** 2 weeks

#### CP8 — Launch (1 week)

| Task | Effort | Notes |
|------|--------|-------|
| Production deployment | 1d | Docker compose on production VPS |
| SSL/TLS configuration | 1d | Let's Encrypt, auto-renewal |
| Domain setup (primary + CDN) | 1d | DNS records, CDN for assets |
| Stripe webhook registration | 0.5d | Live mode endpoints |
| Monitoring & alerting setup | 1d | Prometheus, alert rules, uptime monitoring |
| Email delivery verification | 0.5d | SPF, DKIM, DMARC setup |
| Database backup configuration | 0.5d | Cron job, offsite storage |
| Load test on production hardware | 1d | Validate targets |
| Go/no-go decision | — | Review against checklist |

**CP8 Effort:** 1 week

### 14.3 Total Effort Estimate

| Phase | Weeks | Cumulative |
|-------|-------|------------|
| CP2 — Customer Website | 2 | 2 |
| CP3 — Authentication UX | 2 | 4 |
| CP4 — Knowledge & Workspace | 3 | 7 |
| CP5 — Widget & Conversations | 3 | 10 |
| CP6 — Analytics & Billing | 3 | 13 |
| CP7 — Polish & Accessibility | 2 | 15 |
| CP8 — Launch | 1 | 16 |

**Total:** ~16 weeks (4 months) to public launch

### 14.4 Parallelization Opportunities

| Phase | Can Run In Parallel With | Notes |
|-------|--------------------------|-------|
| CP2 | CP3 (backend work) | CP2 is frontend-only static pages; CP3 starts backend auth endpoints |
| CP3 | CP4 frontend | Auth layout + pages independent of knowledge UI |
| CP4 | CP5 widget JS | Widget is independent package; can be built alongside knowledge UI |
| CP5 | CP6 backend | Analytics + billing backend work independent of widgets |
| CP6 | CP7 | Polish work can start after analytics frontend is stable |

**Optimistic timeline with parallelization:** ~10-12 weeks
