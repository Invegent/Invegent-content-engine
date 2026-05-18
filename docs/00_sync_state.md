# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-18 | cc-0017a-applied-l41-l47 | **cc-0017a Wave 0a APPLIED + 20/20 V-CHECKS PASS + L41/L47/L-v2.81-a + 4-way atomic close (v2.81).** Migration applied 06:56:10 UTC by parallel Claude session under Path B clearance from D-01 `adcc8385-...`. NOT v2.80-close chat (closed cleanly at 06:51:44 UTC with 0 mutations). NOT this session (read-only tools + V-checks only). Provenance investigation: postgres `mgmt-api` connection signature confirms Supabase MCP origin; conversation_search project-scoped → parallel session in another project / Claude surface invisible. PK confirmed parallel apply, no security incident. Path B → Path A conversion: 15 read-only V-checks PASS at session open + 5 write-based V-check pairs PASS post-approval (V-A14a/b, V-A15a/b, V-A16a/b, V-A19a/b) + V-A20 cleanup unconditional + zero residual. Production state preserved: 22 cases / 22 events / 3 source seeds. T-MCP-02 cum 71 unchanged (no new D-01 — apply ran under prior clearance). State-capture exceptions: 1 (unchanged). L41 exercised 3rd time (parallel-session apply not in sync_state). L47 unchanged at 1 occurrence. **L-v2.81-a candidate PROPOSED (1 occurrence): parallel-session apply coordination — operator should designate single applying chat; next-session pre-flight is non-skippable; applying session must commit audit-trail update or notify operator.** Apply gate CLOSED; cc-0017b authoring gate OPEN (P1 r1 v2.81). Dashboard PHASES 34th consecutive deferral. | `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` |
| 2026-05-18 | cc-0017a-v1.1-and-d01-fire | **cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B (v2.80).** L41 discovery at session open: v1.0 brief existed at `068f8dcb` from earlier same-day session, not referenced in sync_state v2.79. v1.1 patch authored fixing 4 defects/gaps (UUID malformations in 6 V-checks; jsonb canonicalisation note; P9 operator_friction extension; P7b orphan-case pre-flight). L41 manifested on push: "failed three times" was actually "succeeded first time, ack dropped". Patch landed at commit `986e4bca`. Pre-flight P1–P12 + P7b all clean. D-01 fire via ChatGPT Review (review_id `adcc8385-...`): verdict=partial, risk=medium, confidence=medium, escalate=true. 3 pushbacks all type-(c) per L62. PK directed Path B. Close-the-loop UPDATE on m.chatgpt_review row. **0 production mutations this session.** T-MCP-02 cum 69→71. State-capture exceptions unchanged at 1. **L47 candidate proposed**: check list_recent_commits before retrying apparent push failures. 4-way atomic sync. Dashboard PHASES **33rd consecutive deferral**. | `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` |
| 2026-05-18 | v2.79-friction-plan-signed | **FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED (v2.79).** Pre-signature chat review surfaced 2 residual ambiguities. PK obtained 4th cross-check (ChatGPT) → 2 clarifications locked as §5.5. PK signed. 32 decisions LOCKED + 2 §5.5 clarifications. cc-0017a Wave 0a authoring execution gate now OPEN. 0 D-01 fires. 4-way atomic sync. Dashboard PHASES: 32nd consecutive deferral. | `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` |
| 2026-05-18 | v2.78-friction-register-consolidation-planning | **FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED (v2.78).** Planning-only session. 4-layer architecture locked. 32 decisions governing execution. 3 independent LLM reviews → 10/11 findings incorporated. Wave 0 split to 0a/0b/0c. cc-0015 + cc-0016 demoted to Waves 7-8. cc-0017a (Wave 0a) ready for authoring on PK approval. **0 D-01 fires.** | `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` |
| 2026-05-18 | cc-0014-archived-and-recon-daily | **cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY + HOLD-STANCE LIFTED (v2.77).** Closed 11 days before Day-19. D-IOL-001 logged. cc-0015 + cc-0016 + publisher recovery + dashboard PHASES all unblocked. 2 D-01 fires (type-(c) PK approval per L62). T-MCP-02 cum = 69. | `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | **cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PROD + cc-0015 + cc-0016 DRAFTED (v2.76).** Stage E close via migration. Window opened. FAB live via Vercel env var. cc-0015 + cc-0016 briefs drafted PENDING_EXECUTION. **(Window closed early 2026-05-18 per v2.77.)** | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | **cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75).** | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | **cc-0014 Stage C APPLIED (v2.74).** | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | **cc-0014 Stage B APPLIED (v2.73).** | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | **cc-0014 Stage A APPLIED (v2.72).** | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |
| 2026-05-13 | cc-0012-closed-with-variance | cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71). | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70). | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69). | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68). | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED — r.* DDL foundation delivered (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |
| 2026-05-11 | post-cc0009-process-upgrades-l44-l48-applied | L44–L48 process upgrades FORMALISED + committed (v2.66). | `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md` |
| 2026-05-11 | cc-0009-stages-d-e-closed | cc-0009 Stages D + E CLOSED (v2.65). | `docs/runtime/sessions/2026-05-11-cc-0009-stages-d-e-closed.md` |

*(Older sessions truncated for brevity — full index preserved in v2.66 archive.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-18 Sydney evening — cc-0017a Wave 0a APPLIED + 20/20 V-CHECKS PASS + L41/L47/L-v2.81-a (v2.81)

**Outcome:** cc-0017a Wave 0a migration `cc_0017a_friction_foundational_schema` confirmed applied at **2026-05-18 06:56:10 UTC** by a parallel Claude session under the Path B clearance from D-01 review_id `adcc8385-b9be-4573-8d64-b40510202940`. **Not the v2.80-close session** (closed cleanly at 06:51:44 UTC with explicit "0 production mutations / apply gate OPEN / Done."). **Not this session** (read-only tools + post-apply V-checks only). PK confirmed parallel-session apply; no security incident. Path B → Path A conversion executed with explicit per-step PK approval. 15 read-only V-checks PASS at session open + 5 write-based V-check pairs PASS post-approval + V-A20 cleanup unconditional + zero residual. **Production state preserved: 22 cases / 22 events / 3 source seeds / 0 test rows residual.** Apply gate **CLOSED**; cc-0017b Wave 0b authoring gate now **OPEN** (P1 rank 1 v2.81).

**Sequence:**

1. **Session open** — read sync_state v2.80 (sha `1271003480`) + action_list v2.80 (sha `8a05f89e`). Today/Next 5 rank 1 v2.80: cc-0017a APPLY UNGATED. PK approval: "Go and apply wave zero a."
2. **Brief v1.1 fetched** at commit `986e4bca` for migration SQL body.
3. **Pre-flight reconfirmation (batched jsonb P1-P12 + P7b)** returned post-apply state: P2=4 (expected 0), P3=9 (expected 0), P4=1 (expected 0), P5=1 (expected 0), P11 includes `fn_compute_dedupe_fingerprint_v1`, P12=1. **HARD STOP.**
4. **Migration history check**: `supabase_migrations.schema_migrations` version `20260518065610` = 2026-05-18 06:56:10 UTC, single statement, 12,271 bytes, body verbatim matches brief v1.1 §5.2. Clean lineage.
5. **L41 / L47 manifestation surfaced to PK** with 3 path options (A: confirm self → V-checks → close; B: investigate provenance gap; C: rollback + re-apply).
6. **PK directed Path B** — read-only V-A1-A20 only; no 4-way close until apply provenance resolved.
7. **15 read-only V-checks executed and PASS**: V-A1, V-A2, V-A3 (schema), V-A4, V-A5, V-A6, V-A13 (negative-test INSERTs raising 23514/23514/23503/23505), V-A7, V-A8 (function determinism + null handling), V-A9, V-A10, V-A11, V-A12 (backfill 22/0/22, recompute 0 mismatches, open distinct 22/22, index def correct), V-A17 (service_role SELECT), V-A18 (anon denied with 42501).
8. **State recorded:** *cc-0017a Wave 0a schema appears fully applied and valid; 15/20 read-only V-checks passed; remaining 5 skipped due to write requirement; production mutation provenance unresolved.*
9. **Branch 2 read-only provenance investigation**:
    - Postgres logs window 07:25-07:35 UTC: `application_name=mgmt-api` connection signature confirmed at 07:35:45 UTC from IPv6 AWS range = Supabase Management API = `apply_migration` MCP path.
    - API logs: no DDL traffic (consistent — `apply_migration` doesn't route through PostgREST).
    - m.chatgpt_review window 04:00-08:00 UTC: single D-01 row `adcc8385-...` (the prior fire) — no second D-01 around apply, applier acted on existing Path B clearance, procedurally consistent.
    - Migration history: clean lineage; only cc-0014 close at 00:02 + cc-0017a at 06:56 today.
    - conversation_search + recent_chats 06:30-07:30 UTC: only chat `8af15492` (v2.80-close session) which ended at 06:51:44 with "0 production mutations / apply gate OPEN / Done." — did NOT apply.
    - Search project-scoped — parallel session in another project / Claude surface / API client invisible.
10. **PK confirmed**: "I recognise this was most likely from another Claude/session/window under the Path B clearance."
11. **Path B → Path A conversion**: PK approved V-A14 through V-A20 with 2 amendments (cleanup unconditional after any prior write; split duplicate-INSERT tests into separate execute_sql calls).
12. **V-A14a, V-A14b, V-A15a, V-A15b, V-A16a, V-A16b, V-A19a, V-A19b all PASS**. V-A19 first attempt was CTE-laziness no-op (no row written, no cleanup needed); split into 19a (function call standalone, event_id `ccdd2ade-...`) + 19b (read-back: event landed, case `c2d21a27-...` created by existing trigger, **`dedupe_fingerprint=NULL` on new case — observational invariant PROVEN**).
13. **V-A20 cleanup PASS**: zero residual across all 5 tables (test_cases_by_title=0, test_cases_by_uuid=0, test_events=0, test_errors=0, test_rules=0, test_policies=0); production state preserved (total_cases_after=22, total_events_after=22, total_sources_after=3).
14. **4-way close drafted with explicit L41/L47/L-v2.81-a parallel-session audit coordination note**; PK approved with wording correction ("3 files in one atomic commit" not "four files" — Lessons section is embedded content, not a separate file).
15. **3-file atomic `push_files` commit** (this commit): sync_state v2.81 + action_list v2.81 + new per-session file `2026-05-18-cc-0017a-applied-l41-l47.md`.

**D-01 fires this session: 0.** Apply ran under prior clearance. T-MCP-02 cumulative unchanged at **71**.

**Production mutations: net zero.** ~6 inserts + ~6 deletes on `friction.*` test rows. Zero schema mutations from this session (no `apply_migration` calls).

**Items resolved this session:**
- cc-0017a Wave 0a APPLY (v2.80 rank 1) → **CLOSED-APPLIED** ✅ (20/20 V-checks PASS)
- Provenance investigation → resolved (parallel session under Path B clearance, PK confirmed)

**Items unblocked by v2.81:** cc-0017b Wave 0b authoring → **P1 rank 1 v2.81** (unified `friction.emit_event` + new trigger + reopen 14-day logic + 3 emit_* functions to thin wrappers).

**Lesson outcomes:**
- **L41 exercised 3rd time** across v2.80-v2.81 pair: (a) v1.0 brief existed pre-v2.80, (b) v1.1 patch ack-dropped, (c) parallel-session apply not in sync_state. Cumulative occurrences: 3. Baseline pattern needs tightening — **empirical pre-flight is non-skippable even when sync_state is fresh**.
- **L47**: unchanged at 1 occurrence (no GitHub MCP push-failure-with-dropped-ack this session).
- **L62 baseline**: not re-exercised v2.81 (no D-01 fire).
- **L58**: 3-file atomic push_files applied this session close — baseline correctly applied.
- **L-v2.78-a watcher candidate**: unchanged at 2 occurrences (no new convergence event).
- **L-v2.81-a CANDIDATE PROPOSED (1 occurrence)** — see below.

**L-v2.81-a candidate (parallel-session apply coordination):** *When a Path B clearance is granted (apply deferred to a separate session), it can be acted on by ANY parallel Claude session with Supabase MCP access — across projects, across Claude surfaces, across browser tabs, across accounts. The chat-side audit trail (sync_state in any one project) cannot reliably observe parallel-session applies. Therefore: (i) operator should designate a single applying chat per Path B clearance; (ii) any next-session reading sync_state with an OPEN apply gate MUST run empirical pre-flight before assuming the gate is still open — sync_state is best-effort, pre-flight P-set is authoritative; (iii) applying session must commit audit-trail update to originating project's sync_state OR notify the operator to do so.* Promotion-eligible on re-exercise.

**v2.81 honest limitations:**
- The audit-trail provenance gap is a structural finding, not a fixed issue. L-v2.81-a is candidate-only; until baseline, parallel-session apply discipline is non-codified operator-side practice.
- Pre-flight evidence captured 06:40 UTC in `m.chatgpt_review.context` is now historical; cc-0017b will need a fresh pre-flight P-set.
- friction.* schema state v2.81: 9 tables (5 cc-0014 + 4 cc-0017a), 10 functions (9 cc-0014 + 1 new), 1 partial unique index. Wave 0b will replace 3 emit_* + 1 trigger — that introduces behavioural change scope deliberately deferred from 0a.
- Dashboard PHASES 34th consecutive deferral — trending strongly toward "first do dashboard sync" discipline call.
- L41 cumulative occurrences across v2.80-v2.81: 3. Recommend formal baseline tightening at next lesson cycle.
- Migration body fully validated against live schema (20/20 V-checks PASS), but Wave 0b not yet authored — Wave 0b authoring needs cc-0014 emit_* function inventory + reopen-window-14d formula + trigger replacement strategy.

---

### 2026-05-18 Sydney evening — cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B (v2.80)

**Outcome:** cc-0017a Wave 0a brief authoring completed via L41-recovery path. v1.0 brief discovered already on main at commit `068f8dcb` from earlier same-day session (sync_state v2.79 didn't reference it). v1.1 patch authored fixing 4 defects/gaps; patch landed at commit `986e4bca` (where "failed three times" was actually "succeeded first time, ack dropped" — explicit-sha guard worked as designed). Pre-flight P1–P12 + P7b executed in single batched jsonb query: all 13 checks PASS. D-01 fired via ChatGPT Review (review_id `adcc8385-...`): verdict=partial, risk=medium, confidence=medium. 3 pushbacks all classified type-(c) per L62 baseline (echoes of self-disclosed weak evidence + own review questions; no new substantive evidence). PK directed Path B (apply deferred to separate session). Close-the-loop UPDATE on m.chatgpt_review row completed. **0 production mutations this session** (close-the-loop is m.chatgpt_review only, not schema).

**Key state at v2.80 close:**
- cc-0017a v1.1 brief on main at commit `986e4bca`
- D-01 disposition recorded: review_id `adcc8385-b9be-4573-8d64-b40510202940`, resolved partial-type-c per Path B
- Apply gate **OPEN for next session**
- T-MCP-02 cum: 71 (+1 D-01 fire +1 close-the-loop UPDATE)
- L41 exercised twice this session (session-open + push-confusion)
- L62 exercised (3 type-c classifications)
- L47 CANDIDATE PROPOSED (1 occurrence): check list_recent_commits before retrying apparent GitHub MCP write failures

*(Full detail at per-session file `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.81)

1. **cc-0017b Wave 0b authoring** (P1 rank 1 v2.81 — promoted from v2.80 closed). Unified `friction.emit_event(p_source, p_condition_key, p_problem_key, p_severity_override, p_dynamic_context, p_observation_text, p_severity, p_category, p_current_route, p_related_object, p_notes)` per Amendment E (8+2 params); new attach-or-create trigger replacing `fn_promote_event_to_case`; reopen window N=14 days per §5.5 Clarification 1; migration of 3 existing emit_* functions (`fn_emit_reconciliation_event`, `fn_emit_health_check_findings`, `fn_emit_manual_event`) to thin wrappers; transition-step backfill of any NULL `dedupe_fingerprint` rows created between 0a apply (06:56 2026-05-18) and 0b apply. Per cc-0017a v1.1 brief shape. D-01 + apply in separate sessions per cc-0017a precedent.
2. **Reconciliation daily cadence diagnostic** — P1 rank 2 v2.81 carry from v2.80 rank 2.
3. **Health_check V-C3 + signal-production diagnostic** — P1 rank 3 v2.81 carry.
4. **Music library activation** — P2 rank 4 v2.81 carry.
5. **Personal businesses check-in** — standing P0.

Carries (lower priority, unchanged from v2.80):
- 25 close-the-loop UPDATEs (22 historical CCH-locked + 3 v2.77 new).
- Dashboard PHASES sync — **34th** consecutive deferral.
- cc-0017a v1.2 doc patch (combined defects + L60 + L63–L65 + L-v2.76 a–f framing + L-v2.78-a + L47 + L-v2.81-a if promoted).
- v1.1 cc-0012 / v1.6 cc-0010A / v1.3 cc-0011 minor doc patches.
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN).
- Memory cap hygiene (19/30; 11 free slots).
- Localhost FAB cleanup.
- IG cron 53 re-enable.
- YT publisher diagnostic.
- Platform Reconciliation View brief authoring.
- M8b separate brief authoring.
- **L-v2.78-a baseline promotion eligibility** — 2 occurrences reached.
- **L47 candidate** (1 occurrence) — promote on re-exercise.
- **L-v2.81-a candidate** (1 occurrence v2.81 NEW) — promote on re-exercise.

---

## ⛔ Carried-forward "do not touch" state

**v2.81 update on standing items:**

- **cc-0017a Wave 0a APPLIED + CLOSED (v2.81).** Migration `cc_0017a_friction_foundational_schema` live at version `20260518065610` (single statement, 12,271 bytes, body verbatim matches brief v1.1 §5.2). 20/20 V-checks PASS. friction.* schema state: 9 tables (5 cc-0014 + 4 cc-0017a: source/emission_rule/emission_rule_history/notification_policy), 10 functions (9 cc-0014 + 1 new: fn_compute_dedupe_fingerprint_v1), 1 partial unique index (case_open_dedupe_uniq). 22 existing cases backfilled with sha256 fingerprints, all distinct.
- **Friction Register Consolidation Plan v1 + amendments + §5.5 SIGNED 2026-05-18 Sydney evening** (carried unchanged from v2.79).
- **m.chatgpt_review row for D-01 review_id `adcc8385-...`** status=`resolved` (unchanged from v2.80). Pre-flight evidence in `.context` field now historical (apply consumed); cc-0017b will need fresh pre-flight.
- **cc-0014 CLOSED-ARCHIVED v2.77.** Unchanged.
- **cc-0015 friction-pool-view**: AUTHORED PENDING_EXECUTION (commit `9a5dc155`). Wave 7. Unchanged.
- **cc-0016 friction-capture-evidence**: AUTHORED PENDING_EXECUTION (commit `f35f8ea4`). Wave 8. Unchanged.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **PostgREST exposed_schemas continues to include `friction`** (carry).
- **cron 85 schedule: daily** (unchanged since v2.77). All other crons unchanged.
- **L58 BASELINE v2.76** carried (applied this session — atomic 3-file push_files).
- **L62 baseline-eligible v2.77** carried; not re-exercised v2.81 (no D-01 fire).
- **L-v2.78-a watcher candidate v2.78**: at 2 occurrences (unchanged this session). Still eligible for baseline promotion.
- **L47 CANDIDATE v2.80**: at 1 occurrence (unchanged v2.81). Promotion eligible on re-exercise.
- **L-v2.81-a CANDIDATE PROPOSED v2.81 (1 occurrence)**: parallel-session apply coordination. Promotion eligible on re-exercise.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.81; promotion still pending.
- **cc-0009 PRV-1 second build: COMPLETE.** Unchanged.
- **cc-0012 PRV v1: CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.
- **cc-0011 cadence-drift-checker: CLOSED-WITH-VERIFIED-VARIANCE v2.70.** Unchanged.
- **cc-0010C reconciliation-matcher: CLOSED-WITH-VERIFIED-VARIANCE v2.69.** Unchanged.
- **cc-0010B ice-evidence-materialiser: CLOSED-WITH-VERIFIED-VARIANCE v2.68.** Unchanged.
- **cc-0010A r.* DDL Foundation: APPLIED + CLOSED v2.67.** Unchanged.
- **25 close-the-loop UPDATEs outstanding** (22 historical CCH-locked + 3 v2.77 new). No additions v2.81.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION**: P3 OPEN.
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY**: P3 OPEN.
- **L34 trigger filter audit**: P3 carry.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows**: retained per directives.
- **T-MCP-02 quota: 71 cumulative v2.81** (unchanged from v2.80).
- **State-capture exceptions cumulative: 1** (unchanged).
- Cron 82-86 firing normally.
- **Dashboard roadmap PHASES** — **34th** consecutive deferral. Trending strongly toward "first do dashboard sync, then continue" discipline call.
- M-series total dead-letter rows cleared since 8 May 2026: 396 rows.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — list unchanged.
- **Cowork output pipeline**: V-C3 still PENDING live run.
- **Production FAB live on dashboard.invegent.com**: unchanged from v2.76.
- **Localhost FAB cleanup pending**: `.env.local` still has flag enabled. Carry P3.
- **22 escalated m.chatgpt_review rows remain** as of 2026-05-17 (21 historical CCH-locked + 1 T-MCP-05 meta). Not to be closed without explicit PK directive.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` written. This sync_state + action_list updated. Dashboard PHASES 34th consecutive deferral. 3-file atomic sync via push_files (L58 baseline applied).

**This file size**: ~26KB after this update (v2.81 current + v2.80 previous inlined per G1 "1-2 sessions inlined" rule; v2.79 + earlier retained as pointer rows only).

---

*Last updated: 2026-05-18 Sydney evening — v2.81: cc-0017a Wave 0a APPLIED + 20/20 V-checks PASS + L41/L47/L-v2.81-a. Migration applied 2026-05-18 06:56:10 UTC by parallel Claude session under Path B clearance; PK confirmed; no security incident; audit-trail gap structural. Path B → Path A conversion: 15 read-only + 5 write-based V-check pairs + V-A20 cleanup, all PASS. Production state preserved (22 cases / 22 events / 3 source seeds / 0 residual). T-MCP-02 cum 71 unchanged. State-capture exceptions 1 unchanged. L41 exercised 3rd time. **L-v2.81-a candidate PROPOSED**: parallel-session apply coordination. Apply gate CLOSED; cc-0017b Wave 0b authoring gate OPEN (P1 r1 v2.81). 3-file atomic sync. Dashboard PHASES 34th consecutive deferral. Previous (v2.80): brief v1.1 + D-01 partial type-c + PK Path B.*
