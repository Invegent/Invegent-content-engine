# Brief cc-0005 — M8 Path A cutover (cron 48 in-place rewrite + legacy-origin future cleanup + `public.get_next_scheduled_for` deprecation)

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Patched:** 2026-05-09 Sydney — **Path A patch** under PK direction. Supersedes original draft `6f16c40e` (Path C: disable cron 48 + cleanup + function rename).  
**Executor:** chat (apply via Supabase MCP `apply_migration`) OR Claude Code per brief-runner-v0  
**Status:** issued (Path A patched 2026-05-09; apply pending PK direction to schedule)  
**Result file:** `docs/briefs/results/cc-0005-m8-atomic-cutover.md` (created on completion)

---

## Patch history

- **2026-05-09 Sydney — Path A patch** under PK direction. Component 1 changed from "disable cron 48 via `cron.alter_job(48, active := false)`" to **"rewrite cron 48's command body in place via `cron.alter_job(48, command := <new body>)` to remove `public.get_next_scheduled_for` from the COALESCE chain"**. Cron 48 remains `active=true`. Cleanup component (component 2) and function deprecation (component 3) are now structurally conditional on V10 (cron 48 no longer calls `public.get_next_scheduled_for`, enforced via in-migration verify gate). New verifications V7-V10 restructured per PK directive: V7 cron 48 active=true; V8 cron 48 command no longer contains `get_next_scheduled_for`; V9 autonomous slot-driven enqueue path still represented; V10 zero live callers before rename. §1.0 PK confirmation gate simplified (Path A architecture resolves the original items 1 + 2). Investigation record added. Rollback updated to restore old command body. Patches in detail under §Patch history details below.
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

1. **Rewrite cron 48 (`enqueue-publish-queue-every-5m`) command body in place** via `cron.alter_job(48, command := <new body>)`. **Cron 48 remains `active=true`.** The new command body is the current command MINUS `public.get_next_scheduled_for(...)` from the COALESCE chain in the candidates CTE — resulting COALESCE: `(pd.scheduled_for, s.scheduled_publish_at)`. Legacy rows with both NULL are **skipped** via the pre-existing `WHERE computed_scheduled_for IS NOT NULL` filter (M3 Bug 3 fix carries forward — Path A repurposes this filter to also drop unresolvable legacy rows). Comment annotation added at the COALESCE site documenting the M8 Path A change.
2. **Cleanup of legacy-origin future queue rows** — dead-letter all `m.post_publish_queue` rows where `pd.slot_id IS NULL AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW() AND q.status IN ('queued','failed')`. These are scheduled-future legacy rows that the publisher would otherwise execute. **Conditional on Component 1 verify gate passing** (cron 48 command no longer references `get_next_scheduled_for`); enforced via in-migration `RAISE EXCEPTION`.
3. **Deprecate `public.get_next_scheduled_for`** — rename to `public.get_next_scheduled_for__deprecated_m8` AND add `COMMENT ON FUNCTION` annotating the deprecation. Function definition retained for audit; calls fail with "function does not exist" post-rename. **Conditional on V10 (zero live callers) passing within the migration**; enforced via in-migration `RAISE EXCEPTION` BEFORE the rename fires.

Apply via Supabase MCP `apply_migration` as migration `m8_atomic_cutover_v1`. Single atomic transaction — either all 3 components succeed or all 3 roll back. M7 closure (documentation-only per reconciliation §6 Q2) folds into the cc-0005 4-way sync close commits, NOT into the migration itself.

**Expected scope at draft time:** UNKNOWN for Component 2 cleanup. Apply session must establish the count via §1.5 read-only SELECT and halt if outside [0, 200].

**Sequencing constraint:** cc-0005 apply must NOT proceed until BOTH cc-0003 v2 AND cc-0004 complete. Both confirmed Complete as of 2026-05-09 (commits `d60dcfb` + `9d5bdd37` respectively).

---

## Source context

- **Investigation record above** (this brief; chat 2026-05-09).
- `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 §2 (Defect 1–6), §6 (cutover plan), §8 Migration 8 — canonical defect description and cutover intent.
- `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §2.8 (M8 cleanup scope) + §6 Q2 (M7 closure folds into M8 4-way sync) + §6 Q3 (M8 cleanup criterion rewrite — `pd.is_shadow` no longer exists post-M5).
- `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md` (v2 patched) — pattern source for pre-flight + P1–P5 + D-01 packet shape.
- `docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` (post 2026-05-09 patch) — pattern source for multi-table criterion + sequencing gate + slot-side P2.7 reasoning.
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` — cc-0003 v1 HALT result (illustrative for the HALT-then-correction loop pattern).
- `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` — cc-0004 result file (sequencing gate satisfied 2026-05-09).
- `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` — 2026-05-09 v2.56 close; cc-0005 §1.0 sequencing items 3 + 4 MET; chat investigation summary recorded.
- `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` + `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` — M4/M5 state captures.
- `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` §10.2 precedence rule 1 — view auto-reclassifies dead rows correctly post-apply.

**`dead_reason` canonical value:** `m8_cutover_legacy_path_deprecated`. Distinguishes from cc-0003 v2 (`anomalous_scheduled_for_bug3_fallback`) and cc-0004 (`anomalous_pre_m4_v4_mismatch`). The M8 cleanup is intentional retirement, not anomaly cleanup. PK can override via patch.

## Scope

**In scope:**
- Pre-flight verification (read-only SELECTs against `information_schema`, `pg_trigger`, `pg_proc`, `cron.job`, `cron.job_run_details`, target tables + JOINs; cc-0003 v2 + cc-0004 result files via Invegent GitHub MCP).
- One D-01 fire (`ask_chatgpt_review`) with packet specified in §5.
- Single Supabase MCP `apply_migration` call with the exact SQL in §3 (atomic 3-component migration with two in-migration verify gates).
- 10 post-apply verification queries V1–V10 (§7).
- Rollback within session if any verification fails (per §8); rollback reverses ALL 3 components, including restoring the pre-Path-A cron 48 command body captured at §1.3.
- Close-the-loop UPDATE to `m.chatgpt_review` (per standing protocol).
- 4-way sync at session close (session file + sync_state pointer + action_list bump + memory).
- M7 closure documented in the 4-way sync (doc-only; per reconciliation §6 Q2).

**Out of scope:**
- M-09-03 view DDL — Phase 0 work, separate cycle.
- Any change to cron jobs other than 48.
- Disabling cron 48 (Path A explicitly retains active=true).
- Any DDL beyond `ALTER FUNCTION ... RENAME` and `COMMENT ON FUNCTION` on `public.get_next_scheduled_for`.
- Any change to `m.post_draft` rows (read-only JOIN for criterion derivation).
- Any change to `m.slot` rows (read-only JOIN; slots remain valid post-cutover regardless of legacy queue retirement).
- Any change to `c.client_publish_profile`, `c.client_publish_schedule`, taxonomy, or any `t.*`, `c.*`, `f.*`, `a.*`, `k.*` schema.
- Touching `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER hold).
- Modifying `m.ef_drift_log`.
- EF deploys, dashboard/portal/web work.
- Building a replacement enqueue path (Path A retains cron 48 as the canonical autonomous enqueue path; no replacement needed).

## Allowed actions

- Read source files referenced in §Source context.
- Read-only `SELECT` against the database for pre-flight P1–P5 + post-apply verification, including JOINs across `m.post_publish_queue`, `m.post_draft`, `m.slot`, `pg_proc`, `pg_views`, `pg_trigger`, `cron.job`, `cron.job_run_details`, `information_schema.columns`.
- One `ask_chatgpt_review` D-01 fire per the packet in §5.
- One `apply_migration` call with the exact SQL in §3 (after PK explicit approval based on D-01 result, AND after §1.0 + sequencing gates pass). The migration touches:
  - `cron.alter_job(48, command := <new body>)` — cron edit on jobid 48 only, command body rewrite, **not** `active := false`
  - `UPDATE m.post_publish_queue SET status='dead', dead_reason='m8_cutover_legacy_path_deprecated', updated_at = NOW() WHERE queue_id IN (...)` — bulk UPDATE on cleanup-criterion-matching rows
  - `ALTER FUNCTION public.get_next_scheduled_for(...) RENAME TO get_next_scheduled_for__deprecated_m8` — single function rename, after V10 verify gate confirms zero callers
  - `COMMENT ON FUNCTION public.get_next_scheduled_for__deprecated_m8(...) IS '@deprecated M8 Path A cutover ...'` — single comment
- Up to 3 retries on the post-apply verification queries (network/timeout reasons only).
- One rollback migration per §8.3 if any verification fails (rollback reverses all 3 components, including restoring pre-Path-A cron 48 command body).
- One close-the-loop UPDATE to `m.chatgpt_review` after success.
- One commit creating `docs/briefs/results/cc-0005-m8-atomic-cutover.md`.
- 4-way sync close commits (session file + sync_state + action_list + memory edit) at session end.

## Forbidden actions

- No second `apply_migration` call beyond the one in §3 (and a rollback if verification fails).
- No modifications to the SQL in §3 except (a) to add or remove `updated_at = NOW()` per P1.1 outcome on `m.post_publish_queue`, and (b) to adjust the function-rename argument signature based on the actual function definition surfaced at P1.4. Both amendments are documented in the D-01 packet (§5) before fire.
- **No setting `cron.alter_job(48, active := false)`.** Path A explicitly retains cron 48 active. Component 1 only rewrites the `command` argument.
- No cron edits to ANY cron job other than jobid 48.
- No DDL beyond `ALTER FUNCTION ... RENAME` and `COMMENT ON FUNCTION` on `public.get_next_scheduled_for`. No `DROP FUNCTION`. No table DDL. No index DDL. No new functions.
- No changes to `m.post_draft` rows. No changes to `m.slot` rows.
- No changes to any other table.
- No D-01 fire beyond the one in §5.
- No deletes. Cleanup is UPDATE only. Function deprecation is rename, not drop.
- No `apply_migration` if §1.0 sequencing gate fails. **Hard halt.**
- No `apply_migration` if cc-0003 v2 OR cc-0004 result file is missing or shows incomplete status. Both must be `Complete` (or clean NO-OP).
- No `apply_migration` if the read-only pre-flight cleanup count returns outside [0, 200] (HALT path §8.2.a).
- No `apply_migration` if pre-flight §1.4 surfaces any caller of `public.get_next_scheduled_for` outside cron 48. **The migration's V10 in-migration gate would catch this anyway, but pre-flight halt is preferred over rollback.**
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`. Escalation to PK per standing protocol.
- No assumption that `pd.created_by = 'seed_and_enqueue'` is the correct legacy-origin filter — §1.1 + §1.5 verify column existence and value distribution.
- No assumption that `pre_dead_reason_count` for `m8_cutover_legacy_path_deprecated` is 0. Always read it from §1.8.
- No assumption that `public.get_next_scheduled_for` is uniquely defined by name. §1.4 surfaces all overloaded signatures; the rename SQL targets the EXACT signature confirmed at apply time.
- No assumption that the Path A new cron 48 command body is byte-equivalent to the existing body except for the third COALESCE element. The complete rewritten body is specified in §3; apply session uses it verbatim.
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it.
- No Phase 0 scheduling.
- No invocation of `m.fill_pending_slots` or any other v4 EF/function from within this brief's apply session.

---

## 1. Pre-flight verification (read-only, runs at apply session start)

### 1.0 Sequencing gate (HARD GATE; runs before §1.1)

**Path A patch note:** the original draft's §1.0 had 4 PK confirmation items. With Path A, items 1 + 2 of the original gate are structurally resolved by the architecture (cron 48 stays as the enqueue path; rewrite removes `get_next_scheduled_for` from COALESCE; in-migration V10 enforces zero callers before rename). The gate is now reduced to the sequencing items only.

**Pre-condition:** before any other pre-flight query, the apply session MUST confirm that the following are TRUE:

1. **cc-0003 v2 result file shows status=Complete or NO-OP.** §1.9 verifies on disk. **Confirmed v2.55 close (commit `08d4835`) with cc-0003 v2 result file at commit `d60dcfb` showing 9 rows dead-lettered, V1-V6 PASS.**
2. **cc-0004 result file shows status=Complete or NO-OP.** §1.9 verifies on disk. **Confirmed v2.56 close (commit `ec3fd92e`) with cc-0004 result file at commit `9d5bdd37` showing 43 rows dead-lettered, V1-V6 PASS.**

**Decision rule:**
- If both confirmed (already true as of 2026-05-09) → proceed to §1.1.
- If either result file is missing or shows incomplete status → HALT (§8.2.c). The brief stays issued. Re-investigation needed.
- This gate is intentionally separate from the regular pre-flight queries. It is a PROCESS gate, not a SQL gate.

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

**Expected:** `m.post_publish_queue.{queue_id, status, dead_reason, scheduled_for, post_draft_id}` + `m.post_draft.{post_draft_id, slot_id, created_by}` confirmed present. **Critical for cc-0005:** the `m.post_draft.created_by` column MUST exist. If it does not, HALT (§8.2.f). `m.post_publish_queue.updated_at` presence is informative-only — if absent (highly unlikely), the SQL in §3 omits it from the SET clause for the cleanup component.

### 1.2 Confirm trigger surface on `m.post_publish_queue`

```sql
SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS triggerdef
FROM pg_trigger
WHERE tgrelid = 'm.post_publish_queue'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

**Decision rule:** same as cc-0003 v2 / cc-0004. HALT if any trigger fires on UPDATE of `status` AND has external side-effects. Expected 3 non-internal triggers, all PASS.

### 1.3 Cron 48 current state, command body, and history

```sql
SELECT jobid, jobname, schedule, command, active, database, username
FROM cron.job
WHERE jobid = 48;
```

**Expected:** `jobid=48`, `jobname='enqueue-publish-queue-every-5m'`, `active=true`, command body references `m.post_publish_queue` INSERT with the M3+M4 COALESCE pattern (positions 1-3 as captured in the Investigation record).

**Capture:** the FULL `command` text. **Critical:** this old-command text is required by §8.3 rollback to restore cron 48 to its pre-Path-A state if any verification fails post-apply. Persist as `OLD_CRON_48_COMMAND` in chat context (or scratch file `/tmp/cc-0005-old-cron-48-{date}.sql`).

**Decision rule:**
- `active = false` already → HALT (§8.2.j); Path A premise is that cron 48 is currently active and providing autonomous enqueue. If already inactive, autonomous publishing is already broken and a different brief is needed.
- Command does NOT contain `get_next_scheduled_for` already → component 1 is a no-op for the rewrite (idempotent); proceed but flag in result file.
- Command DOES contain `get_next_scheduled_for` (expected) → proceed.
- Command does NOT contain `INSERT INTO m.post_publish_queue` → HALT (§8.2.k); the cron 48 we expect is gone or radically changed.

Then check the last 10 executions for context:

```sql
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = 48
ORDER BY start_time DESC
LIMIT 10;
```

**Decision rule:** if recent runs show `status != 'succeeded'` for > 50% of last 10 — capture for D-01 packet (informational; cron is failing pre-apply).

### 1.4 Identify all callers of `public.get_next_scheduled_for` (V10 pre-flight check)

```sql
-- Function/view callers
SELECT n.nspname AS schema_name, p.proname AS function_name, 'function' AS object_type,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p')
  AND pg_get_functiondef(p.oid) ILIKE '%get_next_scheduled_for%'
  AND NOT (n.nspname = 'public' AND p.proname = 'get_next_scheduled_for')  -- exclude self
  AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

SELECT schemaname, viewname, 'view',
       NULL
FROM pg_views
WHERE definition ILIKE '%get_next_scheduled_for%'
  AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

-- Cron callers
SELECT 'cron' AS schema_name, jobname AS function_name, 'cron' AS object_type,
       'jobid=' || jobid AS args
FROM cron.job
WHERE command ILIKE '%get_next_scheduled_for%';
```

**Decision rule:**
- Expected callers: cron 48 (only). **Path A architecture depends on this** — if other callers surface, the function rename in component 3 cannot proceed safely.
- If non-cron-48 callers surface → HALT (§8.2.g). The Path A brief premise (chat 2026-05-09 investigation: cron 48 is the SOLE caller) is empirically falsified. Re-investigate.
- If 0 cron callers surface (cron 48 already rewritten, e.g. a re-attempt) → proceed; component 1 is a no-op rewrite; V10 in-migration gate becomes trivial; component 3 still proceeds.

**Surface the EXACT signature of `public.get_next_scheduled_for`:**

```sql
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_next_scheduled_for';
```

**Decision rule:** if 0 rows → function already absent; component 3 of the migration is a no-op. If 1 row → capture the `args` value for the rename SQL (must be byte-exact in the `ALTER FUNCTION` statement). If > 1 rows → multiple overloaded signatures; HALT (§8.2.h).

### 1.5 Cleanup count check

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

**Decision rule:**
- If `m8_cleanup_count = 0` → cleanup component is a no-op (still proceed if other components required; see §8.1).
- If `m8_cleanup_count` outside [0, 200] → HALT (§8.2.a).
- If `m8_cleanup_count` inside [0, 200] → proceed to §1.6.

**No prior count to inherit:** unlike cc-0003 v2 (9, derived from cc-0003 v1 HALT) and cc-0004 (43, from reconciliation brief), no prior brief has counted the M8 cleanup criterion.

**Cross-check vs cc-0003 v2 + cc-0004:**

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

**Decision rule:**
- `overlap_with_cc_0003_v2_criterion = 0` expected post cc-0003 v2 completion. **HALT** (§8.2.i) if non-zero.
- `overlap_with_cc_0004_criterion = 0` BY CONSTRUCTION. HALT if non-zero.

### 1.6 Capture cleanup snapshot

```sql
SELECT q.queue_id,
       q.client_id,
       q.platform,
       q.scheduled_for AS queue_scheduled_for,
       q.created_at,
       q.status AS pre_status,
       q.post_draft_id,
       pd.approval_status AS draft_status,
       pd.slot_id,
       pd.created_by
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW()
ORDER BY q.scheduled_for, q.queue_id;
```

**Purpose:** target snapshot for V5 paranoia + rollback reconstruction. Persist the queue_id list to chat context (or scratch file `/tmp/cc-0005-targets-{date}.csv`).

### 1.7 Capture pre-state aggregates for V3/V4 verification

```sql
SELECT status, COUNT(*) AS row_count
FROM m.post_publish_queue
GROUP BY status
ORDER BY status;
```

**Purpose:** baseline for V3 + V4 post-apply.

### 1.8 Capture pre-existing `dead_reason` baseline

```sql
SELECT COUNT(*) AS pre_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'm8_cutover_legacy_path_deprecated';
```

**Purpose:** baseline for V1. **Do not assume `pre_dead_reason_count = 0`.** Always read it. Expected likely 0 (this is the first migration to use this `dead_reason`).

### 1.9 Sequencing gate: verify cc-0003 v2 + cc-0004 completion

**Read both result files (read-only via Invegent GitHub MCP):**
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` — confirm §1 status indicates cc-0003 v2 completion. **Already confirmed Complete v2.55 (commit `08d4835`); cc-0003 v2 result at commit `d60dcfb`.**
- `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` — confirm §1 status indicates cc-0004 completion. **Already confirmed Complete v2.56 (commit `ec3fd92e`); cc-0004 result at commit `9d5bdd37`.**

**Decision rule:** Both `Complete` or `NO-OP` → proceed. Either `Partial` / `Blocked` / missing → HALT (§8.2.c).

**Cross-check on the database:**

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

**Expected:** `anomalous_scheduled_for_bug3_fallback` row_count = 9 (cc-0003 v2); `anomalous_pre_m4_v4_mismatch` row_count = 43 (cc-0004). Capture for D-01 packet.

---

## 2. Selection criterion (cleanup component, locked)

```sql
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW()
```

With JOIN: `FROM m.post_publish_queue q JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id`.

**Rationale:** captures legacy-origin (no slot) drafts created by the legacy enqueue path (`seed_and_enqueue`) currently scheduled for a future publish. Path A retires the ability of cron 48 to re-create these (the `WHERE computed_scheduled_for IS NOT NULL` filter post-rewrite drops legacy-unresolvable rows from re-enqueue), but existing future rows in the queue are explicitly retired here.

**Excluded by criterion:**
- Slot-driven rows (`pd.slot_id IS NOT NULL`): cc-0004 scope.
- Legacy-origin rows with `pd.created_by != 'seed_and_enqueue'`: out of M8 scope.
- Legacy-origin rows with `q.scheduled_for <= NOW()`: cc-0003 v2 covers Bug 3 fingerprint past subset; the rest remain.
- Dead or published rows.

**Disjointness vs cc-0003 v2 and cc-0004:** structural disjointness on `q.scheduled_for` time window (vs cc-0003 v2) and `pd.slot_id` discriminator (vs cc-0004). Mutually exclusive WHERE clauses.

**Why `pd.created_by = 'seed_and_enqueue'` not just `pd.slot_id IS NULL`:** narrows to the SPECIFIC legacy enqueue path being deprecated.

---

## 3. Proposed SQL (Path A, locked, with apply-time amendment notes)

Applied via Supabase MCP `apply_migration` with:
- **Migration name:** `m8_atomic_cutover_v1`
- **Project ID:** `mbkmaxqhsohbtwsqolns`

```sql
-- M8 Path A atomic cutover
-- See: docs/briefs/cc-0005-m8-atomic-cutover.md (Path A patched 2026-05-09)
-- See: docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.8
-- See: docs/briefs/2026-05-05-queue-integrity-incident.md §6 (cutover plan) + §8 Migration 8
--
-- Three coordinated components in a single transaction:
--   1. Rewrite cron 48 command body in place (drop public.get_next_scheduled_for from COALESCE)
--   2. Cleanup legacy-origin future queue rows
--   3. Deprecate public.get_next_scheduled_for via rename + comment (after V10 verify gate)
--
-- All 3 atomic: either all succeed or all roll back. Two in-migration verify
-- gates enforce the conditional dependencies:
--   - After Component 1: cron 48 must remain active=true AND command must no longer
--     reference get_next_scheduled_for AND must still INSERT INTO m.post_publish_queue
--     AND must still reference pd.scheduled_for + s.scheduled_publish_at as COALESCE inputs.
--   - Before Component 3 (V10): zero live callers of public.get_next_scheduled_for
--     across pg_proc, pg_views, cron.job. If any caller surfaces, RAISE EXCEPTION.
--
-- M7 closure folds into the 4-way sync close commits, NOT into this migration.

-- =========================================================================
-- COMPONENT 1: Rewrite cron 48 command body in place (Path A)
-- =========================================================================
--
-- Cron 48 stays active=true. Command body is rewritten via cron.alter_job(48, command := ...)
-- to remove public.get_next_scheduled_for from the COALESCE chain in the candidates CTE.
-- Resulting COALESCE: (pd.scheduled_for, s.scheduled_publish_at).
-- Legacy rows with both NULL are skipped via the pre-existing
-- WHERE computed_scheduled_for IS NOT NULL filter (M3 Bug 3 fix carries forward).

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

  IF v_old_command !~ 'get_next_scheduled_for' THEN
    RAISE NOTICE 'M8 Path A component 1: cron 48 command already does not contain get_next_scheduled_for; treating component 1 as idempotent no-op. Verify gate proceeds.';
  ELSE
    -- The new command body is the existing command MINUS the third COALESCE element.
    -- Comment annotations added at the COALESCE site and the WHERE filter site
    -- documenting the M8 Path A change.
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
        -- M8 Path A 2026-05-XX: public.get_next_scheduled_for removed from COALESCE chain.
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
    RAISE NOTICE 'M8 Path A component 1: cron 48 command body rewritten at % (Path A: get_next_scheduled_for removed from COALESCE).', NOW();
  END IF;
END $$;

-- =========================================================================
-- COMPONENT 1 verify gate (V7 + V8 + V9 in-migration check)
-- =========================================================================
-- Cron 48 must still exist, must still be active=true, must no longer reference
-- get_next_scheduled_for, must still INSERT INTO m.post_publish_queue, and must
-- still reference pd.scheduled_for + s.scheduled_publish_at as COALESCE inputs.

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

  -- V8: cron 48 command no longer contains get_next_scheduled_for
  IF v_command ~ 'get_next_scheduled_for' THEN
    RAISE EXCEPTION 'M8 Path A HALT (V8 gate): cron 48 command still contains get_next_scheduled_for post-rewrite. Component 1 did not produce expected effect.';
  END IF;

  -- V9: autonomous slot-driven enqueue path is still represented by the rewritten command
  IF v_command !~ 'INSERT INTO m\.post_publish_queue' THEN
    RAISE EXCEPTION 'M8 Path A HALT (V9 gate): cron 48 command no longer contains INSERT INTO m.post_publish_queue post-rewrite (autonomous enqueue would stop).';
  END IF;
  IF v_command !~ 'pd\.scheduled_for' OR v_command !~ 's\.scheduled_publish_at' THEN
    RAISE EXCEPTION 'M8 Path A HALT (V9 gate): cron 48 command no longer references pd.scheduled_for AND s.scheduled_publish_at as COALESCE inputs.';
  END IF;

  RAISE NOTICE 'M8 Path A Component 1 verify gate: V7+V8+V9 PASS — cron 48 active=true, command rewritten, autonomous enqueue path preserved.';
END $$;

-- =========================================================================
-- COMPONENT 2: Cleanup legacy-origin future queue rows
-- (conditional on Component 1 verify gate above passing)
-- =========================================================================

DO $$
DECLARE
  v_count integer;
  v_min_expected integer := 0;
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

  -- v_count = 0 is acceptable: cleanup component is a no-op, but components 1 + 3 still proceed.
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
-- V10 PRE-RENAME GATE: zero live callers of public.get_next_scheduled_for
-- =========================================================================
-- Component 3 is conditional on V10 passing. This DO block enumerates all
-- callers (function/procedure, view, cron) and RAISE EXCEPTION on non-zero.
-- Cron 48 was the only caller per pre-flight §1.4; Component 1 just rewrote
-- cron 48 to remove the reference, so the cron-side caller count must be 0.
-- If any other caller surfaces (e.g. a function added between pre-flight and
-- apply), the migration aborts here and the rename never happens.

DO $$
DECLARE
  v_func_count integer;
  v_func_callers text;
  v_view_count integer;
  v_cron_count integer;
BEGIN
  -- Function/procedure callers (excluding the function itself)
  SELECT COUNT(*), string_agg(format('%I.%I(%s)',
      n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), ', ')
    INTO v_func_count, v_func_callers
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND pg_get_functiondef(p.oid) ILIKE '%get_next_scheduled_for%'
    AND NOT (n.nspname = 'public' AND p.proname = 'get_next_scheduled_for')
    AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't');

  IF v_func_count > 0 THEN
    RAISE EXCEPTION 'M8 Path A HALT (V10 pre-rename gate): % function/procedure caller(s) of get_next_scheduled_for: %. Cannot rename safely.',
      v_func_count, v_func_callers;
  END IF;

  -- View callers
  SELECT COUNT(*) INTO v_view_count
  FROM pg_views
  WHERE definition ILIKE '%get_next_scheduled_for%'
    AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't');

  IF v_view_count > 0 THEN
    RAISE EXCEPTION 'M8 Path A HALT (V10 pre-rename gate): % view caller(s) of get_next_scheduled_for. Cannot rename safely.', v_view_count;
  END IF;

  -- Cron callers (post-Component-1, cron 48 should no longer match)
  SELECT COUNT(*) INTO v_cron_count
  FROM cron.job
  WHERE command ILIKE '%get_next_scheduled_for%';

  IF v_cron_count > 0 THEN
    RAISE EXCEPTION 'M8 Path A HALT (V10 pre-rename gate): % cron caller(s) of get_next_scheduled_for. Component 1 did not fully remove the reference, OR another cron job was added.', v_cron_count;
  END IF;

  RAISE NOTICE 'M8 Path A V10 pre-rename gate: zero live callers of get_next_scheduled_for (function/view/cron). Safe to proceed with Component 3 rename.';
END $$;

-- =========================================================================
-- COMPONENT 3: Deprecate public.get_next_scheduled_for
-- (conditional on V10 pre-rename gate above passing)
-- =========================================================================
--
-- Apply-time amendment rule: the argument signature `<ARGS>` MUST be
-- replaced with the actual signature surfaced at §1.4 before D-01 fire.
-- Pre-flight §1.4 returns the exact value of pg_get_function_identity_arguments.

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
  'Replaced by slot-aware enqueue path (cron 48 rewritten in place to drop this fallback from COALESCE chain). '
  'Function body retained for audit; do not call. '
  'See docs/briefs/cc-0005-m8-atomic-cutover.md for cutover context.';
```

**Notes on the SQL:**

1. **Atomicity:** `apply_migration` runs the entire migration in a single transaction. If ANY of the 3 components OR the two verify gates raise, the whole transaction rolls back. No partial state.
2. **Idempotency:** all 3 components individually idempotent. Component 1 short-circuits if command already lacks `get_next_scheduled_for`. Component 2 self-checks via WHERE (re-run finds 0 matches if already done). Component 3 short-circuits via count-guard DO block.
3. **Conditional dependencies enforced via in-migration verify gates:**
   - Component 2 conditional on Component 1 gate (V7 + V8 + V9 in-migration).
   - Component 3 conditional on V10 pre-rename gate.
   - Both gates RAISE EXCEPTION on failure → transaction rolls back → no partial cutover.
4. **Apply-time amendment for `<ARGS>`:** the function signature MUST be filled in based on §1.4's `pg_get_function_identity_arguments` result before D-01 fire. Document the amendment in the D-01 packet (§5.2 `sql_to_apply` field).
5. **Apply-time substitution for `2026-05-XX` in comment text:** replace with the apply session's actual UTC date before D-01 fire.
6. **`updated_at = NOW()` for the cleanup UPDATE:** matches cc-0003 v2 / cc-0004 patterns. §1.1 verifies.
7. **`WHERE queue_id IN (...)` subquery form** for the cleanup UPDATE — same shape as cc-0003 v2 / cc-0004.
8. **`dead_reason='m8_cutover_legacy_path_deprecated'`** distinguishes from cc-0003 v2 + cc-0004.
9. **No `DROP FUNCTION`:** rename + comment retains the function body for audit.
10. **Path A specifically does NOT set `cron.alter_job(48, active := false)`** anywhere. Cron 48 stays active.
11. **The new cron 48 command body is byte-for-byte identical to the old body** except for the third COALESCE element (removed) and two added comment lines. F-PUB-010 hard-cap, distinctness selection, NOT EXISTS guards, ORDER BY, ON CONFLICT clause — all preserved verbatim.

---

## 4. P1–P5 pre-flight checklist (per Lesson #61)

### P0 — Pre-condition gate

- [ ] **P0.1** §1.0 sequencing gate — confirm cc-0003 v2 + cc-0004 results both Complete. **Already structurally satisfied as of 2026-05-09.** Re-confirm at apply time by reading the result files.

### P1 — Pre-state capture

- [ ] **P1.1** Run §1.1 information_schema check; confirm `m.post_draft.created_by` column present. HALT (§8.2.f) if absent.
- [ ] **P1.2** Run §1.2 pg_trigger check (expected 3 triggers, all PASS).
- [ ] **P1.3** Run §1.3 cron 48 state check; **capture full command text as `OLD_CRON_48_COMMAND`** for §8.3 rollback. HALT (§8.2.j) if cron 48 already inactive. HALT (§8.2.k) if command no longer contains `INSERT INTO m.post_publish_queue`.
- [ ] **P1.4** Run §1.4 callers + signature check; confirm cron 48 is the only caller; capture `pg_get_function_identity_arguments` value for SQL amendment. HALT (§8.2.g) if other live caller surfaces.
- [ ] **P1.5** Run §1.5 cleanup count check + cross-check vs cc-0003 v2 / cc-0004 criteria. HALT (§8.2.a) if count > 200; HALT (§8.2.i) if cc-0003 v2 overlap > 0.
- [ ] **P1.6** Run §1.6 cleanup snapshot; persist queue_id list.
- [ ] **P1.7** Run §1.7 pre-state aggregates baseline.
- [ ] **P1.8** Run §1.8 pre_dead_reason_count baseline; persist value for V1 pass condition.
- [ ] **P1.9** Run §1.9 sequencing gate: read cc-0003 v2 + cc-0004 result files via Invegent GitHub MCP; cross-check dead_reason populations on the database.

**Pass criterion:** P0.1 + all 9 P1 checks PASS.

### P2 — Side-effect surface

- [ ] **P2.1** `m.publisher_lock_queue_v2` — publisher's row-locking function. Reads `WHERE status='queued'`. Post-apply: cleanup count fewer rows eligible.
- [ ] **P2.2** `m.cleanup_queue_on_publish_v1` trigger — fires on `m.post_publish` INSERT. Not affected.
- [ ] **P2.3** Cron 48 (`enqueue-publish-queue-every-5m`) — **THE TARGET of Component 1.** Post-apply: `active=true` (unchanged) but command body rewritten to remove `get_next_scheduled_for` from COALESCE. **Side-effect:** legacy-origin drafts with no slot AND no `pd.scheduled_for` are skipped at next cron 48 fire (they would have been fallback-scheduled pre-Path-A); slot-driven drafts continue to be enqueued normally via positions 1-2 of COALESCE. Verify in V7 (active=true), V8 (no get_next_scheduled_for), V9 (still inserts into queue).
- [ ] **P2.4** Dashboard / portal queries — no surface visible to users changes (cron 48 still appears active; queue counts shift cosmetically due to cleanup).
- [ ] **P2.5** `m.vw_pipeline_state` — not yet built. Per §10.2 precedence rule 1, post-apply rows correctly classify as `dead`.
- [ ] **P2.6** Health-check Cowork sweep — may surface lower future-queued count. Cosmetic.
- [ ] **P2.7** `m.fill_pending_slots` — v4 draft-generation function. Confirmed by chat investigation 2026-05-09: inserts drafts + ai_jobs ONLY, NOT queue rows. Cron 48's rewritten command continues to pick up drafts created by fill_function (slot-driven path). **No conflict with Path A.**
- [ ] **P2.8** Callers of `public.get_next_scheduled_for` — V10 in-migration gate enforces zero callers before rename. Pre-flight §1.4 + P3.6 cross-check. Post-rewrite of cron 48 (Component 1), cron 48 is no longer a caller.
- [ ] **P2.9** Future cron 48 fires post-apply — first fire after apply runs the rewritten command. Slot-driven drafts continue to enqueue (positions 1-2 of COALESCE work). Legacy-unresolvable drafts get skipped (the existing `WHERE computed_scheduled_for IS NOT NULL` filter drops them). Behaviour change is bounded and intended.

**Pass criterion:** P2.1–P2.9 reviewed; no unaccounted-for side effect.

### P3 — Transitive dependency map

- [ ] **P3.1** Search for any function/view/trigger referencing `m.post_publish_queue.dead_reason`.
- [ ] **P3.2** Code-collision check: search for the literal string `'m8_cutover_legacy_path_deprecated'`.
- [ ] **P3.3** Verify `m.post_draft` rows associated with the cleanup queue rows have valid `approval_status`.
- [ ] **P3.4** Confirm no Cowork brief / scheduled task references `m.post_publish_queue` rows or cron 48 by ID.
- [ ] **P3.5** Forward-look on cron 48 post-rewrite: simulate the new command's effect by inspecting current m.ai_job + m.post_draft + m.slot state. Confirm slot-driven drafts would be enqueued; confirm legacy-unresolvable drafts would be skipped; confirm count of "would-skip" drafts is bounded.
- [ ] **P3.6** Search for any function/view that calls `public.get_next_scheduled_for` by name AND is currently active in production. If found AND not equal to cron 48 → HALT (§8.2.g). **Note: V10 in-migration gate enforces this again at apply time.**

**Pass criterion:** P3.1–P3.6 reviewed; transitive readers safe.

### P4 — Reversibility

- [ ] **P4.1** Rollback SQL drafted (§8.3) for all 3 components: restore old cron 48 command body (from §1.3 `OLD_CRON_48_COMMAND`), restore queue_id list to pre_status, rename function back.
- [ ] **P4.2** Acknowledge irreversible side-effects: NONE. Cron 48 command rewrite is reversible (replay `OLD_CRON_48_COMMAND`). Cleanup UPDATE is reversible. Function rename is reversible.
- [ ] **P4.3** Time-window for rollback: bounded for cron 48 (until first post-apply cron run; if that run inserts a new queue row using the new command, rollback would still restore old command but the inserted row stays). Indefinite for cleanup component. Bounded for function rename (must rename back before any new caller resolves).
- [ ] **P4.4** Confirm rollback would not collide with newer rows: rollback uses captured queue_id list (§1.6), captured old command (§1.3), and known constants (cron jobid 48, function canonical name).
- [ ] **P4.5** Rollback creates an inconsistent state if only PARTIALLY applied: if components 1 + 2 applied but component 3 failed (V10 caught a caller), the in-migration RAISE EXCEPTION rolls back the whole transaction. Same for any other failure point. **No partial state possible** within the migration.

**Pass criterion:** P4.1–P4.5 PASS.

### P5 — Post-state verification preconditions

- [ ] **P5.1** V1: count of rows with `dead_reason='m8_cutover_legacy_path_deprecated'` post-apply equals `pre_dead_reason_count + N`.
- [ ] **P5.2** V2: count of rows matching the M8 cleanup criterion in `status IN ('queued','failed')` becomes 0.
- [ ] **P5.3** V3: total queued+failed count decreases by exactly N.
- [ ] **P5.4** V4: total dead count increases by exactly N.
- [ ] **P5.5** V5 paranoia: only the captured rows changed.
- [ ] **P5.6** V6: per-status aggregates coherent.
- [ ] **P5.7** V7 (CHANGED from original Path C draft): cron 48 status is `active=true`.
- [ ] **P5.8** V8 (CHANGED from original Path C draft): cron 48 command no longer contains `get_next_scheduled_for`.
- [ ] **P5.9** V9 (NEW Path A): cron 48 command still represents autonomous slot-driven enqueue path — must contain `INSERT INTO m.post_publish_queue` AND `pd.scheduled_for` AND `s.scheduled_publish_at`.
- [ ] **P5.10** V10 (NEW Path A): zero live callers of `public.get_next_scheduled_for__deprecated_m8` (the new name) post-rename across functions, views, cron. Mirrors the in-migration V10 gate but verifies post-apply state.

**Pass criterion:** all 10 verification queries written and ready (§7).

---

## 5. D-01 packet content (NOT YET FIRED)

### 5.1 `proposal` (prose)

```
Apply M8 Path A atomic cutover: 3 coordinated components in a single transaction.
Cron 48 is REWRITTEN IN PLACE, not disabled.

Migration name: m8_atomic_cutover_v1
Project: mbkmaxqhsohbtwsqolns
Method: Supabase MCP apply_migration (single atomic transaction)

COMPONENT 1 — Rewrite cron 48 (enqueue-publish-queue-every-5m) command body:
  cron.alter_job(48, command := <new body>)
  New body removes public.get_next_scheduled_for from the COALESCE chain in
  the candidates CTE. Resulting COALESCE: (pd.scheduled_for, s.scheduled_publish_at).
  Cron 48 stays active=true. Legacy rows with both NULL are skipped via the
  pre-existing WHERE computed_scheduled_for IS NOT NULL filter.

IN-MIGRATION VERIFY GATE (V7 + V8 + V9): after Component 1, RAISE EXCEPTION if:
  - cron 48 active != true (V7)
  - cron 48 command still contains get_next_scheduled_for (V8)
  - cron 48 command no longer references INSERT INTO m.post_publish_queue
    OR pd.scheduled_for OR s.scheduled_publish_at (V9)

COMPONENT 2 — Cleanup legacy-origin future queue rows:
  Scope: rows matching `q.status IN ('queued','failed') AND pd.slot_id IS NULL
         AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW()`
  Expected count at apply time: <N> (read-only verified <DATETIME>; halts if outside [0,200])
  UPDATE: SET status='dead', dead_reason='m8_cutover_legacy_path_deprecated', updated_at=NOW()

IN-MIGRATION V10 PRE-RENAME GATE: before Component 3, RAISE EXCEPTION if any
live caller of public.get_next_scheduled_for surfaces (function/procedure/view/cron).

COMPONENT 3 — Deprecate public.get_next_scheduled_for:
  ALTER FUNCTION public.get_next_scheduled_for(<ARGS>) RENAME TO get_next_scheduled_for__deprecated_m8
  + COMMENT ON FUNCTION ... IS '@deprecated M8 Path A cutover ...'

No other tables touched. No other DDL. No other cron edits. No EF deploys.
M7 closure folds into 4-way sync close commits, NOT into this migration.

WHY PATH A: chat investigation 2026-05-09 established cron 48 is the SOLE
autonomous inserter into m.post_publish_queue. Disabling cron 48 (the original
Path C draft) would have stopped autonomous publishing. Path A keeps cron 48
active and rewrites its command body to remove the legacy fallback.
Components 2 + 3 are conditional on Component 1's verify gate passing
(in-migration RAISE EXCEPTION enforces this) and Component 3 is conditional
on V10 pre-rename gate passing.

SEQUENCING:
  - cc-0003 v2 Complete (commit d60dcfb).
  - cc-0004 Complete (commit 9d5bdd37).
  - §1.0 sequencing gate confirmed at apply time.
  - §1.4 pre-flight confirms cron 48 is the only caller of
    public.get_next_scheduled_for; HALT if other caller surfaces.

ROLLBACK: single rollback migration reverses all 3 components atomically:
restore cron 48 to OLD_CRON_48_COMMAND captured at §1.3, restore queue_id list
to pre_status, rename function back.

VERIFICATION: 10 post-apply queries (V1-V10). V1 uses pre_dead_reason_count baseline.
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply M8 Path A atomic cutover: cron 48 in-place command rewrite + legacy-origin future cleanup + public.get_next_scheduled_for deprecation",
  "production_action_if_approved": "Single Supabase MCP apply_migration call. Three components in one transaction with two in-migration verify gates: (1) cron.alter_job(48, command := <new body>) keeping active=true, (2) UPDATE m.post_publish_queue cleanup rows to dead/m8_cutover_legacy_path_deprecated, (3) ALTER FUNCTION public.get_next_scheduled_for RENAME + COMMENT — components 2 + 3 conditional on in-migration verify gates passing.",
  "consequence_if_delayed": "Moderate operational benefit if delayed. Cron 48 currently still calls public.get_next_scheduled_for as the third COALESCE element; this fallback only fires for legacy-origin drafts where pd.scheduled_for IS NULL AND pd.slot_id IS NULL. As of cc-0004 closure, the residual legacy futures are dead-lettered; only NEW legacy-origin drafts via the seed_and_enqueue path would currently use position (3). Until M8 Path A applies, the architectural cutover to v4-only enqueue is incomplete.",
  "cost_of_waiting": "Low. Path A is a structural/architectural cutover; no immediate operational degradation if delayed. Pipeline-integrity benefit (single canonical schedule resolution path; legacy fallback retired in code; deprecation marker on the function) is the residual reason to apply rather than wait.",
  "current_evidence": [
    "Chat investigation 2026-05-09: cron 48 is the SOLE autonomous inserter into m.post_publish_queue (4 other inserters all dashboard-manual / audit).",
    "Chat investigation 2026-05-09: m.fill_pending_slots inserts drafts + ai_jobs only, never queue rows.",
    "Chat investigation 2026-05-09: no trigger inserts queue rows (9 triggers surveyed).",
    "Pre-flight §1.0 sequencing gate: cc-0003 v2 result Complete (commit d60dcfb); cc-0004 result Complete (commit 9d5bdd37).",
    "Pre-flight §1.3 cron 48 state: active=<true|false>; command=<captured>; OLD_CRON_48_COMMAND persisted for rollback.",
    "Pre-flight §1.4 callers of get_next_scheduled_for: cron 48 only (or list any others — HALT if non-cron-48 caller surfaces).",
    "Pre-flight §1.4 function signature: <args>.",
    "Pre-flight §1.5 cleanup count: <N> rows match criterion at <DATETIME>.",
    "Pre-flight §1.5 cross-check: 0 overlap with cc-0003 v2 criterion (post cc-0003 v2 completion); 0 overlap with cc-0004 criterion (by construction).",
    "Pre-flight §1.8 pre_dead_reason_count: <P> (baseline used in V1).",
    "Pre-flight §1.9 sequencing cross-check: cc-0003 v2 dead_reason population <X>; cc-0004 dead_reason population <Y>.",
    "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.8 cutover scope confirmation.",
    "docs/briefs/2026-05-05-queue-integrity-incident.md v3 §6 cutover plan (original Path C; superseded by Path A in this brief)."
  ],
  "known_weak_evidence": [
    "No prior brief has counted the M8 cleanup criterion. The expected range [0, 200] is unanchored.",
    "Three coordinated components in one transaction is a larger blast radius than cc-0003/cc-0004's single-component shape. Mitigation: atomicity + two in-migration verify gates + comprehensive rollback.",
    "Cron edit (command rewrite) in production is a new permission for the brief-runner-v0 trial. cc-0003/cc-0004 explicitly forbade cron edits. cc-0005 explicitly allows cron 48 command rewrite only (NOT active toggle).",
    "DDL (ALTER FUNCTION RENAME) is a new permission for the brief-runner-v0 trial. Reversible via rename-back. V10 pre-rename gate enforces zero callers before rename fires.",
    "The new cron 48 command body is byte-for-byte identical to the old body except for the third COALESCE element removal and two added comment lines. Apply session must use the verbatim SQL in §3 — no re-derivation.",
    "Rollback path uses captured OLD_CRON_48_COMMAND from §1.3, queue_id list from §1.6, and known constants. Depends on apply session correctly persisting the snapshot in P1.3 + P1.6.",
    "V1 pass condition relies on pre_dead_reason_count captured at §1.8."
  ],
  "default_action": "proceed if D-01 returns clean agree AND §1.0 sequencing gate passed AND §1.4 confirmed cron 48 is the sole caller; halt and escalate to PK if any escalation, pushback, risk-elevation, or §1.0/§1.4 fail",
  "references": {
    "cc-0005 brief (Path A patched)": "docs/briefs/cc-0005-m8-atomic-cutover.md",
    "cc-0003 v2 brief (pattern source)": "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 brief (pattern source)": "docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "cc-0003 v2 result (sequencing)": "docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 result (sequencing)": "docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "reconciliation brief": "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md",
    "queue integrity v3": "docs/briefs/2026-05-05-queue-integrity-incident.md",
    "M5 session record": "docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md",
    "v2.56 cc-0004 close (Path A investigation summary)": "docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md",
    "§10.2 view contract": "docs/dashboard-review-2026-05/10_product_objects_and_data_model.md"
  },
  "sql_to_apply": "<full SQL from cc-0005 §3 verbatim, with <ARGS> replaced by P1.4 signature, 2026-05-XX replaced by apply session UTC date, and any updated_at adjustment per P1.1>"
}
```

### 5.3 Decision rule on D-01 verdict

Same as cc-0003 v2 / cc-0004:
- `agree` + `proceed` + risk ≤ medium + 0 pushback → apply.
- `agree` with non-trivial pushback → escalation; PK approval required.
- Anything else → halt; escalate to PK.
- Lesson #62 v2.50 refinement: verbatim-identical pushback → PK explicit approval before override.

---

## 6. Apply procedure

After §1.0 sequencing gate passes, §1.4 confirms cron 48 is the sole caller, D-01 returns clean agree, AND PK approval:

1. **Sequencing gate re-confirmation** — read cc-0003 v2 + cc-0004 result files; confirm both `Complete`/`NO-OP`. HALT if not.
2. **Final read-only re-verification** — re-run §1.3 + §1.4 + §1.5 + §1.6 + §1.8 within ~60s of apply. Confirm cleanup count is in the same range as the D-01 packet stated. **Confirm `OLD_CRON_48_COMMAND` is unchanged from initial pre-flight capture.** If divergence > 10 rows in cleanup count, halt and refresh D-01 packet. If function signature changed, halt. If a new caller of get_next_scheduled_for surfaced, halt.
3. **Apply SQL amendment** — replace `<ARGS>` placeholder in §3 SQL with the actual signature from §1.4. Replace `2026-05-XX` in COMMENT text with the apply session's actual UTC date. Confirm the embedded `$cron_body$` block matches the locked Path A new command body byte-for-byte.
4. **`apply_migration` call** — single call:
   ```
   apply_migration(
     project_id: 'mbkmaxqhsohbtwsqolns',
     name: 'm8_atomic_cutover_v1',
     query: <amended SQL from §3>
   )
   ```
5. **Capture the result** — record success vs failure, exact return value, all 5+ RAISE NOTICE messages (component 1 rewrite, component 1 verify gate, component 2 count, V10 pre-rename gate, component 3 rename).
6. **Run all 10 verification queries (§7)** — if any fails, immediately move to §8.3 rollback.
7. **If all 10 PASS:** session continues to close-the-loop UPDATE on `m.chatgpt_review` and 4-way sync. M7 closure documentation included in 4-way sync.

---

## 7. Verification queries (post-apply)

Run all 10 in sequence. Each must PASS to declare success.

### V1 — Exact dead_reason population delta (cleanup component)

```sql
SELECT COUNT(*) AS post_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'm8_cutover_legacy_path_deprecated';
```

**Pass:** `post_dead_reason_count = pre_dead_reason_count + N`.

### V2 — No remaining matching queued/failed rows (cleanup criterion)

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

### V3 — Queued+failed depth decreased by exactly N

Same as cc-0003 v2 / cc-0004 V3.

### V4 — Dead count increased by exactly N

Same as cc-0003 v2 / cc-0004 V4.

### V5 — Paranoia: only the captured rows changed

Same as cc-0003 v2 / cc-0004 V5, with `dead_reason='m8_cutover_legacy_path_deprecated'`.

### V6 — Coherence cross-check

Same as cc-0003 v2 / cc-0004 V6.

### V7 — Cron 48 active=true (Path A: stays active) [CHANGED FROM ORIGINAL DRAFT]

```sql
SELECT jobid, jobname, active
FROM cron.job
WHERE jobid = 48;
```

**Pass:** `active = true` AND `jobname` unchanged from §1.3 capture. **Path A specifically does NOT disable cron 48.**

### V8 — Cron 48 command no longer contains `get_next_scheduled_for` [CHANGED FROM ORIGINAL DRAFT]

```sql
SELECT jobid,
       (command !~ 'get_next_scheduled_for') AS path_a_rewrite_complete,
       LENGTH(command) AS command_length
FROM cron.job
WHERE jobid = 48;
```

**Pass:** `path_a_rewrite_complete = true` (the command body no longer references `get_next_scheduled_for`). `command_length` should be slightly less than the §1.3 captured length (one COALESCE element removed plus added comment lines; expect roughly within ±200 bytes of original — informational, not pass-conditional).

### V9 — Autonomous slot-driven enqueue path still represented [NEW PATH A]

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

**Pass:** `still_inserts_queue=true`, `uses_pd_scheduled_for=true`, `uses_slot_scheduled_publish_at=true`, `retains_skip_filter=true`, `retains_pub_010_hard_cap_marker=true`, `retains_m4_annotation=true`. The autonomous slot-driven enqueue path is structurally preserved in the rewritten command.

### V10 — Zero live callers of `get_next_scheduled_for__deprecated_m8` post-rename [NEW PATH A]

```sql
-- Function/procedure callers of either name
SELECT 'function' AS object_type, n.nspname || '.' || p.proname AS caller,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p')
  AND (
    pg_get_functiondef(p.oid) ILIKE '%get_next_scheduled_for%'
    AND NOT (n.nspname = 'public' AND p.proname IN ('get_next_scheduled_for', 'get_next_scheduled_for__deprecated_m8'))
  )
  AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

SELECT 'view', schemaname || '.' || viewname, NULL
FROM pg_views
WHERE definition ILIKE '%get_next_scheduled_for%'
  AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

SELECT 'cron', jobname, 'jobid=' || jobid::text
FROM cron.job
WHERE command ILIKE '%get_next_scheduled_for%';
```

**Pass:** zero rows returned. Component 1 removed cron 48's reference; the in-migration V10 pre-rename gate confirmed zero callers before rename; this V10 query confirms the post-apply state matches.

**Note on V10 pre-rename in-migration vs post-apply:** the in-migration V10 gate is the load-bearing check (it fires the RAISE EXCEPTION that prevents an unsafe rename). The post-apply V10 query is the verification that the final state matches the in-migration gate's outcome. Both should agree.

### V8 — Function rename + comment (folded into V10 above) [retired as standalone V check; behaviour now covered by V10 + V8 reposition]

The original draft had V8 = function rename + comment. Path A repositioned V7-V10 per PK directive: V7 = cron active, V8 = cron command rewrite, V9 = enqueue path preserved, V10 = zero callers. The function-rename-and-comment check is now embedded in V10's filter (the rename-target name `get_next_scheduled_for__deprecated_m8` appears alongside the original name in the V10 query) and is implicitly verified by zero callers existing for the renamed function.

For explicit verification of the rename + comment, the apply session should ALSO run this paranoia query (call it V10b for record-keeping; pass condition is the function-rename verification):

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

**Pass:** exactly 1 row returned, with `function_name = 'get_next_scheduled_for__deprecated_m8'`. The `description` contains the substring `'@deprecated M8 Path A cutover'`. No row exists with `function_name = 'get_next_scheduled_for'`.

---

## 8. Rollback / no-op / halt logic

### 8.1 NO-OP path (run before D-01 fire)

Nuanced: cc-0005 has 3 components. Independent NO-OP per component:

- Component 1 NO-OP if §1.3 shows command already lacks `get_next_scheduled_for`: rewrite is a no-op; verify gate still runs.
- Component 2 NO-OP if §1.5 returns 0: cleanup is a no-op.
- Component 3 NO-OP if §1.4 shows 0 signatures: rename is a no-op.

All 3 components no-op simultaneously is genuine NO-OP → NO `apply_migration` call. Document outcome in result file: "M8 Path A cutover no-op: cron 48 already rewritten, cleanup count = 0, function already absent."

Also NO-OP if §1.3 shows `active = false` already → HALT (§8.2.j); brief premise violated.

### 8.2 HALT paths

**8.2.a Cleanup count > 200:** §1.5 returns count outside [0, 200]:
1. NO `apply_migration` call.
2. NO D-01 fire.
3. Document and escalate to PK.

**8.2.b (RETIRED):** previously a generic disjointness HALT path.

**8.2.c Sequencing gate fail:** cc-0003 v2 OR cc-0004 result file missing OR shows incomplete:
1. NO `apply_migration` call. Wait for resolution.

**8.2.d (RETIRED).**

**8.2.e (RETIRED in Path A patch):** the original Path C draft's PK confirmation gate items 1 + 2 are resolved by Path A architecture itself. The §1.0 gate now reduces to sequencing; failure routes to §8.2.c. Retained as historical reference.

**8.2.f `m.post_draft.created_by` column absent:** §1.1 returns no `created_by` column:
1. NO `apply_migration` call.
2. Re-investigate criterion. Escalate to PK.

**8.2.g Live caller of `public.get_next_scheduled_for` outside cron 48:** §1.4 / P3.6 surfaces an active caller other than cron 48:
1. NO `apply_migration` call. Path A premise violated. The function rename in component 3 would break the caller. Escalate to PK with the caller list. Possible actions: retire/migrate the caller first, OR strip component 3 from this brief and apply only components 1 + 2.

**8.2.h Multiple overloaded signatures of `public.get_next_scheduled_for`:** §1.4 returns > 1 signature:
1. NO `apply_migration` call. Escalate to PK to decide which to rename.

**8.2.i cc-0003 v2 overlap > 0:** §1.5 cross-check returns non-zero overlap with cc-0003 v2 criterion:
1. NO `apply_migration` call. Re-investigate.

**8.2.j Cron 48 already inactive (NEW Path A):** §1.3 returns `active = false`:
1. NO `apply_migration` call. Path A premise is that cron 48 is currently active and providing autonomous enqueue. If already inactive, autonomous publishing is already broken; a different brief is needed (likely an emergency restoration brief).

**8.2.k Cron 48 command no longer contains queue INSERT (NEW Path A):** §1.3 returns command without `INSERT INTO m.post_publish_queue`:
1. NO `apply_migration` call. The cron 48 we expect is gone or radically changed. Escalate to PK to investigate.

### 8.3 ROLLBACK path (verification fails after apply)

If any of V1–V10 FAIL:

1. Immediately halt session continuation.
2. Apply rollback migration `m8_atomic_cutover_v1_rollback`. Single transaction reversing all 3 components in reverse order:

```sql
-- Rollback for m8_atomic_cutover_v1 (Path A)
-- Three reversals in single transaction. Order: 3 -> 2 -> 1 (reverse of apply).

-- Reverse component 3: rename function back
ALTER FUNCTION public.get_next_scheduled_for__deprecated_m8(<ARGS>)
  RENAME TO get_next_scheduled_for;

COMMENT ON FUNCTION public.get_next_scheduled_for(<ARGS>) IS NULL;
  -- (original function had no comment; restore that state)

-- Reverse component 2: restore cleanup queue rows
UPDATE m.post_publish_queue
SET status = <pre_status>,  -- per §1.6 captured snapshot, mapped queue_id -> pre_status
    dead_reason = NULL,
    updated_at = NOW()
WHERE queue_id IN (<captured queue_id list from §1.6>);

-- Reverse component 1 (Path A): restore cron 48 command body to OLD_CRON_48_COMMAND
DO $$
BEGIN
  PERFORM cron.alter_job(48, command := $cron_body_old$<OLD_CRON_48_COMMAND from §1.3>$cron_body_old$);
  RAISE NOTICE 'M8 Path A rollback component 1: cron 48 command restored to pre-apply body.';
END $$;
```

3. Re-run V1–V10 to confirm rollback restored pre-apply state. V1 post-rollback equals original `pre_dead_reason_count`. V2 post-rollback equals original §1.5 count. V7 post-rollback shows `active=true` (unchanged). V8 post-rollback shows `command` containing `get_next_scheduled_for` (restored). V10 post-rollback shows cron 48 in caller list.
4. Document: "M8 Path A cutover applied + rolled back. Pre-state restored. Failure mode: <verification ID + diagnosis>."
5. PK escalation; cc-0005 v2 with corrective measures.

### 8.4 Why not template the rollback fully

Same as cc-0003 v2 / cc-0004 §8.4: queue_id → pre_status mapping is known only at apply time. The brief specifies the mechanism; the apply session writes the literal SQL. **Path A addition: `OLD_CRON_48_COMMAND` is captured at §1.3 and used verbatim in the rollback's component 1 reversal.** The cron jobid (48) and function name (canonical) are pre-filled.

---

## 9. Stop condition

The cc-0005 apply session is COMPLETE when:

1. §1.0 sequencing gate passes: cc-0003 v2 + cc-0004 results both `Complete` or clean NO-OP.
2. §1 pre-flight all 9 P1 checks PASS (including §1.3 cron state + OLD_CRON_48_COMMAND capture, §1.4 caller check, §1.8 pre_dead_reason_count baseline, §1.9 sequencing).
3. §4 P0 + P1–P5 all PASS.
4. §5 D-01 fire returns clean agree + PK approval.
5. §6 apply procedure completes; `apply_migration` returns success (in-migration verify gates Component-1 + V10 pre-rename PASSED inside transaction).
6. §7 verification V1–V10 all PASS (V7 cron 48 active=true; V8 cron command rewrite complete; V9 autonomous enqueue path preserved; V10 zero callers post-rename).
7. Close-the-loop UPDATE on `m.chatgpt_review` (or carry as backlog).
8. Result file `docs/briefs/results/cc-0005-m8-atomic-cutover.md` created and committed.
9. **M7 closure documented in the 4-way sync** (per reconciliation §6 Q2; doc-only).
10. 4-way sync close: session file (`docs/runtime/sessions/{YYYY-MM-DD}-cc-0005-m8-cutover-applied.md`) + sync_state pointer index entry + action_list closure of M8 + M7 + memory `recent_updates`.

If any of §8.1, §8.2.a, §8.2.c, §8.2.f, §8.2.g, §8.2.h, §8.2.i, §8.2.j, §8.2.k, or §8.3 paths trigger: report outcome and stop.

---

## Success criteria (for this brief draft, NOT for the apply itself)

This cc-0005 brief (Path A patched) is correctly drafted when:

1. The brief file exists at `docs/briefs/cc-0005-m8-atomic-cutover.md`.
2. The apply procedure can be executed by chat (or any future executor) using only this brief + read-only DB access + Supabase MCP, without re-reading the queue integrity v3 brief or the reconciliation brief.
3. **Path A architecture is explicit:** cron 48 stays active; component 1 rewrites the command body in place; components 2 + 3 are conditional on in-migration verify gates.
4. SQL is locked to the version in §3, with the `<ARGS>` placeholder, the embedded `$cron_body$` block, and the `2026-05-XX` date placeholder. Apply-time amendment rules documented.
5. Verification queries (V1–V10) are runnable as-is post-amendment.
6. Rollback mechanism for all 3 components is concrete, including `OLD_CRON_48_COMMAND` restoration for Component 1.
7. Sequencing gates (cc-0003 v2 + cc-0004) are explicit and re-confirmed at apply procedure step 1.
8. M7 closure folding into the 4-way sync is documented in §9.
9. Forbidden actions explicitly prohibit setting `cron.alter_job(48, active := false)` and any cron/DDL changes outside the listed allowances.
10. No production state changed by drafting this brief (or this Path A patch).

---

## Notes

This is the fourth cc-NNNN brief in the brief-runner-v0 trial; third apply-class brief; first multi-component (3-way) atomic migration; first to require pre-condition gate at §1.0; first with cron edit + DDL permissions; **first with two in-migration verify gates enforcing conditional dependencies between components**.

### Brief-runner-v0 watch items specific to cc-0005 (Path A)

1. **Path A vs Path C cutover decision** — chat investigation 2026-05-09 established cron 48 is the SOLE autonomous inserter; Path C (disable) was not viable. Path A (rewrite in place) is the lowest-risk cutover. Documentation pattern: when a brief's premise is empirically falsified mid-cycle, patch the brief in place under PK direction with full investigation record + Path comparison + rationale.

2. **In-migration verify gates** — NEW pattern. cc-0003 v2 / cc-0004 had no in-migration verify gates (single-component bulk UPDATE). cc-0005 introduces two:
   - Component 1 verify gate (V7 + V8 + V9 in-migration): RAISE EXCEPTION if cron 48 not active OR command still references the deprecated function OR autonomous enqueue path not preserved.
   - V10 pre-rename gate: RAISE EXCEPTION if any caller of get_next_scheduled_for surfaces between Component 2 and Component 3.
   These enforce conditional dependencies via transaction rollback. Pattern is portable to any multi-component atomic migration.

3. **Atomic 3-step migration with embedded dollar-quoted command body** — Component 1 uses `$cron_body$...$cron_body$` to embed the rewritten cron command as a string literal inside a DO block. This is two levels of dollar-quoting (DO block uses `$$`; embedded command uses `$cron_body$`). PostgreSQL supports this safely.

4. **Cron edit permission (command rewrite, not active toggle)** — first cc-NNNN brief with this. Forbidden actions explicitly limit to cron 48 only AND explicitly forbid `active := false`. The `cron.alter_job` call uses the `command :=` keyword argument exclusively.

5. **DDL permission (function rename + comment)** — first cc-NNNN brief with this. Forbidden actions explicitly limit to ALTER FUNCTION RENAME + COMMENT on `public.get_next_scheduled_for` only.

6. **No prior count to inherit** — unchanged from original draft.

7. **10 verification queries** — expanded from cc-0003 v2 / cc-0004's 6, with V7-V10 covering Component 1 + V10 covering Component 3.

8. **Rollback complexity** — reversing 3 components is more complex; Path A rollback's Component 1 reversal uses `OLD_CRON_48_COMMAND` captured at §1.3, restoring the byte-exact pre-Path-A command body.

9. **M7 closure** — doc-only fold into the 4-way sync.

10. **§1.5 cross-check** — unique to cc-0005.

11. **Apply-time SQL amendment for `<ARGS>` and `2026-05-XX`** — documented in §3 and §6.

12. **Path A patch in same brief, not a new brief** — this Path A patch supersedes the original draft `6f16c40e` in place. The brief identifier (`cc-0005`) and migration name (`m8_atomic_cutover_v1`) are unchanged. Patch history at the top of this file documents the change. Brief-runner-v0 lesson candidate: when a brief's premise is invalidated by post-draft investigation, in-place patching is appropriate AS LONG AS the brief has not yet been applied. If applied, a new cc-NNNN brief would be needed for the corrective work.

### Patch history details (Path A patch, 2026-05-09)

Patches relative to original draft `6f16c40e`:

1. **Title** — added "Path A" qualifier; "cron 48 disable" replaced with "cron 48 in-place rewrite".
2. **Header block** — added `Patched:` line; `Status:` updated to mention Path A patch.
3. **NEW: Patch history section** — at top, summarising the Path A patch + original draft commit reference.
4. **NEW: Investigation record section** — at top, capturing chat investigation 2026-05-09 findings (sole inserter, fill_function behaviour, no-trigger surface, disable-stops-publishing) + Path A/B/C synthesis.
5. **§Task** — Component 1 rewritten from "disable" to "rewrite command body in place". Components 2 + 3 marked conditional on in-migration gates. Path A vs Path C contrast added.
6. **§Source context** — added Investigation record reference, added v2.56 cc-0004 close session reference, added cc-0004 result file reference.
7. **§Scope** — "Disabling cron 48" added to Out of scope. "Building a replacement enqueue path" added to Out of scope (Path A doesn't need one).
8. **§Allowed actions** — Component 1 action updated; explicit `command :=` keyword usage; `not active := false` clarification.
9. **§Forbidden actions** — added explicit prohibition on `active := false`; added Path A premise checks; updated cron 48 command body assumption note.
10. **§1.0 PK confirmation gate** — restructured from 4 items to 2 items (sequencing only); items 1 + 2 of original gate noted as resolved by Path A architecture; HALT path 8.2.e retired but retained as historical reference.
11. **§1.3** — added explicit `OLD_CRON_48_COMMAND` capture rule for §8.3 rollback; HALT paths 8.2.j (already inactive) + 8.2.k (no queue INSERT) added.
12. **§1.4** — V10 pre-flight check rationale added; HALT 8.2.g restated to apply to Path A.
13. **§1.5–§1.9** — unchanged structurally.
14. **§2** — clarified rationale to mention Path A retiring re-creation via the COALESCE filter.
15. **§3** — major rewrite of Component 1 SQL (from `active := false` DO block to dollar-quoted command rewrite DO block); added Component 1 verify gate DO block (V7+V8+V9 in-migration); added V10 pre-rename gate DO block before Component 3; Components 2 + 3 SQL otherwise unchanged. Notes section expanded.
16. **§4 P1–P5** — P0.1 simplified to sequencing-only; P1.3 updated for OLD_CRON_48_COMMAND; P1.4 V10 dependency note; P2.3 + P2.7 + P2.9 updated for Path A; P3.5 simulation rewrite; P3.6 V10 in-migration cross-reference; P4.1 + P4.5 updated; P5.7 + P5.8 updated; P5.9 + P5.10 added.
17. **§5 D-01 packet** — `proposal` rewritten for Path A (in-place rewrite, in-migration gates, no disable); `context.production_action_if_approved` updated; `context.consequence_if_delayed` softened (Path A is architectural cutover, not operational fix); `context.current_evidence` adds investigation record references; `context.known_weak_evidence` updates cron permission framing; `context.references` adds v2.56 cc-0004 close + cc-0004 result file.
18. **§6 Apply procedure** — step 2 updated for OLD_CRON_48_COMMAND + new caller check; step 3 updated for `<ARGS>` + `2026-05-XX` + `$cron_body$` block check; step 5 updated for 5+ RAISE NOTICE messages; step 6 updated for 10 V queries.
19. **§7 Verification queries** — V7 + V8 changed semantics; V9 + V10 added; original V8 (function rename) folded into V10 with V10b paranoia query.
20. **§8 Rollback / no-op / halt** — §8.1 NO-OP updated for component-by-component logic (Path A keeps cron 48 active); §8.2.e retired; §8.2.j + §8.2.k added; §8.3 rollback component 1 reversal uses OLD_CRON_48_COMMAND.
21. **§9 Stop condition** — V1–V10 all listed; §1.0 simplified; new HALT path references.
22. **§Notes** — Path A patch list added; brief-runner-v0 watch items expanded with in-migration gates + dollar-quoted embed pattern + Path A patch in-place pattern.

### Open dependencies for the apply session

Before cc-0005 (Path A) can apply, the following must hold:

- **cc-0003 v2 apply** complete (sequencing gate). **Confirmed Complete v2.55.**
- **cc-0004 apply** complete (sequencing gate). **Confirmed Complete v2.56.**
- **Pre-flight §1.4** confirms cron 48 is the only caller of `public.get_next_scheduled_for`. Path A premise; HALT (§8.2.g) if other live caller surfaces.
- **Pre-flight §1.3** confirms cron 48 is currently `active=true`. Path A premise; HALT (§8.2.j) if already inactive.
- D-01 fire passes clean.
- PK explicit approval phrase received.

When all hold: apply session can proceed.

---

*Brief authored 2026-05-09 Sydney by chat per brief-runner-v0 trial. Path A patched 2026-05-09 under PK direction. Inputs: cc-0003 v2 + cc-0004 brief shapes; reconciliation brief §2.8 + §6 Q2 (M7 closure) + §6 Q3 (M8 cleanup criterion); queue integrity v3 brief §6 cutover plan + §8 Migration 8 (original Path C); chat investigation 2026-05-09 (cron 48 sole inserter; fill_function no queue insert; no trigger surface). Output: full apply brief (3-component cutover SQL with two in-migration verify gates + P0 + P1–P5 + D-01 packet + 10 verification queries + 3-component rollback with OLD_CRON_48_COMMAND restoration + halt paths + stop condition incl. M7 closure). No production state changed by drafting or by this Path A patch. cc-0005 (Path A) apply is gated by §1.0 sequencing (already met) + §1.4 caller check + §1.3 cron state + D-01 + PK approval. Awaiting PK direction to schedule the apply session.*
