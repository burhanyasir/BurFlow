# CP3 Redesign Plan — V2 Design Specification Gap Analysis

**Date:** 2026-07-22  
**Status:** Planning — no code modified  
**Source of Truth:** `docs/conversation-engine-design-spec-v2-final.md`  
**Supersedes:** `docs/FRONTEND_DESIGN_SPEC.md` (V1)  

---

## 1. Executive Summary

The v2 spec is a near-total visual and structural departure from the current CP3.6 implementation (which matches V1 exactly). The following dimensions changed completely:

| Dimension | V1 (current) | V2 (target) |
|-----------|-------------|-------------|
| **Accent** | Indigo `#5865F2` + Cyan `#00F0FF` + Amber `#FFB800` | Oxblood `#7A2038` (single spot accent, ~5% of any screen) |
| **Neutrals** | Warm `#F8F9FA`–`#0B0C10` (warm gray) | Cool graphite `#FAFAFB`–`#0A0A0C` (no cream undertone) |
| **Typography** | Inter (all) + JetBrains Mono (code) | IBM Plex Sans (body) + Founders/Space Grotesk (display) + IBM Plex Mono (code) |
| **Card style** | Glassmorphism (`backdrop-blur`, white/80, border) | Flat fill (`Neutral-50`), `shadow-sm`, no border at rest |
| **Effects** | Particle swarms, ambient gradients, SVG noise, CSS 3D glass core | None — only Grounding motif (flat cards converging to answer) |
| **Landing page** | 5 sections: Hero (3D Core) → Features → WidgetPreview → Trust → CTA | 12 sections: Nav → Hero (Grounding) → Proof → Problem → Live Demo → How It Works → Capability Proof → Trust → Metrics → Pricing Preview → Final CTA → Footer |
| **Features page** | 6 glass icon cards in 3-col grid | 4 proof moments with alternating screenshots in device frames |
| **Pricing** | Glass cards, gradient Professional, `#5865F2` accent | Flat cards, Accent-600 header band on Professional, Neutral-800 Enterprise card, "No credit card required" lever |
| **Animations** | 14 framer-motion variants, spring physics, ambient | 2 eases (Functional 120–180ms, Expressive 400–700ms), stagger 60–80ms, tilt 2–3°, no idle motion |
| **Cursor** | Magnetic cursor (V1 spec WebGL) | Banned entirely — no custom cursor effects |
| **Font** | Inter (Google Fonts, free) | IBM Plex Sans (open) + Founders Grotesk (paid, pending licensing) or Space Grotesk (open fallback) |

**Estimated effort:** This is effectively a rebuild of the entire public-facing frontend (20+ files restyled/rewritten, 4 files deleted, 10+ new components, new font loading, new animation system). Estimated 5–8 days of focused work for one engineer.

---

## 2. Components That Can Remain (Behavior Unchanged)

These components have behavior that matches v2 specs; they need token-only restyling (color, radius, shadow, font tokens in CSS/JS) but no structural changes:

| Component | v2 Alignment | Changes Required |
|-----------|-------------|------------------|
| `Accordion` | FAQ pattern matches v2 (single/multi-open, scrollHeight animation) | Colors → v2 tokens; focus ring → `shadow-focus` |
| `Skeleton` | "Shaped skeleton loader" matches v2 Premium Detail #8 | Colors → v2 neutral scale |
| `Toast` | Auto-dismiss, pause on hover matches v2 PD #3 | Colors → v2 semantic tokens; `z-toast: 600` |
| `Modal` | Focus trap, Escape-to-close, overlay matches v2 Section 7 | Colors → v2 tokens; `z-overlay: 300`, `z-modal: 400` |
| `Tooltip` | Short delay (~400ms) matches v2 PD #15 | Colors → v2 tokens; `z-tooltip: 700` |
| `Popover` | Click-outside-to-close matches v2 Section 18 | Colors → v2 tokens |
| `Breadcrumb` | Matches v2 Navigation Section ("last item not linked") | Colors → v2 tokens |
| `Pagination` | Prev/next + page numbers matches standard pattern | Colors → v2 tokens |
| `Avatar` | Initials fallback matches v2 PD #60 | Colors → v2 tokens |
| `Progress` | Determinate/indeterminate matches v2 | Colors → v2 semantic tokens |
| `EmptyState` | "Invitation to act, never apology" matches v2 PD #93 | Colors → v2 tokens; icon vocabulary → Grounding flat-cards |
| `ErrorState` | 404/403/500 pages needed per v2 Section 15 | Colors → v2 tokens; icon vocabulary → Grounding flat-cards |
| `Drawer` | Bottom sheet / slide-over matches v2 Section 19 | Colors → v2 tokens; `z-overlay: 300`, `z-modal: 400` |
| `Table` | Sortable, hover full-row highlight matches v2 PD #10, #51 | Colors → v2 neutral scale; row highlight → `Neutral-100` |
| `Tabs` | Horizontal tab bar matches v2 Section 15 | Colors → v2 tokens |
| `Dropdown` | Click-to-open, click-outside-to-close matches v2 standard | Colors → v2 tokens; `z-dropdown: 100` |
| `Alert` | Semantic color pairs with icon matches v2 Section 18 | Colors → v2 semantic tokens |
| `ContactForm` | Form validation on blur, confirmation message matches v2 PD #29, #80 | Colors → v2 tokens |
| `PageSection` | Section wrapper — behavior unchanged | Colors → v2 tokens |

---

## 3. Components Requiring Redesign

These components exist but need structural and/or visual changes to match v2:

| Component | V1 State | v2 Required Changes | Effort |
|-----------|----------|---------------------|--------|
| **Button** | Indigo `#5865F2` primary, 3 sizes, 4 variants, glow/arrow props | **Accent-600 fill** primary, press scale 98% (PD #1), 44px min height (Section 7), secondary = outlined only, tertiary = text-only. Keep arrow/glow props. Remove `fullWidth` default. Focus ring → `shadow-focus`. Loading: inline spinner, width preserved. States matrix per v2 Section 7. | Medium |
| **Card** | `rounded-xl`, `shadow-sm` + border at rest, glass/bordered/flat variants, `hover:-translate-y-0.5` | Flat fill (`Neutral-50`), `shadow-sm` at rest, **no border by default**, border appears on hover/focus (Section 7). Radius tokens: `md` (8px) default. Remove glass variant entirely. Hover: border appears (+ no shadow change). Focus: `shadow-focus` ring. | Small |
| **Input** | `#D0D5DD` border, `#5865F2` focus ring, `#EF4444` error | Neutral-400/500 border at rest, **Accent-600 border + `shadow-focus` ring** on focus, Error-500 border + Error-600 text on error (Section 7). Height: 44px min (Section 18 touch targets). | Small |
| **Textarea** | Same as Input pattern | Same as Input changes above + `resize-y` kept | Small |
| **Select** | Same as Input + chevron | Same as Input changes above + chevron color → v2 Neutral | Small |
| **Checkbox** | `#5865F2` accent, `#D0D5DD` border | Accent-600 checked state, `shadow-focus` focus ring | Small |
| **Switch** | `#5865F2` active, `#D0D5DD` inactive | Accent-600 active state, `shadow-focus` focus ring | Small |
| **Radio** | `#5865F2` accent | Accent-600 checked state, `shadow-focus` focus ring | Small |
| **Badge** | V1 semantic colors (`#D1FAE5`/`#065F46`, etc.) | **v2 semantic palette** (Success-500 `#3F7855`, Error-500 `#C43B34`, Warning-500 `#A87A1E`, Info-500 `#3E6FA8`). Neutral → `Neutral-100`/`Neutral-600`. Remove `primary` variant. Label-token styling for role badges (Section 15). | Small |
| **PricingCard** | Glass cards, `#5865F2` gradient Professional, `#0B0C10` Enterprise | Professional: **Accent-600 filled header band**, "Most popular" Label-token badge. Enterprise: **Neutral-800 fill**, outlined "Talk to Sales" CTA (Section 11). Free/Starter: visually equal weight. Checkmark → accent color. "No credit card required" label (Section 8, 11). | Medium |

---

## 4. New Components Required

| Component | v2 Reference | Purpose | Effort | Priority |
|-----------|-------------|---------|--------|----------|
| **GroundingMotif** | Section 2, 8, 12 | Flat content-fragment cards → converge → static answer card. Replaces KnowledgeCore entirely. 3 full appearances: hero, onboarding completion, widget-goes-live. Plus scroll-return re-trigger. Gates: `prefers-reduced-motion`, viewport >768px, IntersectionObserver. | Large | P0 |
| **LiveChatDemo** (replaces WidgetPreview) | Section 5, 10 | Real typable chat widget against sandboxed demo KB. Product's own docs as seed data. Suggested question chips. Fallback behavior demo. Static fallback image for sandbox-unreachable (PD #85). | Large | P0 |
| **CitationPill** | Section 10, 14 | Compact source row under answer bubbles. `radius-full` pills, Body-S size, Neutral-100 fill / Neutral-600 text. Tappable → popover with excerpt (2-3 lines). No citation on low-confidence fallback. | Medium | P0 |
| **CitationPopover** | Section 10, 14 | Popover from CitationPill showing source excerpt. Neutral-50 background. Max 2-3 lines. | Small | P0 |
| **ProofBar** | Section 8.3 | Single credibility line ("Built by engineers who got tired...") + live status indicator once real. Replaces fake logo bar. | Small | P0 |
| **HowItWorks** | Section 8.6 | 4 steps: Upload → Publish → Embed → Resolve. Scroll-triggered, one visual per step using Grounding motif card vocabulary. Numbered markers. | Medium | P0 |
| **CapabilityProofCard** | Section 8.7 | 4 proof moments, not 6 generic features. Each: real screenshot in device-frame, checkable outcome statement. Alternating left/right. Device frame with soft shadow + perspective tilt (2-3°). | Medium | P0 |
| **DeviceFrame** | Section 8.7 | Browser-chrome mockup for screenshots. Single directional shadow. Slight perspective tilt on scroll-into-view (motion-tilt token). | Small | P0 |
| **MetricsCounter** | Section 8.9 | Animated count-up on scroll-into-view. Real numbers only — cut section if no real data. Tabular numerals. | Small | P0 |
| **GroundingAnswerCard** | Section 2, 8.11 | The static "landed" answer card. `radius-lg` (12px). Still at rest. Used in hero, final CTA, scroll-return. | Small | P0 |
| **VisitorCitationRow** | Section 14 | Compact source row component for widget answers. Pills → popover pattern. Same visual language as AnswerConfidence module. | Medium | P0 |
| **ScrollReturnGrounding** | Section 12 | Smaller-scale Grounding replay (~final CTA scale) when user scrolls back past top after having scrolled away. Triggered once per scroll-return. | Medium | P1 |
| **AnswerConfidenceModule** | Section 13 | Dashboard widget: rolling % of high-confidence answers vs fallbacks. Links to low-confidence question list. Same visual language as CitationPill. | Medium | P1 |
| **CommandPalette** | Section 13 | Cmd/Ctrl+K fuzzy search navigation. Recently viewed section (PD #94). Keyboard shortcut hints in tooltips (PD #95). | Medium | P1 |
| **WorkspaceSwitcher** | Section 13 | Compact dropdown above nav rail. Current workspace name/avatar + list of other workspaces. | Small | P1 |
| **ActivityFeed** | Section 13 | Real-time conversation resolution feed. New items enter with Accent-200 highlight that fades over 2s Functional-ease. | Medium | P1 |
| **TrustStrip** | Section 9 | Security/compliance badges (SOC2, GDPR, etc.). Small and factual. Footer + Trust Center only. | Small | P1 |
| **SalesContactForm** | Section 16 | Short form: name, email, company size, message. Confirms receipt immediately + real expected response window (PD #80). | Small | P1 |
| **OGImageTemplate** | Section 24 | Wordmark + one-line value prop + Grounding accent on Neutral bg. 1200×630. Per-major-page. | Small | P1 |
| **TransactionalEmailTemplate** | Section 17 | Single column, 600px max, wordmark (not full lockup), Accent-600 button, no marketing content. Welcome, verify, reset, trial-ending. | Small | P1 |
| **PaidTrafficLanding** | Section 24 | Stripped-nav landing: Hero + Live Demo + Pricing Preview + Final CTA only. No nav, no footer nav. | Medium | P2 |
| **CaseStudyTemplate** | Section 9 | Layout-only template. Ready for real customer data. | Small | P2 |
| **MethodologyPage** | Section 9 | "How grounding actually works" — plain-language technical explainer using Grounding motif vocabulary. Linked from footer. | Medium | P1 |
| **TrustCenterHub** | Section 9 | Single URL consolidating Security, Status, Changelog, compliance badges, DPA, security questionnaire download. | Medium | P1 |
| **ScreenReaderLiveRegion** | Section 18 | ARIA live region (`polite`) for widget message stream. | Small | P0 |

---

## 5. Pages Requiring Changes

| Page | Route | V1 State | v2 Required Changes | Effort | Priority |
|------|-------|----------|---------------------|--------|----------|
| **Landing** | `/` | 5 sections, 3D KnowledgeCore, ParticleField, WidgetPreview, glass cards, indigo/cyan theme, 5 fake logo placeholders | Complete restructure to 12 ordered sections (Section 8). GroundingMotif replaces KnowledgeCore. LiveChatDemo replaces WidgetPreview. ProofBar replaces logo bar. ProblemFraming before/after. 4 CapabilityProof cards. MetricsCounter. PricingPreview (4 cards). New CTA copy ("Start answering in 10 minutes"), "No credit card required" lever. Remove: ParticleField, ambient-gradient, noise-overlay, hero-glow, glass-card. Theme: oxblood + cool neutrals. | Very Large | P0 |
| **Features** | `/features` | 6 glass icon cards in 3-col grid, same V1 color theme | **Rename to Capability Proof** content-wise. 4 proof moments with real screenshots in DeviceFrame, alternating left/right. Single checkable outcome statement each. No feature icons. No glass cards. Device frame perspective tilt on scroll. | Large | P0 |
| **Pricing** | `/pricing` | 4 glass cards, gradient Professional, `#5865F2` theme, ghost CTAs on Free/Starter, Enterprise = primary CTA | Professional: Accent-600 header band. Enterprise: Neutral-800 fill, "Talk to Sales" as outlined CTA (Section 11). Free/Starter: visually equal weight to Pro. "No credit card required" next to Free/Starter CTAs. "Most popular" → Label-token badge. One-line guarantee near CTA (Section 11). Annual toggle: ≤150ms digit fade. "Save 20%" badge next to toggle once. FAQ underneath table. No glass, no gradient, no fabricated urgency. | Large | P0 |
| **About** | `/about` | V1 copy: "Democratizing Precision AI Support for Modern Businesses." Glass mission card + 3 core principles | V2 copy: "Give every business a support layer built entirely on what's actually true." Replace glass with flat Grounding vocabulary cards. Remove "Democratizing," "supercharge," etc. (banned per Section 1). Photography direction per Section 23 if team photos added. | Medium | P1 |
| **Contact** | `/contact` | V1 form, glass card wrapper | Sales form: name, email, company size, message. Confirms receipt immediately + real response window (PD #80). Flat card, no glass. Accent-600 submit. | Small | P1 |
| **FAQ** | `/faq` | 4-item accordion, V1 copy | V2 copy: hallucination handling, setup time, white-labeling, overage behavior (Section 11). Keep Accordion component (restyled). | Small | P1 |
| **Blog** | `/blog` | EmptyState placeholder | Single-column article template (Section 15). Body-L lead, Body rest, ~68-char line cap. Code blocks in IBM Plex Mono. Per-post OG images. No stock photography. | Medium | P2 |
| **Docs** | `/docs` | EmptyState placeholder | 3-column pattern: left nav, content, right "on this page" (Section 15). Code blocks → IBM Plex Mono + snippet copy pattern (PD #88). Search → command-palette component. | Medium | P1 |
| **404 / 403 / 500** | `*` | Not built yet | ErrorState component restyled to v2. Grounding flat-card vocabulary for illustration. Real navigation + search (PD #62). | Small | P0 |
| **Privacy / Terms** | `/privacy`, `/terms` | Not built yet | Lead with plain-language summary before full text (Section 16, PD #72). | Small | P1 |
| **T&C** | | | | | |

---

## 6. Animation Changes

### 6.1 Current Animation System (V1) — `src/utils/motion.ts`
- 14 framer-motion variants: `fadeIn`, `fadeInUp`, `fadeInDown`, `fadeInLeft`, `fadeInRight`, `scaleIn`, `slideInUp`, `slideInDown`, `staggerContainer` (0.1s stagger), `staggerItem`, `pageTransition`, `modalOverlay`, `modalContent`, `drawerContent`
- Spring physics used in slide transitions (damping 25, stiffness 300)
- Duration range: 0.15s–0.5s
- No motion tokens — all values are magic numbers

### 6.2 Target Animation System (V2) — Section 12, Section 26
- **Functional ease**: 120–180ms, no overshoot — hover, focus, toggle, click, route transitions
- **Expressive ease**: 400–700ms, slight overshoot — Grounding motif, page-transition reveals, scroll section entrances
- **Stagger**: 60–80ms per item, max 6 items — grid/list entrance choreography
- **Tilt**: 120–180ms (Functional timing), 2–3° max on capability-proof screenshot hover, settles on leave
- **Reduced motion**: `<80ms`, crossfade only — `prefers-reduced-motion: reduce`

### 6.3 Changes Required
| Current | Target | Action |
|---------|--------|--------|
| `fadeIn` (0.3s) | → Functional 150ms crossfade | Replace with motion-functional token |
| `fadeInUp` (0.4s, easeOut) | → Expressive 400–500ms | Replace with motion-expressive token |
| `fadeInDown` (0.4s, easeOut) | → Expressive 400–500ms | Replace with motion-expressive token |
| `fadeInLeft/Right` (0.4s, easeOut) | → Expressive 400–500ms | Replace with motion-expressive token |
| `scaleIn` (0.3s) | → Functional 150ms | Replace with motion-functional token |
| `slideInUp/Down` (spring) | → Functional 180ms crossfade + 8px vertical settle for route transitions | Replace (spring → Functional ease) |
| `staggerContainer` (0.1s stagger) | → 60–80ms stagger, max 6 items | Update stagger value |
| `staggerItem` (0.4s) | → Expressive 400–500ms | Replace with motion-expressive token |
| `pageTransition` (0.3s/0.2s) | → Functional 150ms crossfade + 8px vertical settle | Replace |
| `modalOverlay/Content` (spring + duration) | → Functional 180ms for modals | Replace spring with Functional ease |
| KnowledgeCore (ambient spinning pulse) | → GroundingMotif (converge, then still) | Delete; replace entirely |
| ParticleField (continuous animation) | → Removed entirely | Delete |
| Scroll indicator bounce (looping) | → Removed entirely (idle motion banned) | Delete |

---

## 7. UX Changes

| UX Feature | V1 State | V2 State | Impact |
|------------|----------|----------|--------|
| Hero engagement | 3D glass core with mouse-tracking rotation + particle swarm | Grounding motif: flat cards converge to answer, stays still. Scroll-return re-trigger at smaller scale | No idle motion; "stillness is the argument" |
| Product demo | WidgetPreview: simulated chat with 3 theme colors | LiveChatDemo: real typable chat against sandboxed KB | Requires real sandbox backend; static fallback |
| Social proof | 5 fake logo placeholders ("Trusted by innovative teams") | ProofBar: single credibility line + real status indicator when non-zero. No fabricated proof | Section falls back gracefully pre-launch |
| Feature presentation | 6 icon cards in grid | 4 proof moments: real screenshots + outcome statements, alternating left/right | Higher conversion, no icons |
| Trust signals | No trust architecture beyond logo strip | Distributed trust: before/after (Section 4), live demo (Section 5), Methodology page, Trust Center hub, FAQ, SLA on pricing | New pages: Methodology, Trust Center |
| Pricing CTA | "Start Free Trial" | "Start answering in 10 minutes" (hero/pricing/final) + "Start free" (nav) + "Talk to Sales" (Enterprise) | Different labels per context per v2 |
| Conversion lever | No explicit conversion lever | "No credit card required" next to all primary CTAs | Already true; stated explicitly |
| Navigation CTA | "Get Started" (desktop) / "Sign In" (desktop) | "Start free" (nav) / "Log in" (nav, per Section 8.1) | Shorter nav label |
| Widget demo | Static simulated WidgetPreview | Live typable sandbox + citation pills on answers + deliberate fallback demo | Real sandbox maintenance |
| "Oops" language | Not present (good) | Banned outright (PD #100) | No change needed |

---

## 8. Backend Dependencies

### 8.1 Existing (No New Backend Work)
- All 35 existing APIs remain frozen (CP2_PREPARATION.md Section 1.1)
- No new endpoints needed for CP3 redesign

### 8.2 Sandbox Dependency (New)
The LiveChatDemo (Section 8.5) requires a real query endpoint against a small sandboxed KB:
- Small KB seeded with the product's own documentation
- Query endpoint (`POST /api/chat` already exists)
- Sandbox must be maintained and kept current as docs change
- **Risk**: If no sandbox endpoint exists, fall back to static screenshot (PD #85)

### 8.3 Frontend-Only Dependencies
All pages in CP3 redesign are frontend-only (no auth, no API calls for rendering):
- Landing, Features, Pricing, About, Contact, FAQ, Blog, Docs, error pages
- No backend changes required for any of these

---

## 9. Files Affected

### 9.1 Delete (4 files)
```
frontend/src/components/effects/KnowledgeCore.tsx       # Replaced by GroundingMotif
frontend/src/components/effects/ParticleField.tsx        # Banned per v2 Section 2, 27
frontend/src/components/effects/WidgetPreview.tsx        # Replaced by LiveChatDemo
```

### 9.2 New Files (12+ files)
```
frontend/src/components/effects/GroundingMotif.tsx       # Grounding motif animation
frontend/src/components/effects/LiveChatDemo.tsx          # Live sandbox widget
frontend/src/components/effects/ContentFragmentCard.tsx   # Grounding card vocabulary
frontend/src/components/effects/AnswerCard.tsx            # Static landed answer card
frontend/src/components/ui/CitationPill.tsx               # Source citation pill
frontend/src/components/ui/CitationPopover.tsx            # Source excerpt popover
frontend/src/components/ui/ProofBar.tsx                   # Credibility line + status
frontend/src/components/ui/DeviceFrame.tsx                # Screenshot mockup frame
frontend/src/components/ui/CapabilityProofCard.tsx        # Proof moment with screenshot
frontend/src/components/ui/MetricsCounter.tsx             # Animated count-up
frontend/src/components/ui/HowItWorksSection.tsx          # 4-step scroll section
frontend/src/components/ui/TrustStrip.tsx                 # Compliance badge strip
frontend/src/components/ui/SalesContactForm.tsx           # Enterprise sales form
frontend/src/components/ui/CommandPalette.tsx             # Cmd+K search (CP4+)
frontend/src/components/ui/WorkspaceSwitcher.tsx          # Multi-tenant switch (CP4+)
frontend/src/components/ui/AnswerConfidence.tsx           # Dashboard module (CP4+)
frontend/src/components/ui/GroundingAnswerCard.tsx        # Reusable answer card
frontend/src/components/ui/ScrollReturnGrounding.tsx      # Scroll-return re-trigger
```

### 9.3 Redesign / Rewrite (20+ files)
```
frontend/src/theme/tokens.ts                              # Complete color/typo/token replacement
frontend/src/theme/theme.css                              # Complete CSS custom properties rewrite
frontend/src/theme/ThemeProvider.tsx                       # Token source update
frontend/src/styles/effects.css                           # Remove glass-card, ambient-gradient, noise, hero-glow. Keep .page-content
frontend/src/styles/typography.css                        # Replaced by token-based Tailwind approach or simplified
frontend/src/styles/reset.css                             # font-family → IBM Plex Sans
frontend/src/utils/motion.ts                              # Complete rewrite: 2 eases, 5 tokens, no spring defaults
frontend/src/pages/landing/LandingPage.tsx                 # Complete restructure to 12 sections
frontend/src/pages/features/FeaturesPage.tsx               # Rewrite to 4 proof moments
frontend/src/pages/pricing/PricingPage.tsx                 # New Enterprise card, CTA strategy, "No CC" lever
frontend/src/pages/about/AboutPage.tsx                    # V2 copy + flat cards
frontend/src/pages/contact/ContactPage.tsx                # Sales form + confirmation
frontend/src/pages/faq/FAQPage.tsx                        # V2 FAQ copy
frontend/src/pages/blog/BlogPage.tsx                      # Article template when content exists
frontend/src/pages/docs/DocsPage.tsx                      # 3-column layout when content exists
frontend/src/layouts/PublicLayout.tsx                     # Glass-nav-on-scroll, new nav CTA, new footer links
frontend/src/components/ui/Button.tsx                     # v2 colors, press 98%, 44px min height
frontend/src/components/ui/Card.tsx                        # Flat fill, no border, new hover
frontend/src/components/ui/Input.tsx                       # v2 focus ring, error colors
frontend/src/components/ui/Textarea.tsx                    # v2 focus ring, error colors
frontend/src/components/ui/Select.tsx                      # v2 focus ring, error colors
frontend/src/components/ui/Checkbox.tsx                    # v2 accent color
frontend/src/components/ui/Switch.tsx                      # v2 accent color
frontend/src/components/ui/Radio.tsx                       # v2 accent color
frontend/src/components/ui/Badge.tsx                       # v2 semantic palette, remove primary variant
frontend/src/components/ui/PricingCard.tsx                 # v2 Professional band, Enterprise fill, CTA strategy
frontend/src/components/ui/Accordion.tsx                   # v2 token colors
frontend/src/components/ui/PageSection.tsx                 # v2 section gap tokens
```

### 9.4 Token-Only Updates (15 files — colors/shadows only, no structural changes)
```
frontend/src/components/ui/Alert.tsx                      # → v2 semantic colors
frontend/src/components/ui/Avatar.tsx                     # → v2 neutral tokens
frontend/src/components/ui/Breadcrumb.tsx                 # → v2 neutral tokens
frontend/src/components/ui/Drawer.tsx                     # → v2 tokens + z-index
frontend/src/components/ui/Dropdown.tsx                   # → v2 tokens + z-index
frontend/src/components/ui/EmptyState.tsx                 # → v2 tokens + Grounding icon vocabulary
frontend/src/components/ui/ErrorState.tsx                 # → v2 tokens + Grounding icon vocabulary
frontend/src/components/ui/Modal.tsx                      # → v2 tokens + z-index
frontend/src/components/ui/Pagination.tsx                 # → v2 neutral tokens
frontend/src/components/ui/Popover.tsx                    # → v2 tokens
frontend/src/components/ui/Progress.tsx                   # → v2 semantic colors
frontend/src/components/ui/Skeleton.tsx                   # → v2 neutral tokens
frontend/src/components/ui/Table.tsx                      # → v2 neutral tokens
frontend/src/components/ui/Tabs.tsx                       # → v2 accent + neutral tokens
frontend/src/components/ui/Toast.tsx                      # → v2 semantic colors + z-index: 600
frontend/src/components/ui/Tooltip.tsx                    # → v2 tokens + z-index: 700
```

---

## 10. Priority Breakdown

### P0 — Must Complete Before CP4 Starts
These are the minimal set to get marketing pages matching v2 spec and unblocking CP4 (auth pages):

1. **Design Token System** — `tokens.ts`, `theme.css`, `ThemeProvider.tsx`: complete rewrite to oxblood + cool neutral + IBM Plex + new shadows/radii/z-index
2. **Typography** — Load IBM Plex Sans + Plex Mono (Google Fonts). Decision on Founders vs Space Grotesk (Section 30 open item — default to Space Grotesk if no licensing decision)
3. **Button** — Accent-600 primary, press scale 98%, 44px min height, `shadow-focus` ring, loading width-preserved
4. **Card** — Flat fill, no border default, border on hover, remove glass variant
5. **Input / Textarea / Select** — v2 focus ring, error colors
6. **Badge** — v2 semantic palette
7. **PricingCard** — Accent-600 header band on Professional, Neutral-800 Enterprise
8. **GroundingMotif** — Replace KnowledgeCore on Landing hero
9. **LandingPage** — 12-section restructure: Grounding hero → ProofBar → ProblemFraming → LiveChatDemo → HowItWorks → 4×CapabilityProof → TrustStrip → MetricsCounter → PricingPreview → FinalCTA → Footer
10. **FeaturesPage** — 4 proof moments with DeviceFrame screenshots
11. **PricingPage** — New Enterprise card, "No credit card required" lever, CTA strategy
12. **PublicLayout** — Glass-nav-on-scroll, "Start free" nav CTA, "Log in" link, updated footer (Trust Center, Methodology links)
13. **Remove ParticleField, ambient-gradient, noise-overlay, KnowledgeCore** from all pages
14. **motion.ts** — Rewrite to v2 tokens: motion-functional, motion-expressive, motion-stagger, motion-tilt, motion-reduced
15. **effects.css** — Remove all glass/ambient/noise classes, keep only `.page-content`
16. **404 / Error pages** — Basic Grounding-style error pages with nav

**Estimated P0 effort: 4–6 days**

### P1 — Near-term, Post-CP4 Start
1. **LiveChatDemo** — Real sandbox chat widget (may slip to P2 if sandbox isn't ready)
2. **CitationPill + CitationPopover** — Needed for widget answers
3. **HowItWorksSection** — 4-step scroll-triggered
4. **MetricsCounter** — Animated count-up
5. **TrustCenterHub** page
6. **MethodologyPage** — "How grounding works"
7. **WorkspaceSwitcher** (dashboard, CP4+)
8. **CommandPalette** (dashboard, CP4+)
9. **AnswerConfidenceModule** (dashboard, CP4+)
10. **SalesContactForm** — With confirmation + response window
11. **OGImageTemplate** — Per-major-page
12. **AboutPage** — v2 copy + flat cards
13. **ContactPage** — Sales form + flat card
14. **FAQPage** — v2 FAQ copy
15. **DocsPage** — 3-column layout
16. **Privacy / Terms pages** — Plain-language summaries
17. **ScrollReturnGrounding** — Smaller replay on scroll-back
18. **TransactionalEmailTemplate**

**Estimated P1 effort: 3–5 days**

### P2 — Future
1. **PaidTrafficLanding** — Stripped-nav conversion page
2. **CaseStudyTemplate**
3. **BlogPage** — Full article template with OG images
4. **DeviceFrame micro-tilt** (motion-tilt)
5. **Full dark mode polish across every surface**
6. **Route transition polish** beyond baseline crossfade

**Estimated P2 effort: 1–2 days**

---

## 11. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **GroundingMotif is technically complex** — CSS-only converge animation with cursor parallax, 6-8 cards, scroll-return re-trigger, reduced-motion handling, mobile gating | Medium | High | Prototype GroundingMotif early (first P0 task after tokens). If too complex, simplify to a static arrangement with a single Animation-on-reveal rather than the full drift-converge choreography. |
| R2 | **Founders Grotesk licensing not resolved** → display typography blocked | Medium | Medium | Default to Space Grotesk (open license, comparable character) if no licensing decision by implementation time. Documented in v2 Section 30. |
| R3 | **LiveChatDemo sandbox not ready** → Section 8.5 empty | High | Medium | Build static screenshot fallback with "Try it on the next page" link per v2 PD #85. Demo becomes P2 rather than blocking P0. |
| R4 | **Oxblood perception check (Section 30)** → accent color may change after implementation starts | Low | High | Do not start component coloring until accent is locked. If change is required post-start, it's a token swap only (one `tokens.ts` change) — but narrative around "wine tone = law firm" risk is real. |
| R5 | **C: drive full** — npm installs, font loading may fail | Medium | Low | All npm commands use `$env:npm_config_cache = "D:\npm-cache"` prefix. Font loading is external (Google Fonts CDN) — no disk impact. |
| R6 | **35 existing backend APIs frozen** — if sandbox endpoint needs changes, blocked | Medium | High | LiveChatDemo design must accept existing `POST /api/chat` shape as-is. No backend changes for sandbox. |
| R7 | **Build breaks during refactor** — 20+ files change simultaneously | Medium | Medium | Phase changes: tokens first → verify build → component restyling → verify build → page rewrites → verify build. Commit per verified phase. |
| R8 | **"No credit card required" decision pending** (Section 30) — may not be in final copy | Low | Low | Add as configurable string in page data; toggle on/off via boolean. No structural impact. |

---

## 12. Suggested Implementation Order (Phased)

### Phase 0 — Foundation (P0, Day 1)
1. `tokens.ts` + `theme.css` → oxblood palette, cool neutrals, IBM Plex fonts, new shadow/radius/z-index tokens
2. `reset.css` → IBM Plex Sans as body font
3. `ThemeProvider.tsx` → wire new tokens
4. `motion.ts` → 5 motion tokens, remove spring defaults
5. `effects.css` → strip to `.page-content` only
6. `index.html` → load IBM Plex Sans + Plex Mono + Space Grotesk from Google Fonts
7. **Verify build passes**

### Phase 1 — Core Components (P0, Day 1-2)
1. `Button.tsx` — Accent-600 primary, 44px min, press 98%, `shadow-focus`
2. `Card.tsx` — flat fill, no border default, border on hover
3. `Input.tsx` / `Textarea.tsx` / `Select.tsx` — v2 focus ring + error
4. `Checkbox.tsx` / `Switch.tsx` / `Radio.tsx` — Accent-600 accent
5. `Badge.tsx` — v2 semantic palette
6. `PricingCard.tsx` — v2 Professional band + Enterprise CTA
7. `Accordion.tsx` — token restyle
8. All 15 token-only components — batch color/shadow/z-index update
9. **Verify build passes**

### Phase 2 — Landing Page (P0, Day 2-3)
1. `GroundingMotif.tsx` — converges animation, reduced-motion gate, mobile gate
2. `ProofBar.tsx` — credibility line
3. `DeviceFrame.tsx` — screenshot mockup
4. `CapabilityProofCard.tsx` — proof moment card
5. `MetricsCounter.tsx` — animated count-up
6. `HowItWorksSection.tsx` — 4-step scroll
7. `GroundingAnswerCard.tsx` — static answer card
8. **Rewrite `LandingPage.tsx`** — 12 sections
9. Delete `KnowledgeCore.tsx`, `ParticleField.tsx`, `WidgetPreview.tsx`
10. **Verify build passes**

### Phase 3 — Other Pages (P0, Day 3-4)
1. **Rewrite `FeaturesPage.tsx`** → 4 proof moments
2. **Rewrite `PricingPage.tsx`** → v2 PricingCard, "No CC" lever, new toggle
3. **`PublicLayout.tsx`** — glass-nav-on-scroll, new nav CTA, new footer
4. Build 404 / 403 / 500 error pages with Grounding vocabulary
5. **Verify build passes**

### Phase 4 — Polish & P1 (Day 4-6)
1. About, Contact, FAQ — v2 copy + flat cards
2. CitationPill + CitationPopover
3. TrustCenterHub page
4. MethodologyPage
5. ScrollReturnGrounding
6. OGImageTemplate
7. Build verification + bundle check

### Phase 5 — P2 (Day 6-8, if needed)
1. PaidTrafficLanding
2. CaseStudyTemplate
3. BlogPage template
4. DeviceFrame micro-tilt
5. Route transition polish

---

## 13. Build Verification Criteria

After each phase:
```powershell
$env:npm_config_cache = "D:\npm-cache"; npm run build
```
- Zero TypeScript errors
- Zero build warnings
- Bundle size within acceptable range (<500 KB JS gzip)
- All 27 routes render without crashing

---

## 14. Open Items from v2 Section 30

| Item | Status | Impact |
|------|--------|--------|
| Founders Grotesk vs Space Grotesk | Awaiting licensing decision | Default to Space Grotesk if not resolved by implementation start |
| Oxblood perception check | Not yet validated | Accept risk; implement with oxblood; token swap if changed |
| Dashboard header hierarchy | Not applicable until CP4 | Deferred |
| Founding Customer program | Business decision pending | Not building UI for this yet |
| Reconciliation with V1 decisions | Done — this document is the gap analysis | All contradictions resolved above |
| Build Priority Map reconciliation | Done — P0/P1/P2 mapped above | Ready for engineering mapping |

---

## 15. Conclusion

This is a **complete visual redesign** of the CP3 frontend. No current visual element survives unchanged except the basic page structure (nav + main + footer) and reusable component behaviors (accordion, toast, skeleton, etc.).

**P0 timeline:** 4–6 days for the minimum viable v2-compliant marketing site.  
**Full completion (P0+P1+P2):** 8–10 days including polish and new pages.  
**Backend dependencies:** None for P0 (all frontend-only). LiveChatDemo may need sandbox readiness.  
**Hardest risk:** GroundingMotif animation complexity — prototype first.

**Do not implement until this plan is approved.**
