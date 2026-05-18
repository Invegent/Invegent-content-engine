# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-18 Sydney late evening (**v2.83 — cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN across commits `65047388`–`7f40e554` (HEAD `7f40e554`). 6 brief defects + 2 rollback body inlinings (§5.5.5c + §5.5.5d) all resolved. Production mutations 0. D-01 fires 0. T-MCP-02 cum 73 unchanged. cc-0017c brief authoring opened per PK 4-item scope: (1) FK hardening on `friction.event.source`; (2) direct-write lockdown REVOKE; (3) `resolved_at`/`resolution_kind` backfill; (4) pre-flight grant capture for exact rollback. No apply, no D-01 unless explicitly authorised. L-v2.81-a re-exercised → occurrence 2 → PROMOTION ELIGIBLE at next lesson cycle per PK directive. Dashboard PHASES 36th consecutive deferral. 3-file atomic push_files close (sync_state + action_list + per-session file).** **Today/Next 5 rebuilt**: cc-0017c D-01 → rank 1; cc-0017c apply → rank 2; reconciliation diagnostic → rank 3.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.82.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a (watcher → promotion-eligible v2.79) + L47-candidate + L-v2.81-a-candidate (now **2 occurrences v2.83 — promotion-eligible**) carried. **D-IOL-001 (v2.77) carried.** **D-CC-0017B-Q1** (severity_override query-pattern note) carried.

**v2.83 ADDITIONS:**

- **cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN.** Commits `65047388`–`7f40e554` (HEAD `7f40e554`). 6 brief defects + 2 rollback body inlinings (§5.5.5c + §5.5.5d) all resolved. Brief is now self-contained for rollback. Source-of-truth precedence locked at top of §5.5.5: (1) brief; (2) `supabase_migrations.schema_migrations` row; (3) `pg_get_functiondef` (only valid PRE-cc-0017b apply).
- **cc-0017c brief authoring opened.** PK 4-item scope: FK hardening on `friction.event.source` + direct-write lockdown REVOKE + `resolved_at`/`resolution_kind` backfill + pre-flight grant capture for exact rollback. Multi-file structure following cc-0017a/cc-0017b precedent. Brief commit happens SEPARATELY from this v2.83 close commit. No apply, no D-01 this session per PK explicit directive.
- **L-v2.81-a re-exercised → occurrence 2.** Doc-only parallel-session coordination (lower risk than v2.81's occurrence 1 apply-class case; same coordination pattern). **Promotion-eligible at next lesson cycle per PK directive this session.**
- **D-01 fires v2.83: 0.** T-MCP-02 cum **73** unchanged.
- **Today/Next 5 rebuilt**: cc-0017c D-01 → rank 1; cc-0017c apply → rank 2 (gated on D-01); reconciliation diagnostic → rank 3 (was rank 2 v2.82); health_check V-C3 → rank 4; music library → rank 5.
- **State-capture exceptions: 1** (unchanged).
- **L62 not exercised v2.83** (no D-01 fire).
- **L41 not exercised v2.83** (no SQL execution; verification via `get_file_contents`).
- **L58 applied v2.83** — 3-file atomic push_files this commit.
- **L-v2.78-a** unchanged at 2 occurrences.
- **L47** unchanged at 1 occurrence.
- **Closed Active rows v2.83**: cc-0017b brief v1.1 patch (6 defects + 2 rollback bodies) → CLOSED-APPLIED-ON-MAIN.
- **New Active rows v2.83**: cc-0017c brief authoring (IN FLIGHT — closing on brief commit later this session); cc-0017c D-01 fire (P1 rank 1, gated on PK authorisation); cc-0017c apply (P1 rank 2, gated on D-01).
- **Dashboard PHASES sync: 36th consecutive deferral.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (cc-0017c D-01 + cc-0017c apply + recon daily diagnostic + health_check signal diagnostic) — up 1 from v2.82 (new cc-0017c apply row) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~15h (unchanged v2.83; close+authoring session is light) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.83 cycle: ~1h total** (read sync_state v2.82 + action_list v2.82; spot-check v1.1 patch on main via `get_file_contents`; draft 3-file close package; cc-0017c brief authoring done as separate commit post-close). 0 schema mutations this session.

**State-capture exception count v2.83: 0**. Cumulative: 1 (unchanged).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-18 Sydney late evening (v2.83).
> **v2.83 note:** cc-0017b v1.1 doc patch CLOSED-APPLIED-ON-MAIN. cc-0017c brief authoring opened post-close (separate commit). **PK explicit directive this session: no apply, no D-01 fire** unless explicitly authorised.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017c D-01 plan_review fire** | **P1 (rank 1 v2.83 — NEW)** | cc-0017c brief authored this session (separate commit post-close). D-01 must fire before apply per ICE-PROC-001. Per PK directive this session: **no D-01 fire unless explicitly authorised.** Awaits PK explicit authorisation to fire. | chat → PK | PK authorises; chat fires `ask_chatgpt_review` with brief reference + pre-flight P-set output incl. captured grants JSON + current `resolved_at`/`resolution_kind` row counts + FK validity probe results + default action "do not apply, ask PK". |
| 2 | **cc-0017c apply** | **P1 (rank 2 v2.83 — NEW)** | Gated on D-01 verdict + PK explicit approval. Pre-flight P-set rerun + `apply_migration` + V-checks + close-the-loop UPDATE on `m.chatgpt_review`. Apply in a separate session per cc-0017a/cc-0017b precedent. | chat → PK | PK approves post-D-01; chat applies. |
| 3 | **Reconciliation daily cadence diagnostic** | **P1 (rank 3 v2.83 — was rank 2 v2.82)** | cron 85 next fire ≈2026-05-19 03:30 AEST (≈17:30 UTC). Question post-cc-0017b: did the wrappers route correctly through unified `emit_event`? Did `r.cadence_drift_log` write rows? did `friction.event` write rows? are they paired correctly? | chat → PK | Post-fire SQL: count `r.cadence_drift_log` rows since last fire + count `friction.event source='reconciliation'` rows same window. |
| 4 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 4 v2.83 — was rank 3 v2.82)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready`. Awaiting next Cowork fire. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event. |
| 5 | **Music library activation** | **P2 (rank 5 v2.83 — was rank 4 v2.82)** | Code wired in `video-worker` v3.0.0. ~30 min PK-led with chat guidance. | PK + chat | Create bucket `post-music`; upload 9 tracks; set env var; smoke test one video render. |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.83**: Cron 82 + 83 + 84 + 85 (daily) + 86 unchanged. PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.83**: 9 tables (unchanged from v2.82); 12 functions (unchanged); 1 partial unique index (unchanged); 1 corrective fix on emit_event (unchanged); 3 emission_rule seeds active (reconciliation/observer_stale, health_check/true_stuck, manual/manual_fab); friction.event has `dynamic_context jsonb` column (unchanged); CHECK constraint on event.category_source includes `'category_override'` (unchanged); 22 events + 22 cases (unchanged — no mutations this session). PostgREST exposed_schemas includes `friction`. /operations route live at HEAD `5753f41b`. Next natural fires: cron 85 daily 03:30 AEST (≈17:30 UTC); cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.83)

**Status v2.83: ✅ SIGNED 2026-05-18 (v2.79). Wave 0a APPLIED + CLOSED v2.81. Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + CLOSED v2.82. Wave 0b v1.1 doc patch CLOSED-APPLIED-ON-MAIN v2.83. Wave 0c brief authoring open v2.83.**

**Documents committed:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (SIGNED with §5.5 + §9) — unchanged
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` (v1.1) — APPLIED v2.81
- Migration `cc_0017a_friction_foundational_schema` live at version `20260518065610` — APPLIED v2.81
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.1 (9-file structure: 1 index + 8 sub-files; v1.1 patch landed on main `65047388`–`7f40e554`) — APPLIED v2.82, doc-patch CLOSED v2.83
- Migration `cc_0017b_friction_unified_emit_event` live (main) — APPLIED v2.82
- Migration `cc_0017b_emit_event_ambiguity_fix` live (corrective) — APPLIED v2.82
- **`docs/briefs/cc-0017c-...md`** — **authored v2.83 post-close (separate commit)**
- `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` — v2.79
- `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` — v2.80
- `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` — v2.81
- `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md` — v2.82
- `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` — v2.83 (this commit)

**32 decisions governing execution + 2 within-amendment clarifications:** unchanged v2.83. D-CC-0017B-Q1 (severity_override query-pattern note) carried from v2.82.

**Open gates v2.83:**
1. ✅ PK explicit approval of v1 + amendments → CLOSED 2026-05-18 (v2.79)
2. ✅ cc-0017a brief authored → CLOSED v2.80
3. ✅ D-01 review for cc-0017a → CLOSED v2.80
4. ✅ cc-0017a Wave 0a migration applied + V-checks PASS → CLOSED v2.81
5. ✅ cc-0017b brief authored + D-01 + apply → CLOSED v2.82
6. ✅ **cc-0017b v1.1 doc patch → CLOSED-APPLIED-ON-MAIN v2.83**
7. ⏳ **cc-0017c brief authoring → authored this session post-close (separate commit)**
8. ⏳ **cc-0017c D-01 fire** — P1 rank 1 v2.83, gated on PK explicit authorisation
9. ⏳ **cc-0017c apply** — P1 rank 2 v2.83, gated on D-01
10. ⏳ After cc-0017c applied: friction.event volume empirically observed for 1 week before pool view design (Wave 7)

**v2.83 provenance:** cc-0017b v1.1 doc patches on main originate from a parallel agent (not this chat session). L-v2.81-a re-exercised. cc-0017c brief authoring done by this chat session post-close.

**Critical empirical findings preserved unchanged from v2.79–v2.82.**

---

## 🟢 cc-0017c Wave 0c — STATUS BLOCK (NEW v2.83)

**Status v2.83: ⏳ BRIEF AUTHORING OPEN.**

**Wave 0c scope (per PK explicit directive this session — 4 items):**

1. **FK hardening on `friction.event.source`** — DROP CONSTRAINT `event_source_check` (CHECK enum) + ADD CONSTRAINT `event_source_fk` FOREIGN KEY (source) REFERENCES `friction.source(source_code)`. Pre-flight validates all existing event.source values exist in friction.source.source_code (currently 3 sources seeded: reconciliation, health_check, manual).
2. **Direct-write lockdown REVOKE** (Amendment F enforcement) — `REVOKE INSERT, UPDATE ON friction.event FROM PUBLIC, authenticated`; same for `friction.case`. Only `friction.emit_event` SECURITY DEFINER function (and admin/service_role) can write to the spine. Closes the convention-only loophole exposed by the BYPASS-DEFENCE log line emitted by `fn_promote_event_to_case` since v2.82.
3. **`resolved_at` / `resolution_kind` backfill on existing closed cases** (Amendment G completeness backfill) — for cases with `action_decision IN ('suppress','ignore','duplicate','done')` AND `resolved_at IS NULL`, set `resolved_at = COALESCE(updated_at, now())` and `resolution_kind` per documented mapping. Closes a known data gap in case table inherited from cc-0014.
4. **Pre-flight grant capture for exact rollback (NEW)** — P-set captures full `information_schema.role_table_grants` rows for `friction.event` and `friction.case` BEFORE the REVOKE runs, returning as JSON for inclusion in D-01 fire payload (`current_evidence`). Rollback path uses captured grants to restore exactly — not from memory or brief's idealised grant matrix.

**Explicit constraints per PK directive this session:**
- **No apply this session** — brief authoring only.
- **No D-01 fire** unless PK explicitly authorises.

**Out of scope for cc-0017c per PK explicit directive (deferred to cc-0017d or later sub-brief):**
- `ALTER TABLE friction.case ALTER COLUMN dedupe_fingerprint SET NOT NULL` (listed in cc-0017b "Out of scope (Wave 0c)").
- `emission_rule_history` audit trigger (listed in cc-0017b "Out of scope (Wave 0c)").

**Brief structure planned:** multi-file mirroring cc-0017a / cc-0017b precedent (1 index + 6–8 sub-files under `docs/briefs/cc-0017c/`).

**Authoring kickoff state:**
- friction.* schema state inherited from cc-0017b apply (v2.82): 9 tables; 12 functions; 1 partial unique index; 3 emission_rule seeds active.
- Existing 22 cases + 22 events to be assessed for backfill candidacy via read-only `execute_sql` queries during brief authoring.
- Current grants on friction.event + friction.case to be captured during brief authoring as P-set design reference (NOT as live grant snapshot — that happens in P-set at apply time).

**Open follow-ups for Wave 1+ (post-cc-0017c apply):**
- Wave 1 compliance reviewer fix + emission (per friction plan §4 wave structure).
- Per-source tunable reopen window (v2 work — not v1).
- Cross-source dedupe (v2 work).
- Empirical observation of friction.event volume across all 3 source paths for 1 week before Wave 7 pool view design.

---

## 🟢 cc-0017b Wave 0b — STATUS BLOCK (UPDATED v2.83 — v1.1 doc patch CLOSED)

**Status v2.83: ✅ CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION (v2.82) + v1.1 DOC PATCH CLOSED-APPLIED-ON-MAIN (v2.83).**

**Migrations (unchanged from v2.82):**
- Main: `cc_0017b_friction_unified_emit_event` (11 atomic steps in single transaction)
- Corrective: `cc_0017b_emit_event_ambiguity_fix` (one-line WHERE clause qualification fixing SQLSTATE 42702 ambiguity on emit_event Step 9)

**v1.1 doc patch on main (NEW v2.83):**

Landed across commits `65047388`–`7f40e554` (HEAD `7f40e554`). Authored by parallel agent (not this chat session). Doc-only — no production behaviour change.

6 brief defects resolved:
1. emit_event Step 9 unqualified WHERE → schema-qualified in `migration-sql-part-a.md`
2. P16 SQL strict NULL handling → NULL-from-unset-GUC handled as "unset/inactive" in `preflight-pset.md`
3. V-B12/V-B13/V-B14 data-modifying CTE concurrency → converted to sequential DO-block pattern in `vchecks.md`
4. V-B15 expected cat_source typo → corrected to `'emitter_default'` in `vchecks.md`
5. V-B22 INSERT missing 3 NOT NULL FK columns → INSERT now includes all required FK columns in `vchecks.md`
6. V-B27 cleanup orphan patterns → extended to cover all 6 orphan types discovered during apply in `vchecks.md`

2 rollback body inlinings resolved:
- §5.5.5c: `fn_emit_health_check_findings` verbatim cc-0014 body inlined from migration row `cc_0014_c_health_check_emitter` version `20260514233321`
- §5.5.5d: `fn_emit_manual_event` verbatim cc-0014 body inlined from migration row `cc_0014_d_manual_emit_function` version `20260515005315`

Source-of-truth precedence locked at top of §5.5.5:
1. Brief.
2. `supabase_migrations.schema_migrations` row for the named cc-0014 migration.
3. `pg_get_functiondef` (only valid PRE-cc-0017b apply — post-apply returns cc-0017b body, not cc-0014).

Brief is now self-contained for rollback. No additional capture step required at apply time.

**V-checks 27/27 PASS** (v2.82 result unchanged). **Schema state** (unchanged from v2.82): 9 tables, 12 functions, 1 partial unique index, 1 corrective fix, 3 emission_rule seeds, 1 new event column (`dynamic_context`).

**Open follow-ups for Wave 0c (UPDATED v2.83):**
- cc-0017c brief authoring open this session post-close (separate commit) per PK 4-item scope.
- Empirical observation of friction.event volume post-cc-0017b across all 3 source paths still required across the next 1 week.
- Re-run reconciliation cadence diagnostic post-next cron 85 fire (Today/Next 5 rank 3).

---

## 🟢 cc-0017a Wave 0a — STATUS BLOCK (carried unchanged from v2.82)

Unchanged. CLOSED-APPLIED v2.81. See action_list v2.81 for detail.

---

## 🟢 cc-0014 friction register — STATUS BLOCK (unchanged v2.83)

Unchanged. CLOSED-ARCHIVED 2026-05-18 (v2.77).

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (unchanged v2.83 — Wave 7)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 7.

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (unchanged v2.83 — Wave 8)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 8.

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.83, condensed)

Unchanged. CLOSED-WITH-VERIFIED-VARIANCE v2.71.

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.83, condensed)

Unchanged. CLOSED-WITH-VERIFIED-VARIANCE v2.68.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.83, condensed)

Unchanged. APPLIED + CLOSED v2.67.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate — STATUS BLOCK (UPDATED v2.83)

**Status v2.83:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry from v2.76). **L58 BASELINE v2.76** carried (applied this session — 3-file atomic push_files for the close). **L62 baseline-eligible v2.77** — not re-exercised v2.83 (no D-01 fire). L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry. L-v2.76-a through L-v2.76-f carry.

**v2.83 cycle outcomes:**

- **L41 not exercised v2.83** — verification was via `get_file_contents`, not `execute_sql`. Cumulative L41 occurrences v2.80–v2.83 = 6 (unchanged). Baseline tightening recommendation reinforced.
- **L58 applied v2.83** — 3-file atomic push_files this commit (sync_state + action_list + per-session file). Baseline correctly applied.
- **L62 not exercised v2.83** — no D-01 fire.
- **L-v2.78-a watcher candidate**: not re-exercised v2.83 (no new reviewer convergence event). Unchanged at 2 occurrences.
- **L47 CANDIDATE v2.80**: not re-exercised v2.83. Unchanged at 1 occurrence.
- **L-v2.81-a CANDIDATE v2.81 — RE-EXERCISED v2.83 (occurrence 2)**: cc-0017b v1.1 doc-only patches landed on main via parallel agent (not chat-side Claude this session). Same coordination pattern as v2.81 occurrence 1 (cc-0017a Wave 0a apply by parallel session), lower-risk variant (doc-only vs production schema apply). **Per PK directive this session: PROMOTION ELIGIBLE at next lesson cycle.** Verification cost asymmetry noted: doc-only verification via `get_file_contents` HEAD + spot-check sufficient; production apply verification requires V-checks via `execute_sql`.

**Cumulative recommendation v2.83:** L-v2.81-a now at 2 occurrences alongside L-v2.78-a (also 2). Both eligible for baseline promotion at next lesson cycle. L41 cumulative 6 across v2.80–v2.83 (unchanged); formal baseline tightening still recommended.

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.83)

Unchanged. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.83 update:**
- **Reconciliation daily diagnostic soft deadline**: next cron 85 fire ≈2026-05-19 03:30 AEST (≈17:30 UTC). Worth re-checking post-fire to confirm cc-0017b wrappers route correctly through emit_event.
- **cc-0017c D-01 + apply window**: gated on PK explicit authorisation. No specific deadline.
- **No new v2.83 calendar items.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.83 application**: 0 D-01 fires this session (close + brief authoring only, no production mutation). Cumulative T-MCP-02: **73** (unchanged from v2.82).

**L46 Evidence Gate v2.83**: not exercised (no D-01 fire).
**L62 v2.83 exercises**: 0.
**State-capture exceptions v2.83: 0.** Cumulative: 1 (unchanged).
**Close-the-loop UPDATEs v2.83: 0.** **25 outstanding** unchanged (22 historical CCH-locked + 3 v2.77 new).

---

## 🤖 Cowork automation (D182)

**v2.83 status:** unchanged from v2.82. Cron 82 + 83 + 86 firing normally. V-C3 still PENDING live run.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017c brief authoring** | PK 4-item scope (FK hardening + REVOKE lockdown + resolved_at/resolution_kind backfill + grant capture) | **P1 — IN FLIGHT v2.83 (closing on brief commit later this session)** | OPEN this session post-close. Multi-file structure following cc-0017a/cc-0017b precedent. **No apply, no D-01 this session per PK directive.** | chat → PK | Read-only `execute_sql` queries on friction.* schema state + case action_decision counts + current grants → author 6-8 sub-files + index → push_files separate commit. |
| **cc-0017c D-01 fire** | Plan_review per ICE-PROC-001 | **P1 (rank 1 v2.83 — NEW, gated)** | GATED on PK explicit authorisation. Per PK directive this session: **no D-01 unless explicitly authorised.** | chat → PK | PK authorises → chat fires `ask_chatgpt_review` with brief reference + pre-flight P-set evidence + grant capture JSON + default action "do not apply, ask PK". |
| **cc-0017c apply** | Wave 0c migration | **P1 (rank 2 v2.83 — NEW, gated)** | GATED on D-01 verdict + PK explicit approval. | chat → PK | PK approves post-D-01 → chat applies. |
| **Reconciliation daily cadence diagnostic** | First post-cc-0017b cron 85 fire ≈2026-05-19 03:30 AEST | **P1 (rank 3 v2.83 — was rank 2 v2.82)** | OPEN. Material exists; cc-0017b adds the question "did wrappers route through emit_event correctly?" | chat → PK | Post-fire SQL count comparison + emit_event signature check |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 4 v2.83 — was rank 3 v2.82)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md` |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 5 v2.83 — was rank 4 v2.82)** | PENDING PK execution. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION; Wave 7 | **P2 (Wave 7 v2.83 carry)** | DRAFTED. Commit `9a5dc155`. Wave 7 awaits empirical volume from Waves 1-6. | chat → PK (Wave 7) | Stage A re-scope when Wave 7 reached |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION; Wave 8 | **P2 (Wave 8 v2.83 carry)** | DRAFTED. Commit `f35f8ea4`. Wave 8 awaits Wave 7. | chat → PK (Wave 8) | Stage A unchanged as drafted |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (carry v2.83)** | OBSERVED. Unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (carry v2.83)** | LOGGED. Unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (carry v2.83 — 36th consecutive deferral)** | Unblocked per D-IOL-001. Discipline call increasingly overdue. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN. | PK | When PK directs |
| **Close-the-loop batch sweep — 25 escalated remain** | Gated on PK directive | P2 (carry v2.83) | 22 historical + 3 v2.77 new. No additions v2.83. | chat → future PK directive | Hold pending PK lift of CCH + meta resolution |
| **L-v2.78-a baseline promotion** | Reviewer convergence is high-signal | **P3 (carry v2.83 — eligible at next lesson cycle)** | 2 occurrences (unchanged). | chat → next session | Promote to baseline at appropriate cycle |
| **L47 baseline promotion** | Check list_recent_commits before retrying apparent push failures | **P3 (carry v2.83 — 1 occurrence)** | 1 occurrence. Not re-exercised v2.83. | chat → next session | Promote on re-exercise |
| **L-v2.81-a baseline promotion** | Parallel-session work coordination | **P3 (carry v2.83 — 2 occurrences, ELIGIBLE for promotion per PK directive)** | **2 occurrences v2.83 (was 1 v2.82). RE-EXERCISED this session via doc-only parallel-session work landing. PROMOTION ELIGIBLE at next lesson cycle per PK directive.** | chat → next lesson cycle | Promote alongside L-v2.78-a at next lesson cycle |
| **Brief v1.2 doc patch (cc-0017a)** | 6 defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing + L-v2.78-a + L47 + L-v2.81-a (now eligible) | P3 (carry, scope expanded v2.83) | DRAFT scope expanded — L-v2.81-a now at 2 occurrences, eligible for inclusion. Doc-only. | chat → future | Single doc patch when PK greenlights |
| **v1.1 cc-0012 minor doc patch (3 items)** | Var-A1 + Var-A2 + Var-A3 | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.6 cc-0010A doc patch (3 items)** | result_jsonb rename + trigger audit + queue_id non-FK | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.3 cc-0011 minor doc patch (5 items)** | E1 + Var-A/B/C/E | P3 (carry) | HOLD | chat → future | Doc-only |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows + trigger filter | P3 (carry v2.71) | Strengthened v2.68. | chat → future | Separate cc-NNNN cleanup brief |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | P2 — unblocked per D-IOL-001 | cc-0010A + cc-0010B delivered. | PK → chat | When PK greenlights |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile |
| **Publisher latent config risk** | verify_jwt = false doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **22 escalated m.chatgpt_review rows** | 21 historical CCH-locked + 1 T-MCP-05 meta | P3 (carry; gated) | Untouched per CCH | chat → future PK directive | Hold |
| **Memory cap hygiene** | 19/30 v2.83, unchanged | P3 (carry) | 11 free slots. | chat → future | Add as needed |
| **Parallel agent coordination (L47)** | informational | P3 (carry) | No conflicts observed v2.83 (parallel work was doc-only and additive). | chat → future | Passive observation |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → future | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future | — |
| **Vault `service_role_key` naming** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future | Read-only scope-check |
| **`00_overview.md` 11-section table** | Architecture review structure change | P3 | Required updates | chat → future | ~15 min |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure = Phase 2 B-09-14 | chat → Phase 2 | Bulk approve UI |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural OR synthetic test |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 | P2 | LOGGED | PK → future | Decide |
| **Emergency redeploy governance** | Expedited D-01? | P2 (PK decision) | PENDING PK | PK | PK rules |
| **`f4a0dd85` bridge health-check** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |
| **3 pre-v2 forensic `r.reconciliation_run failed` rows** | cc-0010B Stage E pre-fire | P3 (carry v2.68) | PK forensic-accepted | informational | — |
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | Atomic push_files applied v2.83 (this 3-file sync close). | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry from v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

**Closed v2.83:**
- **cc-0017b brief v1.1 patch (6 defects + 2 rollback bodies)** (v2.82 P3 carry) → **CLOSED-APPLIED-ON-MAIN** ✅ via commits `65047388`–`7f40e554` by parallel agent.

**Closed v2.82:**
- cc-0017b Wave 0b authoring + apply (v2.81 rank 1) → CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION ✅
- D-01 review `b612a8e4-...` → resolved (close-the-loop UPDATE complete)
- D-01 review `a6415afa-...` → resolved (close-the-loop UPDATE complete)

**Closed v2.81:**
- cc-0017a Wave 0a APPLY (v2.80 rank 1) → CLOSED-APPLIED ✅
- Provenance investigation for cc-0017a apply → RESOLVED

**Closed v2.80:**
- cc-0017a Wave 0a authoring → CLOSED ✅
- D-01 review for cc-0017a (`adcc8385-...`) → RESOLVED partial-type-c per PK Path B

**Closed v2.79:** PK approval gate; Amendment G reopen N → LOCKED 14 days; Amendment C triage metric basis → LOCKED phase-based.
**Closed v2.78:** No items closed (planning-only session).
**Closed v2.77:** cc-0014 operational window; cron 85 weekly→daily promotion.
**Closed v2.76:** cc-0014 Stage E close; cc-0014 Stage D production deploy.
**Closed v2.75:** Stage D, E backend, E frontend, E promotion.
**Closed v2.71:** cc-0012 PRV v1 CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.70:** cc-0011 cadence-drift-checker CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.69:** cc-0010C reconciliation-matcher CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.68:** cc-0010B ice-evidence-materialiser CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.67:** cc-0010A v1.5 APPLIED + CLOSED.

---

## 💼 Personal businesses

**v2.83 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(Standing P0 to ask at next session start. None raised v2.83.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.76 / v2.77 / v2.78 / v2.79 / v2.80 / v2.81 / v2.82.

---

## 📌 Backlog

**v2.83 changes:**

- **STATE CHANGE v2.83**: cc-0017b v1.1 doc patch (6 defects + 2 rollback body inlinings) → CLOSED-APPLIED-ON-MAIN via commits `65047388`–`7f40e554` by parallel agent (HEAD on main: `7f40e554`).
- **STATE CHANGE v2.83**: cc-0017c brief authoring → IN FLIGHT (closing on separate brief commit later this session).
- **STATE CHANGE v2.83**: cc-0017c D-01 fire → NEW Active P1 rank 1 (gated on PK explicit authorisation).
- **STATE CHANGE v2.83**: cc-0017c apply → NEW Active P1 rank 2 (gated on D-01 + PK approval).
- **STATE CHANGE v2.83**: L-v2.81-a candidate → 2 occurrences (was 1); PROMOTION ELIGIBLE at next lesson cycle per PK directive.
- **STATE CHANGE v2.83**: friction.* schema state unchanged from v2.82 (no production mutations this session).
- **STATE CHANGE v2.83**: T-MCP-02 cum 73 unchanged (no D-01 fires).
- **No new architectural decisions v2.83.**
- **3-file atomic push_files this session close** (sync_state + this file + new session file). L58 baseline applied correctly. cc-0017c brief commits as SEPARATE commit post-close.
- **CARRIED v2.83**: Dashboard roadmap PHASES — **36th** consecutive deferral.

**Pre-v2.83 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged from v2.82.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate framing carried per v2.83. **v2.83 updates:**

- **L41 not exercised v2.83** — verification via `get_file_contents`, not `execute_sql`. Cumulative occurrences v2.80–v2.83 = 6 (unchanged). Baseline tightening recommendation reinforced.
- **L52 / L53 / L55 / L57 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.83.
- **L58**: 3-file atomic push_files applied this session close (correct baseline application).
- **L62 baseline-eligible since v2.77**: not exercised v2.83 (no D-01 fire).
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.83; promotion still pending.
- **L-v2.78-a watcher candidate**: not re-exercised v2.83. Still at 2 occurrences. **ELIGIBLE FOR BASELINE PROMOTION at next lesson cycle.**
- **L47 CANDIDATE v2.80 (1 occurrence)**: not re-exercised v2.83. Promotion-eligible on re-exercise.
- **L-v2.81-a CANDIDATE v2.81 — RE-EXERCISED v2.83 (occurrence 2 of N)**: doc-only parallel-session coordination case. **Per PK directive this session: PROMOTION ELIGIBLE at next lesson cycle.** Eligible alongside L-v2.78-a (also 2 occurrences).
- **No other new L-candidates v2.83.**

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates.**

---

## v2.83 honest limitations

- All v2.31–v2.82 limitations apply.
- **Verification of v1.1 doc patch was via `get_file_contents` on HEAD `7f40e554`** + spot-check of brief index + `hardstop-rollback.md` §5.5.5c + §5.5.5d. Not via commit-author inspection — chat-side does not know which parallel agent authored the patches (Claude Code session, PK direct edits, or parallel chat-side session). PK directive accepts this as sufficient for doc-only patches.
- **3 of 6 v1.1 defects (defects 2–6) are V-check / pre-flight wording corrections** documenting what the apply session actually did (per PK in-session amendments and corrective patterns). Defect 1 (Step 9 unqualified WHERE) was the only one with a production-correctness corollary, and production was already corrected via `cc_0017b_emit_event_ambiguity_fix` migration v2.82.
- **cc-0017c brief commit is SEPARATE from this v2.83 close commit.** Brief size determined by sub-file count (cc-0017a was multi-file; cc-0017b was 9-file; cc-0017c may be smaller given narrower scope but follows same multi-file precedent).
- **No cc-0017c D-01 fire this session** per PK explicit directive. Brief is authored and committed; D-01 fire awaits explicit PK authorisation.
- **No cc-0017c apply this session** per PK explicit directive.
- **Dashboard PHASES at 36th consecutive deferral.** Discipline call increasingly overdue.
- **Memory cap 19/30** — unchanged.
- **Action_list size at v2.83**: ~45KB (was ~44KB v2.82). cc-0017c brief commit adds 6–8 files (~60–100KB additional) but those are in `docs/briefs/cc-0017c/`, not this file.
- **Per-session files v2.83**: 1 — `2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` (this commit).
- **Doc-sync v2.83**: 1 commit this session for the close (3-file atomic push_files). cc-0017c brief commit is separate. Dashboard PHASES 36th consecutive deferral.
- **Close-the-loop UPDATEs v2.83**: 0 (no D-01 fires this session). **25 outstanding** unchanged (22 historical CCH-locked + 3 v2.77 new).
- **State-capture exceptions v2.83: 0**. Cumulative: 1.
- **Production mutations v2.83**: 0. No `apply_migration` calls; no cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits; 0 DB rows touched.
- **L-v2.81-a re-exercise asymmetry**: occurrence 1 (v2.81) was apply-class (production schema change); occurrence 2 (v2.83) is doc-class (no production effect). The coordination pattern is the same but the verification cost is different. Both occurrences confirm the lesson is real and worth promoting.

---

## Changelog

- v1.0–v2.82: per commit history + sync_state archive.
- **v2.83 (2026-05-18 Sydney late evening, cc-0017b v1.1 doc-patch CLOSED-APPLIED-ON-MAIN + L-v2.81-a re-exercised + cc-0017c authoring open):**
  - **Build arc**: session open against v2.82 state → PK directive → `get_file_contents` verification of v1.1 patch landing on main across commits `65047388`–`7f40e554` (HEAD `7f40e554`) → spot-check of `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` index file version marker (now v1.1) + `hardstop-rollback.md` §5.5.5c + §5.5.5d (cc-0014 bodies now inlined verbatim) → L-v2.81-a re-exercise recognised → 3-file atomic push_files close (sync_state v2.83 + action_list v2.83 + per-session file) → cc-0017c brief authoring opens as SEPARATE commit post-close per PK 4-item scope.
  - **cc-0017b v1.1 doc patch CLOSED-APPLIED-ON-MAIN.** 6 brief defects + 2 rollback body inlinings (§5.5.5c + §5.5.5d) all resolved. Brief is now self-contained for rollback (no `<INSERT_CC0014_BODY_FROM_PROD>` placeholders remain). Source-of-truth precedence locked at top of §5.5.5: (1) brief; (2) `supabase_migrations.schema_migrations` row; (3) `pg_get_functiondef` (only valid PRE-cc-0017b apply).
  - **cc-0017c brief authoring opened.** PK 4-item scope: FK hardening on `friction.event.source` + direct-write lockdown REVOKE + `resolved_at`/`resolution_kind` backfill + pre-flight grant capture for exact rollback. Multi-file structure following cc-0017a/cc-0017b precedent. Brief commit happens SEPARATELY from this v2.83 close commit. **No apply, no D-01 this session per PK explicit directive.**
  - **Today/Next 5 rebuilt v2.83**: rank 1 = cc-0017c D-01 fire (gated on PK authorisation); rank 2 = cc-0017c apply (gated on D-01); rank 3 = reconciliation daily diagnostic (was rank 2 v2.82); rank 4 = health_check V-C3 (was rank 3); rank 5 = music library activation (was rank 4).
  - **D-01 fires v2.83: 0.** T-MCP-02 cum **73** (unchanged from v2.82). State-capture exceptions unchanged at 1.
  - **L-series outcomes**: L-v2.81-a re-exercised (1 → 2 occurrences); **per PK directive PROMOTION ELIGIBLE at next lesson cycle alongside L-v2.78-a**. L58 applied (3-file atomic push). L41 not exercised (no SQL execution this session). L62 not exercised (no D-01). L47 unchanged at 1. L-v2.78-a unchanged at 2.
  - **Active rows updated v2.83**: cc-0017b brief v1.1 patch → CLOSED; cc-0017c brief authoring → IN FLIGHT (closes on separate brief commit); cc-0017c D-01 fire → NEW P1 rank 1; cc-0017c apply → NEW P1 rank 2; L-v2.81-a row updated to 2 occurrences eligible.
  - **STATUS BLOCK v2.83 updated**: Friction Register Consolidation Plan gate 6 (v1.1 doc patch) closed; gates 7-10 added (cc-0017c authoring + D-01 + apply + 1-week empirical observation). New STATUS BLOCK for cc-0017c Wave 0c authoring open added. STATUS BLOCK for cc-0017b Wave 0b updated with v1.1 doc patch closed.
  - **Closure budget**: ~1h v2.83 cycle. Trailing-14-day cumulative ~15h above 8.0h floor.
  - **Doc-sync v2.83**: 1 commit (3-file atomic push_files: sync_state + action_list + per-session file). cc-0017c brief commit happens separately. Dashboard PHASES 36th consecutive deferral.
  - **Production mutations v2.83**: 0. No `apply_migration` calls; 0 cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits; 0 DB rows touched.
  - **T-MCP-02 cum**: 73 unchanged. State-capture exceptions: 1 unchanged. L-v2.78-a unchanged at 2. L47 unchanged at 1. L-v2.81-a NOW AT 2 (re-exercised, promotion-eligible).
