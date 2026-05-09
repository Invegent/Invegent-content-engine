# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-09 Sydney (**v2.59 — M8a Path A APPLIED and CLOSED via cc-0005 v4** by CC. Single-transaction `apply_migration` (`m8a_cron48_rewrite_and_legacy_cleanup_v1`); 344 legacy-origin future queue rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`. Cron 48 rewritten in place (`active=true`, schedule `*/5 * * * *`, jobname all preserved); legacy `public.get_next_scheduled_for(...)` fallback removed from COALESCE chain; autonomous slot-driven enqueue path preserved (V9 in-migration gate verified). cron 48 command_md5 `5113bc4...` → `57bbafb...` (+149 bytes). V1–V10' all PASS. No rollback. **Component 3 (function rename + COMMENT) DEFERRED to M8b** per v4 design; `public.get_next_scheduled_for` NOT renamed; manual callers `public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled` NOT modified. V10' delta-framed verification confirmed exactly 2 manual callers post-apply (cron 48 dropped from caller list as intended). Result file commit `eb820bae6951b66bfd1dd9a61e3e0cb235d5d8ad` (blob `ebd2fb05`, 16,052 B). M-series total dead-letter rows since 8 May 2026: 9 (M6 Phase A) + 43 (M6 Phase B) + 344 (M8a) = **396 rows**. **Urgent pipeline-integrity block now effectively complete** (M1+M2+M3, M4, M5, M6 Phase A + B, M7 folds-in, M8a CLOSED; M8b is the only residual M-series item, gated on manual caller remediation, not blocking new work). **Per PK directive recorded at Platform Reconciliation View brief candidate addition (commit `a8a241d1`): with all three sequencing blockers now cleared, Platform Reconciliation View becomes the next major planning/work item after this sync close.** Brief-runner-v0 L19–L21 VINDICATED (CC pre-flight HALT pattern; in-place patch vs scope-reduce vs new brief; scope re-banding); L11+L16+L17+L18 vindicated again. T-MCP-02 +1 (cc-0005 v4 D-01); cumulative pending close-the-loops now 5. State-capture exceptions v2.59: 0. P0+P1 open: ~2 → ~2 (cc-0005 v4 / M8a was P3 scheduling). PHASES reconciliation now **15th** carry. Closed v2.59: M8 Path A (cc-0005 v4 / M8a). Previous (v2.58): F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED via cc-0007 APPLIED.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.59 application**: 1 D-01 fire chat-side prior cycle for cc-0005 v4 / M8a apply (clean PASS / agree / proceed / 0 pushback / 0 escalation; action_type `sql_destructive`). v2.59 4-way sync close commit (this) is doc-only and per protocol does not require a fire.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. All stages CLOSED. **v2.59 application**: no drift fires this session.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.59 application**: D-01 fire for cc-0005 v4 returned clean agree / 0 pushback / 0 escalation; rule not exercised.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time**.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed. **v2.59 application**: cc-0005 v4 / M8a result file commit `eb820bae6951b66bfd1dd9a61e3e0cb235d5d8ad` verified by re-fetching landed file content via Invegent GitHub MCP — blob `ebd2fb05`, size 16,052 B; V1–V10' verification table + D-01 conditions + brief-runner-v0 §9 patterns observed all present. §1 apply summary records all 12 closure facts (migration name, project, method, return, rows, dead_reason, command_md5 transition, cron 48 active=true preservation, schedule unchanged, V10' delta framing, Component 3 deferral, manual callers preserved).

**STANDING RULE (v2.55 — brief-runner-v0 baseline patterns from cc-0003 cycle)**: L1–L4 are baseline:
- **L1 HALT mechanism is load-bearing.**
- **L2 doc-only patch → re-execution loop.**
- **L3 result-file preservation.**
- **L4 pre-state baseline pattern is now required.**

**v2.56 ADDITION**: **L6 (cross-brief patch propagation when invariant fails) is now baseline.**

**v2.57 ADDITIONS (candidates from cc-0006 + cc-0005 v3 cycles, promotion after one more vindication each):** L10–L18.

**v2.58 ADDITIONS (candidates from cc-0007 cycle):** L22–L25.

**v2.59 vindications and promotions:**
- **L19** CC v3 pre-flight HALT pattern — **VINDICATED** by full M8a closure cycle. v3 §1.4 caller check HALTed correctly when expected (1) didn't match observed (3); v4 reframed and applied cleanly on first attempt. **Promotion to baseline candidate.**
- **L20** in-place patch vs scope-reduce vs new brief — **VINDICATED**. v4 retired Component 3 in-place; M8b reserved as separate cc-NNNN brief; v4 applied cleanly without retrying Component 3 in-line. **Promotion to baseline candidate.**
- **L21** scope re-banding pattern — **VINDICATED**. v4's [250, 500] band held; observed 344 inside band; no apply-time amendment required. **Promotion to baseline candidate.**
- **L11** md5 baseline + post-md5 fingerprint — **VINDICATED AGAIN** (cc-0006 + cc-0005 v4). Two distinct brief classes (`cron_edit` + `sql_destructive` cron edit). **Promotion to baseline candidate.**
- **L17** in-place patching pattern — **VINDICATED THIRD TIME** (cc-0003 v1→v2; cc-0005 v2→v3→v4; v4 itself was the in-place super of v3 since v3 never applied). **Promotion to baseline.**
- **L16** function-call regex pattern — **VINDICATED AGAIN** (cc-0005 v3 review pass + cc-0005 v4 applied verification gates V8 + V10'). **Promotion to baseline candidate.**
- **L18** pre-flight cohort surfacing pattern — **VINDICATED AGAIN** (cc-0005 v3 surfaced 94-row un-publishable cohort + 2 manual callers; v4 carried both forward; M8a apply preserved both as separate follow-up items).

**v2.57/v2.58 promotion candidates (carry-forward, after one more vindication each):** L5, L7, L8, L9, L22, L23, L24, L25.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (unchanged from v2.58; cc-0005 v4 / M8a was P3 scheduling) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~64h (carry from v2.58 + ~2h cc-0005 v4 cycle + ~30m sync close) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This v2.59 4-way sync close: ~30 min** (read 3 docs + cc-0005 v4 result file + author 3 doc files + acceptance integrity verify).

**State-capture exception count v2.59: 0** (cc-0005 v4 D-01 fire returned clean agree; no escalation, no override).

---

## ⭐ Today / Next 5 — REBUILT v2.59

> **Last rebuilt:** 2026-05-09 Sydney (v2.59).
> **M8a Path A CLOSED v2.59 (P3 scheduling).** cron 48 rewritten in place; 344 rows dead-lettered; V1–V10' PASS. **Urgent pipeline-integrity block now effectively complete.** **Per PK directive: Platform Reconciliation View becomes the next major planning/work item.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Platform Reconciliation View — BRIEF AUTHORING** | **P2 → PROMOTED to rank 1 v2.59** | All three sequencing blockers cleared (cc-0007 v2.58, cc-0005 M8a v2.59, urgent pipeline-integrity closure v2.59). **Per PK directive recorded at commit `a8a241d1`: this becomes the next major planning/work item after v2.59 sync close.** | PK directs scheduling. Brief authoring (chat) when greenlit. Implementation gates: Phase 0 confirmation defaults; architecture review §10 extension scope; manual override design (dashboard form vs Supabase RLS-protected table); API ingestion priority order (FB+IG via Meta Graph API likely first; LinkedIn manual until Phase 2.x; YouTube via Data API if possible). 13 seed manual observations preserved in dedicated 🟢 status block below. |
| 2 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 TOP | Unchanged from v2.55–v2.58. M5–M8 reconciliation status: **M6 Phase A + B both CLOSED v2.55/v2.56; M8a CLOSED v2.59; M7 doc-only fold complete; M8b deferred (gated on manual caller remediation, not blocking new work).** | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| 3 | **AI cost view** | P3 quick win | Unchanged. ~1h estimate. | Author `vw_ai_cost_monthly` on `m.ai_job` (read-only DDL) + add NOW dashboard tile. |
| 4 | **Publisher latent config risk follow-up** | P3 quick win | Carry from v2.58. cc-0007 §1.4 surfaced; defensive patch held back per strict rule + D-01 conditions. Currently 0 × 401, but next publisher deploy without flag AND config.toml entry would regress identically. | Single-file commit to `supabase/config.toml` adding `[functions.publisher] verify_jwt = false`. NO deploy required. ~5 min. |
| 5 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

**Carry-forward unchanged from v2.58 except v2.59 deltas (cc-0005 v4 / M8a closure, Platform Reconciliation View promoted to rank 1, Phase 0 prerequisites demoted to rank 2 since pipeline-integrity block now effectively complete).**

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.55)

All stages CLOSED. Cron jobid 80 + 81 active=true. No drift fires this cycle.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.59 update on hard blockers:**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- ✅ **M5–M8 reconciliation — effectively COMPLETE v2.59:** M6 Phase A **CLOSED v2.55**; M6 Phase B **CLOSED v2.56**; M7 doc-only fold complete with M8a 4-way sync per reconciliation §6 Q2; **M8a CLOSED v2.59 (cron 48 rewritten in place + 344 rows dead-lettered).** M8b is the only residual M-series item, deferred to separate cc-NNNN brief (gated on manual caller remediation; not blocking new work).
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override (cc-0001 result file in place).

**Phase 0 still gated on default-blockers but pipeline-integrity prerequisite is now effectively complete v2.59.**

---

## 🟢 Tier 1 + M4 + M5 + M6 Phase A + M6 Phase B + M8a queue integrity & stability remediation — STATUS BLOCK

**v2.59 update — M-series effectively complete:**

| M-step | Closure version | Apply commit | Effect |
|---|---|---|---|
| M1 + M2 + M3 | v2.55 (lineage) | (5 May) | Tier 1 queue integrity foundations |
| M4 | v2.55 (lineage) | (5 May) | State-capture override; 8/8 PASS |
| M5 | v2.55 (lineage) | (5 May) | Corrected cascade fix; 7/7 PASS |
| M6 Phase A | v2.55 | `d60dcfbc` | 9 Bug 3 fingerprint rows dead-lettered |
| M6 Phase B | v2.56 | `9d5bdd37` | 43 v4-mismatch rows dead-lettered |
| M7 | doc-only fold | (folds into M8a 4-way sync per reconciliation §6 Q2) | n/a |
| **M8a** | **v2.59 (this)** | result `eb820bae` | **344 legacy-origin future queue rows dead-lettered + cron 48 rewritten in place (`active=true` preserved)** |
| M8b | DEFERRED | TBD (separate cc-NNNN brief) | function rename + COMMENT after manual caller remediation |

**Total residual rows cleared by M-series dead-letter cycles since 8 May 2026: 9 + 43 + 344 = 396 rows.**

**Urgent pipeline-integrity block now EFFECTIVELY COMPLETE v2.59.** M8b is the only residual M-series item; reserved as separate cc-NNNN brief; gated on manual caller remediation; **not blocking new work.**

---

## 🟢 Platform Reconciliation View — BRIEF CANDIDATE STATUS BLOCK (PROMOTED to rank 1 v2.59; sequencing blockers all cleared)

**Status v2.59:** **PROMOTED to next major planning/work item per PK directive.** Brief authoring (chat) when scheduled. All three sequencing blockers cleared:

| Blocker | Status | Closure |
|---|---|---|
| ~~cc-0007 ai-worker 401 recovery~~ | CLEARED | v2.58 |
| ~~cc-0005 M8a Path A~~ | CLEARED | **v2.59 (this)** |
| ~~Urgent pipeline-integrity closure work~~ | CLEARED | **v2.59 (M-series effectively complete; M8b doesn't block new work)** |

**Classification:** pipeline observability / reconciliation. **NOT cosmetic dashboard work** (PK explicit framing 2026-05-09).

**Title:** Platform Reconciliation View — by day / client / platform.

**Problem (PK directive 2026-05-09 Sydney):** PK is manually checking each social platform to know whether ICE output actually appeared. This is not scalable. Dashboard needs a reconciliation surface showing what ICE expected/produced/queued/published versus what each platform actually shows.

**Required scope (PK-directed 2026-05-09):**
- by day / client / platform reconciliation
- ICE expected cadence (per client × platform × day; sourced from `c.client_publish_profile` + `c.client_ai_profile` schedule rules)
- ICE generated assets / drafts (`m.post_draft` rows, including `approval_status` distribution)
- ICE queue state (`m.post_publish_queue`, including `dead`/`failed`/`queued`/`published`)
- ICE publisher result / logs (`m.post_publish`, `m.worker_http_log`, EF deploy state)
- platform-observed post evidence (manual ingestion or API where available)
- mismatch classification: `missing`, `late`, `duplicate`, `extra`, `wrong-content`, `stale`, `OK`
- evidence links / platform IDs where available
- manual override field for platforms where API ingestion is not yet available

**Seed manual observations (PK direct, 2026-05-09 Sydney; preserved across v2.58 + v2.59 closes):**

| Client | Platform | Observation date | PK note |
|---|---|---|---|
| NDIS Yarns | YouTube Short | 7 May 2026 | — |
| Property Pulse | YouTube Short | 6 May 2026 | — |
| NDIS Yarns | Instagram | 1 May 2026 | — |
| Property Pulse | Instagram | 25 Apr 2026 | — |
| Invegent | Instagram | 25 Apr 2026 | — |
| Property Pulse | Facebook | 8 May 2026 | — |
| NDIS Yarns | Facebook | 8 May 2026 | — |
| Care for Welfare | Facebook | 1 May 2026 | — |
| Invegent | Facebook | 8 May 2026 | **wrong / irrelevant post** (potential `wrong-content` classification) |
| Care for Welfare | LinkedIn | ~6 May 2026 | — |
| NDIS Yarns | LinkedIn | ~8 May 2026 | — |
| Property Pulse | LinkedIn | ~7 May 2026 | **two posts in one day** (potential `duplicate` or `extra` classification) |
| Invegent | LinkedIn | (consistent) | "appears consistent" — informal `OK` |

**13 datapoints across 4 clients (NDIS Yarns, Property Pulse, Care for Welfare, Invegent) and 4 platforms (Facebook, Instagram, LinkedIn, YouTube).** Both PK explicit mismatch flags preserved (Invegent FB wrong-content; Property Pulse LI possible duplicate-or-extra). These 13 datapoints are the durable seed cohort for the brief author.

**Implementation gates (still open as of v2.59):**
1. Phase 0 confirmation defaults still pending (P1 TOP carry).
2. Architecture review §10 extension scope to be decided at brief-authoring time. Existing §10 product objects + data model at `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` informs what "expected" means per platform but will need extension with reconciliation-specific objects (`platform_observation`, `mismatch_classification`).
3. Manual override design — dashboard input form vs Supabase RLS-protected table? PK directs at brief-authoring time.
4. API ingestion priority order — Facebook + Instagram via Meta Graph API likely first (already integrated for publishing); LinkedIn manual until Phase 2.x; YouTube via Data API if possible. PK directs at brief-authoring time.

**Brief author when promoted:** chat. (Consistent with observability-class cc-NNNN pattern.)

**Brief shape sketch (preserved from v2.58):** likely multi-repo (invegent-dashboard for reconciliation surface UI + possibly invegent-content-engine for new tables for platform-observed evidence + manual override + possibly portal scope for client-facing summary variant). Mismatch-classification rules need codification at brief-authoring time (thresholds for `late` vs `OK`, definitions of `duplicate` vs `extra`, content-similarity heuristic for `wrong-content`, freshness threshold for `stale`). Reconciliation joins span `c.*` (expected cadence) + `m.post_draft` (generated) + `m.ai_job` (succeeded/failed) + `m.post_publish_queue` (queue state) + `m.post_publish` (ICE result) + new `m.platform_observation` (platform-observed evidence) + new `m.platform_observation_manual_override` (PK manual entries).

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.54.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 55 cumulative; close-the-loop ~29+ pending; 5 cc-NNNN reviews pending close-the-loop)

**v2.59 application**: 1 D-01 fire chat-side prior cycle for cc-0005 v4 / M8a apply. Cumulative T-MCP-02: 54 → 55. Cumulative T-MCP-08: 2 (unchanged). State-capture exceptions v2.59: **0**.

**Fire ledger this cycle:**
- Fire #1 (cc-0005 v4 D-01, review_id pending close-the-loop capture): action_type **`sql_destructive`**. Verdict agree / proceed / risk ≤ medium / confidence high. 0 pushback. 0 escalation. Clean approve. Conditions: re-run final read-only verification immediately before apply (PASSED — no drift); halt if cleanup count outside [250, 500] (NOT triggered; 344 in band); halt if cron 48 command/md5 changed unexpectedly (NOT triggered); capture fresh queue_id list before UPDATE; use exact cc-0005 v4 §3 SQL verbatim; apply only after PK explicit phrase (RECEIVED); after apply run V1–V10' (DONE — all PASS); roll back only if verification fails (NOT TRIGGERED); commit cc-0005 result file (DONE).

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.59 adds 1 more (cumulative ~29+ pending). **5 cc-NNNN reviews pending close-the-loop** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4). Carried as P3 backlog. **Deferred this turn per PK explicit "no Supabase writes" scope.** v2.55–v2.58 close-the-loops also still pending.

---

## 🤖 Cowork automation (D182)

**v2.59 status (carry from v2.54–v2.58):** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends and flips status=review_required.

**Existing Cowork status (unchanged):** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Platform Reconciliation View — BRIEF AUTHORING** | by day / client / platform reconciliation surface; pipeline observability (NOT cosmetic dashboard) | **P2 → rank 1 v2.59 (PROMOTED)** | All three sequencing blockers cleared as of v2.59. Brief NOT YET AUTHORED. 13 seed manual observations 2026-05-09 captured in dedicated 🟢 status block above. | PK → chat | Brief authoring when PK greenlights. Implementation gates: Phase 0 confirmation defaults; architecture review §10 extension scope; manual override design; API ingestion priority order. **Per PK directive recorded at commit `a8a241d1`: this becomes the next major planning/work item after v2.59 sync close.** |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + ~~M5–M8 reconciliation~~ (effectively complete v2.59) | P1 TOP (unchanged) | S30 cleared v2.47; M-series effectively complete v2.59 (M6 Phase A + B + M8a all CLOSED; M7 fold complete; M8b deferred not-blocking-new-work). 7 default-blockers still pending PK confirm/override. | PK | Review §11.4 items 3–9; confirm defaults via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 → Top 3 (carry) | Backlog | chat → next session | Author view DDL (read-only); add NOW dashboard tile. ~1h estimate. |
| **Publisher latent config risk follow-up** | Doc-only patch adding `[functions.publisher] verify_jwt = false` to `supabase/config.toml` | P3 (carry from v2.58) | OPEN. Currently 0 × 401 (gateway presumably already at correct setting), but next publisher deploy without flag AND config.toml entry would regress identically. | chat → next session | Single-file commit to `supabase/config.toml`. NO deploy required. ~5 min. |
| **M8b separate brief authoring** | Function rename (`public.get_next_scheduled_for` → `__deprecated_m8b`) + COMMENT, after manual caller remediation | P3 (NEW v2.59 Active item; was carry from v2.58) | NOT YET AUTHORED. Reserved as separate cc-NNNN brief. Sequencing gate: BOTH `public.draft_approve_and_enqueue` AND `public.draft_approve_and_enqueue_scheduled` must first be remediated. Once remediated AND V10' returns 0 callers, M8b applies the rename. | PK → chat | When PK directs. Brief shape sketched in cc-0005 v4 §M8b follow-up section. **Not blocking new work.** |
| **94-row un-publishable legacy draft cohort cleanup** | Drafts: `pd.slot_id IS NULL AND pd.scheduled_for IS NULL AND pd.created_by='seed_and_enqueue' AND pd.approval_status IN ('approved','scheduled')` | P3 (carry from v2.58) | LOGGED. Currently 94 rows; oldest 2026-04-17, newest 2026-04-25 (10-day pre-M3/M4 era window). Post-M8a these will silently never publish (cron 48's WHERE filter drops them). | PK → chat → future session | If PK directs, separate cc-NNNN brief. Resolution candidates documented in cc-0005 v4 brief §Separate follow-up: (a) bulk dead-letter, (b) per-draft triage, (c) retroactive scheduling, (d) leave indefinitely. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** (carry, security) | Cron jobid 58 has secret hardcoded inline; cc-0006 deliberately preserved character-for-character | P2 (security) | OPEN — unchanged v2.59 | chat → future session (PK approval required for rotation) | PK to authorise secret rotation + vault entry creation + cron command refactor. Separate cc-NNNN brief required. |
| **F-YT-PUB-AVATAR-EXCLUSION** (carry from v2.53) | youtube-publisher `.in()` filter excludes `video_short_avatar` | P3 | LOGGED, no chat action | chat → future (passive) | Validator: any future NY×YT or PP×YT slot where advisor picks `video_short_avatar`. |
| **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | PK personal-email morning triage | P3 | DRAFT exists at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft) | PK → chat | PK reviews + proposes amendments; chat applies + flips status=review_required. |
| **NEW v2.56 P3 backlog observation** | 1 LinkedIn queue row (`1a21199e-...`) was in queue with `pd.approval_status='draft'` (cc-0004 P3.3 outlier; queue dead-lettered, draft itself unchanged) | P3 | LOGGED, no chat action | chat → future (passive) | Investigation deferred. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session OR Phase 1+ | Either dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream pathway. **v2.58 + v2.59 note:** with cc-0007 recovery + cc-0005 M8a closure, ai-worker is now succeeding AND queue-enqueue path is clean; observe whether finding self-resolves over next 24–48h. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.59 (**15th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** (carry) | cron jobid 31 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Decide: re-author repo source OR retire deployed slug + cron. |
| **F-CRON-INGEST-STALE** (carry) | cron jobid 1 calls deployed `ingest-v8-youtube-channel`; folder absent | P2 | LOGGED | PK → future session | Same shape as compliance-monitor. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** (carry) | cron jobid 30 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-DOCTOR-STALE** (carry) | cron jobids 29 + 39 call deployed slug; folder absent. **NOT** a rename of `pipeline-diagnostician`. | P2 | LOGGED | PK → future session | Same shape. |
| **Music library activation checklist** (carry) | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | PK to action when music tracks are ready. |
| **Emergency redeploy governance question** (carry) | Should bounded production-restoration require expedited D-01? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents in `docs/06_decisions.md`. **v2.58 + v2.59 note:** cc-0007 P1 recovery cycle + cc-0005 v4 SQL apply both demonstrate standard D-01 protocol can handle complex apply-class brief timing without expediting. Empirical input for the decision. |

**Closed v2.59:** **M8 Path A (cc-0005 v4 / M8a)** — APPLIED via Supabase MCP `apply_migration` by CC in single atomic transaction (`m8a_cron48_rewrite_and_legacy_cleanup_v1`). 344 legacy-origin future queue rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`. Cron 48 rewritten in place; `active=true` + schedule `*/5 * * * *` + jobname all preserved. Legacy `public.get_next_scheduled_for(...)` fallback removed from cron 48's COALESCE chain. Autonomous slot-driven enqueue path preserved. cron 48 command_md5 `5113bc4...` → `57bbafb...` (+149 bytes). V1–V10' all PASS. No rollback. Component 3 (function rename + COMMENT) DEFERRED to M8b per v4 design. `public.get_next_scheduled_for` NOT renamed; manual callers `public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled` NOT modified. Result file commit `eb820bae` (blob `ebd2fb05`, 16,052 B). M-series total dead-letter rows since 8 May: 9 + 43 + 344 = 396 rows. Urgent pipeline-integrity block now effectively complete.

**Closed v2.58:** F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1) — cc-0007 result commit `411b85ee`.
**Closed v2.57:** F-CRON-PG-NET-TIMEOUT-5S (P2) — cc-0006 commit `c72bc327`.
**Closed v2.56:** M6 Phase B (P1) — cc-0004 commit `9d5bdd37`.
**Closed v2.55:** M6 Phase A (P1) — cc-0003 v2 commit `d60dcfbc`.
**Closed v2.54:** video-worker `verify_jwt` durable fix (P3) — landed via `supabase/config.toml`.
**Closed v2.53:** F-YT-NY-FORMAT-SELECTION P1 (commit `1ccfe9a2`).
**Closed v2.52:** insights-worker P1 functional drift; F-HEYGEN-RPC-MIGRATIONS-MISSING; F-INSIGHTS-RPC-MIGRATIONS-MISSING.
**Closed v2.50:** P1 SECURITY-DEFINER triage.
**Closed v2.49:** F-EF-DRIFT-PREVENTION Stage 3.
**Closed v2.48:** Stage 2b dashboard drift panel.
**Closed v2.47:** S30.
**Closed v2.46:** Dashboard Architecture Review of 2026-05.
**Closed v2.44:** F-EF-DRIFT-PREVENTION Stage 2a finalisation.
**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

**v2.59 carry (unchanged from v2.55–v2.58):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08; at least one invoice refund verbally confirmed in progress. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr).
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.59 close — standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.59 changes**:

- **CLOSED v2.59**: M8 Path A (cc-0005 v4 / M8a) — result commit `eb820bae`. 344 rows dead-lettered; cron 48 rewritten in place; V1–V10' all PASS.
- **PROMOTED v2.59**: Platform Reconciliation View → rank 1 of Today/Next 5 + first row in Active table. All three sequencing blockers cleared (cc-0007 v2.58, cc-0005 M8a v2.59, urgent pipeline-integrity closure v2.59). Per PK directive recorded at commit `a8a241d1`: becomes next major planning/work item after this sync close.
- **STATE CHANGE v2.59**: M8b separate brief moved from carry-only to Active table P3 row (was implicit carry; now explicit since M8a closure made it the only residual M-series item).
- **STATE CHANGE v2.59**: 94-row un-publishable legacy draft cohort cleanup moved from carry-only to Active table P3 row (was implicit carry; now explicit since M8a closure made it a separate follow-up item per v4 design).
- **CARRIED v2.59**: Dashboard roadmap PHASES — **15th** consecutive deferral (was 14th in v2.58).
- **CARRIED v2.59**: 5 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 fires).
- **CARRIED v2.59**: 4× v2.54 P2 cron findings (F-CRON-COMPLIANCE-MONITOR-STALE, F-CRON-INGEST-STALE, F-CRON-PIPELINE-AI-SUMMARY-STALE, F-CRON-PIPELINE-DOCTOR-STALE).
- **CARRIED v2.59**: F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN unchanged).
- **CARRIED v2.59**: Publisher latent config risk follow-up (P3 quick win, doc-only patch, ~5 min).
- **NEW v2.59 LESSON STATUS**: L19–L21 from cc-0005 v4 / M8a cycle VINDICATED (CC pre-flight HALT; in-place patch vs scope-reduce vs new brief; scope re-banding). L11 + L16 + L17 + L18 vindicated again. L17 vindicated third time — promotion to baseline.
- **CARRIED v2.59**: All v2.55–v2.58 items unchanged except M8 Path A closure, Platform Reconciliation View promoted, M8b + 94-row cohort moved to Active.

**v2.55–v2.58 + earlier changes**: per prior changelog.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Unchanged from v2.58 except:
- **Lesson #61** (P1–P5 must be empirically verified, not theoretically assumed) — reinforced again by cc-0005 v4 / M8a cycle (final re-verify confirmed no drift; pre-flight queries empirically gathered before D-01; §1.5d alignment HALT criterion empirically gated). **Promotion to canonical recommended (now reinforced 4 times: cc-0003 v2, cc-0004, cc-0006, cc-0005 v4).**
- **Lesson #62 v2.50 refinement** — not exercised this cycle.
- **L17 in-place patching pattern** — vindicated third time v2.59. **Recommended for promotion to baseline.**
- **L11, L16, L18 vindicated again** — carry as candidates with strong evidence; promotion next cycle.
- **L19, L20, L21 (v2.58 candidates)** — VINDICATED v2.59. Promotion to baseline candidates.

---

## v2.59 honest limitations

- All v2.31–v2.58 limitations apply.
- **Memory at 30-edit cap pre-session** (carry). v2.59 update DEFERRED per PK explicit scope (no memory edit this turn). Memory `recent_updates` v2.54 entry remains canonical until next chat-owned memory update opportunity (will need to reflect v2.55 + v2.56 + v2.57 + v2.58 + v2.59 closures + inline post-v2.57 additions in a single rolling entry).
- **Dashboard roadmap PHASES still stale** — **15th** consecutive deferral. Risk unchanged.
- **~29+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — v2.59 adds 1 (cc-0005 v4 D-01 fire); v2.55–v2.58 each added 1; cumulative pending ~29+. **5 cc-NNNN reviews pending close-the-loop** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4). All deferred per PK "no Supabase writes" scope.
- **5 cc-NNNN D-01 review_ids not captured in 4-way sync files**. Will surface when close-the-loop UPDATEs are fired.
- **Sync state file size**: ~30KB at v2.59 close. Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54; deferred.
- **M8b separate brief NOT YET AUTHORED.** Reserved as separate cc-NNNN brief; gated on manual caller remediation; not blocking new work but represents an honest residual M-series TODO.
- **94-row un-publishable legacy draft cohort still un-publishable.** Post-M8a these drafts will silently never enqueue (cron 48's WHERE filter drops them). Resolution requires PK directive on which of (a) bulk dead-letter / (b) per-draft triage / (c) retroactive scheduling / (d) leave indefinitely is preferred.
- **Publisher latent config risk** — carried as v2.58/v2.59 P3 follow-up. Doc-only patch only (no deploy). Removes regression risk for next publisher deploy without affecting current state.
- **No D-01 fire for the v2.59 4-way sync close commit** — doc-only, no production state touch.
- **L23 (repo + deploy coordination rollback shape)** — still logged but not exercised; cc-0007 was first apply with TWO production-touching steps but rollback was not triggered. Pattern is durable on apply side; rollback shape remains theoretical until exercised.
- **Brief-runner-v0 §1.x quality observations** from cc-0007 (logged in v2.58): cron blind spot for HTTP failures; §1.2 threshold not regression-onset-aware; §1.5 first-failed-cron-fire query relies on same blind spot; `m.ef_drift_log` column-name mismatch (`ef_slug` → `slug`, `created_at` → `checked_at`). Worth incorporating into brief-template work; **carry for next major brief (likely Platform Reconciliation View).**
- **cc-0005 v4 / M8a brief-runner-v0 §9 patterns** — multi-component single-transaction with in-migration verify gates; md5 fingerprint cron edit verification; §1.6 snapshot persisted to local file; V10' "expected delta" framing; function rename deferral via Component 3 → M8b. All 5 patterns logged for future apply-class briefs.

---

## Changelog

- v1.0–v2.58: per previous changelog.
- **v2.59 (2026-05-09 Sydney, M8a Path A applied + closed via cc-0005 v4):**
  - **M8 Path A (cc-0005 v4 / M8a) APPLIED and CLOSED** — cc-0005 v4 APPLIED via Supabase MCP `apply_migration` by CC in single atomic transaction (`m8a_cron48_rewrite_and_legacy_cleanup_v1`). 344 legacy-origin future queue rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`. Cron 48 rewritten in place; `active=true` and schedule `*/5 * * * *` and jobname `enqueue-publish-queue-every-5m` all preserved unchanged across apply boundary. Legacy `public.get_next_scheduled_for(...)` fallback removed from cron 48's COALESCE chain. Autonomous slot-driven enqueue path preserved (V9 in-migration gate verified `INSERT INTO m.post_publish_queue` + `pd.scheduled_for` + `s.scheduled_publish_at` all still represented in rewritten command). cron 48 command_md5 `5113bc435fe5cb1a088931b66eabdbfe` → `57bbafb19a51308a69db18607c8ad991` (+149 bytes; matches v3-rephrased comment additions). `apply_migration` returned `{"success": true}`. Result file commit `eb820bae6951b66bfd1dd9a61e3e0cb235d5d8ad` (blob `ebd2fb05`, 16,052 B; CC retained brief filename `docs/briefs/results/cc-0005-m8-atomic-cutover.md`).
  - **V1–V10' all PASS:** V1 `dead_reason` count = 344 (= 0 + 344). V2 cleanup criterion = 0. V3 queued+failed = 97 (= 441 - 344). V4 dead = 444 (= 100 + 344). V5 set-equality between captured 344-row snapshot and post-apply set (zero diff). V6 per-status totals coherent. V7 cron 48 active=true + schedule unchanged + jobname unchanged. V8 cron 48 command no longer contains function-call to legacy fallback. V9 autonomous enqueue path still represented. V10' expected callers list = 2 manual functions; 0 cron rows.
  - **Component 3 (function rename + COMMENT) DEFERRED to M8b** per v4 design. `public.get_next_scheduled_for(p_client_id uuid, p_platform text, p_from_utc timestamp with time zone) RETURNS timestamp with time zone` continues to exist with original name and signature. The 2 manual callers (`public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled`) NOT modified.
  - **D-01 fire** — 1 cc-0005 v4 fire (prior cycle by chat), action_type `sql_destructive`. Verdict agree / proceed / risk ≤ medium / confidence high. 0 pushback. 0 escalation. Clean approve. PK approval phrase: `"pk proceed with cc-0005 v4 M8a apply"`. v2.59 4-way sync close (this) is doc-only and per protocol does NOT require a fire.
  - **Pre-flight + final re-verify** — no drift between initial §1 capture and ~60 s pre-apply re-verify. §1.0 sequencing gate cleared (cc-0003 v2 + cc-0004 both Complete). §1.3 cron 48 active=true, command_md5 unchanged. §1.4 callers list = exactly 3 expected (cron 48 + 2 manual functions); v4 §8.2.g HALT criterion not triggered. §1.5a cleanup count 344 (in band [250, 500]). §1.5d slot alignment misaligned count = 0 (HALT §8.2.l not triggered). §1.5 cross-check vs cc-0003 v2 + cc-0004 = 0 + 0. §1.5c un-publishable cohort = 94 (informational; recorded as separate follow-up per v4 design).
  - **Brief-runner-v0 lessons** — L19 (CC v3 pre-flight HALT pattern) VINDICATED; L20 (in-place patch vs scope-reduce vs new brief) VINDICATED; L21 (scope re-banding pattern) VINDICATED; L11 + L16 + L17 + L18 vindicated again. L17 vindicated third time — promotion to baseline candidate. cc-0005 v4 / M8a brief-runner-v0 §9 patterns: multi-component single-transaction with in-migration verify gates; md5 fingerprint cron edit verification; §1.6 snapshot persisted to local file; V10' "expected delta" framing; function rename deferral via Component 3 → M8b.
  - **M-series total dead-letter rows since 8 May 2026:** 9 (M6 Phase A v2.55) + 43 (M6 Phase B v2.56) + 344 (M8a v2.59) = **396 rows**.
  - **Urgent pipeline-integrity block now EFFECTIVELY COMPLETE.** All sequencing blockers cleared (cc-0007 v2.58, cc-0005 M8a v2.59). M8b is the only residual M-series item (deferred to separate cc-NNNN brief; gated on manual caller remediation; not blocking new work).
  - **Per PK directive recorded at Platform Reconciliation View brief candidate addition (commit `a8a241d1`): with all three sequencing blockers now cleared, Platform Reconciliation View becomes the next major planning/work item after this sync close.** Implementation gates: Phase 0 confirmation defaults still pending (P1 TOP carry); architecture review §10 extension scope; manual override design; API ingestion priority order. Brief author when promoted: chat. 13 seed manual observations from 2026-05-09 captured in dedicated 🟢 status block (preserved across v2.58 + v2.59 closes).
  - **PK explicit approval phrase received** for cc-0005 v4 / M8a apply: `"pk proceed with cc-0005 v4 M8a apply"`.
  - **State-capture exception count v2.59: 0**.
  - **Closure budget**: ~30 min chat 4-way sync close. Trailing-14-day ~64h above 8.0 floor. ~2 P0+P1 open of 20 cap (cc-0005 v4 / M8a was P3 scheduling; count unchanged from v2.58).
  - **0 production mutations chat-side this turn** — 4-way sync close is doc-only. Production mutation in this cycle was the cc-0005 v4 `apply_migration` call by CC (separate session, prior cycle).
  - **STANDING_THREE array unchanged**. `m.ef_drift_log` untouched by chat. No cron edits this turn (cron 48 rewrite was the cc-0005 v4 apply by CC, prior cycle). No EF deploys this turn. No code changes this turn. No Phase 0 scheduling.
  - **Acceptance-integrity adherence** (v2.50): cc-0005 v4 / M8a result file commit `eb820bae` verified by re-fetching landed file content via Invegent GitHub MCP — blob `ebd2fb05`, 16,052 B; §1 apply summary records all 12 closure facts; V1–V10' verification table + D-01 conditions + brief-runner-v0 §9 patterns all present.
  - **Deferred per PK explicit scope this turn**: memory `recent_updates` v2.55 + v2.56 + v2.57 + v2.58 + v2.59 entries; 5 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 fires); dashboard PHASES update (**15th** carry); M8b brief authoring (gated on manual caller remediation); 94-row un-publishable legacy draft cohort cleanup (separate follow-up if PK directs); Phase 0 scheduling (carry); Publisher latent config risk follow-up (P3, scheduled separately).
  - **Carried**: Crazy Domains refund follow-up (Personal businesses); morning-inbox-sweep-v1 brief amendment (P3); 4 P2 cron findings from v2.54; F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN, unchanged); Platform Reconciliation View brief candidate (PROMOTED to next major work item); M8b separate brief (Active P3 row, NOT YET AUTHORED, not blocking new work); 94-row un-publishable legacy draft cohort (Active P3 row, separate follow-up).
