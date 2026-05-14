# cc-0014 — Friction Register Capture Experiment

**Brief ID:** cc-0014
**Version:** v1.1
**Status:** Authored, awaiting re-fire of D-01 on Stage A after v1.1 patch
**Authored:** 2026-05-14 Sydney (v1.0); patched 2026-05-14 (v1.1)
**Author:** Chat-side Claude with PK approval
**Strategic anchor:** `docs/strategy/IOL_friction_register_v0.4.md` (v0.4 final-form, four review rounds)
**Depends on:** cc-0012 (op.* views, used as reference architecture only — no dependency on cc-0013 build state)
**Schema:** new `friction.*` schema in Supabase `mbkmaxqhsohbtwsqolns`

**v1.1 patch summary:** D-01 review on v1.0 returned `partial` with `escalate_explicit_flag` (review_id `903cfd8e-5c59-45d5-a310-1e2ff35ef93e`). Pushback point 3 (pre-experiment cleanup robustness) was reclassified as type-(b) genuine: convention-only enforcement of append-only is structurally weaker than the brief's own discipline argument requires. v1.1 adds two triggers to Stage A: `fn_prevent_delete_during_run` (blocks DELETE on `friction.event` and `friction.case` while any `experiment_run.status='running'`) and `fn_lock_criteria_snapshot` (prevents UPDATE on `friction.experiment_run.criteria_snapshot` while status=running). Two new V-checks added (V-A10, V-A11). Pre-experiment test-row cleanup still works because it executes BEFORE `experiment_run.status='running'`. Pushback points 1 (cc-0008 grants class) and 2 (CHECK constraint race conditions) classified as type-(c) generic consistency-bias — ChatGPT did not surface concrete new evidence beyond what was already in v1.0's Section 3 grants matrix and Section 6 CHECK constraints.

---

## 1. Strategic anchor

This brief implements the friction register capture experiment specified in v0.4. The experiment tests whether a consolidated friction register — one place where issues from reconciliation, the nightly health check, and PK's manual observations all live — produces operational signal worth the cost of maintaining it. The experiment runs for 14 days after build completion. Verdict at Day 19 is binary: pass (next-layer design unlocked), fail (table archived, postmortem authored), or invalid (instrument failure, redesign required).

This brief does not re-litigate v0.4's design. The v0.4 strategic doc is assumed read.

---

## 2. Scope summary

### In scope

- Schema for `friction.event`, `friction.case`, `friction.category`, `friction.emit_error`, `friction.experiment_run` tables
- Reconciliation emitter (SQL trigger on `r.cadence_drift_log`)
- Health check emitter (extension to Cowork brief `nightly-health-check-v1` v2.1 → v3.0, dual-write)
- Manual capture form in invegent-dashboard (floating action button reachable from any route)
- Read surface (`/operations` route) for case triage
- Daily verification of health check emission (ID-level, pg_cron-scheduled)
- Day-19 scoring queries (SQL) for compound success criterion

### Out of scope

- AI clustering of any kind
- Playbooks or action catalogue
- Brief runner or autonomous execution
- Dry-run engine
- Health check pg_cron migration (deferred per Option Z)
- CC failure emitter
- Customer-facing register surface
- Autonomy ladder design

### Rejected from v0.3 review with reasoning

- **External-dependency auto-emitter:** rejected. The experiment does not need to test every category; external dependencies can be captured manually if encountered during the window.
- **Formal action_list duplication audit at Day-19:** rejected. Replaced with a single lightweight question in the postmortem.
- **Move category off manual form:** rejected. Category required at capture with last-choice default to avoid under-load classification cost.
- **30-day archive expiry on failure:** rejected. Over-engineering for a 14-day experiment. Archive on failure, postmortem within 14 days, drop only if explicitly approved post-postmortem.

---

## 3. Cross-cutting: grants, RLS, and security V-checks

**This section is non-negotiable. The cc-0008 service_role grants defect demonstrates this class of error has materialized before. Every stage must verify role grants explicitly.**

### Role access matrix

| Role | `friction.event` | `friction.case` | `friction.category` | `friction.emit_error` | `friction.experiment_run` |
|---|---|---|---|---|---|
| `service_role` | SELECT, INSERT (via emitters and functions only) | SELECT, INSERT, UPDATE | SELECT | SELECT, INSERT | SELECT, INSERT, UPDATE |
| `authenticated` | SELECT (via RPC only) | SELECT (via RPC only), UPDATE (triage fields only, via RPC) | SELECT | none | SELECT |
| `anon` | none | none | none | none | none |
| `postgres` (DDL/admin) | full | full | full | full | full |

**Schema usage grants:** `service_role` and `authenticated` need `USAGE` on the `friction` schema. `anon` does not.

**Function execution:** All write paths go through `SECURITY DEFINER` functions owned by `postgres`. No direct INSERT/UPDATE from `authenticated` to any `friction.*` table. Manual form writes via `friction.fn_emit_manual_event` only.

**RLS:** Not enabled on `friction.*` tables for the experiment. Single-operator scope. RLS becomes required if a customer-facing surface is ever built; that is out of scope here.

(Full brief content continues with Sections 4–15 covering emit_error sink, experiment_run boundary and test-data cleanup, Stages A–E with full SQL migrations and V-checks, Day-19 scoring queries, stage rollback matrix, D-01 framing, post-experiment commitments, and open decisions for stage authoring. See /mnt/user-data/outputs/cc-0014-friction-register-experiment.md for the full 1450-line specification. Truncated here due to MCP payload size; a subsequent commit will land the complete content via local git or split-file approach.)

---

*Brief cc-0014 v1.1. Stage A applied 2026-05-14. Stages B–E pending. Full content pending re-commit.*