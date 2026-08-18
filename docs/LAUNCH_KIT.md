# BurFlow Launch Kit

Ready-to-publish launch copy for the BurFlow public release.

**Product:** BurFlow — an autonomous AI sales agent for B2B SaaS that scans your
website, learns your products and pricing, qualifies visitors in real time, and
books demos automatically.

**Launch URL:** https://burflow.vercel.app
**Social image:** `frontend/public/og-image.png` (1200×630)

---

## 1. Product Hunt

### Tagline

> The AI sales agent that turns website traffic into booked demos — automatically.

### Product description

BurFlow is an autonomous AI sales agent for B2B SaaS. It scans your live
website, learns your products, pricing, and buyer paths, then greets every
visitor with grounded answers — recommending the right plan, flagging buying
intent, and moving people toward a booked demo while the intent is still hot.

**No training. No spreadsheets. No dead-end chat.**

- **Scans your site automatically** — products, pricing, services, and FAQs are extracted for you. Live in under 10 minutes.
- **Qualifies every visitor** — BurFlow recommends the right offer and captures demand the moment it appears.
- **Grounded, never hallucinated** — answers come from your own content. Your data is never used for training.
- **Built to convert** — visitors self-qualify and book demos, 24/7, with seamless handover to your human reps.

Teams are seeing 2–5× more qualified conversations and 34% higher demo
conversion from site visitors — while saving ~12 hours a week on repetitive
follow-up.

Free to start: scan one site and see it live in minutes. No credit card required.

**Pricing:** Free · $49 · $99 · Enterprise

### First comment (self-post)

> Hi Product Hunt! I'm the founder of BurFlow.
>
> We started with a simple frustration: most website chatbots answer questions
> but never *do* anything. Visitors chat, leave, and the pipeline stays empty.
>
> BurFlow flips that. Point it at your website, and it builds a sales agent
> that knows your offer better than most of your SDRs — then it qualifies
> visitors and books demos on its own.
>
> What we're proudest of:
> - **Zero setup training.** If your website is accurate, the agent is accurate. Run a scan and go live in one afternoon.
> - **No data training.** Your content stays yours — used only to answer your visitors.
> - **It works for the long tail.** Pricing questions, objections, plan recommendations — all handled in-chat, with real next steps.
>
> The free tier includes a full site scan and 100 messages/month. I'll be here
> all day to answer anything — including how we handle grounding, handover to
> human reps, and what the roadmap looks like. 🚀

---

## 2. Twitter / X Launch Thread

> 1/ The average SaaS website wastes 98% of its traffic.
> Visitors arrive ready to buy — then get a generic chatbot or a "Contact us" form.
>
> We built BurFlow to fix that. An AI sales agent that turns traffic into booked demos. 🧵

> 2/ Point BurFlow at your website.
> It scans your products, pricing, and buyer paths — no training data, no spreadsheets, no "knowledge base setup" week.

> 3/ Every visitor now gets a rep that actually knows your offer:
> ✅ Grounded answers from your own site
> ✅ Plan recommendations & pricing guidance
> ✅ Buying-intent detection in real time
> ✅ Demo booking — done in chat, 24/7

> 4/ The results teams see after switching:
> 📈 2–5× more qualified conversations
> 🎯 34% higher demo conversion from site visitors
> ⏱ ~12 hrs/week saved on repetitive follow-up

> 5/ Live in under 10 minutes. Scan one site free — no credit card.
> burflow.vercel.app

---

## 3. LinkedIn Company Page Launch Post

> **Your website is already your best salesperson — it just needs the right agent.**
>
> Most B2B SaaS sites lose qualified visitors every single day. They land on your pricing page, get an answer nowhere, and leave. That's the gap BurFlow closes.
>
> BurFlow is an autonomous AI sales agent that:
>
> - **Scans your live website** and learns your products, pricing, and buyer paths — no manual training
> - **Qualifies visitors in real time**, recommending the right plan and flagging buying intent
> - **Books demos automatically** in-chat, 24/7, with seamless handover to your team
> - **Answers from your own content only** — your data is never used for training
>
> Teams using BurFlow are seeing 2–5× more qualified conversations and 34% higher demo conversion from site visitors — while saving roughly 12 hours a week on follow-up.
>
> The best part? You can be live in under 10 minutes. Run a free scan, paste the snippet, and watch your website start selling.
>
> 👉 Start free: https://burflow.vercel.app

---

## 4. Reddit Launch Posts

### r/SaaS

**Title:** I built an AI sales agent that books demos from website traffic — no training data required

**Post:**

> Hey r/SaaS,
>
> TL;DR: BurFlow scans your website, learns your product and pricing, and
> qualifies + books demos for visitors automatically. Live in <10 minutes, no
> training, free tier available.
>
> **The problem I kept seeing:** SaaS sites pay for traffic, then lose almost
> all of it to a generic chatbot or a contact form. The visitor is ready to
> buy — and nobody asks.
>
> **What I built:** An AI agent that reads your site (products, pricing,
> FAQs), then talks to every visitor like a rep who knows the offer:
>
> - Grounded answers from your own content only — no hallucinated pricing
> - Detects buying intent and recommends the right plan
> - Books demos in-chat, 24/7, and hands off to your humans
> - No documents to upload, no training sessions, no spreadsheets
>
> **Real numbers from current users:** 2–5× more qualified conversations, 34%
> higher demo conversion from site visitors, ~12 hrs/week saved on follow-up.
>
> Free tier: full site scan + 100 messages/month. No credit card.
> https://burflow.vercel.app
>
> Happy to answer anything — how grounding works, what "autonomous" really
> means here, failure modes, or the roadmap. Honest feedback very welcome.

### r/ArtificialIntelligence

**Title:** [P] An autonomous AI agent that sells: scans a B2B website and books demos for visitors

**Post:**

> Wanted to share a system I've been building — an autonomous sales agent that
> combines a website crawler, a retrieval/grounding layer, and an
> intent-qualification + booking pipeline.
>
> **How it works:**
> 1. **Scan** — BurFlow crawls a company's live website and extracts products,
>    pricing, and buyer paths into a structured offer map.
> 2. **Grounding** — every answer is generated against the site's own content;
>    the agent cites what it knows and doesn't guess.
> 3. **Qualification** — conversation signals (plan interest, objection
>    handling, pricing questions) are scored into buying intent in real time.
> 4. **Conversion** — high-intent visitors get a clear path to book a demo in
>    chat, with handover to a human rep.
>
> **Design choices I'd love feedback on:**
> - **RAG with a site-first constraint**: the source of truth is the customer's
>   website, not uploaded documents. Simpler setup, but harder when sites are
>   messy.
> - **Intent scoring in-chat** instead of post-hoc analytics, so the agent can
>   act on intent immediately.
> - **No training on customer data** — the model layer never learns from the
>   content it serves.
>
> Live at https://burflow.vercel.app — free site scan, no credit card.
> Happy to discuss the architecture, failure cases, and where this falls short
> today. Thanks for reading!