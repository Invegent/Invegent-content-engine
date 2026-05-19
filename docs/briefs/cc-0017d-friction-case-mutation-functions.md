# cc-0017d — Friction Case Mutation Functions (Wave 0d)

**Brief ID:** cc-0017d
**Version:** v1.1
**Status:** CLOSED-APPLIED-WITH-VCHECK-CORRECTION (v2.86, 2026-05-19 Sydney evening)
**Wave:** 0d of 10 (Friction Register Consolidation Plan v1)
**Authored:** 2026-05-19 Sydney morning (session v2.86, v1.0)
**Applied:** 2026-05-19 Sydney evening (session v2.86) via migrations `cc_0017d_friction_case_mutation_functions` + V-check fixture seed + cleanup v1 (zero-effect) + cleanup v2 (1 row removed) + close-the-loop UPDATE.
**v1.1 doc patch:** 2026-05-19 Sydney evening (this revision). Doc-only; no production mutations; no D-01. Captures (a) RAISE+ROWTYPE compile-fix substitutions applied inline at production apply (Path B-prime); (b) V-F1 expected-counts reconciliation against actual V-D-setup fixture path; (c) fixture-naming convention slash-prefix vs hyphen-prefix; (d) corrective cleanup v2 pattern that removed exactly one leftover V-D4 emit_error row; (e) lesson numbering reconciled to authoritative v2.86 a–e set per sync_state.
**Author:** Chat-side Claude on PK directive
**Strategic anchors:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`)
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (signed v2.79)
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` (CLOSED-APPLIED v2.81)
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` (CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION v2.82 + v1.1 doc patch v2.83)
- `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.85)

**Depends on:** Wave 0a + 0b + 0c — foundational schema + canonical emit_event + lockdown. service_role grants on `friction.case` + `friction.event` reduced to SELECT-only post-cc-0017c.
**Schema:** extends `friction.*` schema in Supabase `mbkmaxqhsohbtwsqolns`.
**Migration name (single atomic apply):** `cc_0017d_friction_case_mutation_functions`

---

## v1.1 patch summary (read this first)

The v1.0 brief was authored before production apply. Three classes of drift between v1.0 expectations and the v2.86 production-apply outcome are captured in the v1.1 addenda:

1. **Compile defects fixed inline at apply** — see [`cc-0017d/migration-sql.md` v1.1 Addendum (top)](cc-0017d/migration-sql.md). Two byte-level substitution classes: RAISE `%%`→`%` (24 sites) and `friction.case%ROWTYPE` → `friction."case"%ROWTYPE` (6 sites). Both applied inline during the v2.86 production apply (Path B-prime). The v1.0 SQL is preserved as authored for historical record; the deployed migration `cc_0017d_friction_case_mutation_functions` contains the corrected form.

2. **V-F1 expected-counts reconciliation** — see [`cc-0017d/vchecks.md` v1.1 Addendum (end)](cc-0017d/vchecks.md). The V-D-setup block fell back to direct `INSERT INTO friction.case` (bypassing `emit_event` due to a v2.82 emission_rule CHECK gate on manual-source test-prefix payloads), which means `out_events_deleted` may be `0` and the `mark_duplicate` cross-fingerprint audit lands under an internal prefix `cc-0017d/mark_duplicate/...` not matched by the v1.0 V-F1 pattern. Corrective cleanup v2 (PK-approved adjusted pattern, dropped trailing `/`) removed exactly one orphaned audit row. Slash-prefix fixture-naming convention reaffirmed.

3. **Lesson numbering reconciled** — see [`cc-0017d/lessons-metadata-changelog.md`](cc-0017d/lessons-metadata-changelog.md). The brief's v1.0 candidate lessons (a–d) used a draft numbering authored before the apply. v1.1 reconciles to the authoritative v2.86 a–e set captured in `docs/00_sync_state.md`: L-v2.86-a (HIGH-SIGNAL, pre-apply transactional EXEC), L-v2.86-b (`out_`-prefix on RETURNS TABLE, REALISED), L-v2.86-c (reserved SQL keyword ROWTYPE quoting), L-v2.86-d (cross-column CHECK pre-validation, REALISED), L-v2.86-e (V-check fixture-data convention alignment).

**Out of scope for v1.1:** All other sub-files (`risks-and-grants.md`, `preflight-pset.md`, `hardstop-rollback.md`, `d01-postapply-deferred.md`) are unchanged from v1.0. The v1.0 d01-postapply-deferred.md is now historical record — D-01 review_id `206d2258-…` was fired and resolved at v2.86; status is `resolved`, `resolved_by = cc-0017d-close-v2.86`.

---

## Brief structure (multi-file per L-v2.85-e)

Brief split across `docs/briefs/cc-0017d/` to keep individual file payloads compact and avoid push_files response truncation. Read in order:

| Section | File | Covers |
|---|---|---|
| 1-2 | (this file) | Strategic anchor + scope (+ v1.1 patch summary above) |
| 3-4 | `cc-0017d/risks-and-grants.md` | Risks + function-level grant matrix (unchanged v1.1) |
| 5.1 | `cc-0017d/preflight-pset.md` | P-set queries (unchanged v1.1) |
| 5.2 | `cc-0017d/migration-sql.md` | 6 CREATE OR REPLACE FUNCTION + GRANTs (+ v1.1 Addendum top) |
| 5.3 | `cc-0017d/vchecks.md` | V-A1 through V-Z2 (≈23 V-checks) (+ v1.1 Addendum end) |
| 5.4-5.5 | `cc-0017d/hardstop-rollback.md` | Hard-stop matrix + DROP FUNCTION rollback (unchanged v1.1) |
| 6-8 | `cc-0017d/d01-postapply-deferred.md` | D-01 framing + post-apply commitments + deferred items (unchanged v1.1 — historical record; D-01 fired+resolved v2.86) |
| 9-11 | `cc-0017d/lessons-metadata-changelog.md` | Lessons + metadata + changelog (v1.1 reconciles lesson numbering to v2.86 a–e) |

---

## §1 Strategic anchor

Wave 0d delivers operator-facing case mutation functions required after cc-0017c's REVOKE lockdown reduced service_role privileges on `friction.case` and `friction.event` to SELECT-only. All write paths into `friction.case` (beyond emit_event's automatic open/reopen creation) must now route through `SECURITY DEFINER` functions owned by `postgres`.

Wave 0d is **purely additive at the function layer**: 6 new functions, no DDL on tables, no schema changes, no behaviour changes to existing code paths. Functions are inert until callers wire them. Wave 0d unblocks Wave 7 (cc-0015 friction-pool-view) and Wave 8 (cc-0016 friction-capture-evidence).

### §1.1 Empirical state at authoring (P-α through P-ζ executed 2026-05-19 Sydney morning, session v2.86)

**P-α — existing `fn_triage_case`:** SECURITY DEFINER, owner=`postgres`, `search_path = friction, public`. 10-parameter signature `(p_case_id uuid, p_triage_state text, p_category text, p_quality_flag boolean, p_capture_reason text, p_capture_reason_note text, p_action_decision text, p_next_review_at timestamptz, p_suppression_reason text, p_notes text) RETURNS uuid`. Body uses COALESCE-update pattern (partial UPDATE). **Survives cc-0017c lockdown** (already SECDEF+postgres-owned). Does NOT set `triaged_at` or `triaged_by` (Amendment C gap).

**P-β — CHECK domains on `friction.case` (verbatim from probe):**

- `case_action_decision_check`: `action_decision ∈ {act_now, track, defer_intentionally, suppress, ignore, duplicate}` (`'done'` NOT legal — confirms cc-0017c finding)
- `case_triage_state_check`: `triage_state ∈ {new, acknowledged, duplicate, ignored}` NOT NULL default `'new'`
- `case_resolution_kind_check`: `resolution_kind IS NULL OR ∈ {acted_on, tracked_done, deferred_done, suppressed, ignored, duplicate, reopened}`
- `case_effort_level_check`: `effort_level IS NULL OR ∈ {quick, moderate, deep}`
- `case_severity_check`: `severity ∈ {info, warn, critical}` NOT NULL
- `case_capture_reason_check`: `capture_reason ∈ {missed_without_register, would_have_deferred, would_have_rediscovered, centralized_context, routine_log, other}`
- Cross-column: `suppress_requires_reason` (`action_decision='suppress'` ⇒ `suppression_reason IS NOT NULL`); `track_or_defer_requires_next_review` (`action_decision ∈ {track, defer_intentionally}` ⇒ `next_review_at IS NOT NULL`); `capture_reason_note_required_for_incrementality`; `quality_flag_requires_real_category`

**P-γ — grants on `friction.case` + `friction.event`:** postgres full; service_role SELECT only; authenticated/anon/PUBLIC none. Matches cc-0017c expected state.

**P-δ — naming collisions:** None. `triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `record_first_view`, `purge_test_case`, `purge_test_event` all unused in `friction` schema. (Legacy `fn_triage_case` distinct from new `triage_case`.)

**P-ε — lifecycle bucket distribution (29 cases total):**

| Bucket | Count |
|---|---|
| open (`resolved_at IS NULL`) | 29 |
| resolved | 0 |
| `triaged_at` set | 0 |
| `reviewed_at` set | 8 |
| `action_decision` set | 8 (act_now=1, track=7) |
| `first_viewed_at` set | 0 |
| `predecessor_case_id` set | 0 |
| `triage_state='acknowledged'` | 8 |
| `triage_state='new'` | 21 |

Wave 0d's `triage_case` will be the **first** function to set `triaged_at` + `triaged_by`. `resolve_case` will be the **first** function to set `resolved_at` for operator-initiated resolution. `record_first_view` will be the **first** function to set `first_viewed_at`.

**P-ζ — emit_event grants:** postgres (owner) + service_role + authenticated. Template for Wave 0d functions 1-5.

---

## §2 Scope

### In scope (Wave 0d v1.0)

**Function 1 — `friction.triage_case(p_case_id, p_action_decision, p_actor='pk', p_effort_level=NULL, p_next_review_at=NULL)`**

Sets action_decision + triaged_at + triaged_by + triage_state + reviewed_at + effort_level + next_review_at on an OPEN case. Returns `TABLE(case_id, triaged_at, action_decision, triage_state)`.

**Constraints:**
- Case must be open (`resolved_at IS NULL`); else raises.
- `p_action_decision ∈ {act_now, track, defer_intentionally}` ONLY. Closure-class (`suppress`/`ignore`/`duplicate`) rejected — operator must use `resolve_case` or `mark_duplicate` (which handle the additional state cleanly).
- If `p_action_decision ∈ {track, defer_intentionally}`: `p_next_review_at` REQUIRED if case currently has `next_review_at IS NULL` (defends `track_or_defer_requires_next_review` CHECK).
- `triaged_at` + `triaged_by`: set only on first triage (preserved on re-triage per Amendment C "first non-NULL action_decision time").
- `triage_state`: transitions `new → acknowledged` on first triage; stays at `acknowledged` thereafter.
- Does NOT replace `fn_triage_case`. Legacy function remains for richer multi-field updates.

**Function 2 — `friction.resolve_case(p_case_id, p_resolution_kind, p_actor='pk')`**

Sets resolved_at = now() + resolution_kind on an OPEN case. Returns `TABLE(case_id, resolved_at, resolution_kind)`.

**Constraints:**
- Case must be open.
- `p_resolution_kind ∈ {acted_on, tracked_done, deferred_done, suppressed, ignored, duplicate}`. `'reopened'` REJECTED (transient marker only).
- **Strict consistency:** resolution_kind must match action_decision (strict mapping below). If mismatch, raises with hint to either re-triage first OR (for closure-class) use `mark_duplicate`.

Strict mapping:
| resolution_kind | requires action_decision |
|---|---|
| `acted_on` | `act_now` |
| `tracked_done` | `track` |
| `deferred_done` | `defer_intentionally` |
| `suppressed` | `suppress` (uses `fn_triage_case` for suppression_reason first) |
| `ignored` | `ignore` |
| `duplicate` | `duplicate` (prefer `mark_duplicate` which sets predecessor) |

**Function 3 — `friction.reopen_case(p_case_id, p_actor='pk', p_clear_action_decision=false)`**

Operator-initiated reopen. Clears resolved_at, sets resolution_kind = `'reopened'`, increments reopen_count. Bypasses 14-day window. Returns `TABLE(case_id, reopen_count, prior_resolution_kind)`.

**Constraints:**
- Case must be RESOLVED (`resolved_at IS NOT NULL`); else raises.
- `p_clear_action_decision = true` clears action_decision (forces fresh triage). Default `false` preserves prior intent.

**Function 4 — `friction.mark_duplicate(p_case_id, p_predecessor_case_id, p_actor='pk')`**

Closes a case as a duplicate of a predecessor. Sets `predecessor_case_id`, `triage_state='duplicate'`, `action_decision='duplicate'`, `resolution_kind='duplicate'`, `resolved_at=now()`. Returns `TABLE(case_id, predecessor_case_id, resolved_at)`.

**Constraints:**
- Case must be open.
- Predecessor must exist (FK already enforced by cc-0017a self-FK on `predecessor_case_id`).
- `p_predecessor_case_id != p_case_id` (no self-link).
- Cross-fingerprint dedupes ALLOWED with `friction.emit_error` warning written for audit (operator judgment trusted; see §3.5).

**Function 5 — `friction.record_first_view(p_case_id, p_actor='pk')`**

Idempotent setter for `first_viewed_at` (Wave 7 UI callsite). Returns `TABLE(case_id, first_viewed_at, was_already_viewed)`.

**Constraints:**
- Case must exist (open or resolved both OK).
- If `first_viewed_at IS NOT NULL`: no-op; returns existing value + `was_already_viewed = true`.
- If `first_viewed_at IS NULL`: sets to `now()`; returns + `was_already_viewed = false`.

**Function 6 — `friction.purge_test_case(p_pattern)`**

V-check cleanup helper. Postgres-owner DELETE on event + case + emit_error rows matching strict prefix pattern. Returns `TABLE(events_deleted, cases_deleted, errors_deleted)`.

**Constraints:**
- `p_pattern` MUST match regex `'^cc-[0-9]{4}[a-z]?-test/'` (e.g. `cc-0017d-test/%`, `cc-0018-test/%`). Else raises.
- Deletes from `friction.event` WHERE `observation_text LIKE p_pattern OR source_event_id LIKE p_pattern`.
- Deletes from `friction.case` WHERE `case_title LIKE p_pattern`.
- Deletes from `friction.emit_error` WHERE `source_event_id LIKE p_pattern`.
- EXECUTE granted to `service_role` ONLY (NOT authenticated). Reduced blast radius.
- **v1.1 note:** the `cc-0017d/mark_duplicate/...` internal-prefix audit namespace is intentionally OUTSIDE this regex. Cross-fingerprint audit rows are NOT cleaned by `purge_test_case` even when their `raw_payload` JSONB references test-prefix case rows. V-check cleanup may require a separate corrective pattern targeting `raw_payload::text LIKE '%cc-NNNN[a-z]?-test%'`. See `vchecks.md` v1.1 Addendum.

### Behavioural change scope

**Substantial at function layer; zero at trigger/table layer.** 6 new SQL functions created. No existing function bodies modified. No trigger changes. No table DDL. `fn_triage_case` continues unchanged in parallel.

### Out of scope (deferred)

- `fn_triage_case` deprecation / rename — Wave 0e or later
- `triaged_at` / `triaged_by` backfill for 8 existing acknowledged cases — deferred; data quality, not blocking
- Audit history shadow tables (`friction.case_history`) with before/after JSONB — Wave 0e
- `p_notes` / `p_actor` rich persistence — `p_actor` captured to `triaged_by` (first triage); `p_notes` discarded in v1
- `set_effort_level` separate function — folded into `triage_case` as optional param
- Bulk-operations functions — Wave 7 UI may surface need
- Write-side CHECK enforcing "open iff resolved_at IS NULL" — Wave 0c deferred; Wave 0e candidate
- Patching `fn_triage_case` to set `triaged_at`/`triaged_by` — Wave 0e candidate
- Operator-action audit-event emission via emit_event — Wave 0e

### Rejected from scope (with rationale)

- **Replacing `fn_triage_case` body to wrap new `friction.triage_case`** — adds indirection without benefit; fn_triage_case's broader signature retains value for richer dashboard FAB use cases.
- **Separate `friction.purge_test_event`** — single combined function with event+case+emit_error cascade is simpler; tests rarely create event-only artefacts.
- **Allowing `friction.triage_case` to set closure-class action_decisions** — those paths require additional state (suppression_reason / predecessor_case_id) better handled by `resolve_case` / `mark_duplicate`.
- **Loose `resolve_case`** (any resolution_kind for any action_decision) — strict mapping is cleaner audit and forces operator intent to be explicit; can be relaxed in v1.1 if PK directs. **v1.1 status:** strict retained; no operator friction surfaced at apply.

---

**Continue:** [`cc-0017d/risks-and-grants.md`](cc-0017d/risks-and-grants.md) → [`cc-0017d/preflight-pset.md`](cc-0017d/preflight-pset.md) → [`cc-0017d/migration-sql.md`](cc-0017d/migration-sql.md) → [`cc-0017d/vchecks.md`](cc-0017d/vchecks.md) → [`cc-0017d/hardstop-rollback.md`](cc-0017d/hardstop-rollback.md) → [`cc-0017d/d01-postapply-deferred.md`](cc-0017d/d01-postapply-deferred.md) → [`cc-0017d/lessons-metadata-changelog.md`](cc-0017d/lessons-metadata-changelog.md)
