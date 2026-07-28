# Tier 2 — Consolidation & Hardening Backlog

**Priority:** Medium (mixed P1–P3)
**Labels:** `tier-2`, `tech-debt`, `pattern-matching`, `knowledge-base`, `buying-signals`

## Items

### 1. [P1] Unify buying-signal detection (Policy Engine + Brain)

`policy-engine.ts` originally had its own `BUYING_SIGNAL_PATTERNS` (removed in Tier 1, now imports `detectBuyingSignal` from planner). `conversation-planner.ts` has two separate systems:

- **`BUYING_PATTERNS`** (line 35) — used in `detectCustomerIntent` to return `'buying'` intent classification (lines 115, 168). Still active, not dead code.
- **`SIGNAL_REGEXES`** (lines 44–57) — used by `detectBuyingSignal` for the policy engine's buying-score system.

These overlap semantically but are unaligned. A word that triggers one may not trigger the other.

**Deliverable:** Decide whether to consolidate `BUYING_PATTERNS` into `SIGNAL_REGEXES` (making intent classification and buying-score detection use the same signal set), or keep them separate as intentional decoupling. If consolidate, ensure `detectCustomerIntent`'s `'buying'` return value still fires correctly for all real buying-language inputs.

**Files:**
- `packages/conversation-orchestrator/src/conversation-planner.ts` (lines 35, 44–78, 115, 168)
- `packages/saas-api/src/orchestrator/policy-engine.ts`

---

### 2. [P1] Per-tenant knowledge base gap

The conversation engine has **two** hardcoded knowledge stores — both shared across all tenants, both need to become per-tenant.

**Primary target: `TOPIC_RESPONSE_TEMPLATES`** (`conversation-brain.ts:608`) — a `Record<DiscernedTopic, string[]>` mapping each topic to 5 depth levels of curated conversation scripts with personalization hooks (e.g., `"Your team of {companySize} might want Professional"`). This is what drives actual user-facing responses. This is the real gap.

**Secondary target: `DOCUMENTED_KNOWLEDGE`** (`orchestrator.ts:18`) — a `Record<string, { answer: string; sources: string[] }>` of flat Q&A pairs (return policy, pricing tiers, SSO, etc.). This IS executed every turn (via `orchestrateTurn` → `processConversationIntelligence` → `processConversationBrain`), but its outputs (`sources`, `isFallback`) are never read downstream. It runs but produces nothing consumed. See item 9.

**Why this is P1 (higher priority than fuzzy matching below):** There is zero per-tenant KB, not just imprecise matching. A tenant cannot add their own product docs or response scripts. This blocks production SaaS.

**Fix:** Introduce a `KnowledgeBaseProvider` interface. Pass it through `BrainInput.knowledgeBaseProvider` (no global state). The brain uses provider with fallback to hardcoded `TOPIC_RESPONSE_TEMPLATES` when provider returns null. New `topic_response_templates` SQL table + repository for per-tenant storage.

**Files:**
- `packages/conversation-orchestrator/src/conversation-brain.ts`
- New: `packages/conversation-orchestrator/src/knowledge-base-provider.ts`
- New: `packages/saas-core/src/db/migrations/XXX_add_topic_response_templates.ts`
- New: `packages/saas-core/src/db/topic-response-repository.ts`
- `packages/saas-api/src/routes/chat.ts`
- `packages/saas-api/src/orchestrator/pipeline.ts`

---

### 3. [P2] Fuzzy/stem matching for DOCUMENTED_KNOWLEDGE

Current KB matching is exact-match only (`topicArray.find(t => t.topic === topic)`). A user asking about "pricing plans" won't match "pricing" topic. A user asking about "ticket management" won't match "features" topic.

**Fix options:**
- (a) Stem-based matching (e.g., `natural` library's `PorterStemmer`)
- (b) Levenshtein distance with threshold (simple, no deps)
- (c) Embedding-based semantic search (overkill until per-tenant KB exists)

**Depends on:** Item 2 (per-tenant KB) — no point fuzzy-matching a hardcoded shared KB.

---

### 4. [P2] LEARNING_PATTERNS vs EVALUATING_PATTERNS collision at turnCount < 2

`"what are your prices?"` at turn 0–1 matches `LEARNING_PATTERNS` before `EVALUATING_PATTERNS`.

**Current behavior:** classified as `'learning'` at turn 0–1, correctly as `'evaluating'` from turn 2+. Benign — both map to `answer_question` in `chooseGoal`. However, if anything branches on `customerIntent` directly (analytics, lead-scoring, CRM tagging, funnel-stage override) instead of `chooseGoal`'s output, this causes misclassification.

**Audit requirement:** Verify all downstream consumers read `goal` or `strategy`, not raw `customerIntent`. If any read `customerIntent` directly, fix those first.

**Fix options:**
- (a) Move `LEARNING_PATTERNS` unconditional check after `EVALUATING_PATTERNS` unconditional
- (b) Narrow `LEARNING_PATTERNS` to exclude pricing-language triggers

**Existing test:** `conversation-brain.test.ts:468` documents current behavior.

---

### 5. [P2] GROWTH_SIGNAL / VALUE_SIGNAL false-positive source

`GROWTH_SIGNAL_REGEX = /\b(enterprise|upgrade|scale|grow)\b/i` and `VALUE_SIGNAL_REGEX = /\b(reduce (ticket|support|cost)|improve (response|satisfaction|csat))\b/i` match non-buying context (e.g., "how do we scale our engineering team", "reduce cost of goods").

**Current behavior:** Benign at policy level (score ≥ 60 + trust gate blocks false CTA). Inherited from old `BUYING_SIGNAL_PATTERNS`.

**Fix options:**
- (a) Remove `grow`, `scale` from GROWTH_SIGNAL_REGEX (biggest FP sources)
- (b) Add SaaS-context guard to VALUE_SIGNAL_REGEX (require adjacent SaaS nouns)

---

### 6. [P3] Long-distance negation gap (>40 chars)

`isNegatedBefore` uses a 40-character lookback window before each signal word. Negation words >40 chars before the signal are missed (e.g., "I told you yesterday that I am absolutely not interested in any way, shape, or form in your pricing" — "not" is ~52 chars before "pricing", returns false positive).

**Current behavior:** Benign at policy level due to score gate. Documented as a known limitation in the commit.

**Fix options:**
- (a) Accept as documented limitation
- (b) Increase window to 60–80 chars (reduces FP without full parse, increases FN risk)
- (c) Implement full-sentence negation-scope parse (brittle, high complexity)

---

### 7. [P3] Cross-cutting pattern-matching audit

Audit all places where two independent systems pattern-match the same semantic intent:

- `rapport-repair.ts` has its own `GREETING_PATTERNS` / `SMALL_TALK_PATTERNS` — `conversation-planner.ts` has its own. Are they in sync?
- `policy-engine.ts` has `TRUST_QUESTION_PATTERNS` — any parallel in the brain?
- `conversation-validator.ts` has `GREETING_PATTERNS` / `FAREWELL_PATTERNS` — overlaps with `planner.ts` (see item 8).
- Any other duplicated regex lists?

**Deliverable:** Audit report. If >2 duplications found, create a shared `patterns.ts` module.

---

### 8. [P3] GREETING / FAREWELL consolidation (planner.ts ↔ validator.ts)

**Already approved as a small follow-up.** `conversation-planner.ts` and `conversation-validator.ts` each define their own `GREETING_PATTERNS` and `FAREWELL_PATTERNS`. These have drifted apart — `validator.ts` may be missing patterns that `planner.ts` has.

**Fix:** Extract shared patterns into a single source of truth (possibly under item 7's shared module).

**Files:**
- `packages/conversation-orchestrator/src/conversation-planner.ts`
- `packages/conversation-orchestrator/src/conversation-validator.ts`

---

### 9. [P3] DOCUMENTED_KNOWLEDGE — dead outputs or missing consumer

`DOCUMENTED_KNOWLEDGE` in `orchestrator.ts` is read every turn (via `orchestrateTurn` → CI → brain). Its `responseText`, `sources`, and `isFallback` are set in `OrchestratedTurnResult`, threaded through `ConversationIntelligenceResult.sources` / `.isFallback`, but **nothing downstream reads either field**. The pipeline uses `brainOutput.responseText` from `buildTopicResponse` (TOPIC_RESPONSE_TEMPLATES), never the orchestrator's responseText.

Two possibilities — triage on pickup:
- (a) **Dead code** — the orchestrator's knowledge lookup is vestigial. Remove `DOCUMENTED_KNOWLEDGE` + the fallback path in `orchestrateTurn`.
- (b) **Missing consumer** — the `sources` and `isFallback` fields were intended for citation display or fallback tracking but never wired. If so, add a consumer before removing.

**Files:**
- `packages/conversation-orchestrator/src/orchestrator.ts`
- `packages/conversation-orchestrator/src/conversation-intelligence-service.ts`
- `packages/conversation-orchestrator/src/conversation-intelligence-types.ts`

**Already approved as a small follow-up.** `conversation-planner.ts` and `conversation-validator.ts` each define their own `GREETING_PATTERNS` and `FAREWELL_PATTERNS`. These have drifted apart — `validator.ts` may be missing patterns that `planner.ts` has.

**Fix:** Extract shared patterns into a single source of truth (possibly under item 7's shared module).

**Files:**
- `packages/conversation-orchestrator/src/conversation-planner.ts`
- `packages/conversation-orchestrator/src/conversation-validator.ts`

---

## Acceptance Criteria

- [x] 1. Consolidation decision made (merge `BUYING_PATTERNS` into `SIGNAL_REGEXES` or document intentional separation) — **Done:** `BUYING_PATTERNS` aligned to match `BUYING_SIGNAL_REGEX` minus `try it`; `detectBuyingIntent()` with negation awareness added. Committed `84b9e7e`.
- [x] 2. Per-tenant `KnowledgeBaseProvider` designed and wired into brain — **Done:** `KnowledgeBaseProvider` interface + `DefaultKnowledgeBaseProvider` in orchestrator, `DbKnowledgeBaseProvider` in saas-api, wired through `BrainInput` pipeline. Committed `47791e2` + `8a6baac`. 491/491 regression passing.
- [x] 3. Fuzzy/stem matching evaluated and implemented (or deferred until item 2 is done) — **Done in two passes:**
  - **Pass 1 (commit `a805c26`):** `simpleStem()` function added to `orchestrator.ts` with stem-aware token overlap as 4th matching strategy for `DOCUMENTED_KNOWLEDGE`. Routing guard prevents false positives. 13 new tests.
  - **Pass 2 (this commit):** Architecture audit revealed `orchestrator.ts`'s `DOCUMENTED_KNOWLEDGE` path is **dead output** — its `sources`/`isFallback` values run but are never read downstream (see item 9). The live path uses `TOPIC_RESPONSE_TEMPLATES` via `buildTopicResponse()` → `KnowledgeBaseProvider`. Stemmer and fuzzy matching were **ported to the live path**:
    - `simpleStem()` moved to `knowledge-base-provider.ts` (shared, exported).
    - `DefaultKnowledgeBaseProvider.resolveTopic()` and `DbKnowledgeBaseProvider.resolveTopic()` implemented using `fuzzyResolveTopic()` helper with `TOPIC_KEYWORDS` map (14 topic categories).
    - `buildTopicResponse()` in `conversation-brain.ts` calls `resolveTopic()` when exact `getTopicResponse()` returns null.
    - `processConversationDirector()` calls `resolveTopic()` when `discernTopics()` regex returns empty, so fuzzy-matched topics propagate into `strategy.topicToAnswer`.
    - Multi-word keyword matching (e.g., "active directory" → sso) and ≥3 char substring guard to prevent short-token false positives.
    - 19 new live-path tests prove `processConversationBrain()` returns topic-relevant responses for regex-miss queries like "data protection" → security, "single sign on" → sso, "webhook endpoint" → api, "embed code" → integrations.
    - 1578/1590 passing (+19), same 12 pre-existing failures, zero regressions.
- [x] 4. `LEARNING_PATTERNS` collision resolved; downstream `customerIntent` consumers audited — **Done:** Removed `&& memory.turnCount > 1` guard from `EVALUATING_PATTERNS` check in `conversation-planner.ts:128`, making it fire unconditionally before `LEARNING_PATTERNS`. This ensures any query with evaluating/pricing/feature language (e.g. "what are your prices" at turnCount=0) correctly returns `'evaluating'` instead of `'learning'`. No problematic edge cases found — every query matching both patterns IS evaluative. Test at `conversation-brain.test.ts:464` flipped from `'learning'` → `'evaluating'`. 1565/1577 passing, zero regressions.
- [x] 5. GROWTH/VALUE false-positive source tightened or documented — **Done (documentation only):** Analyzed `GROWTH_SIGNAL_REGEX` (`\b(enterprise|upgrade|scale|grow)\b`) and `VALUE_SIGNAL_REGEX` (`\b(reduce (ticket|support|cost)|improve (response|satisfaction|csat))\b`) in `conversation-planner.ts:47-51`. Impact of a false positive is low — single firing adds +25 to `buyingIntentScore` (need 3 to trigger `booking`), and CTA/qualification gates (trustScore≥50, value delivered, etc.) prevent premature escalation. No real production conversation data available to measure actual false-positive rate (test corpus is synthetic). Tightening without data would risk reducing recall on legitimate growth/value signals with no evidence of current harm. **Revisit:** This decision must be reviewed once real production conversation logs are available to check actual false-positive rates against.`
- [x] 6. Long-distance negation gap documented in known-limitations — **Done (documentation only):** `isNegatedBefore` in `conversation-planner.ts:62-68` uses a 40-character lookback window before each matched signal word. Any negation word (e.g., "not", "no", "never") appearing more than 40 characters before the signal word is missed. Example: "I told you yesterday that I am absolutely not interested in any way, shape, or form in your pricing" — "not" is ~52 characters before "pricing", causing a false-positive buying signal detection. This is a known structural limitation of fixed-window negation scanning. Fixing it would require either a larger window (with increased risk of cross-clause false negatives) or AST-level dependency parsing. Deferred until production data shows this is causing measurable harm.
- [ ] 7. Cross-cutting audit report delivered
- [ ] 8. GREETING/FAREWELL consolidated into shared module
- [x] 9. DOCUMENTED_KNOWLEDGE dead outputs removed or consumer wired — **Done:** Deleted the entire dead path — `DOCUMENTED_KNOWLEDGE` map (7 entries), `simpleStem` import (now unused in orchestrator), `FALLBACK_TEXT`, stem-aware token overlap + routing guard, and `isFallback`/`FALLBACK_TEXT` fallback. Also deleted the 13 `Grounded Knowledge Retrieval` tests in `orchestrator.test.ts` (whole file). Added `console.warn` at `buildTopicResponse()` return-null point to surface true unanswered-topic events in logs, fulfilling the analytics gap left by removing the dead `isFallback` path. 1565/1577 passing (−13 tests, zero regressions).

## References

- Root-cause report: `docs/ROOT_CAUSE_5_FAILURES.md`
- Production readiness checklist: `docs/PRODUCTION_CHECKLIST.md`
- Original diff context: commit `a70276d` (Tier 1 negation fix)
