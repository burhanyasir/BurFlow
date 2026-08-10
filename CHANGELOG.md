# Changelog

## 2026-08-10 — Stabilization & Live Experience

### 📌 Release Summary
This release focuses on platform stability, complete Knowledge Base feedback loops, real-time live chat operator capabilities, and Docker image alignment for the canonical frontend dashboard.

---

### 🛠️ Key Improvements & Feature Additions

#### 1. Widget Customizer & Conversation Detail Realignment (`3d47ece`)
- **Customizer Save Alignment:** Fixed `starterOptions` schema mismatch in `WidgetDashboard.tsx`, resolving `400 Bad Request` errors on saving configurations.
- **Tokenless Embed Snippet:** Embed snippet now uses a runtime bootstrap model (`GET /api/widget/public-token?tenantId=...`) with `data-tenant-id`, removing hardcoded 24h JWT expiration issues.
- **Structured Detail Contract:** Upgraded `GET /api/admin/sessions/:id` to transform raw message rows into structured `turns` with intelligence metadata, eliminating detail page runtime errors.

#### 2. Knowledge Base Gap Detector & UI (`6c68243`)
- **Chat-Time Degradation Tracking:** Exposed `isFallback` across the pipeline whenever the LLM brain degrades or falls back to heuristics.
- **Automatic Gap Persistence:** Unanswered or low-confidence visitor questions are recorded at chat time without interrupting the visitor turn.
- **1-Click Conversion Modal:** Added `POST /api/knowledge/unanswered/:id/convert` and a quick-convert modal in `KnowledgeDashboard.tsx` to turn gaps into FAQs and resolve duplicate queries tenant-wide.
- **Package Consolidation:** Deprecated `admin-portal` and `admin-dashboard` in favor of `frontend/`.

#### 3. Real-Time Human Handoff & Visitor Delivery (`4387e93`)
- **Operator Attribution:** Added `sender` (`'agent'` | `'bot'`) column to the `messages` table via idempotent database migration.
- **Live Incremental Polling:** Introduced public endpoint `GET /api/chat/history?sessionId=&after=` and a 4-second polling loop in `chat-ui.ts`.
- **Distinct Agent Bubbles:** Operator messages sent from `AgentInboxPage` render dynamically in the visitor widget styled with distinct `👤 AGENT` badges.

#### 4. Docker Build Stack Alignment (`31d5ec6`)
- **Canonical Dashboard Docker Image:** Updated `engine/Dockerfile.frontend` and `docker-compose.yml` to build `frontend/` with proper build-time `ARG VITE_API_URL`.

---

### 🗄️ Database Migration Note
The additive schema update executes automatically on application boot via `saas-core` (wrapped in an idempotent `try/catch`, so it is safe to re-run on every boot):

```sql
ALTER TABLE messages ADD COLUMN sender TEXT CHECK (sender IN ('agent','bot'));
```
