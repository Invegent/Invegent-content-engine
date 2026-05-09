# Brief cc-0005 — M8 Path A cutover (cron 48 in-place rewrite + legacy-origin future cleanup + `public.get_next_scheduled_for` deprecation)

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Patched:** 2026-05-09 Sydney — **v3 patch (regex correctness + H1-H6 + L2)** under PK direction. Supersedes Path A patch `f70cb41f` (which had 5 critical regex bugs that would have blocked first apply at the in-migration verify gates). v3 also extends pre-flight scope per H1-H6 review findings.  
**Executor:** chat (apply via Supabase MCP `apply_migration`) OR Claude Code per brief-runner-v0  
**Status:** issued (v3 patched 2026-05-09; apply pending PK direction to schedule)  
**Result file:** `docs/briefs/results/cc-0005-m8-atomic-cutover.md` (created on completion)

---

## Patch history

- **2026-05-09 Sydney — v3 patch (regex correctness + H1-H6 + L2)** under PK direction. Five critical regex bugs in the v2 Path A patch (`f70cb41f`) would have blocked first apply: the in-migration verify gates V8 and V10 used substring matches (`ILIKE '%get_next_scheduled_for%'` / `~ 'get_next_scheduled_for'`) which would have matched the substring in the M8 Path A comment line in the rewritten cron 48 command body, fired `RAISE EXCEPTION`, and rolled back the transaction before Component 2 + Component 3 could run. v3 replaces all 8+ substring matches with function-call-syntax regex (`~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('`) which correctly distinguishes function calls from comment-mentions AND covers both the original name and the renamed/deprecated name. v3 also reworded the M8 Path A comment in the rewritten cron 48 command body to remove the `get_next_scheduled_for` substring entirely ("legacy fallback removed from COALESCE chain.") as belt-and-braces. v3 additionally extends pre-flight scope per the H1-H6 review: distinct `pd.created_by` enumeration (H3), un-publishable legacy draft cohort query (H4), slot-driven alignment check (H5; new HALT §8.2.l if misaligned), original COMMENT capture for rollback (H6), unique rollback dollar-quote tag guidance (M1), §Forbidden-actions amendment list expanded to 4 items (M2), removed unused `v_min_expected` variable (M3), TOCTOU acknowledgement (M4), expanded §1.2 trigger survey (L1), and explicit schedule capture in §1.3 + V7 (L2). Patches in detail under §Patch history details below.

- **2026-05-09 Sydney — Path A patch (v2)** — commit `f70cb41f72e01c27c83639f1ae5bf0dac9353b70`. Component 1 changed from "disable cron 48 via `cron.alter_job(48, active := false)`" to **"rewrite cron 48's command body in place via `cron.alter_job(48, command := <new body>)` to remove `public.get_next_scheduled_for` from the COALESCE chain"**. Cron 48 remains `active=true`. Cleanup component (component 2) and function deprecation (component 3) made structurally conditional on V10 (cron 48 no longer calls `public.get_next_scheduled_for`, enforced via in-migration verify gate). New verifications V7-V10 restructured per PK directive: V7 cron 48 active=true; V8 cron 48 command no longer contains `get_next_scheduled_for`; V9 autonomous slot-driven enqueue path still represented; V10 zero live callers before rename. §1.0 PK confirmation gate simplified (Path A architecture resolves the original items 1 + 2). Investigation record added. Rollback updated to restore old command body. **Superseded by v3 due to regex correctness bugs.**

- **2026-05-09 Sydney (initial draft)** — commit `6f16c40e4947c19280b6f004c1ed3435a234b9ef`. Original Path C draft (disable cron 48 + cleanup + function rename). Brief premise was incorrect: chat investigation 2026-05-09 (turn after cc-0004 closure) established that disabling cron 48 with no replacement would stop autonomous publishing.

---

## Investigation record (chat, 2026-05-09)

This Path A patch is informed by a read-only Supabase investigation conducted by chat 2026-05-09 (the turn immediately after cc-0004 closure / sync_state v2.56). Findings:

1. **Cron 48 is currently the SOLE autonomous inserter into `m.post_publish_queue`.** Confirmed by enumerating every function whose definition contains `INSERT INTO m.post_publish_queue` across all relevant schemas. Result: 4 hits beyond cron 48 — `public.draft_approve_and_enqueue`, `public.draft_approve_and_enqueue_scheduled`, `public.manual_post_insert`, `m.run_system_audit`. All 4 are dashboard-manual / audit paths; **none are autonomous**. SQL used:
   ```sql
   SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.prokind IN ('f','p')
     AND pg_get_functiondef(p.oid) ~* 'INSERT\s+INTO\s+(m\.)?post_publish_queue'
     AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')
   ORDER BY n.nspname, p.proname;
   ```
2. **`m.fill_pending_slots` inserts drafts + AI jobs only, NOT queue rows.** Function body inspected verbatim. The fill function INSERTs / UPSERTs into `m.post_draft` (with `created_by='fill_function'`, `scheduled_for = v_slot.scheduled_publish_at`) and `m.ai_job` (with `status='queued'`, `job_type='slot_fill_synthesis_v1'`). The function NEVER touches `m.post_publish_queue`. Slot-driven drafts therefore depend on cron 48 to enqueue them.
3. **No trigger on `m.post_draft`, `m.slot`, `m.ai_job`, or `m.post_publish` inserts queue rows.** 9 non-internal triggers surveyed. The closest candidates are `trg_release_queue_on_asset_ready` and `trg_gate_queue_on_asset_status`; both operate on EXISTING queue rows (gate / release), not creation.
4. **Disabling cron 48 with no replacement = autonomous publishing stops.** The original cc-0005 draft (Path C) component 1 (`cron.alter_job(48, active := false)`) would have stopped autonomous publishing because the AI worker / auto-approver continue to flow drafts to `approval_status='approved'`, but no path INSERTs them into `m.post_publish_queue`. The publisher reads only from `m.post_publish_queue`. Outcome: **drafts pile up at `approved` status; nothing publishes**.

**Cron 48 current command body (captured by chat 2026-05-09):** three-element COALESCE chain inside the candidates CTE:

```sql
COALESCE(
  pd.scheduled_for,                                              -- (1) preferred; set by m.fill_pending_slots for slot-driven
  s.scheduled_publish_at,                                        -- (2) M4 LEFT JOIN safety net for slot-driven
  public.get_next_scheduled_for(j.client_id, j.platform, NOW())  -- (3) legacy fallback; Bug 3 source pre-M3 fix
)
```

For slot-driven v4 drafts, position (1) is non-null (M4 + F-PUB-009 ensure `pd.scheduled_for` is set by `m.fill_pending_slots`). Position (3) only fires for legacy-origin drafts where `pd.scheduled_for IS NULL` AND `pd.slot_id IS NULL`. The Path A cutover removes position (3) so legacy-unresolvable drafts are skipped via the existing `WHERE computed_scheduled_for IS NOT NULL` filter rather than fallback-scheduled.

**Path A vs Path B vs Path C** (chat synthesis):
- **Path A (this brief):** rewrite cron 48 command body in place. Lowest-risk; cron 48 retains autonomous enqueue role with M4 slot-aware behaviour.
- **Path B:** build a replacement enqueue path (trigger on `m.ai_job` UPDATE→'succeeded' OR new EF). Significant new build work; likely a separate cc-NNNN brief.
- **Path C:** disable cron 48 with no replacement. **Not viable** — autonomous publishing stops.

**PK directed Path A.** This brief implements Path A.

---

## Task

Execute the M8 Path A cutover. Three coordinated components in a single atomic transaction:

1. **Rewrite cron 48 (`enqueue-publish-queue-every-5m`) command body in place** via `cron.alter_job(48, command := <new body>)`. **Cron 48 remains `active=true`.** The new command body is the current command MINUS `public.get_next_scheduled_for(...)` from the COALESCE chain in the candidates CTE — resulting COALESCE: `(pd.scheduled_for, s.scheduled_publish_at)`. Legacy rows with both NULL are **skipped** via the pre-existing `WHERE computed_scheduled_for IS NOT NULL` filter (M3 Bug 3 fix carries forward — Path A repurposes this filter to also drop unresolvable legacy rows). v3-rephrased comment annotation added at the COALESCE site (no longer contains the substring `get_next_scheduled_for` per v3 patch).
2. **Cleanup of legacy-origin future queue rows** — dead-letter all `m.post_publish_queue` rows where `pd.slot_id IS NULL AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW() AND q.status IN ('queued','failed')`. **Conditional on Component 1 verify gate passing** (cron 48 command no longer contains a function-call to `get_next_scheduled_for`); enforced via in-migration `RAISE EXCEPTION`.
3. **Deprecate `public.get_next_scheduled_for`** — rename to `public.get_next_scheduled_for__deprecated_m8` AND add `COMMENT ON FUNCTION` annotating the deprecation. **Conditional on V10 (zero live callers) passing within the migration**; enforced via in-migration `RAISE EXCEPTION` BEFORE the rename fires.

Apply via Supabase MCP `apply_migration` as migration `m8_atomic_cutover_v1`. Single atomic transaction.

**Sequencing:** cc-0003 v2 + cc-0004 confirmed Complete (commits `d60dcfb` + `9d5bdd37`).

---

## Source context

- **Investigation record above** (this brief; chat 2026-05-09).
- `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 §2 + §6 + §8.
- `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §2.8 + §6 Q2 + §6 Q3.
- `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md` (v2 patched) — pattern source.
- `docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` (post 2026-05-09 patch) — pattern source.
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` — v1 HALT result.
- `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` — sequencing satisfied 2026-05-09.
- `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` — v2.56 close.
- `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` + `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` — M4/M5 state.
- `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` §10.2.
- **v3 patch commit (this version)** — see Patch history; v2 patch commit `f70cb41f` superseded.

**`dead_reason` canonical value:** `m8_cutover_legacy_path_deprecated`.

## Scope

**In scope:**
- Pre-flight verification (read-only SELECTs against `information_schema`, `pg_trigger`, `pg_proc`, `pg_views`, `pg_description`, `cron.job`, `cron.job_run_details`, target tables + JOINs; cc-0003 v2 + cc-0004 result files via Invegent GitHub MCP).
- One D-01 fire (`ask_chatgpt_review`) with packet specified in §5.
- Single Supabase MCP `apply_migration` call with the exact SQL in §3 (atomic 3-component migration with two in-migration verify gates).
- 10 post-apply verification queries V1–V10 (§7).
- Rollback within session if any verification fails (per §8); rollback reverses ALL 3 components, including restoring the pre-Path-A cron 48 command body captured at §1.3 AND restoring the original COMMENT (or NULL) on the function captured at §1.4b.
- Close-the-loop UPDATE to `m.chatgpt_review`.
- 4-way sync at session close.
- M7 closure documented in 4-way sync.

**Out of scope:**
- M-09-03 view DDL.
- Any change to cron jobs other than 48.
- Disabling cron 48 (Path A explicitly retains active=true).
- Any DDL beyond `ALTER FUNCTION ... RENAME` and `COMMENT ON FUNCTION` on `public.get_next_scheduled_for`.
- Any change to `m.post_draft` rows.
- Any change to `m.slot` rows.
- Any change to other tables.
- P1 SECURITY-DEFINER hold targets.
- `m.ef_drift_log`.
- EF deploys, dashboard/portal/web work.
- Building a replacement enqueue path.
- Cleanup of un-publishable legacy drafts surfaced by H4 query (separate cc-NNNN if PK directs).

## Allowed actions

- Read source files referenced in §Source context.
- Read-only `SELECT` against the database for pre-flight P1–P5 + post-apply verification.
- One `ask_chatgpt_review` D-01 fire per §5.
- One `apply_migration` call with the exact SQL in §3 (after PK explicit approval based on D-01 result, AND after §1.0 + sequencing gates pass).
- Up to 3 retries on the post-apply verification queries (network/timeout reasons only).
- One rollback migration per §8.3 if any verification fails.
- One close-the-loop UPDATE to `m.chatgpt_review` after success.
- One commit creating `docs/briefs/results/cc-0005-m8-atomic-cutover.md`.
- 4-way sync close commits at session end.

## Forbidden actions

- No second `apply_migration` call beyond the one in §3 (and a rollback if verification fails).
- **SQL amendment list (4 items, expanded v3 per M2):** No modifications to the SQL in §3 except (a) to add or remove `updated_at = NOW()` per P1.1 outcome on `m.post_publish_queue`, (b) to adjust the function-rename argument signature based on the actual function definition surfaced at P1.4, (c) to replace the `2026-05-XX` placeholder in the COMMENT text with the apply-session UTC date, and (d) to replace the `<ORIGINAL_COMMENT>` placeholder in the §8.3 rollback SQL with the value captured at §1.4b (literal NULL or quoted string). All 4 amendments are documented in the D-01 packet (§5.2 `sql_to_apply` field) before fire.
- **No setting `cron.alter_job(48, active := false)`.** Path A explicitly retains cron 48 active. Component 1 only rewrites the `command` argument.
- No cron edits to ANY cron job other than jobid 48.
- No DDL beyond `ALTER FUNCTION ... RENAME` and `COMMENT ON FUNCTION` on `public.get_next_scheduled_for`. No `DROP FUNCTION`. No table DDL. No index DDL. No new functions.
- No changes to `m.post_draft` rows. No changes to `m.slot` rows. No changes to any other table.
- No D-01 fire beyond the one in §5.
- No deletes. Cleanup is UPDATE only. Function deprecation is rename, not drop.
- No `apply_migration` if §1.0 sequencing gate fails.
- No `apply_migration` if cc-0003 v2 OR cc-0004 result file is missing or shows incomplete status.
- No `apply_migration` if pre-flight cleanup count returns outside [0, 200] (HALT path §8.2.a).
- No `apply_migration` if pre-flight §1.4 surfaces any caller of `public.get_next_scheduled_for` outside cron 48.
- **No `apply_migration` if §1.5 P1.5d alignment check returns non-zero (HALT path §8.2.l, NEW v3).**
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`.
- No assumption that `pd.created_by = 'seed_and_enqueue'` is the only legacy-origin filter — §1.5 P1.5b enumerates distinct values.
- No assumption that `pre_dead_reason_count` for `m8_cutover_legacy_path_deprecated` is 0. Always read from §1.8.
- No assumption that `public.get_next_scheduled_for` is uniquely defined by name. §1.4 surfaces all overloaded signatures.
- No assumption that `public.get_next_scheduled_for` has no pre-existing COMMENT. §1.4b captures.
- No assumption that the Path A new cron 48 command body is byte-equivalent to the existing body except for the third COALESCE element. The complete rewritten body is specified in §3.
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it.
- No Phase 0 scheduling.
- No invocation of `m.fill_pending_slots` or any other v4 EF/function from within this brief's apply session.

---

## 1. Pre-flight verification (read-only, runs at apply session start)

### 1.0 Sequencing gate (HARD GATE; runs before §1.1)

**Pre-condition:** before any other pre-flight query, confirm:

1. **cc-0003 v2 result file shows status=Complete or NO-OP.** §1.9 verifies. **Confirmed v2.55 close (commit `08d4835`); cc-0003 v2 result at `d60dcfb` showing 9 rows dead-lettered, V1-V6 PASS.**
2. **cc-0004 result file shows status=Complete or NO-OP.** §1.9 verifies. **Confirmed v2.56 close (commit `ec3fd92e`); cc-0004 result at `9d5bdd37` showing 43 rows dead-lettered, V1-V6 PASS.**

**Decision rule:** Both confirmed (true as of 2026-05-09) → proceed to §1.1. Either missing/incomplete → HALT (§8.2.c).

### 1.1 Confirm table + column structure

```sql
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE (table_schema, table_name) IN (
  ('m', 'post_publish_queue'),
  ('m', 'post_draft')
)
AND column_name IN (
  'queue_id', 'status', 'dead_reason', 'scheduled_for', 'created_at', 'updated_at',
  'post_draft_id', 'client_id', 'platform',
  'slot_id', 'approval_status', 'created_by'
)
ORDER BY table_schema, table_name, column_name;
```

**Expected:** `m.post_publish_queue.{queue_id, status, dead_reason, scheduled_for, post_draft_id}` + `m.post_draft.{post_draft_id, slot_id, created_by}` confirmed present. **Critical:** `m.post_draft.created_by` MUST exist. HALT (§8.2.f) if absent.

### 1.2 Confirm trigger surface (expanded v3 per L1)

```sql
SELECT pn.nspname AS schema_name, c.relname AS table_name,
       t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS triggerdef
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace pn ON pn.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND (pn.nspname, c.relname) IN (
    ('m', 'post_publish_queue'),
    ('m', 'post_draft'),
    ('m', 'slot'),
    ('m', 'ai_job'),
    ('m', 'post_publish')
  )
ORDER BY pn.nspname, c.relname, t.tgname;
```

**Decision rule:** HALT if any trigger fires on UPDATE of `status` AND has external side-effects on `m.post_publish_queue`. **L1 v3 expansion:** survey extends to `m.post_draft / slot / ai_job / post_publish` to confirm none INSERT into `m.post_publish_queue` (validates the chat investigation finding). Expected: triggers on `m.post_publish_queue` PASS criteria; triggers on the other 4 tables exist (gate/release/asset triggers) but none INSERT into queue. Capture full list for D-01.

### 1.3 Cron 48 current state, command body, schedule, and history

```sql
SELECT jobid, jobname, schedule, command, active, database, username
FROM cron.job
WHERE jobid = 48;
```

**Capture (v3 explicit per L2):** `OLD_CRON_48_COMMAND` (the FULL `command` text) AND `OLD_CRON_48_SCHEDULE` (the schedule string). Both required by §8.3 rollback (command body) AND V7 (schedule unchanged check).

**Decision rule:**
- `active = false` → HALT (§8.2.j); Path A premise violated.
- Command does not contain a function-call to `get_next_scheduled_for(...)` (per the regex in §1.4) → component 1 is a no-op for the rewrite (idempotent); proceed but flag.
- Command contains the call (expected) → proceed.
- Command does not contain `INSERT INTO m.post_publish_queue` → HALT (§8.2.k).

```sql
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = 48
ORDER BY start_time DESC
LIMIT 10;
```

If > 50% of last 10 runs show `status != 'succeeded'` — capture for D-01 (informational).

### 1.4 Identify all callers of `public.get_next_scheduled_for` (V10 pre-flight check)

**v3 fix:** all three sub-queries use function-call-syntax regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` instead of substring `ILIKE '%get_next_scheduled_for%'`. The pattern correctly distinguishes function calls from comment-mentions, AND covers both the original name and (post-rename) the deprecated name.

```sql
-- Function/procedure callers
SELECT n.nspname AS schema_name, p.proname AS function_name, 'function' AS object_type,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p')
  AND pg_get_functiondef(p.oid) ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
  AND NOT (n.nspname = 'public' AND p.proname IN ('get_next_scheduled_for', 'get_next_scheduled_for__deprecated_m8'))  -- exclude self
  AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

-- View callers
SELECT schemaname, viewname, 'view',
       NULL
FROM pg_views
WHERE definition ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
  AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

-- Cron callers
SELECT 'cron' AS schema_name, jobname AS function_name, 'cron' AS object_type,
       'jobid=' || jobid AS args
FROM cron.job
WHERE command ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(';
```

**Decision rule:**
- Expected callers: cron 48 (only). HALT (§8.2.g) if non-cron-48 caller surfaces.
- 0 cron callers (e.g. re-attempt after partial state) → proceed; component 1 is a no-op.

**Surface the EXACT signature of `public.get_next_scheduled_for`:**

```sql
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_next_scheduled_for';
```

**Decision rule:** 0 rows → component 3 no-op. 1 row → capture `args` for the rename SQL. > 1 → HALT (§8.2.h).

### 1.4b Capture pre-existing COMMENT on `public.get_next_scheduled_for` (NEW v3 per H6)

```sql
SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       d.description AS pre_existing_comment
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_description d ON d.objoid = p.oid AND d.classoid = 'pg_proc'::regclass
WHERE n.nspname = 'public' AND p.proname = 'get_next_scheduled_for';
```

**Capture:** `ORIGINAL_COMMENT` (NULL if `description` is NULL, otherwise the literal string value). Required by §8.3 rollback to restore the original COMMENT state if rollback fires (instead of hardcoding `IS NULL` which would erase a pre-existing comment).

**Decision rule:** informational. Document captured value in result file. If non-NULL, the v3 brief's `<ORIGINAL_COMMENT>` placeholder in §8.3 is filled with the quoted literal at apply time; if NULL, filled with the literal `NULL`.

### 1.5 Cleanup count check + 3 v3 sub-queries

#### P1.5a — Cleanup count check (unchanged)

```sql
SELECT COUNT(*) AS m8_cleanup_count,
       MIN(q.scheduled_for) AS earliest_future,
       MAX(q.scheduled_for) AS latest_future,
       COUNT(DISTINCT (q.client_id, q.platform)) AS partition_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW();
```

**Decision rule:** = 0 → cleanup is no-op. Outside [0, 200] → HALT (§8.2.a). Inside → proceed.

#### P1.5b — Distinct `pd.created_by` enumeration (NEW v3 per H3)

Surfaces any out-of-scope cohorts beyond `'seed_and_enqueue'`. The cleanup criterion only retires `'seed_and_enqueue'` rows; other values remain in queue post-Path-A and require their own decision.

```sql
SELECT pd.created_by, COUNT(*) AS row_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
GROUP BY pd.created_by
ORDER BY row_count DESC;
```

**Decision rule:** capture all values for D-01. Informational; no HALT. If values other than `'seed_and_enqueue'` appear with non-trivial counts, surface to PK for decision (separate cc-NNNN brief possibly required).

#### P1.5c — Un-publishable legacy draft cohort (NEW v3 per H4)

Drafts that the rewritten cron 48 will silently never enqueue (because both `pd.scheduled_for IS NULL` AND `pd.slot_id IS NULL`, and the new `WHERE computed_scheduled_for IS NOT NULL` filter drops them).

```sql
SELECT COUNT(*) AS unpublishable_legacy_draft_count,
       MIN(pd.created_at) AS oldest_unpublishable,
       MAX(pd.created_at) AS newest_unpublishable,
       COUNT(DISTINCT (pd.client_id, pd.platform)) AS partition_count
FROM m.post_draft pd
WHERE pd.slot_id IS NULL
  AND pd.scheduled_for IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND pd.approval_status IN ('approved','scheduled')
  AND NOT EXISTS (
    SELECT 1 FROM m.post_publish_queue q
    WHERE q.post_draft_id = pd.post_draft_id
  );
```

**Decision rule:** capture for D-01. If `unpublishable_legacy_draft_count > 0`, these drafts will silently never publish post-Path-A. PK decides per-D-01-fire whether to (a) apply Path A as-is and accept the silent skip, (b) clean up these drafts via separate cc-0006 brief before Path A apply, OR (c) extend Path A scope to dead-letter these drafts (would require brief patch v4). **No HALT** in v3 — informational only. PK directs.

#### P1.5d — Slot-driven `pd.scheduled_for` vs `s.scheduled_publish_at` alignment check (NEW v3 per H5)

Path A's COALESCE picks `pd.scheduled_for` first, falling back to `s.scheduled_publish_at`. cc-0004 dead-lettered the misaligned cohort, so post-cc-0004 the two should agree for all active slot-driven drafts. If non-zero, new misalignment has accumulated and Path A would silently use the misaligned `pd.scheduled_for`.

```sql
SELECT COUNT(*) AS post_cc0004_misaligned_count,
       COUNT(DISTINCT pd.client_id) AS distinct_clients
FROM m.post_draft pd
JOIN m.slot s ON s.slot_id = pd.slot_id
WHERE pd.slot_id IS NOT NULL
  AND pd.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
  AND pd.approval_status IN ('approved','scheduled');
```

**Decision rule:** Expected 0 post-cc-0004. **HALT (§8.2.l, NEW v3) if non-zero.** Path A would silently use misaligned `pd.scheduled_for` values. Investigate before Path A apply.

#### P1.5 cross-check vs cc-0003 v2 + cc-0004 (unchanged)

```sql
SELECT
  COUNT(*) FILTER (WHERE pd.slot_id IS NULL
                       AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60)
    AS overlap_with_cc_0003_v2_criterion,
  COUNT(*) FILTER (WHERE pd.slot_id IS NOT NULL)
    AS overlap_with_cc_0004_criterion
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW();
```

**Decision rule:** Both expected 0. HALT (§8.2.i) if either non-zero.

### 1.6 Capture cleanup snapshot

```sql
SELECT q.queue_id, q.client_id, q.platform,
       q.scheduled_for AS queue_scheduled_for, q.created_at,
       q.status AS pre_status, q.post_draft_id,
       pd.approval_status AS draft_status, pd.slot_id, pd.created_by
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW()
ORDER BY q.scheduled_for, q.queue_id;
```

**Purpose:** target snapshot for V5 paranoia + rollback reconstruction. Persist queue_id list.

### 1.7 Capture pre-state aggregates

```sql
SELECT status, COUNT(*) AS row_count
FROM m.post_publish_queue
GROUP BY status
ORDER BY status;
```

### 1.8 Capture pre-existing `dead_reason` baseline

```sql
SELECT COUNT(*) AS pre_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'm8_cutover_legacy_path_deprecated';
```

**Do not assume = 0.** Always read.

### 1.9 Sequencing gate: verify cc-0003 v2 + cc-0004 completion

Read both result files via Invegent GitHub MCP:
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` — confirm Complete. **Confirmed v2.55 (commit `08d4835`); cc-0003 v2 result at `d60dcfb`.**
- `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` — confirm Complete. **Confirmed v2.56 (commit `ec3fd92e`); cc-0004 result at `9d5bdd37`.**

Decision rule: Both Complete/NO-OP → proceed. Either Partial/Blocked/missing → HALT (§8.2.c).

```sql
SELECT dead_reason, COUNT(*) AS row_count
FROM m.post_publish_queue
WHERE dead_reason IN (
  'anomalous_scheduled_for_bug3_fallback',
  'anomalous_pre_m4_v4_mismatch'
)
GROUP BY dead_reason
ORDER BY dead_reason;
```

**Expected:** Bug 3 row_count = 9; v4 mismatch row_count = 43. Capture for D-01.

---

## 2. Selection criterion (cleanup component, locked)

```sql
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW()
```

**Rationale + disjointness:** unchanged from v2 Path A.

---

## 3. Proposed SQL (Path A v3, locked)

Applied via Supabase MCP `apply_migration`:
- **Migration name:** `m8_atomic_cutover_v1`
- **Project ID:** `mbkmaxqhsohbtwsqolns`

```sql
-- M8 Path A atomic cutover (v3 patched)
-- See: docs/briefs/cc-0005-m8-atomic-cutover.md (v3 patched 2026-05-09)
--
-- Three coordinated components in a single transaction:
--   1. Rewrite cron 48 command body in place (drop legacy fallback from COALESCE)
--   2. Cleanup legacy-origin future queue rows
--   3. Deprecate the legacy fallback function via rename + comment (after V10 verify gate)
--
-- All 3 atomic. Two in-migration verify gates enforce conditional dependencies.
-- v3 fix: all regex checks use ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
--         (function-call syntax) instead of substring ILIKE, to avoid false matches
--         against comment text in the rewritten cron body.
-- v3 fix: rewritten cron body comment no longer contains the substring
--         'get_next_scheduled_for' (belt-and-braces).

-- =========================================================================
-- COMPONENT 1: Rewrite cron 48 command body in place (Path A)
-- =========================================================================

DO $$
DECLARE
  v_old_command text;
  v_new_command text;
  v_active boolean;
BEGIN
  SELECT command, active INTO v_old_command, v_active
    FROM cron.job WHERE jobid = 48;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'M8 Path A HALT: cron jobid 48 not found.';
  END IF;

  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'M8 Path A HALT: cron 48 active=% pre-rewrite; expected true. Path A retains cron 48 active.', v_active;
  END IF;

  -- v3 fix: idempotency check uses function-call regex, not substring match.
  IF v_old_command !~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(' THEN
    RAISE NOTICE 'M8 Path A component 1: cron 48 command already has no function-call to the legacy fallback; treating component 1 as idempotent no-op. Verify gate proceeds.';
  ELSE
    -- v3-rephrased comment in $cron_body$ block: belt-and-braces, no substring
    -- 'get_next_scheduled_for' anywhere in the new body.
    v_new_command := $cron_body$
  WITH candidates AS (
    SELECT
      j.ai_job_id,
      j.post_draft_id,
      j.client_id,
      j.platform,
      COALESCE(
        pd.scheduled_for,
        s.scheduled_publish_at
        -- M8 Path A 2026-05-XX: legacy fallback removed from COALESCE chain.
        -- Legacy rows with both NULL are skipped via WHERE computed_scheduled_for IS NOT NULL.
      ) AS computed_scheduled_for
    FROM (
      SELECT DISTINCT ON (j2.client_id, j2.platform)
        j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
      FROM m.ai_job j2
      JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
      WHERE j2.status = 'succeeded'
        AND j2.post_draft_id IS NOT NULL
        AND pd2.approval_status IN ('approved', 'scheduled', 'published')
        AND NOT EXISTS (
          SELECT 1 FROM m.post_publish_queue q
          WHERE q.post_draft_id = j2.post_draft_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM m.post_publish p
          WHERE p.post_draft_id = j2.post_draft_id AND p.status = 'published'
        )
        -- F-PUB-010 hard-cap enforcement preserved verbatim
        AND (
          SELECT COUNT(*)
          FROM m.post_publish_queue q3
          WHERE q3.client_id = j2.client_id
            AND q3.platform = j2.platform
            AND q3.status = 'queued'
        ) < COALESCE(
          (
            SELECT cpp.max_queued_per_platform
            FROM c.client_publish_profile cpp
            WHERE cpp.client_id = j2.client_id
              AND cpp.platform = j2.platform
            LIMIT 1
          ),
          10
        )
      ORDER BY j2.client_id, j2.platform, j2.created_at ASC
    ) j
    JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
    LEFT JOIN m.slot s ON s.slot_id = pd.slot_id  -- M4: slot intent lookup
  )
  INSERT INTO m.post_publish_queue
    (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status)
  SELECT
    ai_job_id, post_draft_id, client_id, platform, computed_scheduled_for, 'queued'
  FROM candidates
  WHERE computed_scheduled_for IS NOT NULL  -- M3 Bug 3 fix; M8 Path A: also filters legacy rows with no resolvable schedule
  ON CONFLICT (post_draft_id, platform) DO NOTHING;
  $cron_body$;

    PERFORM cron.alter_job(48, command := v_new_command);
    RAISE NOTICE 'M8 Path A component 1: cron 48 command body rewritten at % (Path A: legacy fallback removed from COALESCE).', NOW();
  END IF;
END $$;

-- =========================================================================
-- COMPONENT 1 verify gate (V7 + V8 + V9 in-migration check)
-- =========================================================================
-- v3 fix: V8 check uses function-call regex, not substring match.

DO $$
DECLARE
  v_active boolean;
  v_command text;
BEGIN
  SELECT active, command INTO v_active, v_command
    FROM cron.job WHERE jobid = 48;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'M8 Path A HALT (Component 1 gate): cron 48 not found post-rewrite (catastrophic).';
  END IF;

  -- V7: cron 48 active=true
  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'M8 Path A HALT (V7 gate): cron 48 active=% post-rewrite; expected true (Path A keeps cron 48 active).', v_active;
  END IF;

  -- V8 (v3 fix): cron 48 command no longer contains a function-call to the legacy fallback.
  -- Regex matches 'get_next_scheduled_for(' or 'get_next_scheduled_for__deprecated_m8(' but NOT comment text.
  IF v_command ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(' THEN
    RAISE EXCEPTION 'M8 Path A HALT (V8 gate): cron 48 command still contains a function-call to the legacy fallback post-rewrite. Component 1 did not produce expected effect.';
  END IF;

  -- V9: autonomous slot-driven enqueue path is still represented by the rewritten command
  IF v_command !~ 'INSERT INTO m\.post_publish_queue' THEN
    RAISE EXCEPTION 'M8 Path A HALT (V9 gate): cron 48 command no longer contains INSERT INTO m.post_publish_queue post-rewrite (autonomous enqueue would stop).';
  END IF;
  IF v_command !~ 'pd\.scheduled_for' OR v_command !~ 's\.scheduled_publish_at' THEN
    RAISE EXCEPTION 'M8 Path A HALT (V9 gate): cron 48 command no longer references pd.scheduled_for AND s.scheduled_publish_at as COALESCE inputs.';
  END IF;

  RAISE NOTICE 'M8 Path A Component 1 verify gate: V7+V8+V9 PASS — cron 48 active=true, command rewritten (no legacy fallback call), autonomous enqueue path preserved.';
END $$;

-- =========================================================================
-- COMPONENT 2: Cleanup legacy-origin future queue rows
-- (conditional on Component 1 verify gate above passing)
-- =========================================================================
-- v3 cleanup: removed unused v_min_expected variable per M3.
-- v3 note: TOCTOU gap between count check and UPDATE is negligible because
-- single transaction holds row locks; concurrent INSERTs targeting the same
-- criterion in the few seconds the migration runs are vanishingly unlikely
-- (cron 48 just had its command rewritten, so the legacy path that creates
-- such rows is gone within the same transaction).

DO $$
DECLARE
  v_count integer;
  v_max_expected integer := 200;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NULL
    AND pd.created_by = 'seed_and_enqueue'
    AND q.scheduled_for > NOW();

  IF v_count > v_max_expected THEN
    RAISE EXCEPTION 'M8 cleanup SCOPE ANOMALY: % rows match criterion (max % allowed). Halt for re-investigation.',
      v_count, v_max_expected;
  END IF;

  RAISE NOTICE 'M8 Path A component 2: % rows match cleanup criterion. Proceeding with UPDATE.', v_count;
END $$;

UPDATE m.post_publish_queue
SET status = 'dead',
    dead_reason = 'm8_cutover_legacy_path_deprecated',
    updated_at = NOW()
WHERE queue_id IN (
  SELECT q.queue_id
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NULL
    AND pd.created_by = 'seed_and_enqueue'
    AND q.scheduled_for > NOW()
);

-- =========================================================================
-- V10 PRE-RENAME GATE: zero live callers of the legacy fallback function
-- =========================================================================
-- v3 fix: all 3 sub-checks use function-call regex, not substring match.

DO $$
DECLARE
  v_func_count integer;
  v_func_callers text;
  v_view_count integer;
  v_cron_count integer;
BEGIN
  -- Function/procedure callers (excluding self-references)
  SELECT COUNT(*), string_agg(format('%I.%I(%s)',
      n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), ', ')
    INTO v_func_count, v_func_callers
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND pg_get_functiondef(p.oid) ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
    AND NOT (n.nspname = 'public' AND p.proname IN ('get_next_scheduled_for', 'get_next_scheduled_for__deprecated_m8'))
    AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't');

  IF v_func_count > 0 THEN
    RAISE EXCEPTION 'M8 Path A HALT (V10 pre-rename gate): % function/procedure caller(s) of legacy fallback: %. Cannot rename safely.',
      v_func_count, v_func_callers;
  END IF;

  -- View callers
  SELECT COUNT(*) INTO v_view_count
  FROM pg_views
  WHERE definition ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
    AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't');

  IF v_view_count > 0 THEN
    RAISE EXCEPTION 'M8 Path A HALT (V10 pre-rename gate): % view caller(s) of legacy fallback. Cannot rename safely.', v_view_count;
  END IF;

  -- Cron callers (post-Component-1, cron 48 should no longer match)
  SELECT COUNT(*) INTO v_cron_count
  FROM cron.job
  WHERE command ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(';

  IF v_cron_count > 0 THEN
    RAISE EXCEPTION 'M8 Path A HALT (V10 pre-rename gate): % cron caller(s) of legacy fallback. Component 1 did not fully remove the call, OR another cron job was added.', v_cron_count;
  END IF;

  RAISE NOTICE 'M8 Path A V10 pre-rename gate: zero live callers of legacy fallback (function/view/cron). Safe to proceed with Component 3 rename.';
END $$;

-- =========================================================================
-- COMPONENT 3: Deprecate public.get_next_scheduled_for
-- (conditional on V10 pre-rename gate above passing)
-- =========================================================================
--
-- Apply-time amendment rule: <ARGS> MUST be replaced with the actual signature
-- surfaced at §1.4 before D-01 fire.
-- 2026-05-XX MUST be replaced with the apply-session UTC date before D-01 fire.

DO $$
DECLARE
  v_func_count integer;
BEGIN
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_next_scheduled_for';

  IF v_func_count = 0 THEN
    RAISE NOTICE 'M8 Path A component 3: function public.get_next_scheduled_for already absent; no-op.';
  ELSIF v_func_count > 1 THEN
    RAISE EXCEPTION 'M8 Path A HALT: % overloaded signatures of public.get_next_scheduled_for. Brief expected exactly 1.', v_func_count;
  ELSE
    RAISE NOTICE 'M8 Path A component 3: renaming public.get_next_scheduled_for -> get_next_scheduled_for__deprecated_m8.';
  END IF;
END $$;

ALTER FUNCTION public.get_next_scheduled_for(<ARGS>)
  RENAME TO get_next_scheduled_for__deprecated_m8;

COMMENT ON FUNCTION public.get_next_scheduled_for__deprecated_m8(<ARGS>) IS
  '@deprecated M8 Path A cutover 2026-05-XX. Original name: public.get_next_scheduled_for. '
  'Replaced by slot-aware enqueue path (cron 48 rewritten in place to drop the legacy fallback from COALESCE chain). '
  'Function body retained for audit; do not call. '
  'See docs/briefs/cc-0005-m8-atomic-cutover.md for cutover context.';
```

**Notes on the SQL (v3 updated):**

1. **Atomicity:** single transaction. Any RAISE EXCEPTION rolls back all 3 components.
2. **Idempotency:** all 3 components individually idempotent. v3 fix: Component 1's idempotency check uses function-call regex, so post-first-apply state is correctly identified as no-op.
3. **Conditional dependencies enforced via in-migration verify gates:** Component 2 conditional on Component 1 gate (V7+V8+V9). Component 3 conditional on V10 pre-rename gate. Both gates RAISE EXCEPTION on failure.
4. **Apply-time amendments (4 items per §Forbidden actions M2):** (a) `<ARGS>` placeholder, (b) `2026-05-XX` placeholder in COMMENT, (c) `updated_at` SET clause adjustment per §1.1, (d) `<ORIGINAL_COMMENT>` placeholder in §8.3 rollback (NULL or quoted literal from §1.4b).
5. **`updated_at = NOW()` for cleanup UPDATE:** matches cc-0003 v2 / cc-0004 patterns. §1.1 verifies.
6. **`WHERE queue_id IN (...)` subquery form** for cleanup UPDATE.
7. **`dead_reason='m8_cutover_legacy_path_deprecated'`** distinguishes from cc-0003 v2 + cc-0004.
8. **No `DROP FUNCTION`:** rename + comment retains body for audit.
9. **Path A specifically does NOT set `cron.alter_job(48, active := false)`.**
10. **The new cron 48 command body is byte-for-byte identical** to the old body except: the third COALESCE element is removed AND two comment lines are added (v3-rephrased to remove the `get_next_scheduled_for` substring). F-PUB-010 hard-cap, distinctness selection, NOT EXISTS guards, ORDER BY, ON CONFLICT clause — all preserved verbatim.
11. **v3 regex pattern rationale:** `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` is case-insensitive ARE that matches function calls (name + optional whitespace + literal paren) but NOT comment text or substring mentions in larger identifiers. The optional group covers both the original name and the post-rename deprecated name. Prevents false-positive verify-gate exceptions from comments in cron command body or function definitions.
12. **TOCTOU acknowledgement (M4):** the gap between Component 2's count check and UPDATE is single-transaction-bounded; concurrent INSERTs targeting the same criterion in the few seconds the migration runs are vanishingly unlikely (cron 48 just had its command rewritten, so the legacy path that creates such rows is gone within the same transaction). Negligible risk.

---

## 4. P1–P5 pre-flight checklist (per Lesson #61)

### P0 — Pre-condition gate

- [ ] **P0.1** §1.0 sequencing gate (cc-0003 v2 + cc-0004 Complete). Already structurally satisfied as of 2026-05-09.

### P1 — Pre-state capture

- [ ] **P1.1** §1.1 information_schema check.
- [ ] **P1.2** §1.2 pg_trigger check (v3 expanded scope per L1).
- [ ] **P1.3** §1.3 cron 48 state check; capture `OLD_CRON_48_COMMAND` AND `OLD_CRON_48_SCHEDULE` (v3 explicit per L2). HALT (§8.2.j) if inactive. HALT (§8.2.k) if no queue INSERT.
- [ ] **P1.4** §1.4 callers + signature check; HALT (§8.2.g) if non-cron-48 caller; HALT (§8.2.h) if > 1 signature.
- [ ] **P1.4b** (NEW v3 per H6) §1.4b capture `ORIGINAL_COMMENT` for rollback.
- [ ] **P1.5a** §1.5 cleanup count check. HALT (§8.2.a) if outside [0, 200].
- [ ] **P1.5b** (NEW v3 per H3) §1.5 distinct `pd.created_by` enumeration. Informational; capture for D-01.
- [ ] **P1.5c** (NEW v3 per H4) §1.5 un-publishable legacy draft cohort query. Informational; capture for D-01.
- [ ] **P1.5d** (NEW v3 per H5) §1.5 slot-driven alignment check. **HALT (§8.2.l) if non-zero.**
- [ ] **P1.5 cross-check** vs cc-0003 v2 / cc-0004. HALT (§8.2.i) if either overlap > 0.
- [ ] **P1.6** §1.6 cleanup snapshot.
- [ ] **P1.7** §1.7 pre-state aggregates.
- [ ] **P1.8** §1.8 pre_dead_reason_count baseline.
- [ ] **P1.9** §1.9 sequencing gate cross-check.

**Pass criterion:** P0.1 + all P1 checks PASS (15 items v3, up from 9 in v2).

### P2 — Side-effect surface

- [ ] **P2.1** `m.publisher_lock_queue_v2`.
- [ ] **P2.2** `m.cleanup_queue_on_publish_v1` trigger.
- [ ] **P2.3** Cron 48 — Component 1 target. Post-apply: active=true unchanged, command body rewritten, schedule unchanged (V7 v3 expanded).
- [ ] **P2.4** Dashboard / portal queries.
- [ ] **P2.5** `m.vw_pipeline_state`.
- [ ] **P2.6** Cowork health-check.
- [ ] **P2.7** `m.fill_pending_slots` — chat investigation 2026-05-09 confirms inserts drafts + ai_jobs only, never queue rows. No conflict with Path A.
- [ ] **P2.8** Callers of `public.get_next_scheduled_for` — V10 in-migration gate enforces zero callers.
- [ ] **P2.9** Future cron 48 fires post-apply — slot-driven drafts continue to enqueue; legacy-unresolvable drafts skipped via WHERE filter.
- [ ] **P2.10** (NEW v3 per H4) Un-publishable legacy drafts surfaced by P1.5c — captured for D-01; PK directs handling.

### P3 — Transitive dependency map

- [ ] **P3.1** Functions/views/triggers referencing `m.post_publish_queue.dead_reason`.
- [ ] **P3.2** Code-collision check on literal `'m8_cutover_legacy_path_deprecated'`.
- [ ] **P3.3** `m.post_draft.approval_status` distribution for cleanup queue rows.
- [ ] **P3.4** Cowork brief / scheduled task references.
- [ ] **P3.5** Forward-look on cron 48 post-rewrite.
- [ ] **P3.6** Active production callers of `public.get_next_scheduled_for` outside cron 48 — HALT (§8.2.g).

### P4 — Reversibility

- [ ] **P4.1** Rollback SQL drafted (§8.3) for all 3 components: restore old cron 48 command from §1.3, restore queue_id list, rename function back, restore COMMENT from §1.4b (NEW v3).
- [ ] **P4.2** No irreversible side-effects.
- [ ] **P4.3** Time-window for rollback bounded.
- [ ] **P4.4** Rollback uses captured artefacts (§1.3 + §1.4b + §1.6) and known constants.
- [ ] **P4.5** No partial state possible within migration.

### P5 — Post-state verification preconditions

- [ ] **P5.1** V1: dead_reason population delta.
- [ ] **P5.2** V2: zero matching queued/failed rows post-apply.
- [ ] **P5.3** V3: queued+failed depth decrease by N.
- [ ] **P5.4** V4: dead count increase by N.
- [ ] **P5.5** V5: paranoia row-set match.
- [ ] **P5.6** V6: per-status totals coherent.
- [ ] **P5.7** V7 (CHANGED v2; v3 expanded per L2): cron 48 active=true AND schedule unchanged AND jobname unchanged.
- [ ] **P5.8** V8 (CHANGED v2; v3 regex fix): cron 48 command no longer contains a function-call to the legacy fallback.
- [ ] **P5.9** V9 (NEW v2): autonomous slot-driven enqueue path still represented.
- [ ] **P5.10** V10 (NEW v2; v3 regex fix): zero live callers of legacy fallback (or post-rename deprecated) name.

**Pass criterion:** all 10 verification queries written and ready (§7).

---

## 5. D-01 packet content (NOT YET FIRED)

### 5.1 `proposal` (prose)

```
Apply M8 Path A v3 atomic cutover: 3 coordinated components in a single transaction.
Cron 48 is REWRITTEN IN PLACE, not disabled.

Migration name: m8_atomic_cutover_v1
Project: mbkmaxqhsohbtwsqolns
Method: Supabase MCP apply_migration (single atomic transaction)

COMPONENT 1 — Rewrite cron 48 command body (cron stays active=true):
  - Removes legacy fallback function from COALESCE chain.
  - Resulting COALESCE: (pd.scheduled_for, s.scheduled_publish_at).
  - Legacy rows with both NULL are skipped via existing WHERE filter.
  - v3-rephrased comment: 'legacy fallback removed from COALESCE chain.'
    (no longer contains substring 'get_next_scheduled_for')

IN-MIGRATION VERIFY GATE (V7 + V8 + V9): RAISE EXCEPTION if cron 48
  inactive, OR command still contains a function-call to the legacy fallback,
  OR autonomous enqueue path missing required structural elements.
  v3 fix: V8 uses ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
          (function-call regex, not substring).

COMPONENT 2 — Cleanup legacy-origin future queue rows:
  Scope: q.status IN ('queued','failed') AND pd.slot_id IS NULL
         AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW()
  Expected count: <N> (read-only verified <DATETIME>; halts if outside [0,200])
  UPDATE: SET status='dead', dead_reason='m8_cutover_legacy_path_deprecated',
               updated_at=NOW()

IN-MIGRATION V10 PRE-RENAME GATE: RAISE EXCEPTION if any live caller of
  the legacy fallback function surfaces (function/view/cron, both names).
  v3 fix: function-call regex throughout.

COMPONENT 3 — Deprecate the legacy fallback:
  ALTER FUNCTION public.get_next_scheduled_for(<ARGS>)
    RENAME TO get_next_scheduled_for__deprecated_m8
  + COMMENT ON FUNCTION ... IS '@deprecated M8 Path A cutover ...'

v3 PRE-FLIGHT EXTENSIONS (H1-H6):
  - H1 §1.4 ILIKE → ~* (covered by C1-C5).
  - H3 §1.5 P1.5b distinct pd.created_by enumeration.
  - H4 §1.5 P1.5c un-publishable legacy draft cohort (informational).
  - H5 §1.5 P1.5d slot-driven alignment check (HALT §8.2.l if non-zero).
  - H6 §1.4b original COMMENT capture for rollback.

ROLLBACK: single rollback migration; v3 includes COMMENT restoration
  (NULL or captured pre-existing value); apply session picks unique
  dollar-quote tag for OLD_CRON_48_COMMAND embedding (M1).

VERIFICATION: 10 post-apply queries (V1-V10). v3 V7 expanded to include
  schedule check (L2). V8 + V10 regex-fixed.
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply M8 Path A v3 atomic cutover: cron 48 in-place command rewrite + legacy-origin future cleanup + legacy fallback function deprecation",
  "production_action_if_approved": "Single Supabase MCP apply_migration call. Three components in one transaction with two in-migration verify gates: (1) cron.alter_job(48, command := <new body>) keeping active=true, (2) UPDATE m.post_publish_queue cleanup rows to dead/m8_cutover_legacy_path_deprecated, (3) ALTER FUNCTION public.get_next_scheduled_for RENAME + COMMENT.",
  "consequence_if_delayed": "Moderate operational benefit if delayed. Pipeline-integrity benefit (single canonical schedule resolution path; legacy fallback retired in code; deprecation marker on the function) is the residual reason to apply.",
  "cost_of_waiting": "Low. Path A is a structural/architectural cutover; no immediate operational degradation if delayed.",
  "current_evidence": [
    "Chat investigation 2026-05-09: cron 48 is the SOLE autonomous inserter into m.post_publish_queue.",
    "Chat investigation 2026-05-09: m.fill_pending_slots inserts drafts + ai_jobs only.",
    "Chat investigation 2026-05-09: no trigger inserts queue rows (9 triggers surveyed; v3 §1.2 expanded survey re-confirms at apply time).",
    "Pre-flight §1.0: cc-0003 v2 result Complete (commit d60dcfb); cc-0004 result Complete (commit 9d5bdd37).",
    "Pre-flight §1.3: cron 48 active=<true|false>; OLD_CRON_48_COMMAND + OLD_CRON_48_SCHEDULE captured.",
    "Pre-flight §1.4: callers of legacy fallback — cron 48 only (HALT if non-cron-48 caller surfaces).",
    "Pre-flight §1.4: function signature: <args>.",
    "Pre-flight §1.4b (NEW v3): ORIGINAL_COMMENT captured (NULL or string).",
    "Pre-flight §1.5a: cleanup count <N> rows at <DATETIME>.",
    "Pre-flight §1.5b (NEW v3): distinct pd.created_by values + counts: <captured>.",
    "Pre-flight §1.5c (NEW v3): un-publishable legacy draft count: <captured>. PK direction: <as-is | cc-0006 cleanup | brief patch v4>.",
    "Pre-flight §1.5d (NEW v3): post-cc-0004 slot-driven misaligned count: <captured> (HALT if non-zero).",
    "Pre-flight §1.5 cross-check: 0 overlap with cc-0003 v2 + cc-0004.",
    "Pre-flight §1.8: pre_dead_reason_count: <P>.",
    "Pre-flight §1.9: cc-0003 v2 dead_reason population: 9; cc-0004: 43.",
    "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.8.",
    "docs/briefs/2026-05-05-queue-integrity-incident.md v3 §6 (original Path C; superseded by Path A)."
  ],
  "known_weak_evidence": [
    "No prior brief has counted the M8 cleanup criterion. Range [0, 200] unanchored.",
    "Three coordinated components in one transaction is a larger blast radius than cc-0003/cc-0004's single-component shape. Mitigation: atomicity + two in-migration verify gates + comprehensive rollback (now including ORIGINAL_COMMENT restoration v3).",
    "Cron edit (command rewrite) is a new permission for the brief-runner-v0 trial.",
    "DDL (ALTER FUNCTION RENAME) is a new permission for the brief-runner-v0 trial.",
    "v3 regex pattern is critical: substring matching in v2 would have failed at first apply (5 critical bugs caught in review). v3 uses function-call-syntax regex throughout.",
    "Apply-time SQL has 4 amendments (ARGS, date, updated_at, ORIGINAL_COMMENT). Apply session must verify all 4 before D-01 fire.",
    "Rollback path uses captured OLD_CRON_48_COMMAND + queue_id list + ORIGINAL_COMMENT. Apply session picks unique dollar-quote tag at runtime per M1.",
    "v3 P1.5c may surface un-publishable drafts. PK decides whether to address pre-apply."
  ],
  "default_action": "proceed if D-01 returns clean agree AND §1.0 sequencing gate passed AND §1.4 confirmed cron 48 is the sole caller AND §1.5d alignment count = 0 AND PK has directed handling for §1.5c un-publishable cohort",
  "references": {
    "cc-0005 brief (v3 patched)": "docs/briefs/cc-0005-m8-atomic-cutover.md",
    "cc-0005 v2 Path A (superseded by v3)": "commit f70cb41f72e01c27c83639f1ae5bf0dac9353b70",
    "cc-0003 v2 brief": "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 brief": "docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "cc-0003 v2 result": "docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 result": "docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "reconciliation brief": "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md",
    "queue integrity v3": "docs/briefs/2026-05-05-queue-integrity-incident.md",
    "v2.56 cc-0004 close": "docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md",
    "§10.2 view contract": "docs/dashboard-review-2026-05/10_product_objects_and_data_model.md"
  },
  "sql_to_apply": "<full SQL from cc-0005 §3 verbatim, with all 4 apply-time amendments resolved: <ARGS> from §1.4, 2026-05-XX from apply-session UTC date, updated_at adjusted per §1.1, <ORIGINAL_COMMENT> per §1.4b>"
}
```

### 5.3 Decision rule on D-01 verdict

Unchanged from v2: `agree` + `proceed` + risk ≤ medium + 0 pushback → apply. Lesson #62 v2.50 refinement applies.

---

## 6. Apply procedure

1. **Sequencing gate re-confirmation.**
2. **Final read-only re-verification** — re-run §1.3 + §1.4 + §1.4b + §1.5 (all 4 sub-queries: a, b, c, d) + §1.6 + §1.8 within ~60s of apply. Confirm:
   - Cleanup count divergence < 10 rows from D-01 packet.
   - `OLD_CRON_48_COMMAND` + `OLD_CRON_48_SCHEDULE` unchanged from initial pre-flight.
   - Function signature unchanged.
   - `ORIGINAL_COMMENT` unchanged (or document drift).
   - **§1.5d alignment count still = 0** (HALT §8.2.l if non-zero).
   - No new caller surfaced in §1.4.
3. **Apply SQL amendment** — replace 4 placeholders: `<ARGS>` (from §1.4), `2026-05-XX` (apply-session UTC date), `updated_at` SET clause (per §1.1), `<ORIGINAL_COMMENT>` (NULL or quoted from §1.4b — used in §8.3 rollback only). Confirm `$cron_body$` block matches v3 locked body byte-for-byte.
4. **`apply_migration` call** — single call.
5. **Capture the result** — record success/failure, exact return value, and all RAISE NOTICE messages: Component 1 rewrite (or no-op), Component 1 verify gate (V7+V8+V9 PASS), Component 2 count, V10 pre-rename gate (PASS), Component 3 rename (or no-op).
6. **Run all 10 verification queries (§7)** — if any fails, rollback per §8.3.
7. **If all 10 PASS:** session continues to close-the-loop UPDATE on `m.chatgpt_review` and 4-way sync.

---

## 7. Verification queries (post-apply)

All 10 must PASS.

### V1 — dead_reason delta

```sql
SELECT COUNT(*) AS post_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'm8_cutover_legacy_path_deprecated';
```

**Pass:** `post_dead_reason_count = pre_dead_reason_count + N`.

### V2 — Zero remaining matching queued/failed rows

```sql
SELECT COUNT(*) AS v2_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW();
```

**Pass:** `v2_count = 0`.

### V3 — Queued+failed depth decrease by N

Same as cc-0003 v2 / cc-0004 V3.

### V4 — Dead count increase by N

Same as cc-0003 v2 / cc-0004 V4.

### V5 — Paranoia: only the captured rows changed

Same as cc-0003 v2 / cc-0004 V5.

### V6 — Coherence cross-check

Same as cc-0003 v2 / cc-0004 V6.

### V7 — Cron 48 active=true + schedule unchanged + jobname unchanged (v3 expanded per L2)

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobid = 48;
```

**Pass:** `active = true` AND `jobname` unchanged from §1.3 capture AND `schedule` unchanged from `OLD_CRON_48_SCHEDULE` (§1.3 capture).

### V8 — Cron 48 command no longer contains a function-call to the legacy fallback (v3 regex fix)

```sql
SELECT jobid,
       (command !~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(') AS path_a_rewrite_complete,
       LENGTH(command) AS command_length
FROM cron.job
WHERE jobid = 48;
```

**Pass:** `path_a_rewrite_complete = true`. The regex correctly distinguishes function calls from comment-mentions, AND covers both the original name and post-rename deprecated name. `command_length` informational.

### V9 — Autonomous slot-driven enqueue path still represented

```sql
SELECT jobid,
       (command ~ 'INSERT INTO m\.post_publish_queue') AS still_inserts_queue,
       (command ~ 'pd\.scheduled_for') AS uses_pd_scheduled_for,
       (command ~ 's\.scheduled_publish_at') AS uses_slot_scheduled_publish_at,
       (command ~ 'WHERE computed_scheduled_for IS NOT NULL') AS retains_skip_filter,
       (command ~ 'F-PUB-010') AS retains_pub_010_hard_cap_marker,
       (command ~ 'M4: slot intent lookup') AS retains_m4_annotation
FROM cron.job
WHERE jobid = 48;
```

**Pass:** all 6 columns true.

### V10 — Zero live callers of legacy fallback (or post-rename deprecated) name (v3 regex fix)

```sql
SELECT 'function' AS object_type, n.nspname || '.' || p.proname AS caller,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p')
  AND pg_get_functiondef(p.oid) ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
  AND NOT (n.nspname = 'public' AND p.proname IN ('get_next_scheduled_for', 'get_next_scheduled_for__deprecated_m8'))
  AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

SELECT 'view', schemaname || '.' || viewname, NULL
FROM pg_views
WHERE definition ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
  AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

SELECT 'cron', jobname, 'jobid=' || jobid::text
FROM cron.job
WHERE command ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(';
```

**Pass:** zero rows returned.

### V10b — Function rename + comment paranoia (folded post-V10)

```sql
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       d.description
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_description d ON d.objoid = p.oid AND d.classoid = 'pg_proc'::regclass
WHERE n.nspname = 'public'
  AND p.proname IN ('get_next_scheduled_for', 'get_next_scheduled_for__deprecated_m8')
ORDER BY p.proname;
```

**Pass:** exactly 1 row, `function_name = 'get_next_scheduled_for__deprecated_m8'`, `description ~* '@deprecated M8 Path A cutover'`. No row with `function_name = 'get_next_scheduled_for'`.

---

## 8. Rollback / no-op / halt logic

### 8.1 NO-OP path (run before D-01 fire)

Nuanced per-component NO-OP. v3 fix: Component 1 NO-OP detection uses function-call regex.

- Component 1 NO-OP if §1.3 shows command lacks function-call to legacy fallback.
- Component 2 NO-OP if §1.5a returns 0.
- Component 3 NO-OP if §1.4 shows 0 signatures.

All 3 simultaneous NO-OP → no `apply_migration`. Document in result file.

Also §1.3 `active = false` → HALT (§8.2.j).

### 8.2 HALT paths

**8.2.a Cleanup count > 200:** §1.5a outside [0, 200].
**8.2.b (RETIRED).**
**8.2.c Sequencing gate fail.**
**8.2.d (RETIRED).**
**8.2.e (RETIRED v2 Path A patch; v3 historical reference only).**
**8.2.f `m.post_draft.created_by` column absent.**
**8.2.g Live caller of legacy fallback outside cron 48.**
**8.2.h Multiple overloaded signatures of `public.get_next_scheduled_for`.**
**8.2.i cc-0003 v2 / cc-0004 overlap > 0.**
**8.2.j Cron 48 already inactive (Path A premise violated).**
**8.2.k Cron 48 command no longer contains queue INSERT.**
**8.2.l (NEW v3 per H5) Slot-driven misalignment count > 0:** §1.5d returns non-zero `post_cc0004_misaligned_count`. Path A would silently use misaligned `pd.scheduled_for`. Investigate before apply. Possible causes: new misalignment introduced post-cc-0004 by some path; cc-0004 didn't drain expected cohort; M4 backfill regression. NO `apply_migration` call. Escalate to PK with the misaligned cohort details.

### 8.3 ROLLBACK path (verification fails after apply)

If any of V1–V10 (or V10b) FAIL:

1. Halt session continuation.
2. Apply rollback migration `m8_atomic_cutover_v1_rollback`. v3 includes ORIGINAL_COMMENT restoration AND M1 unique dollar-quote-tag guidance.

```sql
-- Rollback for m8_atomic_cutover_v1 (Path A v3)
-- Three reversals in single transaction. Order: 3 -> 2 -> 1 (reverse of apply).
--
-- v3 Apply-time amendment rules (M1 + H6):
--   1. <ARGS> placeholder: replace with §1.4 captured signature.
--   2. <ORIGINAL_COMMENT> placeholder: replace with NULL (literal) if §1.4b
--      captured pre_existing_comment IS NULL, otherwise the captured value
--      properly quoted as a SQL string literal.
--   3. <UNIQUE_TAG_HERE>: apply session must pick a dollar-quote tag
--      that does NOT appear as a substring inside the captured
--      OLD_CRON_48_COMMAND. Verify via simple substring check before
--      templating. Suggested format: $rb_<random_8_chars>$ or
--      $cron_body_rollback_<UTC_unix_ts>$. NEVER use the literal
--      $cron_body_old$ shown below — that is a placeholder, not the
--      actual tag for any real apply session.
--   4. <OLD_CRON_48_COMMAND from §1.3>: paste the captured command
--      verbatim (without modification).

-- Reverse component 3: rename function back, restore COMMENT to original state
ALTER FUNCTION public.get_next_scheduled_for__deprecated_m8(<ARGS>)
  RENAME TO get_next_scheduled_for;

COMMENT ON FUNCTION public.get_next_scheduled_for(<ARGS>) IS <ORIGINAL_COMMENT>;
  -- v3 fix: <ORIGINAL_COMMENT> resolves to either the literal NULL
  -- (if pre-existing was NULL) or a quoted string literal of the captured
  -- comment from §1.4b. Apply session resolves before applying rollback.

-- Reverse component 2: restore cleanup queue rows
UPDATE m.post_publish_queue
SET status = <pre_status>,  -- per §1.6 captured snapshot, mapped queue_id -> pre_status
    dead_reason = NULL,
    updated_at = NOW()
WHERE queue_id IN (<captured queue_id list from §1.6>);

-- Reverse component 1: restore cron 48 command body to OLD_CRON_48_COMMAND
DO $$
BEGIN
  -- v3 fix per M1: apply session picks unique tag <UNIQUE_TAG_HERE> at runtime;
  -- the literal $cron_body_old$ shown below is illustrative, not the actual tag.
  PERFORM cron.alter_job(48, command := $cron_body_old$<OLD_CRON_48_COMMAND from §1.3>$cron_body_old$);
  RAISE NOTICE 'M8 Path A rollback component 1: cron 48 command restored to pre-apply body.';
END $$;
```

3. Re-run V1–V10 + V10b post-rollback. V1 = original `pre_dead_reason_count`. V2 = original §1.5a count. V7 = active=true (unchanged) + schedule unchanged. V8 returns `path_a_rewrite_complete = false` (the legacy fallback function-call is back). V10 returns cron 48 in caller list.
4. Document failure mode + diagnosis.
5. PK escalation; cc-0005 v4 with corrective measures.

### 8.4 Why not template the rollback fully

Unchanged: queue_id mapping known only at apply time; v3 adds `<ORIGINAL_COMMENT>` and `<UNIQUE_TAG_HERE>` to the per-apply-resolution list. The cron jobid (48) and function name (canonical) are pre-filled.

---

## 9. Stop condition

1. §1.0 sequencing gate passes.
2. §1 pre-flight all P1 checks PASS (15 items v3, including P1.4b + P1.5b/c/d).
3. §4 P0 + P1–P5 all PASS.
4. §5 D-01 fire returns clean agree + PK approval.
5. §6 apply procedure completes; in-migration verify gates PASSED inside transaction.
6. §7 verification V1–V10 (+ V10b paranoia) all PASS.
7. Close-the-loop UPDATE on `m.chatgpt_review`.
8. Result file `docs/briefs/results/cc-0005-m8-atomic-cutover.md` committed.
9. M7 closure documented in 4-way sync.
10. 4-way sync close.

If any of §8.1, §8.2.{a,c,f,g,h,i,j,k,l}, or §8.3 paths trigger: report and stop.

---

## Success criteria (for this brief draft, NOT for the apply)

v3 brief is correctly drafted when:

1. The brief file exists at `docs/briefs/cc-0005-m8-atomic-cutover.md`.
2. The apply procedure is executable using only this brief + read-only DB access + Supabase MCP.
3. **v3 regex fixes are explicit:** all substring matches replaced with function-call-syntax regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` at all 11 call sites.
4. **v3 cron command body comment is rephrased:** "legacy fallback removed from COALESCE chain." — no longer contains `get_next_scheduled_for` substring.
5. SQL is locked to v3 §3, with 4 documented apply-time amendments.
6. Verification queries V1–V10 (+ V10b) runnable post-amendment.
7. Rollback for all 3 components concrete: `OLD_CRON_48_COMMAND` (§1.3), captured queue_id list (§1.6), function rename, AND `ORIGINAL_COMMENT` restoration (§1.4b).
8. Sequencing gates re-confirmed at apply procedure step 1.
9. M7 closure folding into 4-way sync documented.
10. Forbidden actions explicitly prohibit `cron.alter_job(48, active := false)`.
11. **v3 H1-H6 + L1-L2 + M1-M4 fixes all reflected.**
12. No production state changed by drafting or by this v3 patch.

---

## Notes

This is the fourth cc-NNNN brief in the brief-runner-v0 trial; third apply-class brief; first multi-component (3-way) atomic migration; first to require pre-condition gate at §1.0; first with cron edit + DDL permissions; first with two in-migration verify gates; **first to undergo a critical doc-only correctness patch (v3) before first apply**.

### Brief-runner-v0 watch items specific to cc-0005 (Path A v3)

1. **Path A vs Path C cutover decision** — chat investigation 2026-05-09 established cron 48 is the SOLE autonomous inserter; Path C (disable) was not viable.

2. **In-migration verify gates** — pattern: RAISE EXCEPTION inside transaction enforces conditional dependencies between components. Two gates in cc-0005 (Component 1 verify gate + V10 pre-rename gate). v3 fix: gates use function-call regex, not substring match.

3. **Atomic 3-step migration with embedded dollar-quoted command body** — Component 1 uses `$cron_body$...$cron_body$` to embed the rewritten cron command. v3 acknowledges that rollback's dollar-quote tag for `OLD_CRON_48_COMMAND` must be picked at runtime to avoid theoretical collision.

4. **Cron edit permission (command rewrite, not active toggle)** — first cc-NNNN brief with this.

5. **DDL permission (function rename + comment)** — first cc-NNNN brief with this.

6. **No prior count to inherit** — cleanup count unanchored.

7. **10 verification queries** — V7-V10 cover Component 1 + V10 covers Component 3.

8. **Rollback complexity** — v3 includes COMMENT restoration; reversing 3 components in single transaction.

9. **M7 closure** — doc-only fold into 4-way sync.

10. **§1.5 cross-check** — unique to cc-0005.

11. **Apply-time SQL amendments (4 items v3)** — `<ARGS>`, `2026-05-XX`, `updated_at`, `<ORIGINAL_COMMENT>`.

12. **In-place patching pattern** — v3 supersedes v2 in place because v2 was never applied. Brief-runner-v0 lesson: **a brief with critical correctness bugs caught at review time can be in-place patched as long as it has not yet been applied. Once applied, any corrective work would require a new cc-NNNN brief.**

13. **NEW v3 — Function-call regex pattern** — `~* '<name>(__deprecated_m8)?\s*\('` correctly distinguishes calls from comments AND covers both pre-rename and post-rename names. Pattern is portable to any brief that needs to verify function-call presence/absence in PostgreSQL function/view/cron bodies.

14. **NEW v3 — Pre-flight cohort surfacing pattern** — H4 un-publishable cohort + H3 distinct created_by enumeration. Pattern: when a brief retires or modifies a code path, surface the cohorts that the retired path was processing; PK decides handling for residual cohorts (apply as-is, separate cleanup brief, or extend brief scope).

### Patch history details (v3 patch, 2026-05-09)

Patches relative to v2 Path A (commit `f70cb41f`):

1. **Title** — added v3 Patched line; superseded reference to v2.
2. **Header block** — added v3 Patched line with regex fix + H1-H6 + L2 summary.
3. **NEW v3 entry at top of §Patch history** — summarises the 5 critical regex bugs in v2 + v3 fixes + H1-H6 + M1-M4 + L1-L2 additions.
4. **§Forbidden actions amendment list** — expanded from 2 items (a) updated_at, (b) ARGS to 4 items adding (c) `2026-05-XX` date in COMMENT, (d) `<ORIGINAL_COMMENT>` in §8.3 rollback (M2).
5. **§Forbidden actions** — added explicit prohibition on apply if §1.5d alignment count > 0 (HALT §8.2.l).
6. **§Forbidden actions** — added "no assumption that `public.get_next_scheduled_for` has no pre-existing COMMENT" clause; added "no assumption that `pd.created_by = 'seed_and_enqueue'` is the only legacy-origin filter" clause referencing P1.5b enumeration.
7. **§1.2** — expanded scope per L1 to survey triggers on `m.post_draft / slot / ai_job / post_publish` in addition to `m.post_publish_queue`. Validates chat investigation finding that no trigger inserts queue rows.
8. **§1.3** — added explicit `OLD_CRON_48_SCHEDULE` capture per L2 (already in raw query but now explicit in capture rule).
9. **§1.4** — function/view/cron callers WHERE clauses changed from `ILIKE '%get_next_scheduled_for%'` to `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` (3 sub-queries; v3 critical fix C1+C5 + H1).
10. **§1.4b** (NEW) — pre-existing COMMENT capture for rollback (H6).
11. **§1.5** — added 3 sub-queries: P1.5b distinct created_by enumeration (H3); P1.5c un-publishable legacy draft cohort (H4); P1.5d slot-driven alignment check (H5).
12. **§3 Component 1 idempotency check** — `IF v_old_command !~ 'get_next_scheduled_for'` changed to `IF v_old_command !~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` (v3 critical fix; addresses H2 — re-attempt now correctly recognised as no-op).
13. **§3 Component 1 `$cron_body$` block** — v3 comment rephrase: `-- M8 Path A 2026-05-XX: legacy fallback removed from COALESCE chain.` (no longer contains `get_next_scheduled_for` substring; belt-and-braces against any future regex tweak that might revert to substring-style).
14. **§3 Component 1 verify gate (V8 in-migration)** — `IF v_command ~ 'get_next_scheduled_for'` changed to `IF v_command ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` (v3 critical fix C1).
15. **§3 Component 2 DO block** — removed unused `v_min_expected` variable per M3.
16. **§3 V10 pre-rename gate** — 3 ILIKE checks changed to ~* function-call regex (v3 critical fix C2 + C5).
17. **§3 Notes** — note 11 updated to document the function-call regex rationale; note 12 added (TOCTOU acknowledgement per M4); note about "no longer contains the substring `get_next_scheduled_for`" added.
18. **§4 P1–P5 walk** — added P1.4b (H6), P1.5b/c/d (H3/H4/H5), P2.10 (H4 forward-look), P5.7 expanded for schedule (L2). Pass criterion now 15 items in P1 (was 9 in v2).
19. **§5 D-01 packet** — `proposal` rewritten for v3 (4-amendment apply rule; v3 regex pattern explicit; H1-H6 evidence items); `context.current_evidence` adds H6 + H3 + H4 + H5 captures; `context.known_weak_evidence` adds v3 regex critique + 4-amendment caveat + ORIGINAL_COMMENT dependency; `context.references` adds v2 supersession reference.
20. **§6 Apply procedure** — step 2 expanded: re-run §1.4b + §1.5b/c/d alongside existing checks; step 3 expanded: 4-amendment list; step 5 expanded: 5+ RAISE NOTICE messages including V10 pre-rename gate.
21. **§7 V7** — expanded per L2 to verify schedule unchanged in addition to active=true and jobname unchanged.
22. **§7 V8** — substring `(command !~ 'get_next_scheduled_for')` changed to `(command !~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(')` (v3 critical fix C3).
23. **§7 V10** — 3 ILIKE checks changed to ~* function-call regex (v3 critical fix C4).
24. **§7 V10b paranoia query** — unchanged (already used direct name match).
25. **§8.1 NO-OP path** — Component 1 NO-OP detection updated to use function-call regex.
26. **§8.2 HALT paths** — added §8.2.l for slot-driven misalignment per H5; §8.2.e remains retired (v2 Path A patch).
27. **§8.3 Rollback** — Component 3 reversal `COMMENT ON FUNCTION ... IS NULL` replaced with `IS <ORIGINAL_COMMENT>` placeholder per H6; added M1 unique-dollar-quote-tag guidance for Component 1 reversal; updated apply-time amendment rules to 4 items.
28. **§9 Stop condition** — P1 check count updated to 15; added §8.2.l reference.
29. **§Notes brief-runner-v0 watch items** — added items 13 (function-call regex pattern) + 14 (pre-flight cohort surfacing pattern) as v3 lesson candidates.
30. **§Notes Patch history details (this section)** — v3 patch enumeration (30 items).

### Open dependencies for the apply session (v3 updated)

Before cc-0005 (Path A v3) can apply:

- **cc-0003 v2 apply** complete. Confirmed Complete v2.55.
- **cc-0004 apply** complete. Confirmed Complete v2.56.
- **Pre-flight §1.4** confirms cron 48 is the only caller of legacy fallback. Path A premise.
- **Pre-flight §1.4b** captures pre-existing COMMENT (NULL or string).
- **Pre-flight §1.3** confirms cron 48 currently `active=true`. Path A premise.
- **Pre-flight §1.5d** alignment count = 0 (NEW v3 HALT §8.2.l).
- **Pre-flight §1.5c** un-publishable cohort surfaced; PK direction received.
- D-01 fire passes clean.
- PK explicit approval phrase received.

When all hold: apply session can proceed.

---

*Brief authored 2026-05-09 Sydney by chat. Path A patched 2026-05-09 (v2, commit `f70cb41f`). v3 patched 2026-05-09 under PK direction (regex correctness + H1-H6 + L2). Inputs: cc-0003 v2 + cc-0004 brief shapes; reconciliation brief; queue integrity v3; chat investigation 2026-05-09; chat review pass on v2 (5 critical bugs surfaced + H1-H6 + M1-M4 + L1-L2 recommendations). Output: full apply brief (3-component cutover SQL with two in-migration verify gates using function-call regex throughout + P0 + P1–P5 + D-01 packet with 4-amendment SQL + 10 verification queries + V10b paranoia + 3-component rollback with ORIGINAL_COMMENT restoration and unique-tag guidance + halt paths incl. new §8.2.l + stop condition incl. M7 closure). No production state changed by drafting v3. cc-0005 (v3) apply gated by §1.0 sequencing (already met) + §1.4 caller check + §1.3 cron state + §1.5d alignment + §1.5c PK direction + D-01 + PK approval. Awaiting PK direction to schedule apply session.*
