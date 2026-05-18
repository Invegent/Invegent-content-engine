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
| 2026-05-18 | v2.83-cc0017b-v1.1-close-cc0017c-open | **cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN + L-v2.81-a re-exercised (occurrence 2) + cc-0017c authoring open (v2.83).** Verified v1.1 patch landing on main across commits `65047388`–`7f40e554` (HEAD on main: `7f40e554`). 6 brief defects + 2 rollback bodies (`§5.5.5c` + `§5.5.5d`) all resolved on main. Production mutations: **0** (doc-only). D-01 fires: **0**. T-MCP-02 cum **73** unchanged. cc-0017c brief authoring opened per PK 4-item scope (FK hardening on `event.source` + REVOKE direct-write lockdown + `resolved_at`/`resolution_kind` backfill + pre-flight grant capture for exact rollback); **no apply, no D-01 fire** this session per PK explicit directive. L-v2.81-a now at 2 occurrences (was 1 v2.81); PK directive: promotion-eligible at next lesson cycle. Dashboard PHASES **36th** consecutive deferral. 3-file atomic push_files close. | `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` |
| 2026-05-18 | cc-0017b-applied | cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-CHECKS PASS (v2.82). 2 migrations applied: `cc_0017b_friction_unified_emit_event` (main, 11 steps) + `cc_0017b_emit_event_ambiguity_fix` (corrective). Both D-01 review IDs resolved. 6 brief defects flagged for v1.1 patch (deferred at v2.82; CLOSED v2.83). T-MCP-02 cum 71→73. | `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md` |
| 2026-05-18 | cc-0017a-applied-l41-l47 | cc-0017a Wave 0a APPLIED + 20/20 V-CHECKS PASS + L41/L47/L-v2.81-a (v2.81). | `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` |
| 2026-05-18 | cc-0017a-v1.1-and-d01-fire | cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B (v2.80). | `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` |
| 2026-05-18 | v2.79-friction-plan-signed | FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED (v2.79). | `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` |
| 2026-05-18 | v2.78-friction-register-consolidation-planning | FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED (v2.78). | `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` |
| 2026-05-18 | cc-0014-archived-and-recon-daily | cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY + HOLD-STANCE LIFTED (v2.77). | `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PROD + cc-0015 + cc-0016 DRAFTED (v2.76). | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | cc-0014 Stage C APPLIED (v2.74). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | cc-0014 Stage B APPLIED (v2.73). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | cc-0014 Stage A APPLIED (v2.72). | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |
| 2026-05-13 | cc-0012-closed-with-variance | cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71). | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70). | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69). | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68). | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |
| 2026-05-11 | post-cc0009-process-upgrades-l44-l48-applied | L44–L48 process upgrades FORMALISED + committed (v2.66). | `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md` |
| 2026-05-11 | cc-0009-stages-d-e-closed | cc-0009 Stages D + E CLOSED (v2.65). | `docs/runtime/sessions/2026-05-11-cc-0009-stages-d-e-closed.md` |

*(Older sessions truncated for brevity — full index preserved in v2.66 archive.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-18 Sydney late evening — v2.83 close: cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN + L-v2.81-a re-exercised (occurrence 2) + cc-0017c authoring open

**Outcome:** v2.82-deferred cc-0017b v1.1 doc-only patch (6 brief defects + 2 rollback body inlinings) confirmed landed on main across commits `65047388`–`7f40e554`. Repo HEAD on main verified at `7f40e554c0249591473a17bf7371779c3cb95ab2`. Spot-check of `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` index + `docs/briefs/cc-0017b/hardstop-rollback.md` §5.5.5c + §5.5.5d confirms (a) version marker now reads `v1.1 (doc-only patch — 6 defects + 2 rollback bodies inlined)`, and (b) verbatim cc-0014 function bodies are inlined for `fn_emit_health_check_findings` (from migration row `cc_0014_c_health_check_emitter` version `20260514233321`) and `fn_emit_manual_event` (from migration row `cc_0014_d_manual_emit_function` version `20260515005315`) — placeholders `<INSERT_CC0014_BODY_FROM_PROD>` no longer present.

**Production mutations: 0.** D-01 fires: 0. T-MCP-02 cum **73** unchanged. State-capture exceptions: 1 cumulative unchanged.

**Sequence:**

1. **Session open** — read sync_state v2.82 + action_list v2.82. v2.82 state confirmed (cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + CLOSED; 6 defects + 2 placeholders flagged for v1.1; Wave 0c authoring gate OPEN with no work started v2.82 per PK directive).
2. **PK directive** — perform 4-way sync close to v2.83 documenting v1.1 doc-only patch already on main, then begin cc-0017c authoring only (no apply, no D-01 unless explicitly authorised).
3. **Verification of v1.1 patch landing** — `get_file_contents` on brief index file + `hardstop-rollback.md`. HEAD on main `7f40e554` matches upper bound of PK's stated commit range. v1.1 patch note at top of §5.5.5 explains the inlining and locks source-of-truth precedence: (1) brief; (2) `supabase_migrations.schema_migrations` row; (3) `pg_get_functiondef` (only valid PRE-cc-0017b apply).
4. **L-v2.81-a re-exercise observed** — chat-side Claude this session did NOT author the v1.1 patch commits. Origin: parallel agent (Claude Code session, PK direct edits, or parallel chat-side session). Second occurrence of L-v2.81-a; promotion-eligible at next lesson cycle per PK directive.
5. **4-way sync close v2.83** — 3-file atomic push_files (sync_state v2.83 + action_list v2.83 + per-session file). No `decisions.md` change this session. Dashboard PHASES **36th** consecutive deferral.
6. **cc-0017c authoring open (post-close, separate commit)** — PK 4-item scope codified: (1) FK hardening on `friction.event.source`; (2) direct-write lockdown REVOKE; (3) `resolved_at`/`resolution_kind` backfill; (4) pre-flight grant capture for exact rollback. **No apply, no D-01 fire** this session per PK explicit constraint.

**D-01 fires this session: 0.** T-MCP-02 cum **73** unchanged.

**Production mutations:** 0. No cron mutations, no EF deploys, no vault writes, no memory edits, no DB rows touched.

**Items closed v2.83:**
- **cc-0017b v1.1 doc-only patch** → **CLOSED-APPLIED-ON-MAIN** ✅ (6 brief defects + 2 rollback bodies inlined; was deferred v2.82 P3 carry; now removed from Active).

**Items moved to Active v2.83:**
- **cc-0017c brief authoring** — IN FLIGHT this session post-close; expected CLOSED upon brief commit later this session.
- **cc-0017c D-01 fire** — NEW Active P1 rank 1 (will become rank 1 post-brief commit); gated on PK explicit authorisation per directive.
- **cc-0017c apply** — NEW Active P1 rank 2; gated on D-01 verdict + PK explicit approval.

**Items unblocked by v2.83 close:**
- cc-0017c brief authoring may proceed (this session, separate commit).

**Lesson outcomes v2.83:**
- **L-v2.81-a re-exercised** — occurrence 2. Doc-only parallel-session coordination (lower risk than v2.81's apply-class occurrence 1, same coordination pattern). **Eligible for baseline promotion at next lesson cycle per PK directive.**
- **L58 applied** — 3-file atomic push_files this close. Baseline correctly applied.
- **L41 not exercised** — no SQL execution this session (verification was via `get_file_contents`, not `execute_sql`).
- **L62 not exercised** — no D-01 fire this session.
- **L-v2.78-a unchanged** at 2 occurrences (no reviewer convergence event).
- **L47 unchanged** at 1 occurrence (no push-failure-with-dropped-ack event).

**v2.83 honest limitations:**
- 3-file atomic push_files this commit (sync_state + action_list + per-session file). No `decisions.md` change (no new decision).
- Dashboard PHASES **36th** consecutive deferral. Discipline call increasingly overdue.
- T-MCP-02 cum **73** (unchanged v2.83). State-capture exceptions: 1 (unchanged).
- 25 outstanding close-the-loop UPDATEs (22 historical CCH-locked + 3 v2.77 new) unchanged.
- cc-0017c brief commit is SEPARATE from this v2.83 close commit. Brief size will be determined by sub-file count (cc-0017a was multi-file; cc-0017b was 9-file; cc-0017c may be smaller given its narrower scope but follows the same multi-file precedent).
- This session does NOT fire D-01 for cc-0017c. Brief is authored; D-01 awaits explicit PK authorisation.

---

### 2026-05-18 Sydney late evening — cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-checks PASS (v2.82)

**Outcome:** cc-0017b Wave 0b — the unified `friction.emit_event` layer + new attach-or-create trigger + 14-day reopen window + 3 emit_* wrappers — applied to production via **2 migrations**: main `cc_0017b_friction_unified_emit_event` (11 atomic steps) + corrective `cc_0017b_emit_event_ambiguity_fix` (one-line WHERE clause qualification fixing emit_event Step 9 SQLSTATE 42702 ambiguity surfaced mid-V-check). All **27 V-checks PASS** via sequential DO-block pattern (V-B12/V-B13/V-B14/V-B22 converted from data-modifying CTEs per PK directive). Production baseline restored: **22 events / 22 cases / 3 source seeds**. Both D-01 reviews resolved.

**6 brief defects + 2 rollback placeholders flagged for v1.1 doc-only patch (deferred at v2.82) — CLOSED-APPLIED-ON-MAIN at v2.83 across commits `65047388`–`7f40e554`.**

**D-01 fires v2.82: 2.** T-MCP-02 cumulative 71 → **73**.

**Production mutations:** schema changes per Sequence (apply_migration ×2); data delta 0 rows on friction.* tables (all V-check test data cleaned up).

*(Full v2.82 detail at per-session file `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md`. v2.81 detail at `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.83)

**Conditional on whether cc-0017c brief commit lands this session:**

1. **cc-0017c D-01 plan_review fire** (P1 rank 1 v2.83 — NEW post-authoring). Gated on PK explicit authorisation per directive. Fires `ask_chatgpt_review` with brief reference + pre-flight P-set output incl. captured grants JSON + current `resolved_at` / `resolution_kind` row counts + FK validity probe results. Default action: do not apply, ask PK.
2. **cc-0017c apply** (P1 rank 2 v2.83 — NEW post-D-01). Gated on D-01 verdict + PK explicit approval. Pre-flight P-set rerun + apply_migration + V-checks + close-the-loop UPDATE on `m.chatgpt_review`. Apply in a separate session per cc-0017a/cc-0017b precedent.
3. **Reconciliation daily cadence diagnostic** — P1 rank 3 v2.83 (was rank 2 v2.82). Carry. Next cron 85 fire ≈2026-05-19 03:30 AEST (≈17:30 UTC). Question post-cc-0017b: did the wrappers route correctly through unified `emit_event`?
4. **Health_check V-C3 + signal-production diagnostic** — P1 rank 4 v2.83 (was rank 3 v2.82). Carry.
5. **Music library activation** — P2 rank 5 v2.83 (was rank 4 v2.82). Carry.

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

Carries (lower priority, unchanged or noted):
- **cc-0017a v1.2 doc patch** (combined defects + L60 + L63–L65 + L-v2.76 a–f framing + L-v2.78-a + L47 + L-v2.81-a) — scope expanded slightly v2.83 (L-v2.81-a now at 2 occurrences, eligible for promotion).
- 25 close-the-loop UPDATEs (22 historical CCH-locked + 3 v2.77 new).
- Dashboard PHASES sync — **36th** consecutive deferral.
- v1.1 cc-0012 / v1.6 cc-0010A / v1.3 cc-0011 minor doc patches.
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN).
- Memory cap hygiene (19/30; 11 free slots).
- Localhost FAB cleanup.
- IG cron 53 re-enable.
- YT publisher diagnostic.
- Platform Reconciliation View brief authoring.
- M8b separate brief authoring.
- **L-v2.78-a baseline promotion eligibility** — 2 occurrences reached (unchanged).
- **L47 candidate** — 1 occurrence (unchanged).
- **L-v2.81-a candidate** — **2 occurrences v2.83 (was 1 v2.82). PROMOTION ELIGIBLE at next lesson cycle per PK directive this session.**

---

## ⛔ Carried-forward "do not touch" state

**v2.83 update on standing items:**

- **cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN v2.83.** 6 brief defects + 2 rollback body inlinings landed across commits `65047388`–`7f40e554`. Brief is now self-contained for rollback (no `<INSERT_CC0014_BODY_FROM_PROD>` placeholders remain). Source-of-truth precedence locked at top of §5.5.5: (1) brief; (2) `supabase_migrations.schema_migrations` row; (3) `pg_get_functiondef` (only valid PRE-cc-0017b apply).
- **cc-0017c brief authoring open v2.83.** PK 4-item scope: (1) FK hardening on `friction.event.source`; (2) direct-write lockdown REVOKE; (3) `resolved_at`/`resolution_kind` backfill; (4) pre-flight grant capture for exact rollback. No apply, no D-01 unless explicitly authorised.
- **cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + CLOSED (v2.82).** Unchanged. Main migration `cc_0017b_friction_unified_emit_event` + corrective `cc_0017b_emit_event_ambiguity_fix` both live. friction.* schema state: 9 tables (unchanged), 12 functions (10 cc-0017a + 2 new + 5 rewritten in-place), 1 partial unique index, 1 corrective fix on emit_event, 3 emission_rule seeds active.
- **cc-0017a Wave 0a APPLIED + CLOSED (v2.81).** Unchanged.
- **Friction Register Consolidation Plan v1 + amendments + §5.5 SIGNED** (carry).
- **m.chatgpt_review row `b612a8e4-...`** status=`resolved` (v2.82 close-the-loop).
- **m.chatgpt_review row `a6415afa-...`** status=`resolved` (v2.82 close-the-loop).
- **m.chatgpt_review row `adcc8385-...`** status=`resolved` from v2.80.
- **cc-0014 CLOSED-ARCHIVED v2.77.** Unchanged.
- **cc-0015 friction-pool-view**: AUTHORED PENDING_EXECUTION (commit `9a5dc155`). Wave 7. Unchanged.
- **cc-0016 friction-capture-evidence**: AUTHORED PENDING_EXECUTION (commit `f35f8ea4`). Wave 8. Unchanged.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **PostgREST exposed_schemas continues to include `friction`** (carry).
- **cron 85 schedule: daily** (unchanged since v2.77). cron 86 (Cowork health check) unchanged. All other crons unchanged.
- **L58 BASELINE v2.76** carried (applied this session — 3-file atomic push_files).
- **L62 baseline-eligible v2.77** — not exercised v2.83 (no D-01 fire).
- **L-v2.78-a watcher candidate v2.78**: at 2 occurrences (unchanged). Still eligible for baseline promotion.
- **L47 CANDIDATE v2.80**: at 1 occurrence (unchanged).
- **L-v2.81-a CANDIDATE v2.81**: now at **2 occurrences v2.83** (re-exercised this session via parallel-session doc patch landing). **PROMOTION ELIGIBLE at next lesson cycle per PK directive.**
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.83; promotion still pending.
- **cc-0009 PRV-1 second build: COMPLETE.** Unchanged.
- **cc-0012 PRV v1: CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.
- **cc-0011 cadence-drift-checker: CLOSED-WITH-VERIFIED-VARIANCE v2.70.** Unchanged.
- **cc-0010C reconciliation-matcher: CLOSED-WITH-VERIFIED-VARIANCE v2.69.** Unchanged.
- **cc-0010B ice-evidence-materialiser: CLOSED-WITH-VERIFIED-VARIANCE v2.68.** Unchanged.
- **cc-0010A r.* DDL Foundation: APPLIED + CLOSED v2.67.** Unchanged.
- **25 close-the-loop UPDATEs outstanding** (22 historical CCH-locked + 3 v2.77 new). No additions or removals v2.83.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION**: P3 OPEN.
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY**: P3 OPEN.
- **L34 trigger filter audit**: P3 carry.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows**: retained per directives.
- **T-MCP-02 quota: 73 cumulative v2.83** (unchanged from v2.82 — 0 D-01 fires this session).
- **State-capture exceptions cumulative: 1** (unchanged).
- Cron 82-86 firing normally.
- **Dashboard roadmap PHASES** — **36th** consecutive deferral. Discipline call increasingly overdue.
- M-series total dead-letter rows cleared since 8 May 2026: 396 rows.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — list unchanged.
- **Cowork output pipeline**: V-C3 still PENDING live run.
- **Production FAB live on dashboard.invegent.com**: unchanged.
- **Localhost FAB cleanup pending**: `.env.local` still has flag enabled. Carry P3.
- **22 escalated m.chatgpt_review rows remain** as of 2026-05-17 (21 historical CCH-locked + 1 T-MCP-05 meta). Not to be closed without explicit PK directive.
- **D-CC-0017B-Q1** (severity_override query-pattern note) in `docs/06_decisions.md` (carried from v2.82).

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` written. This sync_state + action_list updated. `decisions.md` not touched (no new decision). Dashboard PHASES 36th consecutive deferral. 3-file atomic sync via push_files (L58 baseline applied).

**This file size**: ~24KB after this update (v2.83 current + v2.82 inlined per G1 "1-2 sessions inlined" rule; v2.81 + earlier retained as pointer rows only).

---

*Last updated: 2026-05-18 Sydney late evening — v2.83: cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN across commits `65047388`–`7f40e554` (HEAD `7f40e554`). 6 brief defects + 2 rollback bodies (§5.5.5c + §5.5.5d) all resolved. Production mutations 0. D-01 fires 0. T-MCP-02 cum 73 unchanged. cc-0017c brief authoring opened per PK 4-item scope (FK hardening + REVOKE direct-write lockdown + resolved_at/resolution_kind backfill + pre-flight grant capture); no apply, no D-01 fire this session per PK explicit directive. L-v2.81-a re-exercised (occurrence 2; promotion-eligible at next lesson cycle per PK directive). Dashboard PHASES 36th consecutive deferral. 3-file atomic push_files close (sync_state + action_list + per-session file). Previous (v2.82): cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-checks PASS via 2 migrations.*
