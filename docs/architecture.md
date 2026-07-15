# BrightSmile AI — Conversation Engine Architecture

This document describes the internal architecture of the demo-mode conversation
engine: how a user message becomes a reply, how intent recognition is fully
configuration-driven, how the engine is industry-independent, and how to extend
it (new industries, new intents, new analytics).

The engine is a **deterministic, state-machine conversation engine** — not an LLM.
Every behaviour is data-driven and testable.

---

## 1. High-level flow

```
HTTP POST /api/chat
        │
        ▼
conversation-manager.processMessage(sessionId, text)
        │
        ├─ classifyIntent(text, context)        → { intent, route, confidence, suggestions }
        │     (rules live in data/intents.json)
        │
        ├─ dispatch on classification.route
        │     ├─ greeting / decline / confirm / continue
        │     ├─ booking / insurance / pricing / emergency / lead   → workflow engine
        │     ├─ business_info                                    → business-knowledge Q&A
        │     ├─ general                                          → handleGeneralQuestion
        │     └─ unknown                                          → "Did you mean…?" fallback
        │
        └─ conversation-recorder.recordTurn(...)   → analytics
```

All heavy lifting is delegated to modules in `lib/`; all *content* and *rules*
live in `data/`.

---

## 2. Module layout (`lib/`)

| File | Responsibility |
|------|----------------|
| `intent-classifier.js` | Scores the 22-intent taxonomy from `data/intents.json`; returns `intent`, `route`, `confidence`, `suggestions`. |
| `conversation-manager.js` | Per-session state, context, routing/dispatch, fallback & loop handling, greeting/escalation. |
| `conversation-flows.js` | Workflow definitions (booking, pricing, insurance, emergency, lead). Step `prompt`/`process` state machines. |
| `business-knowledge.js` | Data-driven lookup of clinic info, services, FAQs. No hardcoded industry text. |
| `entity-extractor.js` | Extracts services, doctors, dates, times, names, phones, emails, insurance, contact preference. Exposes `SERVICES`. |
| `conversation-recorder.js` | Records turns and computes analytics (incl. fallback / unknown-intent / abandonment rates). |

---

## 3. Intent taxonomy — fully configuration-driven (`data/intents.json`)

Intent recognition contains **no inline keyword rules**. `data/intents.json` is the
single source of truth:

```json
{
  "thresholds": { "lowConfidence": 0.28, "unknown": 0.15, "workflowStart": 0.15 },
  "contextBoost": { "activeWorkflowMultiplier": 1.3, "activeWorkflowAdd": 5, ... },
  "serviceMatch": { "multiBookingWeight": 15, "singleFaqWeight": 8, "singlePricingWeight": 4 },
  "genericSignals": [ { "pattern": "need", "maxLen": 30, "scores": {...} }, ... ],
  "defaultSuggestions": ["appointment_booking", "pricing", "insurance", "business_info"],
  "intents": [
    { "label": "emergency", "route": "emergency", "weight": 20,
      "patterns": ["emergency", "toothache", "pain", ...], "suggest": "Get emergency help" },
    ...
  ]
}
```

Each intent has:
- `label` — canonical taxonomy name (the **22-intent taxonomy**).
- `route` — how the manager dispatches it: `booking | insurance | pricing |
  emergency | lead | business_info | general | greeting | confirm | decline |
  continue | unknown`.
- `weight` — score added per matching pattern.
- `patterns` — regex source strings (case-insensitive).
- `exclude` — if any matches, this intent is suppressed (used so "reschedule my
  appointment" scores `appointment_reschedule`, not `appointment_booking`).
- `suggest` — friendly text used in low-confidence "Did you mean?" hints.

The classifier:
1. Adds `weight` for every matching pattern of every intent.
2. Applies `genericSignals` (linguistic hints like "I need…").
3. Applies `contextBoost` (an active workflow's score is multiplied/added).
4. Uses service-entity matches (from `entity-extractor`) to bias booking/FAQ.
5. Picks the top label; `confidence = topScore / totalScore`.
6. If `confidence < lowConfidence`, attaches `suggestions` (top runners-up).
7. If nothing matches, returns `general` (FAQ) with `defaultSuggestions`.

### Supported taxonomy (22 user intents + system intents)

`greeting, goodbye, small_talk, services, pricing, appointment_booking,
appointment_reschedule, appointment_cancel, doctors, insurance, location, hours,
emergency, payment, faq, lead_capture, contact_request, complaint, thanks,
unknown` — plus the system intents `confirm_workflow`, `decline_workflow`,
`continue_workflow`, and `clarification`.

---

## 4. Industry independence

**The engine contains zero industry-specific literals.** All brand, staff,
services, pricing, hours, and terminology live in configuration.

`data/seed.js` provides the Dental demo (`clinic`, `services`, `faqs`). The
`clinic` object drives every previously-hardcoded value:

```js
clinic: {
  name, address, phone, email, hours,
  rating, paymentProvider, assistantName,
  staff: [{ name, specialty, experience }],
  patientTypes: ["new patient", "existing patient"],
  patientTypeQuestion: "Are you a new patient or an existing patient?",
  serviceAliases: { "child|kid|children|pediatric": "Pediatric Dentistry", ... },
  pediatricServiceLabel: "pediatric dentistry",
  customerLabel: "Patient",   // used in confirmations ("Patient: …")
  clientNoun: "patients",     // used in reputation replies
  // ...
}
```

The same engine serves **Restaurant, Law Firm, Gym, Salon, Real Estate** by
swapping only the `clinic`/`services`/`faqs` config — no code change. See
`data/industries.js` for working Restaurant and Law Firm examples (verified by
`test_industry.js`).

Key design points:
- The `appointment_booking` flow's `visit_type` step (new/existing *patient*) is
  skipped automatically when `clinic.patientTypes` is empty (e.g. a restaurant).
- `customerLabel` ("Patient" / "Guest" / "Client") and `clientNoun`
  ("patients" / "guests" / "clients") remove all hardcoded "patient" wording.
- `serviceAliases` map free-text ("child", "existing") → canonical service names.

---

## 5. Workflows (`lib/conversation-flows.js`)

Each workflow is a step machine: `initialState` + `steps[step].prompt/process`.
The manager drives a workflow via `processToCompletion`, collecting
`state.collected` (service, date, time, name, contact, etc.) and emitting a
`generateConfirmation` on completion. Workflows are generic enough to cover
appointment-like industries; `business_info` Q&A is satisfied entirely by the
knowledge base.

---

## 6. Analytics (`lib/conversation-recorder.js`)

`computeAnalytics()` returns conversation-level and turn-level metrics, including
the spec-required:

- `fallbackCount` / `fallbackRate` — turns where the bot gave a generic
  catch-all or low-confidence reply.
- `unknownIntentTurns` / `unknownIntentRate` — share of turns the engine could
  not confidently classify.
- `abandonedConversations` / `abandonmentRate` — conversations that started a
  workflow but never reached a completion.

Exposed at `GET /api/admin/analytics`.

---

## 7. Extending the engine

### Add a new industry
1. Create a config object `{ clinic, services, faqs }` (mirror `data/seed.js`).
2. Pass it to `createConversationManager(config)`.
3. No engine code changes required.

### Add a new intent
1. Add an entry to `data/intents.json` `intents` with `label`, `route`,
   `weight`, `patterns`, `suggest`.
2. If the route is new, handle it in `conversation-manager.js` dispatch.
3. Add QA scenarios in `qa_suite.js`.

### Add an analytics metric
1. Capture the needed signal in `recordTurn` (e.g. `turn.wasFallback`).
2. Aggregate it in `computeAnalytics`.

---

## 8. Testing

- `node qa_suite.js` — 82 regression scenarios (conversation behaviour).
- `node agency_e2e.js` — 19 end-to-end agency flow checks.
- `node test_industry.js` — proves industry independence (Restaurant + Law Firm).

Run all three after any engine change; they must stay green.
