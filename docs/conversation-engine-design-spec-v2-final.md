# Conversation Engine — Design Specification v2 (Final)

**Prepared by:** Lead Product Design
**Status:** Ready for implementation
**Supersedes:** Design Freeze V2 (draft), the critique pass performed on it, `FRONTEND_DESIGN_SPEC.md` (V1), and the Gemini Brand & Creative Specification — all merged and reconciled into this single document

---

## Contents
0. Purpose & Changelog · 1. Brand Positioning · 2. Visual Identity & Logo System · 3. Color System · 4. Typography · 5. Spacing System · 6. Grid System · 7. Component Design Language · 8. Landing Page · 9. Trust Architecture · 10. Product Demonstration & Grounding Proof Surfaces · 11. Pricing Psychology · 12. Animation System · 13. Dashboard Design Language · 14. Widget Experience · 15. Additional Application Surfaces · 16. Enterprise & Sales-Assist UX · 17. Transactional Email System · 18. Accessibility · 19. Mobile Experience · 20. Dark Mode · 21. Illustration System · 22. Icon System · 23. Photography Direction · 24. SEO, Metadata & Content Marketing · 25. Design Tokens · 26. Motion Tokens · 27. Do/Don't Rules · 28. Premium Details (100) · 29. Build Priority Map · 30. Open Decisions & Validation Tasks · 31. Handoff Notes

---

## Section 0 — Purpose & Changelog

This document merges the Design Freeze V2 draft with the critical review performed against it. Every strong decision from the draft survives unchanged. Every weak decision the review flagged has been fixed, reframed, or explicitly parked as an open question rather than silently dropped. Every real gap the review found — missing pages, missing trust surfaces, missing conversion logic, missing engineering scaffolding — has been filled in below. This is the version that goes to implementation.

**Why the earlier Gemini direction was rejected (kept brief; the full reasoning lived in the draft and doesn't need repeating at length):** a neon indigo/cyan-on-void palette, particle swarms, glass/refraction materials, and a magnetic cursor read as crypto-exchange/game-launcher regardless of the enterprise vocabulary wrapped around them, contradicted the explicit brief (Apple, Stripe, Linear, Vercel — none of which use any of that), and carried real, mostly-unbudgeted engineering cost. The replacement premise — one restrained, literal motif, one accent color, calm at rest — is what the rest of this document builds out.

**What changed from the V2 draft, and why:**
- **Logo mark:** the two-letter "CE" monogram is dropped. Two-letter monograms are themselves one of the most common enterprise-B2B logo defaults — the draft spent a full section rejecting clichés and then landed on one without noticing. Replaced with a mark drawn from the product's own signature motif instead of arbitrary letters (Section 2).
- **Display typeface:** Founders Grotesk is kept as the preferred choice but is no longer specced without qualification — it's a paid, per-pageview-licensed face, which directly contradicts the same section's praise of IBM Plex for being open and frictionless. A free, license-compatible fallback is now named (Section 4), and the licensing decision is logged as an open item (Section 30).
- **Mission statement:** "never sleeps, never guesses, never says something that isn't true" is a parallel-triad copywriting template and "never sleeps" specifically is one of the most reused phrases in support software — replaced with a plainer, less templated line that keeps the same meaning (Section 1).
- **Dashboard header hierarchy:** "one hero metric, everything else secondary" is downgraded from a firm rule to a provisional default. Usage-vs-limit is a billing-anxiety number a support lead may check as often as the hero metric — it now ships at equal visual weight, not demoted, pending real usage data (Section 13, Section 30).
- **Warmth:** the brand personality table promises "warm, not sterile," but a system with no illustration, no photography, and one desaturated accent had nothing left to deliver it. Three explicit levers are now named — typography, copy voice, and one narrowly-scoped tint use — so warmth isn't just asserted (Section 2, 21).
- **Oxblood as sole accent:** kept, because it genuinely avoids every AI-category and crypto cliché the draft was trying to escape — but flagged for a quick perception check before final lock, since a deep wine tone can read as law-firm/insurance rather than technology at a glance (Section 30).
- **Nav vs. hero CTA copy:** the draft's own "Do/Don't" rules claimed one consistent CTA phrase appears in all four locations including the nav, while the nav section specced a different, shorter label. That was a real internal contradiction — resolved explicitly in Section 8, with the exception stated on purpose instead of left as a discrepancy.
- **Capability grid:** alternating screenshot/copy blocks are still structurally a features grid no matter how asymmetric the layout is. Reframed around fewer, higher-impact "proof moments" rather than six generic capability tiles (Section 8).
- **Depth:** the correction away from Gemini's glass-and-particles overshot past the brief, which explicitly asked for tasteful depth and named Apple and Stripe — both of which use restrained dimensionality on product shots. A device-frame/shadow/parallax treatment is added back in without reopening glass or particles (Section 8, 12).
- **Fake urgency:** correctly banned, but nothing honest replaced it. A concrete, checkable lever is now specified (Section 11).
- **New sections added in full:** Additional Application Surfaces (15), Enterprise & Sales-Assist UX (16), Transactional Email System (17), SEO/Metadata/Content Marketing (24), Build Priority Map (29), Open Decisions & Validation Tasks (30) — plus a z-index scale, a component-states matrix, and a CTA-hierarchy spec inside Section 7, and a visitor-facing citation component inside Section 10 and 14.

Everything else in the draft — the color contrast math, the Grounding motif's three-appearance restraint, the honesty constraints around fake metrics and logos, the Premium Details list — was already strong and is carried forward unchanged.

---

## Section 1 — Brand Positioning

**Product name:** Conversation Engine — category-descriptive, not proprietary-sounding. Because the name can't do brand work on its own, the visual system carries more of that weight than it would for an invented name. That's a constraint on everything below, not an oversight.

**Positioning statement:** Conversation Engine is the support layer a business trusts because it only says things that are true. Every other AI support product promises "instant." This one is built around the rarer, harder promise: it doesn't guess.

**Brand personality:**
| Is | Not |
|---|---|
| Precise | Loud |
| Confident | Hyped |
| Warm (in tone and in specific, limited places — see Section 2) | Sterile |
| Engineered | Decorated |

**Buyer reality check:** the buyer is frequently a non-technical business owner; the champion who picks the vendor is often technical (a support lead or the developer doing the embed). The site has to read as credible to someone evaluating five vendors in a tab group and not intimidate someone who's never heard the word "API." Target register: closer to Stripe than to Linear (too austere for the buyer) or Notion (undersells the seriousness of handling someone's customers).

**Mission:** Give every business a support layer built entirely on what's actually true — answers sourced from real content, or an honest "I don't know."
*(Replaces the draft's tricolon mission line — same meaning, without the templated parallel-triad construction or the category's most overused phrase.)*

**Vision:** A web where visiting a company's site and asking it a direct question gets you a direct, correct answer — not a form, not a hold queue, not a hallucination.

**Tone of voice — rules:**
- Active voice, always.
- No hedge words in marketing copy — cut "helps," "enables," "aims to."
- No unearned superlatives — "fastest," "revolutionary," "game-changing," "supercharge," "unleash" are banned outright.
- Specificity beats cleverness — "Deploys in under 10 minutes" beats "Lightning-fast setup."
- Errors state the problem and the fix. Never apologize on the system's behalf — "Oops" is banned.
- One register throughout: a senior engineer explaining something to a smart colleague.

---

## Section 2 — Visual Identity & Logo System

**The signature idea: "The Grounding."** Loose, disordered fragments of content — document lines, FAQ snippets, page excerpts, rendered as thin flat rectangular cards, never 3D or glass — drift toward a fixed point and lock into a single precise, static answer card, which stays completely still once formed. Motion happens on the way in; the resting state is calm and motionless. That stillness is the visual argument for "grounded, not guessing," and is as load-bearing as the motion itself.

This beat appears at exactly **three** moments, and no more: the landing-page hero, the final step of onboarding, and the moment a widget goes live. A fourth, narrow, purely functional exception is defined in Section 12 (a small-scale re-trigger on scroll-return) — it does not add a fourth "appearance" in spirit, since it's a state confirmation, not a new brand moment.

**Why not the Gemini direction:** no particle swarms, no glass/refraction material, no volumetric lighting, no cursor effects. The Grounding motif is a diagram of the actual product mechanism, not decoration placed near it.

**Logo direction (revised).** The draft specced a two-letter "CE" monogram for compact contexts. Dropped — monograms are one of the single most common enterprise-B2B logo patterns in existence, and landing on one directly undercuts this document's own anti-cliché argument.

- **Primary lockup:** the full wordmark "Conversation Engine," set in the display face (Section 4) at tightened, custom tracking, sentence case.
- **Compact lockup (favicon, app icon, browser tab, widget launcher): the Anchor Mark.** A small, single, square-cornered rectangle — the Grounding motif's own locked answer card, reduced to its simplest form — with a short fixed accent-colored line beneath it standing in for the moment of arrival. Because it's drawn directly from the product's own signature idea rather than an arbitrary abstract shape or initials, no competitor's mark can mean the same thing, which a monogram can't claim.
- Avoid chat bubbles, robots, brains, and lightbulbs — the four most-used clichés in this category.

**Where warmth actually comes from.** The brand table promises "warm, not sterile" while the palette is cool-neutral, the accent is used sparingly, and there's no illustration or photography by default. Three explicit levers carry that weight instead of it being asserted with nothing behind it:
1. **Typography** — IBM Plex Sans for all body/UI copy specifically because it reads warmer than a geometric grotesk at small sizes (Section 4).
2. **Copy voice** — direct, second-person, human, per Section 1's tone rules; warmth in a B2B product usually comes from clarity and respect for the reader's time, not from color or illustration.
3. **One tint, used narrowly** — Accent-200 (the lightest accent step) may be used as a soft background wash in a small number of specifically non-critical, non-decorative contexts (e.g., a subtle section tint behind testimonials once they exist, or behind a quoted customer FAQ answer). It is never used as a full-bleed hero background and never appears more than once per screen. This is the one warm *surface* move the system permits.

**Illustration style:** none in the traditional sense — no isometric mascots, no line-art people, no abstract blobs. Anywhere an illustration would traditionally go, reuse the Grounding motif's own vocabulary (flat content-fragment cards, precise answer cards) rather than inventing a second visual language (Section 21).

**Photography style:** avoid stock photography of people entirely where possible. If used (team, careers), it must be real, specific, unstaged, and cropped tight (Section 23).

**Iconography:** single-weight line icons, 1.5px stroke, 24px base, square-cornered terminals — matches the precision-over-friendliness personality. Filled shapes are reserved for status dots only (Section 22).

**Motion language, one sentence:** motion clarifies cause and effect; it never exists to look alive on its own.

---

## Section 3 — Color System

Two failure modes were deliberately avoided: the neon-cyan/indigo-on-void direction (crypto/gaming, regardless of enterprise vocabulary) and the *other* extremely common AI-generated default — warm cream background, high-contrast serif, terracotta accent — which is just as recognizable a tell in the opposite direction. What's left: a cool, precise neutral system with exactly one saturated accent in a hue family almost nobody else in this category uses. Every pairing below is checked against WCAG 2.1 contrast math, not eyeballed.

### Neutral scale (cool graphite — no warm/cream undertone)
| Token | Hex | Primary use |
|---|---|---|
| Neutral-0 | `#FAFAFB` | Light-mode page background |
| Neutral-50 | `#F1F1F3` | Light-mode surface / card background |
| Neutral-100 | `#E4E4E8` | Light-mode subtle fill (hover states) |
| Neutral-200 | `#D0D0D6` | Decorative hairline dividers only — fails 3:1, never for meaningful borders |
| Neutral-300 | `#B0B0B9` | Disabled text/icons on light |
| Neutral-400 | `#8C8C97` | Functional borders (inputs, cards) on light — 3.19:1 |
| Neutral-500 | `#6B6B75` | Secondary/muted body text on light — 5.05:1 |
| Neutral-600 | `#4F4F58` | Tertiary UI chrome |
| Neutral-700 | `#38383F` | Decorative hairline dividers on dark only |
| Neutral-800 | `#232328` | Dark-mode surface / card background |
| Neutral-900 | `#151518` | Primary text on light — 17.47:1 |
| Neutral-950 | `#0A0A0C` | Dark-mode page background |

Dark-mode secondary text: Neutral-400 on Neutral-950 = 5.95:1. Dark-mode functional borders: Neutral-500 on Neutral-950 = 3.75:1.

### Accent — Oxblood
A deep, desaturated wine/burgundy — deliberately not the purple/indigo every AI product defaults to, not the terracotta of the "warm AI-generated" default, and not the Gemini spec's neon. Reads as law-firm/publishing/fine-goods premium rather than tech-startup premium, matching the "timeless, not trendy" brief. **This is the one color decision in the system flagged for a pre-launch perception check — see Section 30.**

| Token | Hex | Use | Verified contrast |
|---|---|---|---|
| Accent-200 | `#E8C7CE` | Decorative tint / subtle fills only (see Section 2 warmth note) | — |
| Accent-400 | `#B96478` | Links/UI text on dark backgrounds | 4.86:1 on Neutral-950 |
| Accent-500 | `#93304A` | Brand graphic fills, icons, decorative use on light backgrounds only | 7.29:1 on Neutral-0. **Fails on dark (2.60:1) — never text or thin UI on dark** |
| Accent-600 | `#7A2038` | Links/buttons/UI text on light backgrounds | 9.63:1 on Neutral-0 |
| Accent-700 | `#5C1729` | High-emphasis text, pressed/active states on light | 12.51:1 on Neutral-0 |

Accent is a spot color: never a full-bleed background, never a gradient, never more than roughly 5% of any screen. Its job is to mark the one thing that matters on a page — never to decorate.

### Semantic colors (a deliberately distinct hue family from Accent)
| Token | Hex | Use | Verified contrast |
|---|---|---|---|
| Success-500 | `#3F7855` | Success text/icons on light | 5.00:1 |
| Success-300 | `#7FB08F` | Success text/icons on dark | 8.02:1 |
| Warning-600 | `#7A5714` | Warning body text on light (small text) | 6.29:1 |
| Warning-500 | `#A87A1E` | Warning icons/large text/borders on light only | 3.68:1 — UI/large-text threshold, not body-safe |
| Warning-300 | `#D9AE5C` | Warning text/icons on dark | 9.57:1 |
| Error-500 | `#C43B34` | Error text/icons on light | 5.01:1 |
| Error-300 | `#E8948E` | Error text/icons on dark | 8.53:1 |
| Info-500 | `#3E6FA8` | System/informational messages only, never decorative | 4.98:1 |
| Info-300 | `#8BB3DE` | Info text/icons on dark | 9.04:1 |

### Dark mode is not an inverted palette
Neutral-950/900/800 were picked independently, not derived by inverting the light values, so card elevation and text weight still feel correct in the dark. Accent shifts from the 600/700 range (light) to the 400 range (dark) rather than staying fixed — a color readable on white is frequently not readable on near-black at the same lightness. Accent-500 is explicitly banned from dark-mode text for this reason.

---

## Section 4 — Typography

**Why not Inter:** Inter (or an Inter-alike) is the single most common typeface in "premium minimal SaaS" right now — "Inter + dark mode + generous whitespace" has become its own templated look. Two distinct sans faces are used for genuine personality difference rather than one face reused at different weights.

| Role | Typeface | Why |
|---|---|---|
| Display / headlines | **Founders Grotesk** (preferred) / **Space Grotesk** (fallback) | Technical, precise, genuine point of view. Founders Grotesk is a paid, per-pageview-licensed face — that cost has to be an explicit line item before it's locked in (Section 30). If it isn't cleared in time, Space Grotesk is a fully open-license (SIL OFL) substitute with a comparable geometric/technical character, so the display voice doesn't quietly default back to Inter under deadline pressure. |
| Body / UI | **IBM Plex Sans** | Warmer and more readable than the display face at small sizes, fully open-licensed, shares a family with the mono face so code and prose feel like one system. |
| Code / technical / data | **IBM Plex Mono** | Embed snippets, API keys, log output, and anywhere a number needs to visibly not be lying (pricing, usage stats). |

**Type scale** (rem, 16px root):
| Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| Display-XL | 4.5rem / 72px | 1.05 | 600 | Hero headline only |
| Display-L | 3rem / 48px | 1.1 | 600 | Section headlines |
| Display-M | 2.25rem / 36px | 1.15 | 600 | Sub-section/card headlines |
| Heading | 1.5rem / 24px | 1.25 | 600 | In-page headings |
| Body-L | 1.125rem / 18px | 1.6 | 400 | Lead paragraphs, hero subhead |
| Body | 1rem / 16px | 1.6 | 400 | Default body copy |
| Body-S | 0.875rem / 14px | 1.5 | 400 | Secondary text, captions |
| Label | 0.75rem / 12px | 1.4 | 600, +4% tracking, all-caps | Eyebrows, form labels, badges |
| Code | 0.875rem / 14px | 1.6 | 400 (mono) | Inline code, snippets |

**Rules:**
- Tabular numerals everywhere digits update or sit in a column — pricing, usage stats, the dashboard. Proportional numerals cause visible width jitter, which reads as cheap exactly where trust matters most (billing, analytics).
- Display-XL is the only size ever set above 600 weight-visual-dominance on a page — never two competing huge headlines in one viewport.
- No justified text, no centered body beyond two lines, no all-caps body copy (Label tokens only).
- Line length caps at ~68 characters for body copy regardless of viewport width.

---

## Section 5 — Spacing System

4px base unit, fixed token scale:

| Token | Value | Typical use |
|---|---|---|
| space-1 | 4px | Icon-to-label gaps |
| space-2 | 8px | Tight internal padding |
| space-3 | 12px | Form field internal padding |
| space-4 | 16px | Default component padding |
| space-6 | 24px | Card padding, gaps between related elements |
| space-8 | 32px | Gaps between distinct components |
| space-12 | 48px | Gaps between sub-sections |
| space-16 | 64px | Gaps between major page sections (mobile) |
| space-24 | 96px | Gaps between major page sections (desktop) |
| space-32 | 128px | Hero vertical breathing room (desktop only) |

Section-to-section rhythm on marketing pages should not vary arbitrarily — space-24 (desktop) / space-16 (mobile) is the standard section gap; deviate only for the hero.

---

## Section 6 — Grid System

- **Marketing pages:** 12-column grid, 1280px max content width, 24px gutters, centered with fluid margins beyond 1280px. Asymmetric layouts (7/5, 8/4) read as more considered than repeated centered full-width blocks.
- **Application (dashboard):** fixed 240px left navigation rail (collapsible to 64px icon-only), fluid content area with a 1120px max width, 24px gutters.
- **Breakpoints:** 480 / 768 / 1024 / 1280 / 1536px. Below 768px, the grid collapses to 4 columns with 16px gutters — single-column stacking except pricing cards and stat pairs, which stay 2-up as long as they fit without cramping.
- **Baseline grid:** all vertical rhythm snaps to 4px via the spacing tokens above.

---

## Section 7 — Component Design Language

**Radius:**
| Token | Value | Use |
|---|---|---|
| radius-sm | 4px | Inputs, small buttons, badges |
| radius-md | 8px | Cards, modals, buttons (default) |
| radius-lg | 12px | Large containers, the Grounding answer card |
| radius-full | 9999px | Pills/tags and avatars only — never buttons |

**Elevation / shadow:** warm-neutral tinted at low opacity, not pure black. Single consistent light source (top), never multi-directional glow.
| Token | Spec | Use |
|---|---|---|
| shadow-sm | 0 1px 2px, 6% opacity | Resting cards |
| shadow-md | 0 4px 12px, 8% opacity | Dropdowns, popovers |
| shadow-lg | 0 16px 32px, 10% opacity | Modals |
| shadow-focus | 0 0 0 3px Accent-600 at 35% opacity, ring only | Focus indicator (Section 18) |

**Z-index scale.** Not present in the draft at all — every layered surface in this system needs a stacking token so implementers aren't inventing values per-component:
| Token | Value | Use |
|---|---|---|
| z-base | 0 | Default document flow |
| z-dropdown | 100 | Select menus, inline popovers |
| z-sticky-nav | 200 | The persistent nav bar once glass-scrolled |
| z-overlay | 300 | Modal/drawer backdrop |
| z-modal | 400 | Modal and drawer content |
| z-command-palette | 500 | Cmd/Ctrl+K palette |
| z-toast | 600 | Toast notifications |
| z-tooltip | 700 | Tooltips — always above everything else, since they're triggered by direct focus/hover |

**Glass/blur — used exactly once, not as a system default.** Reserved for the top nav bar once scrolled past the hero (translucent surface, 12px blur, 1px hairline border in Neutral-200/700). Never applied to cards, modals, the widget, or pricing tiers.

**Buttons:** one primary (filled) button per screen — Accent-600 fill with Neutral-0 text (light) or Accent-400-bordered/transparent with Neutral-0 text (dark). Secondary buttons are outlined, never a second solid color. Tertiary actions are text-only, underlined on hover only.

**CTA hierarchy (added — the draft asserted "primary and secondary never compete" without specifying how that's enforced):**
- Primary button: minimum 44px height, Body-size label, Accent-600/Accent-400 fill.
- Secondary text-link CTA: Body-S size (one step smaller than the primary's label), Accent-600/Accent-400 text color with no fill, underline appears on hover only, minimum 16px gap from the primary action so the two never visually compete for the first glance.
- Never place a secondary link CTA in a heavier weight or larger size than the primary button's label in the same viewport.

**Cards:** flat fill (Neutral-50 light / Neutral-800 dark), shadow-sm at rest, no border by default — border only appears on hover/focus (shadow + border together reads busy).

**Inputs:** Neutral-400/500 functional border at rest, Accent-600/Accent-400 border + shadow-focus ring on focus, error state swaps border to Error-500 with inline text below in Error-600.

**Component states matrix (added — states were mentioned piecemeal in the draft and never gathered in one place):**
| Component | Default | Hover | Focus | Active/Pressed | Disabled | Error | Loading |
|---|---|---|---|---|---|---|---|
| Primary button | Accent-600 fill | +4% darken | shadow-focus ring | scale 98% (Premium Detail #1) | 40% opacity, no pointer | n/a | inline spinner replaces label, width preserved |
| Input | Neutral-400 border | border → Neutral-500 | Accent border + shadow-focus | n/a | Neutral-100 fill, Neutral-300 text | Error-500 border + Error-600 helper text | n/a |
| Card | shadow-sm, no border | hairline border appears | shadow-focus ring if interactive | shadow-sm → shadow-md | n/a | n/a | skeleton matching final shape (Section 13) |
| Table row | Neutral-0/800 fill | full-row highlight (Premium Detail #10) | outline on focused cell | n/a | n/a | inline Error-500 text in affected cell | skeleton row |
| Nav item | Neutral-600 text | Neutral-900/0 text | shadow-focus ring | Accent-600 text + left rule for active route | n/a | n/a | n/a |

---

## Section 8 — Landing Page

Twelve sections, in order. Each has a stated job — nothing included "because it looks premium" without one.

**1. Navigation (persistent).** Logo/Anchor Mark left, five links max (Product, Pricing, Docs, Blog, Log in), one primary CTA right. Transparent over the hero; on scroll past 80px it becomes the one glass surface permitted (Section 7), sliding in shadow-sm. **Nav CTA copy is intentionally shorter than the hero/pricing/final-CTA phrase** — "Start free" rather than "Start answering in 10 minutes." This is a deliberate, documented exception to the one-consistent-phrase rule below, not an oversight: the nav bar is persistent, present on every scroll position including mobile, and needs to stay short; both labels resolve to the identical signup flow. Once scrolled, this nav CTA functions as the page's sticky/floating conversion element for the entire scroll length — no separate floating CTA component is needed.

**2. Hero.** Headline: **"Every answer is already in your docs. Now it talks."** Sub-head: "Conversation Engine turns your existing documentation into instant, accurate answers for every visitor — grounded in what you actually wrote, with nothing improvised." Primary CTA: **"Start answering in 10 minutes."** Secondary CTA: text link, "See it answer a real question ↓," scrolling to Section 5 rather than a separate page.

Visual: the Grounding motif as the entire hero visual. 6–8 flat content-fragment cards (short, real-looking snippets — "Refund policy," "API rate limits," "Shipping to EU") drift in from the viewport edges with slight cursor-parallax, converge over ~2.5 seconds, and lock into one still answer card with a real example answer. Runs once on load, then stays still — no looping, no idle motion. A soft cast shadow beneath each fragment deepens as it nears the convergence point, giving the arrival genuine z-depth without introducing any glass or particle material (see Section 12). Static fallback image for `prefers-reduced-motion` and at initial mobile paint; the converge animation plays only above 768px, gated by IntersectionObserver.

**3. Proof bar.** Pre-launch, there are no customer logos to show — designing a logo bar and filling it with placeholders would mean shipping fabricated social proof. Ship a single credibility line instead ("Built by engineers who got tired of writing the same FAQ answer forty times a week") plus a live, real status indicator once one exists (uptime, or "X questions answered today" once non-zero). Swap to real logos the day three exist.

**4. Problem framing.** Two sentences, one visual: a before/after split showing a generic chatbot hedging next to Conversation Engine giving a precise, sourced answer with a small citation tag pointing at the source document. This single visual carries more conversion weight than the feature grid below it — it's the first moment a skeptical visitor sees the actual differentiator demonstrated, not claimed.

**5. Live interactive demo.** A real, typable chat widget embedded in the page, pointed at a small sandboxed demo knowledge base (this product's own documentation). This does more conversion work than every other section combined. Needs a real, maintained sandbox — a visibly scripted demo undermines the "grounded, not improvised" claim the moment anyone notices it's canned (full detail in Section 10).

**6. How it works.** Four steps, scroll-triggered, one visual per step: Upload → Publish → Embed → Resolve. Numbered markers are appropriate here specifically because order carries real information. Each step's visual reuses the flat-card language from the Grounding motif rather than introducing new iconography.

**7. Capability proof (revised from "capability grid").** The draft's six identical icon-over-three-lines cards, even dressed up with alternating screenshots, are still structurally a features grid. Replaced with **four proof moments**, not six generic capabilities — each anchored to one real product screenshot and one specific, checkable outcome statement (not a feature name), e.g. not "Smart Search" but "Finds the answer even when the visitor doesn't use your exact wording." Screenshots render in a soft device-frame/browser-chrome mockup with a single directional shadow and a slight perspective tilt that settles on scroll-into-view (Section 12) — restrained dimensionality, zero glass, consistent with Apple/Stripe's own product shots. Full-bleed, alternating left/right down the page.

**8. Trust strip.** See Section 9 in full. Placed after the visitor has seen the product work (Section 5) and understood how it fits together (6–7) — trust lands harder once curiosity is satisfied.

**9. Metrics.** Real, live numbers only, animated count-up on scroll-into-view: messages answered, median response time, resolution rate without human handoff. **Do not fabricate pre-launch** — cut the section rather than invent a number; a false claim is a liability the moment anyone checks, and directly contradicts the brand's core premise.

**10. Pricing preview.** Condensed 4-card snapshot (full treatment in Section 11), "Most popular" badge on Professional, single CTA to the full pricing page. Never render full comparison tables here — decision paralysis this early in the funnel.

**11. Final CTA.** Reprises the Grounding motif at roughly a third of the hero's scale, replaying once as the section enters view — the visitor saw the idea once at the top, understood the product in between, and sees it land a second time right before the ask. Headline: "Stop writing the same answer twice." CTA: same "Start answering in 10 minutes" phrase as the hero.

**12. Footer.** Standard four-column (Product / Platform / Company / Legal), as already drafted — fine as-is; footers are utility, not a brand stage. Now also links to the Trust Center hub, the Methodology page, and (once real) Case Studies — see Sections 9 and 16.

### Section order, one line
Nav → Hero (Grounding) → Proof-or-credibility → Problem framing → Live demo → How it works → Capability proof → Trust → Metrics → Pricing preview → Final CTA (Grounding, reprised) → Footer.

### CTA strategy, summarized
One consistent primary phrase ("Start answering in 10 minutes") at the three big-commitment moments — hero, pricing preview, final CTA. The persistent nav uses a documented shorter variant ("Start free") for space and repetition reasons, resolving to the same flow. Secondary CTAs are always link-styled, per the hierarchy in Section 7. Enterprise gets its own distinct path — see Section 11 and 16, not a "book a demo" fork for every tier.

**A real, checkable conversion lever (replaces the fake urgency that was correctly banned but never replaced):** lead with "No credit card required" wherever the primary CTA appears — it's already true given the Free tier, costs nothing to state, and does real conversion work without inventing anything. A "Founding customer" cohort (locked-in pricing or extra features for the first N signups) is a legitimate second lever *if* Product/Business can commit to it truthfully — flagged as a pending business decision, not specced further here (Section 30).

---

## Section 9 — Trust Architecture

Trust has to be distributed at the exact moment each specific doubt occurs, not concentrated in one badge strip.

| Doubt in the visitor's head | Where it gets answered |
|---|---|
| "Will this actually give correct answers?" | Section 4 (before/after) and Section 5 (live demo) of the landing page — shown, not claimed |
| "How does 'grounded' actually work, technically?" | **New: a dedicated Methodology page** ("How grounding actually works"), linked from the footer and referenced from the landing page's problem-framing section — a plain-language technical explainer using the Grounding motif's own static vocabulary to diagram retrieval-grounding without jargon. Given the entire brand claim is "doesn't guess," this was a real gap — a claim this central needs an explainer, not just a demo. |
| "Is our data safe?" | A line in the trust strip plus full detail in the **Trust Center hub** (new — see below) |
| "Is this actively maintained?" | A visible, dated changelog and status page (footer nav) |
| "Do real companies use this?" | Customer logos + testimonials, once they exist — never simulated pre-launch. **A Case Studies page template is built now** (layout only, per Section 15) so it's ready the day the first real customer exists, rather than being designed under launch pressure. |
| "What happens if it breaks?" | SLA terms in plain language on the pricing page for Professional/Enterprise |
| "Is the pricing going to surprise us?" | Usage shown transparently in-app (80%/100% warnings per the product plan) |

**Trust Center hub (new).** A single URL consolidating the Security page, Status page, Changelog, compliance badges (SOC2, GDPR, etc.), the DPA/subprocessor list, and the downloadable security-questionnaire one-pager (Section 16). Enterprise buyers expect one place to find all of this rather than scattered footer links — the draft had these as separate, disconnected footer items.

**Security/compliance badges** belong in the footer and the Trust Center, small and factual — never hero-section decoration. Oversized trust badges on a hero read as compensating for something, the opposite of the intended effect.

**Uptime:** a real, live status link, not a static "99.9%" claim with no source.

**Where NOT to put trust signals:** never interrupt the live demo with a trust badge overlay — let the product speak uninterrupted there.

---

## Section 10 — Product Demonstration & Grounding Proof Surfaces

The live, typable, embedded demo in Section 8.5 is the core demonstration strategy.

- **Sandbox, not scripted animation.** A pre-recorded loop is an acceptable fallback for JS/embed-restricted users, but the primary experience must be a real query against a real, small knowledge base — otherwise the "grounded, not improvised" claim is undermined by the first thing a skeptical visitor tries.
- **Seed the sandbox with the product's own documentation** — authentic, always current as a side effect of normal engineering work, and it lets a visitor see genuinely honest fallback behavior on a hard question.
- **Show the fallback deliberately, once, guided** — a suggested-question chip ("Ask about something off-topic") lets a visitor safely see the honest "I don't know" behavior without hitting a dead end unguided.
- **No sandbox anywhere except the landing page** — one canonical demo location avoids diluting it into a repeated gimmick.

**Visitor-facing citation component (new — the single largest gap identified in review).** The draft's best differentiator — grounded, sourced, confidence-scored answers — was only ever designed for the internal dashboard (Section 13's Answer Confidence module). A visitor talking to the live widget never sees any version of it. Fixed here and specced fully in Section 14: every grounded answer in both the demo widget and the production widget renders a small source-citation row beneath it, and low-confidence answers visibly fall back rather than fabricate a citation. This turns the core brand claim into something a visitor can verify in the same five seconds they're evaluating the product, not just something the copy asserts.

---

## Section 11 — Pricing Psychology

Four tiers, per the product plan (Free / Starter $29 / Professional $99 / Enterprise custom).

- **Professional gets the visual anchor** — the only card with a filled Accent-600 header band and a "Most popular" label (Label-token styling, not a ribbon graphic). Not oversized relative to the others; the accent color alone does the work.
- **Enterprise is priced "Custom"** and exists partly to make Professional look reasonable. Its card is distinctly different in *material*, not just price: solid Neutral-800 fill instead of the light treatment the other three share. **Its CTA is "Talk to Sales," styled as the outlined secondary treatment** (never a second filled primary on the same screen as Professional's filled CTA) — see Section 16 for the sales-assist flow this leads to. This resolves the draft's own open question about whether Enterprise needs a separate CTA path: it does, and it's now specified.
- **Free stays visually equal-weight to Starter** — same card treatment, same information density, genuinely useful at $0. Deliberately punishing the free tier's presentation reads as manipulative the moment a visitor notices.
- **Monthly/annual toggle:** simple state swap, ≤150ms fade on the price digits (tabular numerals make this look clean without a spring/flip animation). "Save 20%" badge sits next to the toggle itself, once, not repeated per card.
- **FAQ placement:** directly beneath the pricing table — the four drafted FAQs (hallucination handling, setup time, white-labeling, overage behavior) answer the exact objections that occur at this exact funnel moment.
- **No fake urgency** — no countdown timers, no fake viewer counts, no artificially scarce language anywhere in pricing.
- **A one-line guarantee, stated plainly, near the CTA** — something concrete and checkable, not a badge graphic.
- **The real conversion lever from Section 8** ("No credit card required") repeats here, next to the Free and Starter CTAs specifically, where it does the most work.

---

## Section 12 — Animation System

Two eases. Consistency here is itself a premium signal — a different easing per component feels assembled, not designed.

| Name | Character | Duration | Use |
|---|---|---|---|
| **Functional** | Quick, controlled, no overshoot | 120–180ms | Hover, focus, toggle, click feedback, menu open/close |
| **Expressive** | Slight overshoot/settle, cinematic | 400–700ms | The Grounding motif's appearances, page-transition reveals, scroll-triggered section entrances |

**Choreography rules:**
- Staggered reveals stagger 60–80ms per item, capped at 6 items.
- Nothing animates purely ambiently at rest — if it's not responding to scroll, hover, or a state change, it doesn't move.
- `prefers-reduced-motion: reduce` disables all Expressive-tier motion (crossfade replaces movement) and shortens Functional-tier motion to under 80ms rather than removing it — feedback on direct interaction should still register.
- No scroll-jacking, ever.
- No custom cursor effects of any kind — they don't exist on touch, they fight browser-native affordances, and they're a common "concept demo" flourish that delights nobody in production.

**Three additions, all still trigger-based — none of these reopen the "idle ambient motion" door the draft correctly closed:**
- **Scroll-return re-trigger (narrow exception).** The total ban on idle motion means a repeat visitor scrolling back to the top of the landing page after scrolling away sees a permanently dead hero. A smaller-scale replay of the convergence (roughly final-CTA scale, not full hero scale) plays once when the user scrolls back past the top of the viewport after having scrolled away — this is a "welcome back" state confirmation triggered by a real scroll event, not ambient decoration, and it does not count against the "three appearances" rule since it's a re-trigger of the hero's own instance, not a new brand moment.
- **Pointer-response micro-tilt.** A restrained 2–3° tilt on the capability-proof screenshots (Section 8.7) on hover, Functional-ease, settling back on mouse-leave — a well-worn "feels premium" detail on the sites this system is explicitly benchmarked against (Linear, Vercel), and clearly distinct from the banned magnetic-cursor effect since it responds to a specific hovered element, not a global cursor replacement.
- **Route transitions (in-app).** Dashboard → Knowledge Base → Billing, etc. use a Functional-ease crossfade with a small (8px) vertical settle on the incoming view — enough to signal "you moved," not enough to feel like a marketing-site page transition. This was undefined in the draft despite how much motion discipline went into the marketing site; the in-app navigation shouldn't feel like an afterthought by comparison.

---

## Section 13 — Dashboard Design Language

The actual shared trait across the named benchmarks (OpenAI, Vercel, Supabase, Stripe, Linear) isn't a visual style — it's information density done correctly, a genuine feeling of real-time state, and fast perceived performance. Chase those three, not their palettes.

- **Header stat row (revised).** The draft specced one dominant hero metric with three smaller supporting metrics, purely to avoid the "four equal KPI cards" template. That's too strong a rule applied without checking it against what a support lead actually needs at a glance: usage-vs-plan-limit is a billing-anxiety number, not a vanity one, and demoting it purely for visual variety risks hiding something users check constantly. **Revised default: one hero metric (conversations this week, with sparkline) plus a Usage module (messages used / plan limit, shown as a compact progress bar) at equal visual prominence** — not four identical boxes, but not a single dominant number either. Resolution rate and median response time remain smaller supporting tiles. This default is provisional and should be checked against real usage data post-launch (Section 30).
- **A live activity feed**, genuinely real-time (or near it), showing recent conversations as they resolve — new items enter with a brief Functional-ease highlight in Accent-200 that fades over 2 seconds, never a persistent colored row.
- **Workspace switcher (new — was missing entirely).** The product plan requires multi-tenant workspace switching; the draft's dashboard section never addressed it. A compact switcher sits above the navigation rail, showing the current workspace name/avatar with a dropdown listing other workspaces the user belongs to — same dropdown component language as everywhere else in the system, not a bespoke pattern.
- **"Answer Confidence" — the signature module.** A rolling percentage of visitor questions answered with high grounding confidence versus the percentage that fell back to "I don't know." No competitor dashboard in this benchmark set has a reason to show this; this product does, and it's a literal, ongoing instrument of the entire brand promise. **It links directly to the specific low-confidence questions behind the score**, turning a vanity metric into an actionable one (Premium Detail #96). Recommend building this even if nothing else in this section makes the first release. It uses the same confidence visual language as the widget's citation component (Section 10, 14) — one consistent grounding signal across dashboard, inbox, and widget, not three different visual treatments of the same idea.
- **Command palette (Cmd/Ctrl+K)** for navigation and quick actions — genuinely high-value for the technical-user portion of the audience, not decorative.
- **Skeleton loading matching final layout exactly**, never a generic spinner.
- **Empty states** use the drafted copy, paired with a specific illustration built from the Grounding motif's flat-card vocabulary, never a generic empty-box icon.

---

## Section 14 — Widget Experience

**Installation flow (4 steps):** snippet copy → paste confirmation (polling) → domain verification → live confirmation. Functional-ease state changes throughout, one deliberate Expressive exception below.

- **Copy-snippet button:** swaps to a checkmark for 2 seconds with a Functional fade, not a toast — feedback lives where the eye already is.
- **Domain verification:** a real polling indicator (slim animated progress bar, not a spinner).
- **Success moment reprises the Grounding motif** — the third and final of its three permitted full appearances. Confirms the widget is live; closes the loop a visitor started watching in the hero.
- **Widget states:** online (Success-500 dot, filled), typing (three-dot Functional pulse, 400ms cycle), fallback (answer card renders in Neutral tones instead of Accent, with the drafted fallback copy — deliberately not alarm-colored, so an honest "I don't know" reads calm, not like an apology).

**Citation & confidence surface (new — full spec for the component referenced in Section 10).** Every grounded answer in the widget renders a compact source row beneath the answer bubble:
- One or more small pills (radius-full, per the Section 7 exception), Body-S size, Neutral-100 fill / Neutral-600 text (light mode), reading the source document's title (e.g., "Refund Policy — p.2").
- Tapping/clicking a pill opens a small popover showing the specific excerpt the answer was grounded in, Neutral-50 background, capped at 2–3 lines.
- On a low-confidence fallback, no citation pill renders at all — the fallback copy stands alone in its Neutral styling. Never fabricate a citation to fill the space.
- This is the same visual grounding language used in the dashboard's Answer Confidence module and the Conversations inbox (Section 15) — one consistent signal, three surfaces.

**Brand customization (white-label):** primary color, logo, welcome message, position — exactly as scoped in the product plan. The customization panel uses this same design system's components, not a separate theming visual language.

---

## Section 15 — Additional Application Surfaces

The draft gave real design direction to Landing, Pricing, Dashboard, and Widget, and none at all to roughly half the product's actual page inventory. Each surface below gets enough direction to prevent it being invented ad hoc mid-build; all reuse the tokens, components, and states already defined above rather than introducing anything new.

- **Knowledge Base (source management).** Table or card list of uploaded sources with status chips (Processing / Live / Error, using semantic colors from Section 3). Drag-and-drop bulk upload zone (Premium Detail #11's drop-zone state change). Per-source last-updated timestamp shown as relative time with exact time on hover (Premium Detail #18). Search/filter bar above the list. Empty state uses the Grounding flat-card vocabulary, not a generic empty-box icon.
- **Conversations (inbox).** Two-pane layout: conversation list (left) + full thread (right). Unread indicator is a small functional dot, not a second use of Accent within the same screen as any existing primary CTA. Filter by resolved / unresolved / needs-review. Each message in the thread carries the same confidence/citation visual language as the widget (Section 14) so an admin reviewing a conversation sees exactly what the visitor saw.
- **Analytics.** Reuses the dashboard's chart language — semantic and neutral tokens only, never a separately invented rainbow palette (Premium Detail #65). Answer Confidence trend is the primary chart. Date-range picker uses tabular-numeral date display. CSV export action available.
- **Billing.** Invoice list, each downloadable as a clean branded PDF (Premium Detail #99). Plan card matches the pricing-page card treatment for consistency between what a customer sees pre- and post-purchase. Usage meter as a horizontal progress bar with Warning/Error semantic colors at the 80%/100% thresholds already defined in the product plan.
- **Team / Members.** Simple table (name, role, status). Invite flow reuses the standard form language (Section 7). Role badges use Label-token styling, not custom ad hoc colors.
- **API Keys.** Table with the key string shown exactly once at creation, then only the last four characters afterward (Premium Detail #98) — the UI must actually enforce this, not just say it in copy. Scopes/permissions shown as small tags. Key strings render in IBM Plex Mono.
- **Support / Help (in-app).** Reuses the command-palette/search pattern where feasible. Simple searchable FAQ/article list. A clearly stated escalation path to a real human, consistent with the SLA-honesty principle in Section 9 — never a dead-end bot loop.
- **Documentation (docs.site).** Classic three-column pattern: left nav, content, right-side "on this page" anchor nav. Code blocks in IBM Plex Mono with the same copy-to-clipboard pattern as the widget installer (Premium Detail #88 applies here too — no horizontal overflow on narrow viewports). Search reuses the command-palette component.
- **Blog.** Single-column article template. Body-L for the lead paragraph, Body for the rest, same ~68-character line-length cap as the rest of the system. No decorative stock photography (Section 23). Each post gets a unique Open Graph image per the template in Section 24.

---

## Section 16 — Enterprise & Sales-Assist UX

The draft's persona section explicitly names enterprise buyers, but nothing downstream gave them a path beyond self-serve signup. Fixed here.

- **Sales-assisted path.** Enterprise's pricing-card CTA is "Talk to Sales" (Section 11), leading to a short contact form (name, email, company size, message) using the standard form components. Confirms receipt immediately and states a real expected response window (Premium Detail #80) — never a generic "we'll be in touch."
- **SSO / SAML.** Configuration lives in Team settings as an admin-only panel, using the same form language as the rest of the product: identity-provider metadata URL input plus a "Test connection" action that reuses the domain-verification polling pattern already specified for the widget installer (Section 14) rather than inventing a new loading pattern for the same underlying idea.
- **Security questionnaire / procurement one-pager.** A clean, single-page downloadable PDF using the product's actual type and color system — not a dense, generic legal document — available from the Trust Center hub (Section 9).
- **Plain-language legal review aid.** Legal pages (Privacy, Terms, Security) lead with a short plain-language summary before the full text (Premium Detail #72), specifically because enterprise legal review is a named buyer behavior in Section 1 — this is the concrete UX moment that behavior needed and didn't have.

---

## Section 17 — Transactional Email System

Named as a backend deliverable in the product plan with zero design direction in the draft. Welcome, verify-email, password-reset, and trial-ending (if a trial exists) all follow one template:

- Single column, 600px max width, mostly plain text in structure — this is a utility moment, not a marketing moment.
- Small wordmark at the top (not the full hero lockup).
- One primary action per email, styled as the same Accent-600 filled button used everywhere else in the product — never a different button style invented for email.
- Copy follows the Section 1 tone rules verbatim: active voice, no hedge words, no "Oops," second-person throughout.
- Footer: unsubscribe (where applicable) and legal links only — no additional marketing content riding along on a transactional email.

---

## Section 18 — Accessibility

WCAG 2.1 AA, verified rather than assumed — see Section 3 for the specific contrast ratios behind every color pairing.

- **Focus states:** visible 3px ring in Accent-600 (light) / Accent-400 (dark) at 35% opacity, offset 2px — `shadow-focus`. Focus-visible only (keyboard focus), never triggered by mouse click.
- **Touch targets:** 44×44px minimum on all interactive elements, including icon-only buttons.
- **Motion:** `prefers-reduced-motion` handling per Section 12 — a hard requirement given how much of this system leans on the Grounding motif.
- **Chat/live regions:** the widget's message stream uses an ARIA live region (`polite`), so new messages are announced without interrupting a screen reader mid-sentence.
- **Color is never the only signal** — success/warning/error states always pair color with an icon and/or text label.
- **Keyboard navigation is complete**, including the command palette, all dropdowns, and modal focus-trapping with Escape-to-close.
- **Contrast for decorative elements** (icons, dividers, linework) targets 3:1 wherever it carries meaning; purely ornamental hairlines (Neutral-200/700) are explicitly exempt.

---

## Section 19 — Mobile Experience

"No compromises" means equivalent quality through mobile-native patterns, not a shrunk desktop replica.

- **The hero's Grounding motif plays as a shorter, simpler version** (fewer fragment cards, no cursor-parallax) rather than the full desktop choreography scaled down.
- **The dashboard's left rail becomes a bottom sheet / slide-over**, not a squeezed sidebar.
- **Data tables become stacked cards**, each row's columns becoming labeled key-value pairs — never a horizontally-scrolling table.
- **Primary actions anchor to the bottom of the viewport** within thumb reach on mobile forms and flows.
- **The command palette becomes a full-screen search sheet.**
- Type scale drops one step at the 768px breakpoint rather than using unchecked `clamp()` scaling, to keep hierarchy intentional.

---

## Section 20 — Dark Mode

Specified inline throughout Sections 3, 7, and 12–14 rather than bolted on separately, on purpose.

- **Dark mode is the default for the application** (dashboard, widget config); **light mode is the default for marketing pages** — matches actual usage (a support lead has the dashboard open for hours; a prospect glances at the marketing site once).
- **Elevation in dark mode is communicated with lightness steps** (Neutral-800 → Neutral-700), not shadow, since shadows are far less visible against dark backgrounds.

---

## Section 21 — Illustration System

No separate illustration language exists. Every place an illustration would traditionally appear (empty states, onboarding, 404) draws from the same flat content-fragment / answer-card vocabulary as the Grounding motif — thin rectangular cards, single-weight outlines, Neutral fills with a single Accent touch where something needs highlighting, and, per Section 2's warmth resolution, an occasional Accent-200 tint fill where a softer surface is appropriate. This is a constraint, not a limitation: every illustration reinforces the same idea instead of a new metaphor being invented per screen.

---

## Section 22 — Icon System

- 24×24px grid, 1.5px stroke, square-cornered terminals (not rounded caps) — matches the precision-over-friendliness personality.
- Single style throughout: outline only. No mixing of outline and filled icons except the status-dot exception.
- Icons never carry meaning alone in a critical action (e.g., a bare trash-can for delete) without an accessible label.
- Custom icons only where genuinely needed (the Grounding/answer-card icon, a knowledge-base icon); everything else pulls from one consistent third-party icon set to avoid the subtle stroke-width drift that comes from mixing sources.

---

## Section 23 — Photography Direction

Avoid stock photography of people entirely where possible. If the About or Careers page needs human photography, the standard is tight, real, unstaged — a team member captured mid-work, never posed and smiling at a laptop that isn't open to anything. No "diverse team collaborating around a whiteboard" stock imagery — instantly recognizable as stock, and instantly undercuts a brand built on "we don't say things that aren't true."

---

## Section 24 — SEO, Metadata & Content Marketing

Absent from the draft entirely despite being a named exit criterion in the engineering plan (Lighthouse ≥90, structured data validation, sitemap). Specified here:

- **Structured data:** Organization schema site-wide, Product schema on the pricing page, FAQPage schema on the pricing FAQ and any dedicated FAQ page, Article schema on blog posts.
- **Sitemap:** generated and kept current as a build step, not a manual one-time file.
- **Open Graph images:** one custom image per major page (landing, pricing, each blog post), not one generic image reused everywhere (Premium Detail #58 named the requirement; this gives it a treatment). Template: wordmark or Anchor Mark, one-line value-prop text, laid over a Neutral-950 or Neutral-0 background with a small static Grounding-motif accent in the corner — never a screenshot crammed into a 1200×630 frame, which reads as low-effort at that crop.
- **Meta descriptions:** written per page, not auto-truncated from body copy (Premium Detail #59).
- **Blog visual system:** see Section 15 — single-column template, no decorative stock photography, code blocks in Plex Mono where relevant.
- **Paid-traffic landing variant:** yes, build one. A stripped-nav conversion page reusing only Hero, Live Demo, Pricing Preview, and Final CTA — no nav, no footer navigation, nothing to click that isn't the conversion path — for ad-spend traffic where every extra distraction measurably costs conversions. Stated as an explicit stance rather than left open, per the review's flag.

---

## Section 25 — Design Tokens (consolidated reference)

**Color:** Neutral-0 `#FAFAFB` · Neutral-50 `#F1F1F3` · Neutral-100 `#E4E4E8` · Neutral-200 `#D0D0D6` · Neutral-300 `#B0B0B9` · Neutral-400 `#8C8C97` · Neutral-500 `#6B6B75` · Neutral-600 `#4F4F58` · Neutral-700 `#38383F` · Neutral-800 `#232328` · Neutral-900 `#151518` · Neutral-950 `#0A0A0C` · Accent-200 `#E8C7CE` · Accent-400 `#B96478` · Accent-500 `#93304A` · Accent-600 `#7A2038` · Accent-700 `#5C1729` · Success-300 `#7FB08F` · Success-500 `#3F7855` · Warning-300 `#D9AE5C` · Warning-500 `#A87A1E` · Warning-600 `#7A5714` · Error-300 `#E8948E` · Error-500 `#C43B34` · Info-300 `#8BB3DE` · Info-500 `#3E6FA8`.

**Type:** Display-XL 72px/1.05/600 · Display-L 48px/1.1/600 · Display-M 36px/1.15/600 · Heading 24px/1.25/600 · Body-L 18px/1.6/400 · Body 16px/1.6/400 · Body-S 14px/1.5/400 · Label 12px/1.4/600/+4% tracking/caps · Code 14px/1.6/400 mono. Faces: Founders Grotesk (display, preferred) / Space Grotesk (display, fallback) · IBM Plex Sans (body/UI) · IBM Plex Mono (code).

**Space:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 (px).

**Radius:** sm 4 · md 8 · lg 12 · full 9999 (px).

**Elevation:** shadow-sm 0/1/2/6% · shadow-md 0/4/12/8% · shadow-lg 0/16/32/10% (offset-y/blur/opacity, warm-neutral tinted) · shadow-focus 3px ring, Accent-600 (light) / Accent-400 (dark), 35% opacity.

**Z-index:** base 0 · dropdown 100 · sticky-nav 200 · overlay 300 · modal 400 · command-palette 500 · toast 600 · tooltip 700.

**Breakpoints:** 480 · 768 · 1024 · 1280 · 1536 (px).

---

## Section 26 — Motion Tokens

| Token | Duration | Character | Use |
|---|---|---|---|
| motion-functional | 120–180ms | Quick, no overshoot | Hover, focus, toggle, click feedback, route transitions |
| motion-expressive | 400–700ms | Slight overshoot/settle | Grounding motif (3 full appearances + narrow scroll-return re-trigger), section scroll-reveals |
| motion-stagger | 60–80ms per item, max 6 | — | Grid/list entrance choreography |
| motion-tilt | 120–180ms (uses motion-functional timing) | 2–3° max, settles on leave | Capability-proof screenshot hover only |
| motion-reduced | <80ms, crossfade only | No movement | `prefers-reduced-motion: reduce` |

No other duration or easing values exist in this system. If an implementer needs something these five don't cover, that's a signal the interaction needs re-thinking, not a sixth token.

---

## Section 27 — Do / Don't Rules

**Do:**
- Use Accent color for exactly one meaningful thing per screen.
- Let the Grounding motif appear at its three full moments, plus the one narrow scroll-return re-trigger defined in Section 12.
- Show real product UI (screenshots, in device-frame mockups per Section 8) over icons and illustrations wherever real UI exists.
- State claims in numbers that are true and checkable.
- Use tabular numerals anywhere a number updates or sits in a column.
- Keep dark mode the default for the app, light mode the default for marketing.
- Use the visitor-facing citation component (Section 14) everywhere a grounded answer renders, including the marketing demo.

**Don't:**
- Don't add a second accent color "for variety."
- Don't use particle effects, glass/refraction material, or custom cursor behavior anywhere.
- Don't animate anything at rest with no trigger.
- Don't fabricate social proof, metrics, or urgency. Omit the section instead.
- Don't reuse "Democratizing X for Y," "never sleeps," "revolutionary," "game-changing," "supercharge," or "unleash" anywhere in copy.
- Don't build a second illustration language for empty states, onboarding, or error pages.
- Don't apply the one permitted glass treatment (scrolled nav bar) to any other surface.
- Don't let more than one button per screen carry primary (filled) visual weight.
- Don't ship a spinner where a shaped skeleton loader is feasible instead.
- Don't design a monogram, mascot, or abstract mark that isn't traceable back to the Grounding motif itself.

---

## Section 28 — Premium Details (100)

Small, individually minor, collectively the entire difference between "technically correct" and "feels expensive." Unchanged from the draft — every item here was already sound.

**Motion & feedback (1–15)**
1. Buttons scale to 98% on press, not just on hover.
2. Copy-to-clipboard actions swap to a checkmark state, never just a toast.
3. Toasts auto-dismiss but pause their timer on hover.
4. Destructive actions get a confirmation step; everything else doesn't.
5. Every async action shows real progress when the underlying task has one — never a fake progress bar.
6. Optimistic UI updates for anything reversible; wait for the server for anything destructive or billing-related.
7. Undo, not just confirm, is offered after destructive actions where feasible.
8. Loading skeletons match the exact shape of the content they precede.
9. No layout shift on image load — explicit width/height reserved in advance.
10. Hover states on rows highlight the entire row, not just the text under the cursor.
11. Drag-and-drop file upload has a clear, obvious drop-zone state change.
12. Autosave shows a small, unobtrusive "Saved" state, not a modal or toast.
13. Session-timeout warnings appear before logout, with time remaining.
14. Rate-limit responses show a real countdown, not just "try again later."
15. Tooltips have a short delay (~400ms) before appearing.

**Typography & numbers (16–28)**
16. Tabular numerals wherever digits update or sit in a column — no exceptions.
17. Currency and dates localize to the visitor's locale.
18. Timestamps show relative time with the exact timestamp on hover.
19. No orphaned single words at the end of headlines.
20. Widows avoided in marketing copy through manual review.
21. Truncated text always has the full value available on hover or tap.
22. Sentence case throughout the UI, never Title Case Buttons.
23. Numbers under 10 spelled out in marketing copy; data/UI numerals always numeric.
24. Placeholder text is a real example, styled distinctly, never literal instructions.
25. Consistent decimal precision — pricing never jumps between $99 and $99.00 in the same view.
26. Percentages round to whole numbers unless the fractional part is the point.
27. No Comic-Sans-tier error humor.
28. Button labels always match the resulting confirmation.

**Forms & inputs (29–40)**
29. Inline validation on blur, not only on submit.
30. Required-field indication is consistent across every form.
31. Autofocus on the first field of any standalone form.
32. Password fields have a visibility toggle, always.
33. Multi-step forms show progress (step X of Y).
34. Field grouping uses visual proximity and labeled sections.
35. Advanced/rare settings are progressively disclosed.
36. Every settings change confirms it saved, even without a full-page reload.
37. Form errors scroll the first invalid field into view automatically.
38. Paste is never blocked in password or code-snippet fields.
39. Keyboard "Enter" submits the obviously-primary form; never a hidden secondary action.
40. Long forms preserve entered data if the user navigates away and back.

**Navigation & structure (41–52)**
41. Command palette (Cmd/Ctrl+K), fuzzy search.
42. "/" focuses the primary search field from anywhere it's present.
43. Breadcrumbs on any page more than two levels deep.
44. Page `<title>` updates per route.
45. Sidebar navigation shows the active item unambiguously.
46. Escape closes any open modal or dropdown; click-outside does too.
47. Tab order follows visual/logical order, verified manually.
48. External links get a small indicator icon and open in a new tab.
49. Sticky elements never overlap content when the viewport is short.
50. Pagination vs. infinite scroll is a deliberate per-context choice.
51. Sortable table columns show current sort direction; clicking again reverses it.
52. Bulk-action bars appear only once items are selected.

**Visual polish (53–68)**
53. One consistent shadow direction (top light source) across every elevated surface.
54. Consistent border-radius per component tier.
55. Icon stroke width identical across every icon in the product.
56. Favicon renders legibly at 16px, tested.
57. Favicon adapts to OS light/dark theme where supported.
58. Open Graph preview images are custom per major page (Section 24).
59. Meta descriptions written per page.
60. Avatar fallbacks use styled initials with a consistent, deterministic color per user.
61. Empty table states designed per context, never a bare "No data" string.
62. 404 and other error pages include real navigation and search.
63. Print stylesheet exists for anything a customer would reasonably print (invoices, receipts).
64. Dark mode is a genuinely separate palette, never a CSS invert filter.
65. Chart colors reuse the system's semantic and neutral tokens — never a separately invented rainbow palette.
66. Consistent spacing rhythm verified against the 4px baseline grid at every breakpoint.
67. Cursor changes appropriately (pointer vs. default vs. text) on every interactive element.
68. Selection color (text highlight) is themed to the Accent color.

**Trust & content integrity (69–80)**
69. A visible, dated changelog.
70. A real status page linked from the footer.
71. Every metric shown publicly is real and sourced, everywhere, not just the landing page.
72. Legal pages lead with a plain-language summary before the full text.
73. The FAQ answers real objections from actual support conversations once they exist.
74. Testimonials, once real, always link to a real, checkable source.
75. Pricing page states exactly what happens at usage overage.
76. Cancellation is genuinely simple and stated plainly.
77. Support response-time commitments are real SLA numbers, never marketing language.
78. The widget's fallback response is honest about not knowing, never a vague deflection.
79. Data export is available and easy to find.
80. Contact form confirms receipt immediately and states a real expected response window.

**Performance & engineering-adjacent details (81–90)**
81. Hero and above-the-fold content load with a considered font-display strategy.
82. The Grounding motif's converge animation is gated behind IntersectionObserver and viewport-width checks.
83. Images served at the size they're displayed at.
84. Below-the-fold images and sections lazy-load.
85. The live demo widget fails gracefully to a static screenshot with a "try it on the next page" link if the sandbox is unreachable.
86. Analytics/tracking scripts never block first paint.
87. Dashboard data fetches show the skeleton state within 100ms if data hasn't arrived.
88. Copy-snippet code blocks wrap or scroll cleanly on narrow viewports, never overflow horizontally.
89. Every animation respects `prefers-reduced-motion`.
90. Third-party embeds are sandboxed so a slow script can't block primary page interactivity.

**Small human touches (91–100)**
91. The widget-goes-live success moment is genuinely satisfying without being juvenile — no confetti, no mascot, just the Grounding motif landing.
92. Onboarding step copy uses "you/your" consistently.
93. Empty states are framed as an invitation to act, never an apology.
94. The command palette includes a genuinely helpful "recently viewed" section, not just search.
95. Keyboard shortcut hints appear in tooltips for power-user actions, discoverable but not forced on new users.
96. The dashboard's Answer Confidence module links directly to the specific unanswered questions behind a low score.
97. Team invite emails are written in the same tone-of-voice register as the rest of the product.
98. The API keys page shows a key exactly once at creation, then only the last four characters — enforced in the UI, not just stated in copy.
99. Billing invoices are downloadable as clean, branded PDFs, not a raw HTML table.
100. Nothing in the product ever says "Oops."

---

## Section 29 — Build Priority Map

Absent from the draft entirely — 24 sections and 100 numbered items with no priority tier is a real usability failure for whoever implements this under a deadline. This uses a generic P0/P1/P2 scheme as a stand-in; **it needs to be reconciled with the engineering team's actual Hard-Freeze / Soft-Freeze / Future-Freeze phase names**, which weren't available for this pass (see Section 30).

**P0 — blocks launch:**
Color system, typography, spacing/grid, core components (buttons, inputs, cards, states matrix), the landing page's Hero → Live Demo → Pricing Preview → Final CTA path, the full Pricing page, a minimal Dashboard (hero metric + Usage module + activity feed), the Widget's install flow *and* its citation/confidence surface, baseline accessibility (Section 18), and the honest-by-default footer (status link, minimal legal, no fabricated proof sections).

**P1 — near-term, post-launch:**
The rest of the Dashboard (Answer Confidence module, command palette, workspace switcher), all of Section 15's Additional Application Surfaces, the Trust Center hub, the Methodology page, the transactional email system, dark-mode polish across every surface, SSO/SAML flow.

**P2 — future:**
Case Studies (once real customers exist), full blog visual-system polish, the paid-traffic landing variant, the micro-tilt and device-frame depth polish, the scroll-return Grounding re-trigger, the Founding Customer program (pending Section 30's business decision), route-transition polish beyond the baseline crossfade.

---

## Section 30 — Open Decisions & Validation Tasks

Items in this document that are deliberately not fully locked, and why:

1. **Founders Grotesk vs. Space Grotesk fallback (Section 4).** Pending a licensing-budget decision from whoever owns procurement. Design ships correctly either way; engineering needs the answer before the display face is wired in.
2. **Oxblood as the sole accent (Section 3).** Chosen deliberately to avoid every AI-category and crypto cliché in the category, but a deep wine tone risks reading as law-firm/insurance rather than technology at a glance. Recommend a quick perception check (five-ish people, "what industry does this look like") before final lock.
3. **Dashboard header hierarchy (Section 13).** The one-hero-metric-plus-Usage-module default is a reasoned compromise, not tested data. Validate against real support-lead task frequency once usage data exists, and be willing to revise.
4. **Founding Customer program (Section 8, 11).** A legitimate replacement for fake urgency, but it requires a real commitment from Product/Business before Design specs it further — don't build the UI for a promise that isn't actually going to be honored.
5. **Front-end framework/stack.** Explicitly out of scope — an engineering call, not a design one.
6. **Reconciliation with Design Freeze V1 and current-site screenshots.** Neither was available for the original draft or this merge. If V1 made decisions this document contradicts, reconcile before implementation — don't let engineering silently pick whichever document it reads last.
7. **Build Priority Map (Section 29).** Uses a generic P0/P1/P2 scheme; needs mapping onto engineering's actual freeze-phase taxonomy, which wasn't available for this pass.

---

## Section 31 — Handoff Notes

- **The one thing to protect above everything else if time runs short:** the Grounding motif's restraint — three full appearances plus the one narrow scroll-return exception, stillness at rest, no ambient idle motion anywhere else in the product. Every other section here can be executed at 80% and the product still feels considered. If that restraint gets diluted into "let's add a bit more animation everywhere," the system drifts back toward exactly what this document was written to move away from.
- **The second thing to protect:** the visitor-facing citation/confidence component (Section 10, 14). It's the cheapest, highest-leverage fix to come out of this merge — it turns the entire brand claim into something a visitor can verify themselves in seconds, and it was completely missing from the original draft despite being the actual differentiator.
- **Pre-launch honesty constraint, worth repeating because it's the easiest rule to break under deadline pressure:** any section referencing customer logos, testimonials, or metrics ships empty or omitted until the underlying numbers are real. This is restated a third time across this document on purpose.
- **This document is now the single source of truth.** It supersedes the V2 draft and the standalone critique pass — implementers should not need to cross-reference either of those documents; anything worth keeping from them is already merged in above.
