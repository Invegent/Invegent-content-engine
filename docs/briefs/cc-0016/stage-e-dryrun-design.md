# cc-0016 Stage E — Dry-Run Design (NON-MUTATING SPEC ONLY)

**Status:** DESIGN AUTHORED (non-mutating). **NOT EXECUTED. NOT APPLIED. NOT SCHEDULED.**
**Authored:** 2026-05-28 Sydney
**Author:** CCD (laptop terminal Claude Code) under PK directive
**Parent brief:** [`docs/briefs/cc-0016-friction-capture-evidence.md`](../cc-0016-friction-capture-evidence.md) §7 "Stage E — Lifecycle / cleanup"
**Predecessor stages (live in production):** Stage A APPLIED v2.97; Stage B CLOSED v2.99; Stage C APPLIED v2.98; Stage D CLOSED/PASS v3.00 (mobile-verified v3.02).
**Constraint of authorship:** this document was produced with **0 SQL apply, 0 DB write, 0 deploy, 0 cron change, 0 production-state mutation, 0 lifecycle cleanup run.** It only reads `docs/00_sync_state.md` + `docs/00_action_list.md` + the parent brief.

> **The destructive Stage E run remains FUTURE/GATED.** This artefact is the *dry-run* design only. Before any destructive cleanup ever fires, the **separate future gate** described in §6 below MUST be satisfied (its own D-01 + explicit PK approval phrase). Nothing in this artefact implies, infers, or pre-authorises that gate.

---

## 1. Cleanup objective and scope boundaries

### 1.1 Objective

Bound long-term Supabase Storage cost for the `friction-evidence` bucket by removing **attachment binaries + their JSONB metadata references** that are older than an **18-month retention window** (parent brief §7), without touching the `friction.event` row itself, its case linkage, or any other audit trail.

### 1.2 What is IN scope for cleanup

| Target | Resource | Scope |
|---|---|---|
| T-1 | `storage.objects` rows | only where `bucket_id = 'friction-evidence'` AND `name` matches a `storage_path` inside the `attachments` array of a *targetable* event |
| T-2 | `friction.event.attachments` JSONB column | only on *targetable* events: **replace** the array with `'[]'::jsonb` (the column itself, the row, and all other columns remain untouched) |

A **targetable event** = `friction.event` row where ALL of:
- `observed_at < (now() - INTERVAL '18 months')` — strict less-than, measured at function execution time
- `jsonb_array_length(attachments) > 0` — no work needed on already-empty rows
- (implicit) `attachments` is a JSON array — invariant enforced by `attachments_is_array` CHECK (Stage A)

### 1.3 What is explicitly OUT of scope (boundaries)

The dry-run, and the eventual destructive run, MUST NOT:

| Boundary | Rationale |
|---|---|
| B-1 | Touch `friction.event` rows that have no attachments (`attachments = '[]'`) | nothing to clean; would be a no-op write but is forbidden to keep the write set minimal |
| B-2 | Touch `friction.event` rows where `observed_at >= cutoff` | retention window violation |
| B-3 | Delete, modify, or relabel the `friction.event` row itself (`event_id`, `case_id`, `observation_text`, `severity`, `category`, etc.) | audit trail must remain whole — only the attachment binaries + their JSONB pointer are ephemeral |
| B-4 | Touch `friction.case`, `friction.case_history`, `friction.event_link`, `friction.emit_error`, `friction.emission_rule`, or any other `friction.*` table | out of scope; lifecycle is per-event-attachments only |
| B-5 | Touch `storage.objects` rows in any bucket other than `friction-evidence` | cross-bucket bleed is forbidden |
| B-6 | Touch `storage.objects` rows in `friction-evidence` that are NOT referenced by a targetable event's `attachments` array | orphan-storage cleanup is **a separate concern**; if orphan rows exist (file uploaded but never referenced, or referenced then row deleted out-of-band) they are NOT eligible under this design — they require their own gated job |
| B-7 | Touch `storage.buckets`, `storage.policies`, or any RLS policy on `storage.objects` | bucket lifecycle is not Stage E |
| B-8 | Issue any `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, or DDL of any kind | Stage E is row-level DML only |
| B-9 | Re-run for the same event within the same invocation | the `UPDATE … SET attachments = '[]'::jsonb` is idempotent; re-running across invocations is safe but unnecessary |
| B-10 | Run on `friction.event` rows during the **first 14 days of production attachment use** (operational guardrail, see §6) | gives PK time to verify retention semantics on live data before any binary is irrecoverably deleted |

### 1.4 No-op guarantee

If zero targetable events exist (e.g. first call after deploy, or all old attachments already cleaned), the dry-run reports `targetable_events: 0 / targetable_files: 0` and the future destructive run performs **zero writes** (no `DELETE`, no `UPDATE`). This is verified by acceptance criterion AC-7 (§5).

---

## 2. Candidate lifecycle states / rows / tables to inspect

The dry-run inspects these tables/relations **read-only** (no DML, no DDL). Listed in the order the dry-run should query them.

| Step | Relation | Purpose | Read mode |
|---|---|---|---|
| I-1 | `friction.event` | Identify targetable events: `observed_at < cutoff` AND `jsonb_array_length(attachments) > 0` | `SELECT` only |
| I-2 | `friction.event.attachments` (JSONB) | Extract each `storage_path` per targetable event for file-deletion counting | `jsonb_array_elements` over already-selected rows |
| I-3 | `storage.objects` | For each extracted `storage_path`, verify a corresponding row exists in `bucket_id='friction-evidence'` (the file is actually there) | `SELECT name, created_at, owner, metadata` |
| I-4 | `storage.buckets` | Confirm `friction-evidence` exists and is still `public=false` (Stage A invariant) — fail-closed if the bucket has been reconfigured | `SELECT name, public, file_size_limit` |
| I-5 | `cron.job` | Detect whether the `friction-attachment-cleanup-weekly` job is already scheduled (must be absent during dry-run) and whether any name-collision job exists | `SELECT jobname, schedule, active` |
| I-6 | `pg_proc` + `pg_namespace` | Detect whether `friction.fn_cleanup_old_attachments()` already exists (must be absent during dry-run; presence is a signal that Stage E may have been partially applied) | `SELECT proname, prokind, proacl` |
| I-7 | `friction.event` (counter-check) | Counter-validate: count rows that *would NOT* be touched (`observed_at >= cutoff` OR `jsonb_array_length(attachments) = 0`) to prove the negative-space cardinality matches `total_with_attachments - targetable` | `SELECT COUNT(*)` |

**Lifecycle state transitions touched by the eventual destructive run** (documented for the gate review; not exercised here):

- `friction.event.attachments`: `<jsonb_array(N)>` → `'[]'::jsonb` where `observed_at < cutoff` (T-2 above)
- `storage.objects` (in `friction-evidence`): row present → row removed where `name` ∈ the cleared array (T-1 above)
- `friction.event.observed_at`, `event_id`, `case_id`, `severity`, `category`, `observation_text`, `raw_payload`, `dedupe_fingerprint`, `dynamic_context`, `related_object`: **unchanged**.
- `friction.case`: **unchanged** (case-level attachment counts via `friction.case_with_attachment_count` view will recompute on next read — the view is `LEFT JOIN`-aggregating).

---

## 3. Read-only verification queries (pseudocode + SQL)

> **Permissions context for execution:** all queries below are SELECT-only. They are safe to run as a least-privilege read role with `SELECT` on `friction.event`, `storage.objects`, `storage.buckets`, `cron.job`, and `pg_catalog`. They MUST NOT be run as `service_role` if the intent is observation; a read role avoids any accidental write privilege.

### Q-1 — Cutoff snapshot (binds the timestamp once)

```sql
-- Bind cutoff once; reuse via CTE so concurrent dry-runs don't drift between queries.
WITH params AS (
  SELECT (now() - INTERVAL '18 months')::timestamptz AS cutoff,
         now()                                       AS as_of
)
SELECT cutoff, as_of, age(as_of, cutoff) AS retention_window
FROM params;
```

### Q-2 — Targetable event count + total attachment-file count

```sql
WITH params AS (
  SELECT (now() - INTERVAL '18 months')::timestamptz AS cutoff
),
targetable AS (
  SELECT e.event_id,
         e.observed_at,
         jsonb_array_length(e.attachments)         AS file_count,
         e.attachments
  FROM   friction.event e, params p
  WHERE  e.observed_at < p.cutoff
    AND  jsonb_array_length(e.attachments) > 0
)
SELECT (SELECT cutoff FROM params)        AS cutoff,
       COUNT(*)                           AS targetable_events,
       COALESCE(SUM(file_count), 0)       AS targetable_files,
       MIN(observed_at)                   AS oldest_targetable_event,
       MAX(observed_at)                   AS newest_targetable_event
FROM   targetable;
```

### Q-3 — Per-event preview (capped sample, full counts via Q-2)

```sql
WITH params AS (
  SELECT (now() - INTERVAL '18 months')::timestamptz AS cutoff
)
SELECT e.event_id,
       e.observed_at,
       jsonb_array_length(e.attachments) AS file_count,
       e.attachments                     AS attachments_preview
FROM   friction.event e, params p
WHERE  e.observed_at < p.cutoff
  AND  jsonb_array_length(e.attachments) > 0
ORDER  BY e.observed_at ASC
LIMIT  20;   -- sample only; full counts live in Q-2
```

### Q-4 — Storage-object existence cross-check (extract storage_path, probe storage.objects)

```sql
WITH params AS (
  SELECT (now() - INTERVAL '18 months')::timestamptz AS cutoff
),
targetable_paths AS (
  SELECT e.event_id,
         e.observed_at,
         (att->>'storage_path')::text AS storage_path
  FROM   friction.event e, params p,
         LATERAL jsonb_array_elements(e.attachments) AS att
  WHERE  e.observed_at < p.cutoff
    AND  jsonb_array_length(e.attachments) > 0
)
SELECT t.event_id,
       t.observed_at,
       t.storage_path,
       CASE WHEN o.name IS NULL THEN 'missing_in_storage' ELSE 'present' END AS storage_status,
       o.created_at AS storage_created_at,
       o.metadata->>'size' AS storage_size_bytes
FROM   targetable_paths t
LEFT   JOIN storage.objects o
       ON o.bucket_id = 'friction-evidence' AND o.name = t.storage_path
ORDER  BY t.observed_at ASC, t.storage_path
LIMIT  100;   -- full status counts via Q-5
```

### Q-5 — Storage-object cross-check summary (counts, no row list)

```sql
WITH params AS (
  SELECT (now() - INTERVAL '18 months')::timestamptz AS cutoff
),
targetable_paths AS (
  SELECT (att->>'storage_path')::text AS storage_path
  FROM   friction.event e, params p,
         LATERAL jsonb_array_elements(e.attachments) AS att
  WHERE  e.observed_at < p.cutoff
    AND  jsonb_array_length(e.attachments) > 0
)
SELECT COUNT(*)                                                          AS jsonb_paths_total,
       COUNT(o.name)                                                     AS present_in_storage,
       COUNT(*) FILTER (WHERE o.name IS NULL)                            AS missing_in_storage,
       COALESCE(SUM((o.metadata->>'size')::bigint), 0)                   AS bytes_to_delete
FROM   targetable_paths t
LEFT   JOIN storage.objects o
       ON o.bucket_id = 'friction-evidence' AND o.name = t.storage_path;
```

### Q-6 — Bucket invariant check (Stage A baseline)

```sql
SELECT name, public, file_size_limit, allowed_mime_types
FROM   storage.buckets
WHERE  name = 'friction-evidence';
-- Expected: exactly 1 row; public=false; file_size_limit=5242880;
-- allowed_mime_types contains image/jpeg, image/png, image/webp.
```

### Q-7 — Cron-job absence check (no scheduled cleanup must exist during dry-run)

```sql
SELECT jobid, jobname, schedule, active, command
FROM   cron.job
WHERE  jobname = 'friction-attachment-cleanup-weekly'
   OR  command ILIKE '%fn_cleanup_old_attachments%';
-- Expected during dry-run: zero rows. Any row here means Stage E was
-- partially applied previously; the gate (§6) must reconcile before
-- the destructive run can be authorised.
```

### Q-8 — Function absence check (the cleanup function must not yet exist)

```sql
SELECT n.nspname AS schema, p.proname, p.prokind, p.proacl
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname = 'friction'
  AND  p.proname = 'fn_cleanup_old_attachments';
-- Expected during dry-run: zero rows. Same partial-apply guardrail as Q-7.
```

### Q-9 — Counter-validation (the "would-NOT-be-touched" negative space)

```sql
WITH params AS (
  SELECT (now() - INTERVAL '18 months')::timestamptz AS cutoff
)
SELECT COUNT(*) FILTER (WHERE e.observed_at >= p.cutoff)                                          AS within_window,
       COUNT(*) FILTER (WHERE e.observed_at <  p.cutoff AND jsonb_array_length(e.attachments)=0)  AS old_but_already_empty,
       COUNT(*) FILTER (WHERE jsonb_array_length(e.attachments) = 0)                              AS empty_attachments_any_age,
       COUNT(*)                                                                                   AS total_event_rows
FROM   friction.event e, params p;
```

Counter-validation invariant (machine-checkable after Q-2 + Q-9):

```
total_event_rows
  = within_window
  + (targetable_events)                        -- from Q-2
  + (old_but_already_empty)                    -- from Q-9
```

A mismatch indicates either a clock skew during the run or an unexpected NULL `observed_at` (CHECK on `friction.event` should reject NULL; nonetheless, fail closed).

### Q-10 — Dry-run pseudocode (orchestration wrapper, OPTIONAL)

If/when a callable read-only function is introduced for repeatable observation, its shape is:

```sql
-- PSEUDOCODE ONLY — not for application. Future, gated.
CREATE OR REPLACE FUNCTION friction.fn_cleanup_old_attachments_DRYRUN()
RETURNS jsonb
LANGUAGE sql
STABLE                              -- pure SELECT, no writes
SECURITY INVOKER                    -- run as caller; do not elevate
SET search_path = friction, storage, public
AS $$
  WITH params AS (
    SELECT (now() - INTERVAL '18 months')::timestamptz AS cutoff
  ),
  -- … (compose Q-2, Q-5, Q-6, Q-7, Q-8, Q-9 into a single JSON object) …
  SELECT jsonb_build_object(
    'mode',               'dryrun',
    'cutoff_date',        (SELECT cutoff FROM params),
    'as_of',              now(),
    'targetable_events',  …,
    'targetable_files',   …,
    'bytes_to_delete',    …,
    'missing_in_storage', …,
    'bucket_ok',          …,
    'cron_already_set',   …,
    'function_already_present', …,
    'counter_validation_ok',     …
  );
$$;
```

This wrapper is **NOT created here.** It is left as a follow-up that the future gate (§6) may choose to introduce alongside the destructive `fn_cleanup_old_attachments`, deployed as a paired (DRYRUN, EXECUTE) function pair so PK can audit-then-apply.

---

## 4. Dry-run output format

The dry-run produces a single JSON object (whether assembled from the ad-hoc queries Q-1–Q-9 by the operator or returned by the future `fn_…_DRYRUN()` wrapper). The shape:

```json
{
  "mode":                       "dryrun",
  "cutoff_date":                "2024-11-28T00:00:00Z",
  "as_of":                      "2026-05-28T00:00:00Z",
  "retention_months":           18,
  "bucket":                     "friction-evidence",

  "targetable_events":          <int  >= 0>,
  "targetable_files":           <int  >= 0>,
  "bytes_to_delete":            <int  >= 0>,
  "oldest_targetable_event":    "<timestamptz | null>",
  "newest_targetable_event":    "<timestamptz | null>",

  "storage_cross_check": {
    "jsonb_paths_total":        <int>,
    "present_in_storage":       <int>,
    "missing_in_storage":       <int>
  },

  "guardrails": {
    "bucket_ok":                <bool>,        // Q-6: bucket exists + public=false
    "cron_already_set":         <bool>,        // Q-7: must be false during dry-run
    "function_already_present": <bool>,        // Q-8: must be false during dry-run
    "counter_validation_ok":    <bool>         // Q-2 + Q-9 reconcile
  },

  "sample_events": [
    {
      "event_id":     "<uuid>",
      "observed_at":  "<timestamptz>",
      "file_count":   <int>,
      "attachments":  [ /* JSONB preview, capped */ ]
    }
    /* up to 20 rows from Q-3 */
  ],

  "negative_space": {
    "within_window":           <int>,
    "old_but_already_empty":   <int>,
    "empty_attachments_any_age": <int>,
    "total_event_rows":        <int>
  }
}
```

Output is **archival** — write it to the session file (e.g. `docs/runtime/sessions/YYYY-MM-DD-vX.YY-cc-0016-stage-e-dryrun.md`) at the time the dry-run is exercised. Do not store it inside `friction.*` tables (that would be a write, against the non-mutating contract).

---

## 5. Acceptance criteria (dry-run pass)

The dry-run is considered **PASS** (and only then may the future gate §6 even be considered) when ALL of the following hold:

| # | Criterion | Source query |
|---|---|---|
| AC-1 | `bucket_ok = true` — Stage A bucket invariant holds (single row, `public=false`, file_size_limit=5MB, MIME list intact) | Q-6 |
| AC-2 | `cron_already_set = false` — no `friction-attachment-cleanup-weekly` job exists (else: Stage E was partially applied; reconcile before any further action) | Q-7 |
| AC-3 | `function_already_present = false` — `friction.fn_cleanup_old_attachments` does not exist (same partial-apply guardrail) | Q-8 |
| AC-4 | `counter_validation_ok = true` — `total_event_rows = within_window + targetable_events + old_but_already_empty` (off-by-one or NULL `observed_at` would break this) | Q-2 + Q-9 |
| AC-5 | `missing_in_storage` is **understood** — if non-zero, every missing path is explainable (e.g. manually deleted, RLS-hidden, bucket rename); a non-zero `missing_in_storage` is NOT a fail per se, but each missing row must be enumerated in the session note and accepted before the gate is opened | Q-4 + Q-5 |
| AC-6 | `targetable_events` cardinality and `bytes_to_delete` are within the **PK-confirmed expected order of magnitude** for the period (sanity check: a sudden multi-order-of-magnitude jump = possible misconfiguration; halt) | Q-2 + Q-5 |
| AC-7 | If `targetable_events = 0`, the dry-run reports **NO-OP** and the future gate is not opened (no destructive run needed) | Q-2 |
| AC-8 | The dry-run was executed **after at least 14 days** of production attachment use (operational guardrail per §1.3 B-10) — gives PK time to verify Stage B/C/D end-to-end before any binary is irrecoverably deleted | manual / timestamp check |
| AC-9 | The dry-run output is committed to a session note in `docs/runtime/sessions/` and referenced from `docs/00_sync_state.md` before the gate is requested | manual |

A **FAIL** on AC-1, AC-2, AC-3, AC-4, or AC-8 halts: the gate cannot be opened. AC-5 / AC-6 require explicit per-finding PK adjudication before the gate may be opened. AC-7 short-circuits to NO-OP (no gate needed).

---

## 6. Separate future gate (required before any destructive run)

The dry-run design above produces **only** observation output. A subsequent destructive run requires its OWN gate, separate from this design's authorship gate. The gate has three independent legs that must ALL hold:

### Gate G-E1 — D-01 review

Fire a `sql_destructive` D-01 (`m.chatgpt_review`) with action description equivalent to:

> Apply migration `cc_0016_e_attachment_lifecycle`:
> (a) `CREATE FUNCTION friction.fn_cleanup_old_attachments()` per parent brief §7,
> (b) `cron.schedule('friction-attachment-cleanup-weekly', '30 2 * * 0', …)`,
> (c) first invocation will permanently delete `<N>` files (`<B>` bytes) from `storage.objects` and clear `<N>` `friction.event.attachments` arrays for events with `observed_at < <cutoff>`.

The D-01 must include the EXACT dry-run output JSON (§4) so the reviewer evaluates against a concrete, recently-observed dataset. A stale dry-run (>7 days old at the time of the gate) MUST be re-run.

`requires_pk_escalation = true` is mandatory: this run permanently destroys binary data and (per Stage A rollback note) **the deletion is irreversible** — Supabase Storage retains no shadow copy under the configured bucket settings.

### Gate G-E2 — PK exact approval phrase

PK must respond with an exact, unambiguous approval phrase recorded verbatim into the migration header and the D-01 close-loop row. Suggested phrasing for this gate (PK to confirm final wording):

> `PK APPROVES cc-0016 STAGE E DESTRUCTIVE CLEANUP — CUTOFF <YYYY-MM-DD>, <N> FILES, <B> BYTES`

Substituting placeholders with the values from the dry-run output. The cutoff date locks the cleanup scope to the dry-run snapshot — the destructive run uses the SAME cutoff (not `now()` re-evaluated at execution time) to prevent silent scope drift between approval and apply.

### Gate G-E3 — Stage B/C/D operational maturity

The destructive run is gated on:
- ≥ 14 production days since the first attachment was written via Stage B's FAB (per AC-8)
- Stage D `/operations` display path verified PASS (already CLOSED/PASS v3.00; mobile-verified v3.02)
- No open P0/P1 finding against `friction.event.attachments` shape, `storage.objects` row integrity, or RLS on `friction-evidence`

Failure of any one gate (G-E1, G-E2, G-E3) holds Stage E. The dry-run output remains valid as a non-actionable observation.

### What this design EXPLICITLY does NOT do

- Does not fire D-01 G-E1 — that fires only when PK directs an execution session.
- Does not produce a migration file at `supabase/migrations/`.
- Does not produce, schedule, or call `friction.fn_cleanup_old_attachments` or `friction.fn_cleanup_old_attachments_DRYRUN`.
- Does not commit any approval phrase. Anything that looks like an approval phrase in this document is template/placeholder text and explicitly NOT a record of approval.

---

## 7. Risk notes + rollback / no-op guarantees

### 7.1 Risks (dry-run authorship session — this artefact)

| Risk | Likelihood | Mitigation |
|---|---|---|
| R-A1 | Authoring this artefact mutates production | NIL — file-only, no DB connection used in authorship; this section documents the guarantee, not a hedge against it |
| R-A2 | The artefact is interpreted as authorisation | LOW — §6 explicitly requires a separate gate; this document does not contain approval phrases or D-01 IDs |
| R-A3 | Reader uses the SQL in §3 as a destructive script | LOW — every query in §3 is `SELECT` only; running them as a non-privileged read role is harmless |
| R-A4 | Reader uses the pseudocode in Q-10 as a deployable migration | LOW — Q-10 is wrapped with `STABLE` + `SECURITY INVOKER` + `RETURNS jsonb`, and labelled PSEUDOCODE; even if executed it cannot write |

### 7.2 Risks (the future destructive run — guarded by §6 gates)

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| R-B1 | Binary loss: a file matching a `storage_path` was actually still needed (e.g. an external doc references it) | LOW–MED | 18-month retention + Stage A `public=false` + signed-URL-only access → external references are signed URLs that already have short TTL; no durable external dependency expected |
| R-B2 | Clock skew or DST jump shifts cutoff mid-run | LOW | Mitigation: cutoff is computed ONCE in a CTE (`WITH params AS (SELECT now()-INTERVAL '18 months' AS cutoff)`) and reused; the future destructive function should bind cutoff to a `DECLARE v_cutoff timestamptz := now() - INTERVAL '18 months';` at the top, exactly as the parent brief §7 already does |
| R-B3 | Deletes a `storage.objects` row referenced by a NEWER (within-window) event because two events share the same `storage_path` | LOW (Stage B's client-side UUID path prefix prevents collision: `{event_id}/{filename}`) | The dry-run output's `sample_events` (§4) should be reviewed for duplicate `storage_path` strings; the future function could be hardened to JOIN-check that no within-window event references the same path before delete |
| R-B4 | Long-running scan locks `friction.event` | LOW | The function iterates per-event in a PL/pgSQL loop with single-row `UPDATE`s; no table-level lock; acceptable for the expected cardinality |
| R-B5 | `storage.objects` `DELETE` triggers an upstream RLS denial (e.g. policy added post-Stage-A that restricts delete by owner) | LOW–MED | The function is `SECURITY DEFINER` running as `service_role` (Stage A grants); `service_role` bypasses RLS. Dry-run AC-1 verifies the bucket invariant; the gate's D-01 should additionally inspect any new RLS on `storage.objects` since Stage A |
| R-B6 | The cron schedule misfires (runs twice, overlaps a Saturday backlog) | LOW | The function is idempotent at the event level: re-running on an already-cleaned event finds `jsonb_array_length(attachments) = 0` and skips it (the WHERE clause `jsonb_array_length(attachments) > 0` is the loop predicate). No double-delete risk |
| R-B7 | Bucket renamed or deleted between dry-run and destructive run | LOW | AC-1 must be re-verified at the start of the destructive session, not relied on from the dry-run timestamp |

### 7.3 Rollback / no-op guarantees for THIS artefact

| Guarantee | Mechanism |
|---|---|
| G-1 | This artefact creates NO production change | only `Write` of `docs/briefs/cc-0016/stage-e-dryrun-design.md` + optional surgical `Edit` of `docs/briefs/cc-0016-friction-capture-evidence.md` to link this design + optional `Edit` of `docs/00_sync_state.md` + `docs/00_action_list.md` to record the design's authorship |
| G-2 | This artefact can be revoked by `git rm` of the file | no DB state to roll back; no cron unschedule; no function drop |
| G-3 | The queries in §3 are safe to run repeatedly | `SELECT`-only; no write privilege needed; idempotent observation |
| G-4 | The pseudocode in §3 Q-10 is **NOT** to be created as a function in this session | explicitly marked PSEUDOCODE; would otherwise need its own D-01 even though it's read-only, because it's a DDL `CREATE FUNCTION` |

### 7.4 Rollback paths for the FUTURE destructive run (informational; carries forward from parent brief §7)

```sql
-- Stop future cleanups (does NOT recover already-deleted files):
SELECT cron.unschedule('friction-attachment-cleanup-weekly');
DROP FUNCTION IF EXISTS friction.fn_cleanup_old_attachments();
```

Note: there is no in-place rollback for binaries already deleted by the destructive run. The first invocation IS the rollback boundary. This is captured in Gate G-E1's D-01 framing and Gate G-E2's PK approval phrase.

---

## 8. Open questions for the gate (deferred — NOT decided here)

These are the questions the parent brief §9 already flagged plus the additions surfaced while authoring this dry-run design. They feed into Gate G-E1's D-01 framing; this document does NOT decide them.

| # | Question | Source |
|---|---|---|
| OQ-1 | Is the 18-month retention correct (vs 12 / 24 / never)? | Parent §9.2 |
| OQ-2 | Is delete-without-archive acceptable, or should the destructive run move binaries to an `friction-evidence-archive` cold bucket first? | Parent §9.6 + R-B1 |
| OQ-3 | Should the cleanup log to `friction.emit_error` (source = `attachment_cleanup`) for audit? Or to a new dedicated table? | Parent §9.7 |
| OQ-4 | Should the future destructive function `RAISE NOTICE` per-event for streaming logs, or return only the summary JSONB? | New — surfaced by §4 design |
| OQ-5 | Should the gate require a fresh dry-run within N hours of execution? (e.g. 24h freshness window — observed events could change between dry-run and apply) | New — surfaced by Gate G-E1 staleness rule |
| OQ-6 | Is the cron schedule `'30 2 * * 0'` correct, or should it align with the existing nightly-health-check pattern? | Parent §7 |
| OQ-7 | Should `missing_in_storage` rows (per AC-5) be auto-classified (e.g. "orphaned-but-jsonb-still-references") into a separate followup brief? | New — surfaced by Q-4/Q-5 |

---

## 9. Provenance and verification trail

- This document was authored against the parent brief at commit `fa2aefc` (HEAD at session start, branch `chore/cc-0020-migration-history-reconcile-v2`). The parent brief itself is unchanged in this session.
- Read: `docs/00_sync_state.md` (lines 1–85), `docs/00_action_list.md` (lines 1–235), `docs/briefs/cc-0016-friction-capture-evidence.md` (full, 1298 lines).
- Cross-references inspected: `docs/briefs/cc-0017c/` subdirectory pattern (used to confirm the `cc-0016/` subdirectory convention).
- 0 SQL executed. 0 MCP tool called against production. 0 `apply_migration`. 0 D-01 fired. 0 cron change. 0 deploy.
- The destructive Stage E gate (§6) is NOT opened by this document.

---

*cc-0016 Stage E dry-run design v1.0. Authored 2026-05-28 Sydney. Non-mutating spec. No D-01 fired. No approval inferred. Destructive run remains future/gated under §6.*
