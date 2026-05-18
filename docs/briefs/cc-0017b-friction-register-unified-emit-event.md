# cc-0017b — Friction Register Unified Emit Event (Wave 0b)

**Brief ID:** cc-0017b
**Version:** v1.1 (doc-only patch — 6 defects + 2 rollback bodies inlined)
**Status:** CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION 2026-05-18 (v2.82) — doc-only v1.1 patch 2026-05-18
**Wave:** 0b of 10 (Friction Register Consolidation Plan)
**Authored:** 2026-05-18 Sydney evening (v1.0); v1.1 patched 2026-05-18 Sydney late evening
**Author:** Chat-side Claude on PK directive
**Strategic anchors:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`)
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (signed v2.79)
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` v1.1 (CLOSED-APPLIED v2.81)

**Migrations applied (2026-05-18, v2.82):**
- `cc_0017b_friction_unified_emit_event` (main, 11 atomic steps)
- `cc_0017b_emit_event_ambiguity_fix` (corrective, schema-qualifies emit_event Step 9 WHERE)

**Depends on:** cc-0017a Wave 0a — schema landed at migration version `20260518065610`, 22 cases backfilled with sha256 fingerprints, partial unique index `case_open_dedupe_uniq` active.
**Schema:** extends `friction.*` schema in Supabase `mbkmaxqhsohbtwsqolns`.

---

## Brief structure (multi-file)

This brief is split across multiple files under `docs/briefs/cc-0017b/` to stay within authoring-tool payload limits. Read in order:

| Section | File | What it covers |
|---|---|---|
| 1–2 | (this file, below) | Strategic anchor + scope summary |
| 3–4 | [`cc-0017b/risks-and-grants.md`](cc-0017b/risks-and-grants.md) | Cross-cutting grants, RLS, security + risks/mitigations table |
| 5.1 | [`cc-0017b/preflight-pset.md`](cc-0017b/preflight-pset.md) | Pre-flight P1–P16 (run before D-01 fire) |
| 5.2 (Steps 1–6) | [`cc-0017b/migration-sql-part-a.md`](cc-0017b/migration-sql-part-a.md) | Transition backfill + CHECK extension + dynamic_context column + helper functions + GUC-aware trigger + canonical emit_event |
| 5.2 (Steps 7–11) | [`cc-0017b/migration-sql-part-b.md`](cc-0017b/migration-sql-part-b.md) | 3 wrapper rewrites + emission_rule seeds + GRANTs |
| 5.3 | [`cc-0017b/vchecks.md`](cc-0017b/vchecks.md) | V-B1 through V-B27 |
| 5.4–5.5 | [`cc-0017b/hardstop-rollback.md`](cc-0017b/hardstop-rollback.md) | Hard-stop conditions + rollback SQL (incl. verbatim cc-0014 bodies) |
| 6–8 | [`cc-0017b/d01-postapply-deferred.md`](cc-0017b/d01-postapply-deferred.md) | D-01 framing + post-apply commitments + deferred decisions |
| 9–11 | [`cc-0017b/lessons-metadata-changelog.md`](cc-0017b/lessons-metadata-changelog.md) | Lessons reference + authoring metadata + changelog |

The full brief is the union of all sub-files. No file stands alone.

---

## 1. Strategic anchor

This brief implements **Wave 0b — the engine + trigger logic layer** of the Friction Register Consolidation Plan v1 + amendments + §5.5 (signed 2026-05-18 Sydney evening).

Wave 0b is **the behavioural transition** from cc-0014's direct-INSERT-per-emitter pattern to the unified `friction.emit_event` canonical entrypoint. After this migration applies, all three production emitters become thin wrappers over `friction.emit_event`. The BEFORE INSERT trigger on `friction.event` is rewritten to provide defence-in-depth for any direct INSERTs that bypass `emit_event` (transition window before Wave 0c's Amendment F lockdown REVOKE).

Locked decisions enacted:

| Source | Used in this brief |
|---|---|
| v1 plan §5 Decisions 1–10 | Central emit_event entrypoint; strict emission_rule contract; dedupe attaches to OPEN cases; "exactly once" discipline |
| v1 plan §6.7 | Initial `emit_event` sketch — revised with Amendments E + E.1 (+ category_override per PK) |
| Amendment A | Wave split — this is 0b; 0c (REVOKE lockdown + FK + NOT NULL) deferred |
| Amendment B | Canonical `dedupe_fingerprint = sha256(source ‖ ':' ‖ problem_key ‖ ':' ‖ related_object_canonical)` via `fn_compute_dedupe_fingerprint_v1` (from cc-0017a) |
| Amendment C | `triaged_at`, `triaged_by`, `first_viewed_at` columns from cc-0017a — emit_event does NOT set these |
| Amendment E | `p_severity_override` parameter; **per PK directive 2026-05-18 the provenance is stored in `dynamic_context`, NOT extended into `category_source` enum** |
| Amendment E.1 (NEW) | `p_category_override` parameter — symmetric extension; `category_source = 'category_override'` added to CHECK enum only when caller passes the override AND `reported_by ≠ 'pk'` |
| Amendment F (ref) | `REVOKE` lockdown is Wave 0c; this brief grants `EXECUTE` to `emit_event` in preparation |
| Amendment G | `resolved_at`, `resolution_kind`, `reopen_count`, `predecessor_case_id` columns from cc-0017a; reopen path semantics locked here |
| §5.5 Clarification 1 | Reopen window N = 14 days — embedded as `interval '14 days'` constant in emit_event body |

### 1.1 Pre-brief introspection (read-only, captured 2026-05-18 Sydney evening pre-D-01)

The brief is authored against empirical production state captured in a single chat session before D-01 fire. All seed lists, expected row counts, and behavioural assumptions trace to these read-only queries. The pre-flight P-set re-runs the same queries before D-01 to detect drift.

| Q | Finding | Wave 0b impact |
|---|---|---|
| Q1 | `fn_emit_reconciliation_event` is a TRIGGER function (no args, returns `trigger`); `fn_emit_health_check_findings(p_run_id text, p_markdown_path text, p_findings jsonb) RETURNS jsonb`; `fn_emit_manual_event(...)` matches cc-0017a V-A19 evidence exactly | Wrapper signatures preserved EXACTLY |
| Q2 | `event.reported_by` CHECK = `('system','pk','client','vendor','unknown')` — 5 enum values; `event.category_source` CHECK = `('emitter_default','manual_at_capture','triage_override')` — 3 enum values | emit_event validates `p_reported_by` against the 5-value enum; category_source extension is minimal (one new value: `'category_override'`) |
| Q3 | 4 triggers in place: `friction_event_promote_to_case`, `friction_event_no_delete_during_run`, `friction_case_no_delete_during_run`, `friction_emit_reconciliation` (on `r.cadence_drift_log`). UNIQUE `(source, source_event_id)` ALREADY on `friction.event` | Idempotency schema-enforced. No DROP TRIGGER / CREATE TRIGGER needed — function bodies replaced via CREATE OR REPLACE FUNCTION |
| Q4 | `emission_rule` + `notification_policy` columns match cc-0017a spec; 0 rows in both | Seed 3 emission_rule rows (1 per source); notification_policy stays empty until Wave 2 (cc-0023) |
| Q5 | `r.cadence_drift_log` has 1 distinct drift_type: `'observer_stale'` (12 rows); reconciliation events have 1 distinct problem_key: `'observer_stale'` (9 events) | Single emission_rule for reconciliation: `(reconciliation, observer_stale)` |
| Q6 | health_check events have 5 distinct problem_keys, all matching pattern `'true-stuck-<platform>-<client-slug>'` | Single emission_rule for health_check: `(health_check, true_stuck)`. Wrapper resolves `condition_key` via 3-tier rule: explicit field → parse → emit_error fallback |
| Q7 | 0 cases with NULL `dedupe_fingerprint` post-cc-0017a; 0 cases created post-0a apply | Defensive transition-window backfill in migration Step 1 expects 0–N (small) rows |
| Q8 | Event `dedupe_fingerprint` format: 22 events all 32-char md5 (legacy); 22 cases all 64-char sha256 (cc-0017a backfill) | Future emit_event events get sha256. Historical md5 fingerprints are forensic-only. Cross-format documented and acceptable |

---

## 2. Scope summary

### In scope (Wave 0b)

**1 new column on `friction.event`:**
- `dynamic_context jsonb` — nullable. Audit blob: severity/category override provenance + caller-supplied context. PK directive 2026-05-18: override provenance lives here, NOT extended into `category_source` enum.

**1 CHECK constraint extension on `friction.event`:**
- `event_category_source_check` extended from 3 to 4 permitted values. Added: `'category_override'` (set by emit_event when `p_category_override IS NOT NULL` AND `p_reported_by ≠ 'pk'`). **NOT added: `'severity_override'`** — PK directive.

**2 new helper functions:**
- `friction.fn_severity_rank(p_severity text) RETURNS integer` — IMMUTABLE. Maps `info→0, warn→1, critical→2, else→-1`. Used by attach-path escalation.
- `friction.fn_attach_or_create_inner_v1(...)` — shared decision tree extracted from emit_event Step 8 so the trigger function's defence-in-depth path can reuse it.

**1 canonical entrypoint function:**
- `friction.emit_event(p_source, p_condition_key, p_problem_key, p_source_event_id, p_observed_at, p_related_object, p_observation_text, p_raw_payload, p_reported_by, p_severity_override, p_category_override, p_dynamic_context)` — 12 parameters; returns TABLE `(event_id uuid, case_id uuid, case_disposition text)`. SECURITY DEFINER. The single write path for all future friction.event rows. Sets transaction-local GUC `friction.emit_event_active='true'` to signal the BEFORE INSERT trigger to no-op.

**4 function bodies replaced via CREATE OR REPLACE (signatures preserved exactly):**
1. `friction.fn_promote_event_to_case()` — BEFORE INSERT trigger function. Body: check GUC; if set, no-op; else defence-in-depth attach-or-create-or-reopen via `fn_attach_or_create_inner_v1`, logging bypass to `friction.emit_error`.
2. `friction.fn_emit_reconciliation_event()` — AFTER INSERT trigger on `r.cadence_drift_log`. Body calls `emit_event` with `p_source='reconciliation'`, `p_condition_key=NEW.drift_type`.
3. `friction.fn_emit_health_check_findings(text, text, jsonb) RETURNS jsonb` — Cowork RPC. Body iterates findings, resolves `condition_key` via 3-tier rule, calls `emit_event` per finding.
4. `friction.fn_emit_manual_event(...) RETURNS uuid` — FAB RPC. Body calls `emit_event` with `p_reported_by='pk'`, `p_severity_override=p_severity`, `p_category_override=p_category` when set.

**3 `friction.emission_rule` seed rows:**
1. `('reconciliation', 'observer_stale')` — `warn` / `client_commitment` / `open_cases` / `auto_create`
2. `('health_check', 'true_stuck')` — `warn` / `pipeline_integrity` / `open_cases` / `auto_create`
3. `('manual', 'manual_fab')` — `info` / `unclassified` / `open_cases` / `auto_create`

**1 GRANT:**
- `GRANT EXECUTE ON FUNCTION friction.emit_event(...) TO service_role, authenticated` — preparation for Wave 0c REVOKE.

**1 defensive backfill step:**
- Wave 0a→0b transition-window NULL `dedupe_fingerprint` backfill. Expected: 0–20 rows. Hard-stop if any case with linked event has NULL fingerprint post-backfill.

### Explicitly out of scope (deferred to 0c / later waves)

- `REVOKE INSERT, UPDATE ON friction.event` from PUBLIC/authenticated — Wave 0c
- `REVOKE INSERT, UPDATE ON friction.case` from PUBLIC/authenticated — Wave 0c
- `DROP CONSTRAINT event_source_check` + add FK to `friction.source` — Wave 0c
- `ALTER TABLE friction.case ALTER COLUMN dedupe_fingerprint SET NOT NULL` — Wave 0c
- `emission_rule_history` audit trigger — Wave 0c
- Per-source tunable reopen window — v2
- Cross-source dedupe — v2
- Wave 1+ emitters (compliance, doctor/fixer, sentinel dual-write, slot_alerts, token) — separate briefs
- Telegram lifecycle trigger on `friction.case` — Wave 2 (cc-0023)
- `/operations` UI instrumentation of `first_viewed_at` — Wave 7 (cc-0015)

### Behavioural change scope

**SUBSTANTIAL.** Unlike cc-0017a's purely-additive 0a, this brief changes how every existing emitter writes to friction.event:

- Before 0b: emitters compute md5 fingerprints; INSERT directly; trigger does attach-or-create via 7-day rolling event-EXISTS lookup.
- After 0b: emitters compute condition_key + problem_key; call `emit_event`; `emit_event` computes sha256 fingerprint, looks up `emission_rule`, attaches/reopens/creates via case-fingerprint lookup + 14-day reopen window; sets transaction-local GUC; trigger sees GUC and no-ops. Direct INSERTs hit defence-in-depth path.

**Backward-compatibility guarantees:**

1. **All 3 wrapper signatures preserved exactly.** External callers (cron 85 trigger on `r.cadence_drift_log`; Cowork `nightly-health-check-v1` v3.0 brief; invegent-dashboard FAB) require ZERO changes.
2. **Existing problem_key derivation preserved** for all 3 emitters.
3. **Existing severity-to-priority mapping preserved** (health_check priority 1/2/3 → critical/warn/info via `p_severity_override`).
4. **Existing `friction.emit_error` audit pattern preserved.** Wrapper failures still log to emit_error and never raise to caller.
5. **Existing trigger bindings preserved.** No DROP TRIGGER / CREATE TRIGGER. Only function body replacement via CREATE OR REPLACE FUNCTION.

### Rejected from scope considerations

- **Renaming `fn_promote_event_to_case` to `fn_attach_or_create_case_v2`.** Requires DROP TRIGGER + CREATE TRIGGER. CREATE OR REPLACE FUNCTION on the same name is atomic and less risky. Defer rename to a future cosmetic cleanup wave.
- **Adding `severity_source` as a separate column.** Larger schema change; Amendment E explicitly proposed using `dynamic_context` jsonb instead. Reject.
- **Recomputing existing 22 events' `dedupe_fingerprint` to sha256.** Events are immutable facts. Future events get sha256 from emit_event. Cross-format is documented. Reject.
- **Adding `validate_severity_format` and `validate_category_format` CHECK constraints on the override parameters.** Caller-level validation already happens in emit_event Step 1. Reject.

---

**Continue reading:** [`cc-0017b/risks-and-grants.md`](cc-0017b/risks-and-grants.md) → [`cc-0017b/preflight-pset.md`](cc-0017b/preflight-pset.md) → [`cc-0017b/migration-sql-part-a.md`](cc-0017b/migration-sql-part-a.md) → [`cc-0017b/migration-sql-part-b.md`](cc-0017b/migration-sql-part-b.md) → [`cc-0017b/vchecks.md`](cc-0017b/vchecks.md) → [`cc-0017b/hardstop-rollback.md`](cc-0017b/hardstop-rollback.md) → [`cc-0017b/d01-postapply-deferred.md`](cc-0017b/d01-postapply-deferred.md) → [`cc-0017b/lessons-metadata-changelog.md`](cc-0017b/lessons-metadata-changelog.md)
