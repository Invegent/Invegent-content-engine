# cc-0017c — Friction Register Lockdown + Backfill

**Brief version:** v1.2 (doc-only apply-record backfill — status→APPLIED-WITH-VCHECK-CORRECTION, apply date, migration versions, 3 D-01 references, V-B4 signature-correction pointer. No SQL change. Supersedes v1.1 Path A.)
**Authoring date:** 2026-05-18 Sydney late evening (v1.0 + v1.1 same session)
**Authoring session:** v2.84
**Apply date:** 2026-05-19 Sydney morning
**Apply session:** v2.85
**Status:** APPLIED-WITH-VCHECK-CORRECTION ✅ (migrations `20260519004545` + `20260519005322`)

> **v1.2 note (apply-record backfill):** This brief previously read `AUTHORED_PENDING_D01_REFIRE` / "Apply: Still GATED" — stale. cc-0017c was applied at session v2.85 (2026-05-19) via a fresh AGREE D-01 verdict and explicit PK approval. v1.2 records that fact; no scope or SQL changed. See `docs/runtime/sessions/2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md` for the full apply narrative + V-check matrix.

---

## §1 Strategic anchor

Friction Register Consolidation Plan v1 (signed v2.79). Amendment F (direct-write lockdown) + Amendment G (resolution invariant). Wave 0c — third and final friction.* foundational wave; follows Wave 0a (schema, cc-0017a APPLIED v2.81) and Wave 0b (unified emit_event, cc-0017b APPLIED-WITH-CORRECTIVE-MIGRATION v2.82 + v1.1 doc patch v2.83). **Wave 0 (0a + 0b + 0c) COMPLETE at v2.85.**

Empirical findings from v2.83 fact-finding probes diverge from Amendment F/G idealised framing. Divergences surfaced explicitly in `risks-and-grants.md §3.4` (now resolved via Path A per v1.1) and `§3.5` (defensive idempotent REVOKE strategy).

## §2 Scope (PK 4-item directive — verbatim)

1. **FK hardening on `friction.event.source`** — replace `event_source_check` CHECK with FK→`friction.source(source_code)`
2. **Direct-write lockdown** — REVOKE INSERT/UPDATE on `friction.event` + `friction.case` from service_role + PUBLIC + authenticated + anon
3. **`resolved_at` / `resolution_kind` backfill** — encode closure invariant on rows already in closed-class `action_decision`
4. **Pre-flight grant capture** — JSON snapshot of current grants for exact rollback

**v1.1 refinement to scope item 3:** closed-class set restricted to current legal `case_action_decision_check` domain values `('suppress','ignore','duplicate')` per Path A. `'done'` removed.

**Apply outcome (v2.85):** all 4 scope items applied (item 2 = 2 effective REVOKEs on service_role + 6 defensive no-ops; item 3 = 0 rows affected, as expected).

## §3 Production state at brief authoring (v2.83 fact-finding)

- **22 events / 22 cases / 3 source seeds** (reconciliation, health_check, manual; all is_active=true)
- **0 cases** with `action_decision IN ('suppress','ignore','duplicate') AND resolved_at IS NULL` (backfill candidates, v1.1 WHERE)
- **22/22 events** have valid FK target (orphan-free for FK swap)
- **service_role grants:** friction.event INSERT/SELECT; friction.case INSERT/SELECT/UPDATE
- **No PUBLIC/authenticated/anon grants** on either table
- **action_decision distribution:** NULL=14, track=7, act_now=1, suppress=0, ignore=0, duplicate=0, defer_intentionally=0, done=0 (and `'done'` is not legal under `case_action_decision_check`)

**Pre-apply drift (v2.85 P-set):** forward drift to 29 events / 29 cases (reconciliation +7 from cron 85 daily fires) — within the brief's "or higher" envelope; benign. Backfill candidate count still 0 at apply.

## §4 Sub-file map

| § | File | Purpose |
|---|---|---|
| 1-2 | _this file_ | Strategic anchor + scope + production state |
| 3 | `cc-0017c/risks-and-grants.md` | Risks (incl. divergence from idealised Amendment F/G) + REAL grant matrix |
| 4 | `cc-0017c/risks-and-grants.md` (§4) | Authorisation gates |
| 5.1 | `cc-0017c/preflight-pset.md` | P-set — grant JSON capture + FK validity probe + backfill count + baseline + CHECK capture |
| 5.2 | `cc-0017c/migration-sql.md` | Migration SQL — Section A (FK swap) + Section B (REVOKE lockdown) + Section C (backfill UPDATE; v1.1 legal-domain-only) |
| 5.3 | `cc-0017c/vchecks.md` | V-checks — 9 total (3-A + 4-B + 2-C). **⚠️ V-B4 still carries the stale pre-cc-0017b 7-param `emit_event` signature — see §6a; sub-file patch outstanding (separate P3).** |
| 5.4-5.5 | `cc-0017c/hardstop-rollback.md` | Hard-stop matrix (14 triggers) + per-section rollback bodies |
| 6-8 | `cc-0017c/d01-postapply-deferred.md` | D-01 evidence package + post-apply close-the-loop + deferred items |
| 9-11 | `cc-0017c/lessons-metadata-changelog.md` | Lessons + metadata + changelog |

## §5 Out of scope (deferred)

- `case.dedupe_fingerprint NOT NULL` constraint addition — carried from cc-0017b out-of-scope
- `emission_rule_history` audit trigger — carried from cc-0017b out-of-scope
- **Expanding `case_action_decision_check` to include `'done'`** — Amendment G nomenclature work; **explicitly carried per v1.1 Path A rationale** (`'done'` is not currently legal; introduce via future lifecycle-domain expansion if needed; PK scope-expansion not authorised at v2.84)
- CHECK or trigger enforcing closure invariant write-side — backfill UPDATE encodes pattern only
- Triage/resolution SECURITY DEFINER functions for friction.case post-lockdown UPDATE path — Wave 0d candidate (became BLOCKING at v2.85: service_role lost UPDATE on friction.case, so all future case state-mutation must route through SECURITY DEFINER functions)
- M8b separate brief authoring (Platform Reconciliation View) — carried
- Dashboard PHASES reconciliation (36th deferral) — carried

## §6 Authorisation status (v1.2 — APPLIED)

- **Brief v1.0/v1.1 commits:** doc-only, no production mutations
- **v1.0 D-01:** `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79` — verdict **partial** (corrected_action Option A: drop `'done'` from backfill WHERE/CASE); satisfied via v1.1; resolved v2.84
- **v1.1 D-01:** `9e602a2d-…` — verdict **partial / type-c** (generic validation-process echo); deferred to fresh session (Path C); resolved v2.84. *(⚠️ full UUID not captured in the v2.85 source session — recorded truncated; do not treat the tail as known.)*
- **Fresh apply D-01:** `d18fa6db-3a5c-42ff-8aef-55fcb4fb4f92` — verdict **AGREE** (empty pushback_points, empty corrected_action; procedural escalate only). Applied this session via explicit PK approval. Close-the-loop: `m.chatgpt_review` status=`resolved`, escalation_resolved_at `2026-05-19 00:54:22 UTC`, resolved_by `cc-0017c-v2.85-applied-with-vcheck-correction`
- **Apply:** DONE at v2.85 via single atomic `apply_migration` (PK-approved). Pre-flight P-set rerun completed (P-1…P-5, all within envelope).

## §6a Apply record + V-check correction (v1.2 addendum)

- **Migrations live:** `20260519004545` (`cc_0017c_friction_register_lockdown_and_backfill` — Section A FK swap + Section B 8 REVOKEs + Section C 0-row UPDATE) and `20260519005322` (`cc_0017c_v_b4_smoke_cleanup` — postgres-owner DELETE of the V-B4 smoke event/case).
- **V-check matrix:** 8 PASS + 1 PARTIAL (V-A3 DO-block clean; REVOKE-first acceptable per brief).
- **V-B4 brief defect (corrected inline at apply, PK Path 1):** the V-B4 SQL in sub-file `cc-0017c/vchecks.md` was authored against the pre-cc-0017b **7-param** `emit_event` memorial signature and failed at runtime (`42883 function does not exist`). The deployed signature is **12-param**: `friction.emit_event(source, condition_key, problem_key, source_event_id, observed_at, related_object, observation_text, raw_payload, reported_by, severity_override, category_override, dynamic_context)` → `RETURNS TABLE(event_id uuid, case_id uuid, case_disposition text)`, `SECURITY DEFINER`. The corrected 12-param call from service_role context PASSED post Section B REVOKE (smoke event_id `f4c94457-…`, case_id `fd573ea1-…`, case_disposition `created_new`), empirically confirming the SECURITY DEFINER bypass.
- **⚠️ Outstanding (separate P3):** the sub-file `cc-0017c/vchecks.md` still contains the stale 7-param V-B4 and needs the 12-param correction written into it. That patch is tracked separately ("vchecks.md V-B4 doc patch") and is **not** applied by this v1.2 main-brief patch.

## §7 Apply migration name

`cc_0017c_friction_register_lockdown_and_backfill` (unchanged from v1.0 — SQL body updated in v1.1, name preserved). **Applied as version `20260519004545`** (+ companion cleanup `20260519005322`).

Single atomic apply_migration call. All three sections succeed or all roll back (Postgres DDL transaction semantics).

## §8 Predecessor + successor chain

- **Predecessor (apply order):** cc-0017a (Wave 0a, schema foundation, APPLIED v2.81) → cc-0017b (Wave 0b, unified emit_event + v1.1 doc patch, APPLIED v2.82/v2.83) → **cc-0017c (this brief, Wave 0c, APPLIED v2.85)**
- **Successors:** Wave 0d (triage/resolution SECURITY DEFINER functions — cc-0017d APPLIED 2026-05-19; exact session-version tag not reconfirmed in this v1.2 patch) → Wave 0e (audit history shadow tables — cc-0017e APPLIED; v2.90 apply + v1.1 doc patch v2.91 per action_list) → cc-0015 (friction-pool-view, AUTHORED PENDING_EXECUTION at commit `9a5dc155`) → cc-0016 (friction-capture-evidence, AUTHORED PENDING_EXECUTION at commit `f35f8ea4`)

---

*Last updated: 2026-05-25 Sydney — v1.2 doc-only apply-record backfill (status→APPLIED-WITH-VCHECK-CORRECTION; apply date 2026-05-19; migrations `20260519004545` + `20260519005322`; 3 D-01 refs incl. apply verdict `d18fa6db-…` AGREE; V-B4 12-param signature pointer added; sub-file `cc-0017c/vchecks.md` V-B4 correction still outstanding as a separate P3). No SQL change. Prior: v1.1 doc-only patch 2026-05-18 (Path A per D-01 `a37eff28-…`).*
