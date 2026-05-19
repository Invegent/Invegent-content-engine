# cc-0017c — Friction Register Lockdown + Backfill

**Brief version:** v1.1 (doc-only patch — Path A: drop `'done'` from backfill WHERE/CASE per D-01 verdict `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`)
**Authoring date:** 2026-05-18 Sydney late evening (v1.0 + v1.1 same session)
**Authoring session:** v2.84
**Status:** AUTHORED_PENDING_D01_REFIRE (v1.1 awaits fresh D-01 verdict; apply gated on D-01 + separate PK approval)

---

## §1 Strategic anchor

Friction Register Consolidation Plan v1 (signed v2.79). Amendment F (direct-write lockdown) + Amendment G (resolution invariant). Wave 0c — third and final friction.* foundational wave; follows Wave 0a (schema, cc-0017a APPLIED v2.81) and Wave 0b (unified emit_event, cc-0017b APPLIED-WITH-CORRECTIVE-MIGRATION v2.82 + v1.1 doc patch v2.83).

Empirical findings from v2.83 fact-finding probes diverge from Amendment F/G idealised framing. Divergences surfaced explicitly in `risks-and-grants.md §3.4` (now resolved via Path A per v1.1) and `§3.5` (defensive idempotent REVOKE strategy).

## §2 Scope (PK 4-item directive — verbatim)

1. **FK hardening on `friction.event.source`** — replace `event_source_check` CHECK with FK→`friction.source(source_code)`
2. **Direct-write lockdown** — REVOKE INSERT/UPDATE on `friction.event` + `friction.case` from service_role + PUBLIC + authenticated + anon
3. **`resolved_at` / `resolution_kind` backfill** — encode closure invariant on rows already in closed-class `action_decision`
4. **Pre-flight grant capture** — JSON snapshot of current grants for exact rollback

**v1.1 refinement to scope item 3:** closed-class set restricted to current legal `case_action_decision_check` domain values `('suppress','ignore','duplicate')` per Path A. `'done'` removed.

## §3 Production state at brief authoring (v2.83 fact-finding)

- **22 events / 22 cases / 3 source seeds** (reconciliation, health_check, manual; all is_active=true)
- **0 cases** with `action_decision IN ('suppress','ignore','duplicate') AND resolved_at IS NULL` (backfill candidates, v1.1 WHERE)
- **22/22 events** have valid FK target (orphan-free for FK swap)
- **service_role grants:** friction.event INSERT/SELECT; friction.case INSERT/SELECT/UPDATE
- **No PUBLIC/authenticated/anon grants** on either table
- **action_decision distribution:** NULL=14, track=7, act_now=1, suppress=0, ignore=0, duplicate=0, defer_intentionally=0, done=0 (and `'done'` is not legal under `case_action_decision_check`)

## §4 Sub-file map

| § | File | Purpose |
|---|---|---|
| 1-2 | _this file_ | Strategic anchor + scope + production state |
| 3 | `cc-0017c/risks-and-grants.md` | Risks (incl. divergence from idealised Amendment F/G) + REAL grant matrix |
| 4 | `cc-0017c/risks-and-grants.md` (§4) | Authorisation gates |
| 5.1 | `cc-0017c/preflight-pset.md` | P-set — grant JSON capture + FK validity probe + backfill count + baseline + CHECK capture |
| 5.2 | `cc-0017c/migration-sql.md` | Migration SQL — Section A (FK swap) + Section B (REVOKE lockdown) + Section C (backfill UPDATE; v1.1 legal-domain-only) |
| 5.3 | `cc-0017c/vchecks.md` | V-checks — 9 total (3-A + 4-B + 2-C) |
| 5.4-5.5 | `cc-0017c/hardstop-rollback.md` | Hard-stop matrix (14 triggers) + per-section rollback bodies |
| 6-8 | `cc-0017c/d01-postapply-deferred.md` | D-01 evidence package + post-apply close-the-loop + deferred items |
| 9-11 | `cc-0017c/lessons-metadata-changelog.md` | Lessons + metadata + changelog |

## §5 Out of scope (deferred)

- `case.dedupe_fingerprint NOT NULL` constraint addition — carried from cc-0017b out-of-scope
- `emission_rule_history` audit trigger — carried from cc-0017b out-of-scope
- **Expanding `case_action_decision_check` to include `'done'`** — Amendment G nomenclature work; **explicitly carried per v1.1 Path A rationale** (`'done'` is not currently legal; introduce via future lifecycle-domain expansion if needed; PK scope-expansion not authorised at v2.84)
- CHECK or trigger enforcing closure invariant write-side — backfill UPDATE encodes pattern only
- Triage/resolution SECURITY DEFINER functions for friction.case post-lockdown UPDATE path — Wave 0d candidate
- M8b separate brief authoring (Platform Reconciliation View) — carried
- Dashboard PHASES reconciliation (36th deferral) — carried

## §6 Authorisation status (v1.1)

- **Brief v1.1 commit:** This commit — no production mutations, no migration runs
- **D-01 fire on v1.1:** Next step this session (PK directive: "Re-fire D-01 on v1.1")
- **Close-the-loop on v1.0 D-01 row `a37eff28-...`:** UPDATE to `status=resolved` immediately after this v1.1 patch commit, before v1.1 D-01 re-fire
- **Apply:** Still GATED on v1.1 D-01 verdict + PK explicit approval (per PK directive item 7: "No apply until fresh D-01 result plus separate PK approval")
- **Pre-flight P-set rerun:** REQUIRED immediately before apply (drift detection vs brief-authoring values)

## §7 Apply migration name

`cc_0017c_friction_register_lockdown_and_backfill` (unchanged from v1.0 — SQL body updated in v1.1, name preserved)

Single atomic apply_migration call. All three sections succeed or all roll back (Postgres DDL transaction semantics).

## §8 Predecessor + successor chain

- **Predecessor (apply order):** cc-0017a (Wave 0a, schema foundation) → cc-0017b (Wave 0b, unified emit_event + v1.1 doc patch) → **cc-0017c (this brief, Wave 0c)**
- **Anticipated successors:** Wave 0d (triage/resolution SECURITY DEFINER functions) → Wave 0e (audit history shadow tables) → cc-0015 (friction-pool-view, AUTHORED PENDING_EXECUTION at commit `9a5dc155`) → cc-0016 (friction-capture-evidence, AUTHORED PENDING_EXECUTION at commit `f35f8ea4`)

---

*Last updated: 2026-05-18 Sydney late evening — v1.1 doc-only patch (Path A per D-01 verdict `a37eff28-...`).*
