# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-05 Sydney evening session-end (v2.39 — **F-YT-OAUTH-PP RESTORED for Property Pulse. PK reconnected PP+NY YouTube via `dashboard.invegent.com/connect` (superseded staged Template 1 SQL). Template 2 SQL (4-draft reset) D-01 cleared first-fire `91caf322`; applied via Supabase MCP. Both subsequent cron 34 firings (:15 + :45 UTC) published all 4 stuck PP×YT drafts cleanly. First PP×YT publishes since 2026-04-01. F-YT-NY-FORMAT-SELECTION brief committed `ff5ae6ae` (queued behind RECONCILE-EF-DRIFT). New finding RECONCILE-EF-DRIFT (P1) blocks all EF patches.**). Closure budget: ~1h this session, day total ~7h, trailing-14-day ~26h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S28)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.39 application**: 1 D-01 review fired this session (Template 2 — PP×YT 4-draft reset). Cleared first-fire, no escalation, no pushback. T-MCP-02 quota now 34. **Counter-pattern to Lesson #62 reinforced (3-of-3 clean proceeds in 24h on bounded `sql_destructive` actions when PK pre-approves + scope tight + evidence empirically grounded + rollback explicit).**

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

**NEW STANDING RULE (D-YT-OAUTH-1, v2.39)**: Use invegent-dashboard `/connect` (or `/clients?tab=connect`) page first for any FB/IG/LI/YT OAuth reconnect. Dashboard handles full OAuth flow + writes new refresh_token into `c.client_channel.config` automatically. OAuth Playground / Google Cloud Console only as fallback if dashboard flow fails. Confirmed working 5 May 2026 for PP+NY YouTube. (Memory edit landed.)

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~5 (T05 P1-urgent + RECONCILE-EF-DRIFT + F-YT-NY-FORMAT-SELECTION + M6 Phase A pending + 3 cluster diagnoses still active) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~26h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1h** (OAuth reconnect verification + scope confirmation + D-01 fire + Template 2 apply + 2 cron-firing verifications + storage sanity check + F-YT-NY-FORMAT-SELECTION brief authoring + 4-way sync).

**Day total (5 May): ~7h** (Tier 1 morning ~3.5h + M4 ~1h + M5 ~1.5h + F-YT-OAUTH-PP ~1h).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-05 Sydney evening session-end (v2.39).
> **This session: F-YT-OAUTH-PP restored for PP + F-YT-NY-FORMAT-SELECTION brief committed + RECONCILE-EF-DRIFT new P1 + 4-way sync.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **RECONCILE-EF-DRIFT — sync deployed EF source to repo** | **P1 (TOP next session)** | Repo missing source for ai-worker v2.11.1, heygen-worker v1.1.0, video-worker v2.1.0 (whole EF, no folder); youtube-publisher v1.6.0 matches. Surfaced as F-YT-ASSET-GEN-GAP precursor. Blocks ALL EF code patching including F-YT-NY-FORMAT-SELECTION fix. | PK runs `npx supabase functions download` × 4 locally from `C:\Users\parve\Invegent-content-engine` and commits as sync-only commit. Reply "synced" to unblock. |
| 3 | **F-YT-NY-FORMAT-SELECTION — diagnose v2.11.1 + format-advisor-v1** | **P1** | NY×YT 100% text-format → 0% YouTube publishes. PP×YT 76% text → only 24% publish viable. Brief committed `ff5ae6ae` lists 4 candidate fix shapes. Sequenced after RECONCILE-EF-DRIFT. | After source synced: read `supabase/functions/ai-worker/index.ts` v2.11.1, locate `format-advisor-v1` call site, read prompt template + candidate format list, decide between the 4 fix shapes (advisor prompt extension / post-decision override / pre-filter candidates / per-client column). Compose CC-stage brief. |
| 4 | **M6 Phase A — 108 historical Bug 3 fingerprint dead-letter** | **P1** | Sequenced item from v2.36 incident response. 108 queue rows currently sitting `queued` since `m3_bug3_fallback_artifact_2026-05-05`-style fingerprints. Will not silently publish (most Instagram on disabled profiles) but should be cleaned up. | PK directs start; chat composes brief + D-01 + pre-flight P1-P5; apply via Supabase MCP DML. Brief reuses v2.36 incident document. |
| 5 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.29 | PK fills 2 placeholders and sends |

**Demoted from prior Today/Next 5 in v2.38→v2.39 cycle** (closed/resolved):

- **F-YT-OAUTH-PP — Property Pulse YouTube OAuth invalid_grant** ✅ RESTORED v2.39. Dashboard reconnect at `/connect` superseded Template 1; Template 2 reset 4 stuck drafts (D-01 `91caf322` cleared first-fire); both cron firings published cleanly. PP×YT first 4 publishes since 2026-04-01.

**Demoted from prior Today/Next 5 in v2.37→v2.38 cycle** (still active, just not Top 5):

- F-AAP-NEEDS-REVIEW-BACKLOG (P2) — 28 drafts in `needs_review`. Top P2 next-up.
- F-PUB-009 7-day flow check (P2) — combined with M4/M5/F-YT-OAUTH-PP forward-flow expectation.
- 3 stuck-item clusters re-evaluation (P1) — PP×YT cluster may now be cleared by F-YT-OAUTH-PP; verify next session.
- CFW LI fill cycle V3-V5 acid test — ~05-06 03:04 UTC. Quintuple-test window: parser fix + F-PUB-009 + M2 cap-tight + M4 slot-intent + M5 no-shadow signature.

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

**Briefs:**
- `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 (commit `06510ff`)
- `docs/briefs/2026-05-05-m5-p-shadow-removal.md`
- `docs/briefs/2026-05-05-f-yt-ny-format-selection.md` (commit `ff5ae6ae`, NEW v2.39)

**Tier 1 (M1-M3): ✅ COMPLETE v2.36** — all three migrations applied 2026-05-05 02:08-03:30 UTC, 8/8 post-apply checks PASS.

**M4: ✅ COMPLETE v2.37** — applied 2026-05-05 ~04:14 UTC, 8/8 post-apply checks PASS.

**M5: ✅ COMPLETE v2.38** — applied 2026-05-05 ~05:25 UTC, 7/7 post-apply checks PASS.

**F-YT-OAUTH-PP: ✅ COMPLETE v2.39** — Template 2 applied 2026-05-05 ~09:11 UTC, 4/4 post-apply checks PASS, 4/4 drafts published via cron 34 at :15 + :45.

| Migration / Patch | Status | Applied | D-01 review_ids |
|---|---|---|---|
| `m1_cleanup_trigger_filter_by_queue_id` | ✅ DONE | 02:08 UTC | `02557e30-...` (proceed first fire) |
| `m2_publisher_lock_queue_v2_per_partition_cap` | ✅ DONE | 02:35 UTC | `5850dc5a-...` escalated → `e464d685-...` re-fire proceed |
| `m3_get_next_scheduled_for_null_fallback_and_enqueue_guards` | ✅ DONE | 02:56 UTC | `ba0fe26f-...` escalated → `6657f70c-...` re-fire proceed |
| `m4_enqueue_scheduled_for_slot_intent_and_backfill` | ✅ DONE | ~04:14 UTC | `b03eaf14-...` escalated → `602b0fb2-...` re-fire escalated → **Lesson #62 state-capture override** (PK approval) |
| `m4_close_the_loop_d01_reviews` | ✅ DONE | ~04:21 UTC | (audit-trail-only DML; no review needed) |
| `m5_remove_p_shadow_corrected_v2` | ✅ DONE | ~05:25 UTC | `b3609bc4-...` proceed → first apply failed (`42P16`) → `713dc407-...` corrected packet proceed → applied cleanly |
| **F-YT-OAUTH-PP Template 2** (v2.39) | ✅ DONE | ~09:11 UTC | `91caf322-...` proceed first fire (clean) |

**Cleanup performed:** v2.36 dead-lettered queue_id `ad573844`. v2.37 backfilled 147 rows of `m.post_draft.scheduled_for`. v2.38 dropped p_shadow / is_shadow + indexes; refactored view + `m.check_evergreen_threshold` + `m.fill_pending_slots`; updated cron 75. **v2.39 reset 4 specific PP×YT drafts (`4f07da94`, `2cc22fce`, `53b16d45`, `e59a561d`) from `video_status='failed'` → `'generated'`; cleared `youtube_upload_error` + `youtube_upload_attempted` JSONB keys.**

**Tier 2-3 (M6-M8): pending separate D-01 reviews.**

| Migration | Description | Status |
|---|---|---|
| M6 Phase A | Dead-letter 108 historical Bug 3 fingerprint anomalies | ⏳ pending PK call — recommended next AFTER RECONCILE-EF-DRIFT and F-YT-NY-FORMAT-SELECTION |
| M6 Phase B | Address 47 v4 mismatch queue rows | ⏳ sequenced after M6 Phase A |
| M7 | Promote v4 (atomic with M8) | ⏳ pending |
| M8 | Disable legacy enqueue + remaining legacy futures | ⏳ pending |

**T-MCP-08 vindicated 2x in v2.36 (M2 + M3 re-fires).** **Lesson #62 vindicated 1x in v2.37 (M4 re-fire); sixth vindication overall.** **v2.38 + v2.39 clean-proceed counter-pattern: 3-of-3 D-01 fires proceed first-time without escalation despite `sql_destructive` action_type.**

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate | (per v2.30) | (per v2.30) |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.39 note**: 34 fires total (1 fire this session — Template 2, clean proceed). 7d escalation rate now 17/35 = 49% (T-MCP-06 signal trending lower as sql_destructive clean-proceed pattern accumulates). |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at ~26h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | (per v2.30) | (per v2.30) |
| S21 | Pipeline incident health | `SELECT * FROM audit.v_brand_platform_audit_matrix ORDER BY CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END, client_slug, platform;` | Watch for: classification shifts. v2.34 added `approved_not_queued_genuine_gap` label. **v2.39 note**: PP×YT cluster should now show as `ok_or_recently_active` post-F-YT-OAUTH-PP. |
| S22 | Cron heartbeat health | `SELECT jobname, status, minutes_since_last, consecutive_misses FROM m.cron_health_status WHERE status != 'green';` | Empty result = all crons healthy. |
| S23 | F-PUB-009 forward-flow check | `SELECT count(*) FROM m.post_draft d JOIN m.slot s ON s.filled_draft_id = d.post_draft_id WHERE d.created_at >= NOW() - INTERVAL '24 hours' AND d.scheduled_for IS NOT NULL` | Should be > 0 within 24h post-apply, growing. |
| S24 | F-AI-WORKER-PARSER-SKIP-BUG forward verification | `SELECT count(*) FROM m.ai_job WHERE updated_at >= NOW() - INTERVAL '24 hours' AND status='succeeded' AND output_payload->>'skipped' = 'true'` | Should be > 0 within 24h post-apply when CFW LI fill cycles fire. |
| S25 | Cowork autonomous run check | Verify `docs/audit/health/{today}.md` exists; check no cc-owned briefs were picked up by Cowork. | Empty health file or any cc-owned brief picked up = v2.2 owner-gate failure; investigate. |
| S26 | Tier 1 fix forward verification | Check (a) cron 48 still uses CTE wrapper + IS NOT NULL filter; (b) `m.post_publish_queue` NULL `scheduled_for` count = 0; (c) publisher per-partition cap respected. | Any drift = regression. |
| S27 | M4 forward verification | (1) `SELECT count(*) FROM m.post_draft pd JOIN m.slot s ON s.slot_id = pd.slot_id WHERE pd.slot_id IS NOT NULL AND pd.scheduled_for IS DISTINCT FROM s.scheduled_publish_at` — should remain 0. (2) Publisher-eligible aligned v4 queue rows growing. | Drift on (1) = M4 regression. **v2.39 verified: drift=0 (no regression post-F-YT-OAUTH-PP).** |
| S28 | M5 forward verification | (1) `m.fill_pending_slots(p_max_slots integer)` exists, no p_shadow arg. (2) After cron 75 fires, no errors. (3) `m.evergreen_ratio_7d` returns rows on every call. (4) `m.check_evergreen_threshold` returns `alert` and `ratio_used` keys. | Any failure = M5 regression. |
| **S29 NEW v2.39** | **F-YT-OAUTH-PP forward verification** | After 24-48h: `SELECT COUNT(*) FROM m.post_publish WHERE platform='youtube' AND client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND published_at >= NOW() - INTERVAL '24 hours' AND status='published';` should grow as new PP×YT video drafts are auto-approved + auto-published. Plus: `m.post_draft` for PP×YT in last 24h with `video_status='failed'` AND `youtube_upload_error LIKE '%invalid_grant%'` should remain 0. | Either new invalid_grant errors OR zero new PP×YT publishes within 7 days = regression OR ai-worker still picking text only (latter is F-YT-NY-FORMAT-SELECTION territory, not F-YT-OAUTH-PP regression). |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31.

**v2.39 status delta**: F-YT-OAUTH-PP closed for PP. RECONCILE-EF-DRIFT + F-YT-NY-FORMAT-SELECTION queued. M6-M8 still sequenced.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 34 of 5)

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 34 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17 |
| T-MCP-05 | ✅ DONE v2.29 | — | — |
| T-MCP-05-NEW | Close-the-loop UPDATE on `1bae5068-...` | P3 | PK confirm |
| T-MCP-05-NEW2 | Close-the-loop UPDATE on review_ids from v2.34 + v2.38 + v2.39 | P3 | Combine in next batch closure (7 carry-overs + v2.38's `b3609bc4` + `713dc407` + v2.39's `91caf322` = 10 pending) |
| T-MCP-06 | Investigate plan_review + sql_destructive escalation rates | P3 | **v2.39 update**: sql_destructive clean-proceed pattern now 3-of-3 across v2.38 (M5 ×2) + v2.39 (Template 2). Counter-pattern to recent escalation streak is reproducible when PK pre-approves + bounded scope + empirical evidence + reversible. Track for canonical promotion of clean-proceed pattern. |
| T-MCP-08 | ✅ PROMOTED canonical v2.29 | **REINFORCED 2x v2.36** | M2 + M3 re-fires |
| T-MCP-09 | Lesson candidate: post-apply ACL verification | P3 | After 1-2 more instances |
| T-MCP-10 | Lesson candidate: state-snapshot age ≥ 4h re-verification | P3 | After 1-2 more instances |
| T-MCP-11 | Lesson candidate: pre-flight discipline includes verifying log/health table actually contains data | P3 | Bundle with T-MCP-12 for promotion |
| T-MCP-12 | Lesson candidate: query EVERY annotation column when verifying table contents | P3 | Bundle with T-MCP-11 for promotion |
| T-MCP-13 | Lesson candidate: pre-flight P3 must trace transitive view→fn→fn dependencies, not just touch-points | P2 | Surfaced v2.38. Promote to canonical after 1 more vindication. |
| T-MCP-14 | Lesson candidate: destructive apply must re-snapshot state immediately before apply if >5min has passed since last capture | P2 | Surfaced v2.38 closeout. **v2.39 implicitly honoured** — Template 2 had ~2 min between final state-check and D-01 fire. Promote to canonical after 1 more vindication. |
| **T-MCP-15 NEW v2.39** | **Lesson candidate: don't conclude a feature is missing from a 0-hit code search** | P3 | Surfaced v2.39 — `github:search_code` for `youtube oauth` against invegent-dashboard returned 0 hits despite the feature being live and in production use (PK's reconnect flow). Code search is not exhaustive across all repo paths. Always verify with PK before recommending external alternatives like OAuth Playground. Promote to canonical after 1 more vindication. |

---

## 🤖 Cowork automation (D182)

**v2.39 update**: 2026-05-05 02:00 AEST autonomous run executed cleanly under v2.2 owner-gate (per v2.36). Sunset review: 12 May 2026 — unchanged.

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged from v2.35. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.31 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **NEW v2.39: RECONCILE-EF-DRIFT — sync deployed EF source to repo** | ai-worker v2.11.1, heygen-worker v1.1.0, video-worker v2.1.0 deployed but not in repo; youtube-publisher v1.6.0 matches | **P1 (top next session)** | Pending PK local | PK → repo → next session | Run `npx supabase functions download` × 4 from `C:\Users\parve\Invegent-content-engine`. Commit as sync-only commit. Reply "synced". Required precursor to F-YT-NY-FORMAT-SELECTION fix and ALL EF code patches. |
| **NEW v2.39: F-YT-NY-FORMAT-SELECTION** | NY×YT 100% text-format → 0% YouTube publishes. PP×YT 76% text → only 24% publish viable. Format-advisor-v1 platform-agnostic logic. | P1 | Brief committed `ff5ae6ae`; sequenced after RECONCILE-EF-DRIFT | chat → next session | Read v2.11.1 source post-sync, locate `format-advisor-v1` call site, decide between 4 candidate fix shapes from brief, compose CC-stage brief, D-01, deploy. |
| **M6 Phase A — 108 historical Bug 3 dead-letter** | Clean up `queued` rows with Bug 3 fingerprint | P1 | Pending PK call (carried from v2.38) | PK → chat → after RECONCILE-EF-DRIFT + F-YT-NY-FORMAT-SELECTION | PK directs start; chat composes brief + D-01 + pre-flight P1-P5; apply via Supabase MCP DML. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | Address as part of M6 Phase B. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP residual + YouTube-PP unexpected + YouTube-NY unexpected | P1 | PP×YT cluster likely cleared by F-YT-OAUTH-PP; NY×YT cluster blocked on F-YT-NY-FORMAT-SELECTION | chat → next session | Re-query S21 audit matrix; verify PP×YT now `ok_or_recently_active`. |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix on CFW LI × image_quote | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle (~05-06 03:04 UTC) | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC for CFW LI rows with `output_payload->>'skipped' = 'true'` |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; combined with M4/M5 forward-flow check | chat → next session | Query `m.post_draft` newly-filled rows for `scheduled_for IS NOT NULL` matching `slot.scheduled_publish_at` |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete v2.35; §1 next | chat ↔ PK | PK signals start, write §1 in `Invegent-content-engine/docs/dashboard-review-2026-05/01-current-state-inventory.md` (~1.5h) |
| (others) | per v2.31 | — | — | — | per v2.31 |

**Closed v2.39:**

- **F-YT-OAUTH-PP — Property Pulse YouTube OAuth invalid_grant** ✅ — PK reconnected via `dashboard.invegent.com/connect` (superseded Template 1 SQL); Template 2 reset 4 stuck PP×YT drafts; D-01 cleared first-fire `91caf322-213d-4994-b781-abb54acc70b9`; both cron 34 firings (:15 + :45) published cleanly: `4f07da94→fD3_BmOegaY`, `2cc22fce→FU6AwvULcAs`, `53b16d45→vRTXpKrf56k`, `e59a561d→1_YU6Yc_FfI`. First PP×YT pipeline-driven publishes since 2026-04-01 (~5 weeks dark). Traceability: `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md`.

**Closed v2.38:**

- **M5 — `p_shadow` / `is_shadow` removal + cascade fix on `m.check_evergreen_threshold`** ✅

---

## 💼 Personal businesses

*(none flagged — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.39 changes**:

- **NEW v2.39**: RECONCILE-EF-DRIFT (P1) — promoted to Active, top next-session.
- **NEW v2.39**: F-YT-NY-FORMAT-SELECTION (P1) — promoted to Active, queued behind RECONCILE-EF-DRIFT.
- **NEW v2.39**: T-MCP-15 lesson candidate — code-search 0-hits ≠ feature missing.
- **NEW v2.39**: D-YT-OAUTH-1 standing rule — dashboard `/connect` first for OAuth reconnects.
- **NEW v2.39**: S29 standing check — F-YT-OAUTH-PP forward verification.
- **Closed v2.39**: F-YT-OAUTH-PP for Property Pulse.

**v2.38 changes** (still active):

- T-MCP-13 lesson candidate (pre-flight P3 transitive dependency mapping).
- T-MCP-14 lesson candidate (re-snapshot rule for parallel-session safety).
- M5 closed.
- M6 Phase A promoted Active (still pending PK call; demoted from #2 to #4 in v2.39 due to RECONCILE-EF-DRIFT and F-YT-NY-FORMAT-SELECTION priorities).

**v2.37 changes** (still active):

- M6-M8 sequenced for Tier 2-3.
- 108 historical Bug 3 fingerprint queue rows intentionally retained as `queued`; M6 Phase A address scope.
- queue_id `ad573844` dead-lettered.
- 47 v4-origin queue rows still mismatch slot intent — M6 Phase B address scope.

**v2.36 changes** (still active):

- (M5 closed in v2.38; M6-M8 still sequenced)

**v2.35 changes** (still active):

- F-COWORK-OWNER-GATE-BUG ✅ CLOSED v2.35.
- 3 stuck-item clusters from health check — Active P1; re-evaluated v2.36 + v2.37 + v2.38 + v2.39.
- ICE Dashboard Architecture Review — Active strategic workstream.

**v2.34 changes** (still active):

- F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009 — V3-V5 acid tests remain (Active rows). Quintuple-test window ~05-06 03:04 UTC.

**v2.33 additions** (still active):

- **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts. Top P2 next-up.
- **B-TOKEN-HEALTH-EMPTY (P3)** — `m.platform_token_health` empty for all clients.
- **F-CFW-LI-DUP-SLOTS (P3)** — historic; part of 6 exceeded_recovery_attempts cluster.

**Carried from v2.31**:

- **B-WORKER-LOG-GAP (P3)**, **B-AUDIT-FRAMEWORK-PROPOSAL (P3)**, **B-CRON-BLOAT (P3)**, **F-AAP-003 (P3)**, **B-CRON-V3-ORPHAN (P3)**, **B-CRON-V3-ORPHAN-READERS (P3)**, **F-AAP-004/005/006 (P3-P4 dormant)**, **F-AAP-001 dead-join cleanup**, **B-AUDIT-CYCLE3**, **F-PUB-008** (NULL platform_post_id, P2), **B-INV-LinkedIn-PhantomPublishes** (P2), **B39** (Drain over-cap queues, P3 by design), **B-PP-FB-ORPHAN-PENDING-FILL (P3)**, **F-RECOVER-LOOP-001 (P3 demoted v2.33)**.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.39 twenty-first — pre-flight P1-P5 honoured before Template 2 apply)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication; REINFORCED v2.38; **REINFORCED v2.39 — state-capture immediately before Template 2 apply, T-MCP-14 implicitly honoured**)
- **Lesson #62 type-(c) — sixth vindication v2.37 (M4 re-fire). READY FOR CANONICAL PROMOTION.** v2.38 + v2.39 did not vindicate (3 clean proceeds in 24h); promotion still pending but counter-pattern accumulating evidence for distinct lesson.
- G1 sync_state restructure (v2.23) — honoured through v2.39
- Lessons #40, #41, #42 promoted canonical
- T-MCP-08 PROMOTED canonical v2.29 — REINFORCED 2x v2.36
- T-MCP-09 lesson candidate (post-apply ACL verification, since v2.29)
- T-MCP-10 lesson candidate (state-snapshot age ≥ 4h re-verification, since v2.30)
- T-MCP-11 lesson candidate (pre-flight log/health table content verification, since v2.31)
- T-MCP-12 lesson candidate (query EVERY annotation column when verifying, since v2.32)
- T-MCP-13 lesson candidate (pre-flight P3 transitive dependency mapping, since v2.38)
- T-MCP-14 lesson candidate (state-freshness rule for destructive apply, since v2.38)
- **T-MCP-15 NEW v2.39: code-search 0-hits ≠ feature missing.** GitHub MCP `search_code` returned 0 hits for `youtube oauth` against invegent-dashboard despite the feature being live. Promote to canonical after 1 more vindication.
- **Clean-proceed counter-pattern on `sql_destructive`** — v2.38 (2 fires) + v2.39 (1 fire) = 3-of-3 clean proceeds when PK pre-approves + scope tight + evidence empirically grounded + rollback explicit. Distinct from Lesson #62; promote to canonical after 1-2 more vindications.
- Lesson candidates v2.33-v2.36 retained.

---

## v2.39 honest limitations

- All v2.31-v2.38 limitations apply.
- **F-YT-OAUTH-PP closed for PP only.** NY×YT OAuth not verified end-to-end (NY has no historical YT publishes; only test data). Cannot prove NY's new refresh_token works for upload until ai-worker selects a video format for NY×YT — currently 0% per F-YT-NY-FORMAT-SELECTION.
- **F-YT-NY-FORMAT-SELECTION fix path is unconfirmed.** Brief lists 4 candidate fix shapes; the actual implementation depends on `format-advisor-v1`'s architecture which is not visible without source sync. Blocks on RECONCILE-EF-DRIFT.
- **`is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai`** despite M5 column drop. Legacy code path still writes the JSONB key. Not a regression; investigate post-source-sync.
- **2 NY×YT avatar test drafts** (a501aa6a, 80d8d2b7) from 2026-04-09 have HeyGen-hosted URLs that have already expired (`?Expires=1776301302` ≈ 15 Apr 2026). Latent issue; not actionable until heygen-worker column-vs-JSONB drift resolved post-source-sync.
- **10 close-the-loop UPDATEs still pending** (carry-over 7 + v2.38's 2 + v2.39's `91caf322`). Combine in next batch closure.
- **Closure budget remains well above floor** (~26h trailing-14-day). v2.39 added ~1h; rate continues high but justified by directly attributable production-defect closure.
- **RECONCILE-EF-DRIFT identified as a blocker but not yet resolved.** PK runs the source-download commands locally when ready. Until then, no EF code patching is safe.

---

## Changelog

- v1.0–2.32: per previous changelog.
- v2.33–2.37: per previous changelog.
- v2.38: per previous changelog.
- **v2.39 (2026-05-05 Sydney evening session-end, F-YT-OAUTH-PP restored for Property Pulse):**
  - **F-YT-OAUTH-PP CLOSED for Property Pulse.** PK reconnected PP+NY YouTube via `dashboard.invegent.com/connect` (superseded staged Template 1 SQL). c.client_channel.config.refresh_token verified at 09:02 (NY) and 09:03 (PP) UTC, both 103-char canonical Google length, both is_enabled=true. Template 2 SQL — `UPDATE m.post_draft SET video_status='generated', draft_format = draft_format - 'youtube_upload_error' - 'youtube_upload_attempted'` for 4 specific UUIDs with state guards — D-01 cleared first-fire `91caf322`. Applied via Supabase MCP execute_sql. 4 rows returned, idempotent guards held. Both cron 34 firings published cleanly: 09:15 took kinetic drafts (4f07da94 → `fD3_BmOegaY`, 2cc22fce → `FU6AwvULcAs`); 09:45 took stat drafts (53b16d45 → `vRTXpKrf56k`, e59a561d → `1_YU6Yc_FfI`). All 4 m.post_publish rows created; pp_status='published'; no new youtube_upload_error.
  - **NEW finding RECONCILE-EF-DRIFT (P1)**: ai-worker v2.11.1, heygen-worker v1.1.0, video-worker v2.1.0 (entire EF) deployed but not in repo; youtube-publisher v1.6.0 matches. Surfaced as F-YT-ASSET-GEN-GAP precursor. Blocks ALL EF code patching including F-YT-NY-FORMAT-SELECTION fix. Resolution: PK runs `npx supabase functions download` × 4 locally and commits as sync-only commit.
  - **NEW finding F-YT-NY-FORMAT-SELECTION (P1)**: ai-worker v2.11.1 selects `recommended_format='text'` for 100% NY×YT (8/8) and 76% PP×YT (13/17). Format-advisor-v1 (visible in `draft_format.ai.format_advisor_key`) is a separate component making content-driven decisions; platform-agnostic in current logic. Brief committed `docs/briefs/2026-05-05-f-yt-ny-format-selection.md` (commit `ff5ae6ae`). Lists 4 candidate fix shapes; no fix attempted. Sequenced after RECONCILE-EF-DRIFT.
  - **NEW STANDING RULE D-YT-OAUTH-1**: dashboard `/connect` and `/clients?tab=connect` is canonical reconnect path for FB/IG/LI/YT OAuth tokens; OAuth Playground is fallback. Memory edit landed.
  - **NEW S29 standing check** added: F-YT-OAUTH-PP forward verification at 24-48h.
  - **NEW T-MCP-15 lesson candidate**: code-search 0-hits ≠ feature missing. GitHub `search_code` for `youtube oauth` returned 0 hits despite the feature being live. Promote to canonical after 1 more vindication.
  - **D-01 fires this session: 1 (Template 2, clean proceed, no escalation, no pushback).** review_id `91caf322-213d-4994-b781-abb54acc70b9`. T-MCP-02 quota: 33 → 34. Counter-pattern reinforced (3-of-3 clean proceeds across recent sql_destructive D-01s).
  - **Net P0+P1 open**: 4 → 5 (F-YT-OAUTH-PP closed; RECONCILE-EF-DRIFT + F-YT-NY-FORMAT-SELECTION promoted). Within 20-finding cap.
  - **Closure budget**: +~1h F-YT-OAUTH-PP. Day total ~7h. Trailing-14d ~26h. Above 8.0 floor.
  - **No EF deploys.** **M6 untouched.** **Old D-01 review `a80cf579-...` remains superseded, never cited as cleared.**
