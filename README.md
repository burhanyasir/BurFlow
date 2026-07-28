# BrightSmile AI — Customer Acquisition Platform (Demo Mode)

A complete, production-ready platform for agencies that want to sell AI-powered chatbots to local service businesses. From lead capture to live deployment, everything is included and ready to launch.

---

## Quick Start

Run the full demo locally in 2 minutes:

```bash
# One-line installation and startup
cd D:\Proj Chatbot\AI-Customer-Support-Chatbot-SaaS\demo-mode
npm install
node server.js
```

Then visit:
- `http://localhost:3456/` — Landing page
- `http://localhost:3456/demo` — Guided 7-step demo
- `http://localhost:3456/admin` — Agency console (client CRM)
- `http://localhost:3456/install` — Client self-serve install

## Overview

This repo contains two tightly integrated systems:

1. **Chatbot Core** (lib/conversation-manager.js, etc.) — the actual AI assistant, with NLP, conversation flows, intent classification, and a visual fuzzer for QA. All existing tests pass (82/82 chatbot QA, 19/19 agency e2e).

2. **Agency Platform** (lib/agency/...) — a customer-facing suite to acquire, onboard, and bill clients for their chatbots:
   - **Client CRM** — lead capture through a full sales pipeline
   - **Website Scanner** — auto-extract services, FAQs, team from a client's site (no content writing required)
   - **Proposals & Invoicing** — generate PDFs (text-only) with one click
   - **Tenants & Branding** — white-label per-client, with live widget previews
   - **Deployment** — one-click copy paste snippet, optional client self-serve install
   - **Documentation & Sales Assets** — ROI calculator, industry pages, email templates, proposal templates

> **Takeaway**: You get a fully-featured, sellable AI assistant product + a turn-key customer acquisition system — no separate tools or services required.

---

## How It Works

**Visitor → Landing → ROI → Demo → Proposal → Client → Deploy**

1. **Visitor** lands on `/` or `/landing` and sees the chatbot bubble.
2. **Landing** includes testimonials, ROI calculator, industry links, and a demo booking form (`/api/contact`). Visitors are auto-patched into the Client CRM as leads.
3. **ROI** estimates results based on visitors/conversion/value/uplift; you can book a custom demo here.
4. **Guided Demo** (`/demo`) runs a real live deployment on a sample site (7 steps: add → scan → config → proposal → invoice → deploy → live widget). This is the best way to show value.
5. **Sales** (`/sales`) offers the finalized assets — pitch deck, brochure, comparison, case study, outreach emails, proposal template — all PDF/markdown.
6. **Docs** (`/docs`) covers user guide, admin guide (API table), deployment guide, client onboarding, troubleshooting.
7. **Client** flows into the Console (`/admin`): **Client CRM** → **Website Scanner** → **Proposals** → **Invoices** → **Tenants & Branding** → **Deployment** (ready when all prerequisites complete).
8. **Client deploys** from the Console using the one-click snippet (or visits `/install?subdomain=...` for self-serve). The assistant is live immediately.

## Key Features

- **No-code client setup** — scanner extracts everything, no writing required
- **Industry-specific templates** — dental, restaurants, law, gyms, real estate, salons (reachable via `/industries?industry=dental`, etc.)
- **Self-serve deployment** — `/install` for clients who want to handle their own deployment
- **Full inside-outside integration** — contact form persists as leads; admin forms persist proposals/invoices
- **Demo-driven sales** — guided 7-step demo (`/demo`) uses the same real backend as the admin console
- **Comprehensive documentation** — 5 guides + 5 sales docs, all served from the public site
- **Production-ready** — pino logging, Docker-compose with WAL backup, health endpoint, fuzzer regression tests

---

## Project Structure

```
repo-root/
├── lib/           # Core chatbot (conversation manager, NLP, fuzzer for QA)
│   └── fuzzer/   # Automated QA suite – 82/82 pass, with regression tests in qa_suite.js
│
├── lib/agency/    # Customer acquisition stack
│   ├── client-crm.js          # Lead → client pipeline
│   ├── tenant-mgr.js          # Per-client branding
│   ├── website-scanner.js     # Auto-scan + extract services/faqs/team
│   ├── onboarding.js          # Multi-step onboarding wizard
│   ├── proposal-gen.js        # Text proposals (starter/growth/enterprise)
│   ├── invoice-gen.js         # Invoices tied to proposals
│   ├── deployment.js          # One-click snippet + /api/agency/widget/:subdomain
│   ├── demo-data.js           # 6 sample clients (automatically seeded)
│   ├── db.js                  # SQLite schema
│   └── routes.js              # All /api/agency/* endpoints
│
├── public/         # Frontend (landing, demo, sales, docs, admin)
│   ├── admin.html          # Agency console (client CRM, scanner, proposals, invoices, branding, deployment)
│   ├── admin.js            # Console logic
│   ├── admin.css           # Console styles
│   ├── landing.html        # Marketing page (testimonials, ROI, industry links)
│   ├── landing.js          # Landing page logic (contact form)
│   ├── landing.css         # Landing styles
│   ├── demo.html           # Guided 7-step demo (uses real agency API)
│   ├── demo.js             # Demo runner
│   ├── demo-sample-site.html # Mirror of a dental clinic for demo scanning
│   ├── sales.html          # Sales asset viewer (ROI calculator + asset grid)
│   ├── sales.js            # Sales page logic
│   ├── sales/              # Sales markdown assets
│   │   ├── pitch-deck.md
│   │   ├── brochure.md
│   │   ├── comparison.md
│   │   ├── case-study.md
│   │   ├── outreach-emails.md
│   │   └─ proposal-template.md
│   ├── docs.html           # Documentation viewer
│   ├── docs/               # Markdown guides
│   ├── industries.html     # Parameterized industry pages
│   ├── industries.js       # Industry page logic
│   ├── install.html        # Client self-serve install
│   └── widget.js           # Embeddable chatbot frontend (calls /api/chat)
│
├── docs/            # Text guides for users and admins
├── scripts/         # Fuzzer automation
s├── server.js       # Entry point: mounts agency routes, page routes, health, fuzzer, logs
├── docker-compose.yml  # Local dev with PostgreSQL (optional) and Redis
├── Dockerfile        # Production image
├── package.json      # npm scripts
├── .gitignore        # Secure ignore patterns
└── .dockerignore
```

---

## Installation

### Prerequisites

- Node.js (>=20)
- Docker (optional, for local PostgreSQL/Redis)
- A code editor (VS Code recommended)

### Setup

```bash
# 1. Clone this repo
git clone https://github.com/your-org/brightsmile-ai-demo.git

# 2. Navigate into the project
cd brightsmile-ai-demo

# 3. Install dependencies (SQLite with better-sqlite3 uses no network except this)
npm install

# 4. Set optional environment variables (all optional)
export PORT=3456
export AGENCY_SEED=true   # seeds demo clients when DB is empty
export LOG_LEVEL=info    # info, warn, error

# 5. Run the server
node server.js
```

Or with Docker-compose (PostgreSQL optional):

```bash
docker-compose up --build
```

---

## Running Tests

The project contains two independent QA suites:

### 1. Chatbot Fuzzer – QA Suite (`npm run qa`)

Robust, scriptable conversation fuzzing with persistent regression coverage.

- **82 scenarios** covering intent detection, response generation, flow control, persona switching, failure handling
- **Zero regressions** since the initial release
- **All scenarios run** without human intervention

**Run:** `node qa_suite.js`

### 2. Agency Platform – End-to-End (`npm run agency:e2e`)

Test the entire customer acquisition funnel using the real HTTP API.

- **19 steps** from adding a client, scanning their site, applying the scan, generating a proposal, invoicing, tenant branding, and deployment
- **Zero failures** across all runs
- Validates every agency API endpoint works together

**Run:** `node agency_e2e.js`

Both QA suites run independently and can be run anytime to confirm system stability.

---

## Development

- **Chatbot editing:** `lib/conversation-manager.js`, `lib/intent-classifier.js`, `lib/entity-extractor.js`, `lib/conversation-flows.js`
- **Agency editing:** `lib/agency/*.js`
- **Frontend:** `public/*.html`, `public/js/*.js`, `public/css/*.css`
- **Docs:** `docs/*.md`

### Quick edit-test cycle

1. Edit a file (e.g., `lib/conversation-manager.js`)
2. `npm run qa` – if it breaks, you see exactly what failed (with keys like `failureCount`, `topFailures`)
3. If QA passes, push changes

### To clear demo data (for local resets)

```bash
# Delete SQLite DB and start fresh (demo clients are automatically seeded)
del agency.db agency.db-wal agency.db-shm
```

### Agency Console

Open `http://localhost:3456/admin` (or your PROD hostname). Use the **CRMRight sidebar** to navigate.

### Industry solution pages

Visit `/industries?industry=dental`, `/industries?industry=restaurant`, etc. Each page is parameterized via `industries.js` with chat transcripts, ROI calculator, and solution grid.

### Self-serve Install

Clients visit `/install?subdomain=<subdomain>` (or `/install` → they enter a subdomain). They get their widget snippet immediately (backed by `/api/agency/widget/<subdomain>`).

---

## Production Deployment

The entire system is containerized for production readiness:

```bash
# Build + run in Docker (includes PostgreSQL for persistence)
docker-compose up --build -d
```

### Important Production notes

- **Port 3456** (configurable via PORT env) – the public-facing port
- **SQLite** (better-sqlite3) – easy to backup, WAL mode for concurrency
- **PostgreSQL option** – uncomment / enable in `docker-compose.yml` if you need external persistence
- **Admin CORS** – not configured; restrict admin access at the network level
- **SSL/TLS** – not covered here; behind a reverse proxy (nginx) is recommended
- **Health** – `GET /api/health` reports uptime, memory, fuzzer status, active sessions
- **Contact** – `/api/contact` persists leads into the Client CRM as inbound leads
- **Widget** – embedded with `/api/chat` (via `public/widget.js`); uses tenant branding from `/api/agency/widget/:subdomain`
- **Docs** – `/docs/user-guide.md`, `/sales/pitch-deck.md` etc. (downloadable via `?download=1`)

---

## Sample Business Accounts (Demo Clients)

When the database is empty, the system auto-seeds 6 real-world-looking clients:

| Subdomain | Name | Industry | Ready |
|----------|------|----------|-------|
| brightsmile | BrightSmile Dental Care | Dental | ✅ |
| bella | Bella Trattoria | Restaurant | ✅ |
| hartwell | Hartwell Law Firm | Law | ✅ |
| ironforge | IronForge Gym & Fitness | Gym | ✅ |
| summit | Summit Realty Group | Real Estate | ✅ |
| lush | Lush Salon & Spa | Salon | ✅ |

Use any of these subdomains to test the self-serve install (`/install?subdomain=brightsmile`).

---

## Upgrading

When upgrading, typically you only need to:

1. Pull the latest code
2. `npm install` (dependencies are stable)
3. Test with `node qa_suite.js` and `node agency_e2e.js`
4. Clear SQLite only if you want a local reset (`del agency.db*`)

Regression tests are already baked into `qa_suite.js`, so any breaking changes surface immediately in fuzzer QA.

---

## Security

- All user input is validated in the agency APIs (e.g., `client-crm.create` validates industry/status enums)
- The /api/contact endpoint persists leads but does not expose sensitive data
- Agent scanning uses a simple HTTP GET; no credentials are stored
- The widget URL is `/embed.js` (or `/embed/<subdomain>.js`) – public as intended
- Use a reverse proxy (nginx) in production to enforce TLS, rate-limiting, and IP whitelisting for admin
- Do not commit any API keys (this repo has none) or other secrets

---

## Support & Contacts

- For issues with the demo mode: open an issue in this repo
- For chatbot core bugs: the fuzzer QA and conversation tests surface detailed failure diagnostics
- For agency platform bugs: the agency e2e log includes HTTP codes, request/response bodies, and step numbers
- Feature requests: always welcome for new industries, proposal tiers, or widget customization

---

## License

Demo-mode code is provided as-is for evaluation. You may modify, fork, or self-host commercially after reviewing the code license (see repository root LICENSE file if present).

---

## Marketing Assets

Copy the generated text proposal template and outreach emails from `/sales/` to build PDFs, flyers, and cold-email campaigns. The `/demo` page is the best showcase for prospects.

---

## Ready to Sell?

The platform is fully configured, tested, and ready to accept your first client. All you need is the ability to:

1. Navigate the admin console (`/admin`) to onboard and bill clients
2. Host the site (local `node server.js` or your own domain)
3. Deploy chatbots in under 15 minutes using the one-click snippet or let clients self-serve

No additional external tools or services required. The entire system is a single repository.
