# Brief cc-0005 — M8 atomic cutover (cron 48 disable + legacy-origin future cleanup + `public.get_next_scheduled_for` deprecation)

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Executor:** chat (apply via Supabase MCP `apply_migration`) OR Claude Code per brief-runner-v0  
**Status:** issued (draft; pre-condition resolution required before apply — see §1.0 hard gate)  
**Result file:** `docs/briefs/results/cc-0005-m8-atomic-cutover.md` (created on completion)

---

## Task

Execute the M8 atomic cutover. Three coordinated components in a single transaction:

1. **Disable cron 48 (`enqueue-publish-queue-every-5m`)** — the legacy enqueue cron path. Disable via `cron.alter_job(48, active := false)`.
2. **Cleanup of legacy-origin future queue rows** — dead-letter all `m.post_publish_queue` rows where `pd.slot_id IS NULL AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW() AND q.status IN ('queued','failed')`. These are scheduled-future legacy rows that the publisher would otherwise execute against the deprecated enqueue path.
3. **Deprecate `public.get_next_scheduled_for`** — the wall-clock-fallback function (Bug 3 source). Rename to `public.get_next_scheduled_for__deprecated_m8` AND add `COMMENT ON FUNCTION` annotating the deprecation. Function definition retained for audit; calls fail with "function does not exist" post-rename.

Apply via Supabase MCP `apply_migration` as migration `m8_atomic_cutover_v1`. Single atomic transaction — either all 3 components succeed or all 3 roll back. M7 closure (documentation-only per reconciliation §6 Q2) folds into the cc-0005 4-way sync close commits, NOT into the migration itself.

**Expected scope at draft time:** UNKNOWN. The cleanup component's row count cannot be inferred from prior briefs (cc-0003 v2 covered Bug 3 fingerprint cohort; cc-0004 covered v4 mismatch cohort; M8 cleanup is a different criterion). Apply session must establish the count via §1.5 read-only SELECT and halt if outside the [TBD—see §1.5 decision rule].

**Sequencing constraint:** cc-0005 apply must NOT proceed until BOTH cc-0003 v2 AND cc-0004 complete successfully OR resolve to clean NO-OPs. Plus a hard pre-condition gate at §1.0.

---

## Source context

- `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 §2 (Defect 1–6), §6 (cutover plan), §8 Migration 8 — canonical defect description and cutover intent.
- `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §2.8 (M8 cleanup scope) + §6 Q2 (M7 closure folds into M8 4-way sync) + §6 Q3 (M8 cleanup criterion rewrite — `pd.is_shadow` no longer exists post-M5).
- `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md` (v2 patched, blob `3e585738…`) — pattern source for pre-flight + P1–P5 + D-01 packet shape.
- `docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` (post 2026-05-09 patch, blob `7d38ba6c…`) — pattern source for multi-table criterion + sequencing gate + slot-side P2.7 reasoning.
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` — cc-0003 v1 HALT result (illustrative for the HALT-then-correction loop pattern).
- `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` + `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` — M4/M5 state captures; M5 explicit "slot-driven v4 architecture fully deployed (Phase A complete, Gate A passed)".
- `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` §10.2 precedence rule 1 — view auto-reclassifies dead rows correctly post-apply.
- `docs/00_action_list.md` v2.54 — carry-forward classification of M8 cutover as P3.

**`dead_reason` canonical value:** `m8_cutover_legacy_path_deprecated`. Distinguishes from cc-0003 v2 (`anomalous_scheduled_for_bug3_fallback`) and cc-0004 (`anomalous_pre_m4_v4_mismatch`). The M8 cleanup is not an anomaly retirement — it is an INTENTIONAL retirement of legacy-origin futures because the enqueue path itself is being deprecated. Naming reflects intent, not pathology. PK can override via patch.

## Scope

**In scope:**
- Pre-flight verification (read-only SELECTs against `information_schema`, `pg_trigger`, `pg_proc`, `cron.job`, `cron.job_run_details`, target tables + JOINs)
- One D-01 fire (`ask_chatgpt_review`) with packet specified in §5
- Single Supabase MCP `apply_migration` call with the exact SQL in §3 (atomic 3-step migration)
- 8 post-apply verification queries from §7
- Rollback within session if any verification fails (per §8); rollback reverses ALL 3 components
- Close-the-loop UPDATE to `m.chatgpt_review` (per standing protocol)
- 4-way sync at session close (session file + sync_state pointer + action_list bump + memory)
- M7 closure documented in the 4-way sync (doc-only; per reconciliation §6 Q2)

**Out of scope:**
- M-09-03 view DDL — Phase 0 work, separate cycle
- Any change to cron jobs other than 48
- Any DDL beyond `ALTER FUNCTION ... RENAME` and `COMMENT ON FUNCTION` on `public.get_next_scheduled_for`
- Any change to `m.post_draft` rows (read-only JOIN for criterion derivation)
- Any change to `m.slot` rows (read-only JOIN; slots remain valid post-cutover regardless of legacy queue retirement)
- Any change to `c.client_publish_profile`, `c.client_publish_schedule`, taxonomy, or any `t.*`, `c.*`, `f.*`, `a.*`, `k.*` schema
- Touching `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER hold)
- Modifying `m.ef_drift_log`
- EF deploys, dashboard/portal/web work
- Building / verifying the post-cutover enqueue path itself (must be verified by PK at §1.0 BEFORE this brief executes; not part of this brief's apply scope)

## Allowed actions

- Read source files referenced in §Source context.
- Read-only `SELECT` against the database for pre-flight P1–P5 + post-apply verification, including JOINs across `m.post_publish_queue`, `m.post_draft`, `pg_proc`, `pg_views`, `pg_trigger`, `cron.job`, `cron.job_run_details`, `information_schema.columns`.
- One `ask_chatgpt_review` D-01 fire per the packet in §5.
- One `apply_migration` call with the exact SQL in §3 (after PK explicit approval based on D-01 result, AND after §1.0 + sequencing gates pass). The migration touches:
  - `cron.alter_job(48, active := false)` — cron edit on jobid 48 only
  - `UPDATE m.post_publish_queue SET status='dead', dead_reason='m8_cutover_legacy_path_deprecated', updated_at = NOW() WHERE queue_id IN (...)` — bulk UPDATE on cleanup-criterion-matching rows
  - `ALTER FUNCTION public.get_next_scheduled_for(...) RENAME TO get_next_scheduled_for__deprecated_m8` — single function rename
  - `COMMENT ON FUNCTION public.get_next_scheduled_for__deprecated_m8(...) IS '@deprecated M8 cutover 2026-05-XX...'` — single comment
- Up to 3 retries on the post-apply verification queries (network/timeout reasons only).
- One rollback migration per §8 if any verification fails (rollback reverses all 3 components).
- One close-the-loop UPDATE to `m.chatgpt_review` after success.
- One commit creating `docs/briefs/results/cc-0005-m8-atomic-cutover.md`.
- 4-way sync close commits (session file + sync_state + action_list + memory edit) at session end.

## Forbidden actions

- No second `apply_migration` call beyond the one in §3 (and a rollback if verification fails).
- No modifications to the SQL in §3 except (a) to add or remove `updated_at = NOW()` per P1.1 outcome on `m.post_publish_queue`, and (b) to adjust the function-rename argument signature based on the actual function definition surfaced at P1.4. Both amendments are documented in the D-01 packet (§5) before fire.
- No cron edits to ANY cron job other than jobid 48. §2/§3 explicitly target jobid 48; any other cron change is out of scope.
- No DDL beyond `ALTER FUNCTION ... RENAME` and `COMMENT ON FUNCTION` on `public.get_next_scheduled_for`. No `DROP FUNCTION`. No table DDL. No index DDL. No new functions.
- No changes to `m.post_draft` rows (drafts remain in their current state). No changes to `m.slot` rows.
- No changes to any other table.
- No D-01 fire beyond the one in §5.
- No deletes. Cleanup is UPDATE only. Function deprecation is rename, not drop.
- No `apply_migration` if §1.0 PK confirmation gate fails. **Hard halt; the brief does not execute speculatively.**
- No `apply_migration` if cc-0003 v2 OR cc-0004 result file is missing or shows incomplete status. Both must be `Complete` (or clean NO-OP).
- No `apply_migration` if the read-only pre-flight cleanup count returns 0 with no other component required (NO-OP path §8.1) OR returns outside the [0, 200] range (HALT path §8.2.a). Range bounds are deliberately wide because no prior count is inheritable.
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`. Escalation to PK per standing protocol.
- No assumption that `pd.created_by = 'seed_and_enqueue'` is the correct legacy-origin filter — §1.1 + §1.5 verify column existence and value distribution.
- No assumption that `pre_dead_reason_count` for `m8_cutover_legacy_path_deprecated` is 0. Always read it from §1.8.
- No assumption that `public.get_next_scheduled_for` is uniquely defined by name. §1.4 surfaces all overloaded signatures; the rename SQL targets the EXACT signature confirmed at apply time.
- No assumption that disabling cron 48 is safe in isolation. §1.0 PK confirmation MUST establish that an alternate enqueue path exists for slot-driven v4 drafts post-cutover. **If no alternate path is confirmed, the brief HALTs at §1.0 — cc-0005 cannot execute and a separate investigation brief is needed.**
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it.
- No Phase 0 scheduling.
- No invocation of `m.fill_pending_slots` or any other v4 EF/function from within this brief's apply session.

---

## 1. Pre-flight verification (read-only, runs at apply session start)

### 1.0 PK confirmation gate (HARD GATE; runs before §1.1)

**Pre-condition:** before any other pre-flight query, the apply session MUST confirm with PK directly (in chat, via session interaction) that the following are TRUE:

1. **Post-cutover enqueue path is established and verified.** Disabling cron 48 means slot-driven v4 drafts must be enqueued by an alternate path. Candidates known to chat at draft time (NOT verified):
   - (a) An EF or scheduled function that picks up new drafts and inserts queue rows directly
   - (b) A trigger on `m.post_draft` INSERT/UPDATE that creates the queue row inline
   - (c) `m.fill_pending_slots` extended to insert queue rows alongside draft rows (single-step path)
   - (d) Some other path PK is aware of
   
   PK must explicitly confirm WHICH path takes over post-cutover, AND that this path is currently active or will be activated as part of the M8 apply session. If no such path exists, M8 cannot be applied without first building it — a separate brief.

2. **`public.get_next_scheduled_for` has no live callers outside cron 48.** §1.4 will enumerate; PK confirms reading that list that no caller will be broken by the rename. (The RENAME path keeps the function body intact under the new name, so any active caller would still resolve via direct OID reference but not by name. This is technically reversible but operationally messy; PK explicit confirmation required.)

3. **cc-0003 v2 result file shows status=Complete or NO-OP.** §1.9 verifies; PK confirms acknowledgement.

4. **cc-0004 result file shows status=Complete or NO-OP.** §1.9 verifies; PK confirms acknowledgement.

**Decision rule:**
- If PK confirms ALL 4 → proceed to §1.1.
- If PK cannot confirm ANY of (1)–(4) → HALT (§8.2.e). The brief stays issued. A separate investigation or build brief is needed before cc-0005 can execute.
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

**Expected:** `m.post_publish_queue.{queue_id, status, dead_reason, scheduled_for, post_draft_id}` + `m.post_draft.{post_draft_id, slot_id, created_by}` confirmed present. **Critical for cc-0005:** the `m.post_draft.created_by` column MUST exist. If it does not, HALT (§8.2.f) and re-investigate criterion. `m.post_publish_queue.updated_at` presence is informative-only — if absent, the SQL in §3 omits it from the SET clause for the cleanup component.

### 1.2 Confirm trigger surface on `m.post_publish_queue`

```sql
SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS triggerdef
FROM pg_trigger
WHERE tgrelid = 'm.post_publish_queue'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

**Decision rule:** same as cc-0003 v2 / cc-0004. HALT if any trigger fires on UPDATE of `status` AND has external side-effects. cc-0003 v1 HALT and cc-0004 (per pre-flight reasoning) both expect 3 non-internal triggers, all PASS.

### 1.3 Cron 48 current state and history

```sql
SELECT jobid, jobname, schedule, command, active, database, username
FROM cron.job
WHERE jobid = 48;
```

**Expected:** `jobid=48`, `jobname='enqueue-publish-queue-every-5m'`, `active=true`, command body references `m.post_publish_queue` INSERT (likely calling `public.get_next_scheduled_for` for legacy fallback OR the slot-aware coalesce introduced by M4).

**Capture:** the FULL `command` text. The command contains the exact SQL cron 48 runs every 5 minutes — this is the audit trail of what cron 48 does, and it must be preserved in the result file.

Then check the last 10 executions for context:

```sql
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = 48
ORDER BY start_time DESC
LIMIT 10;
```

**Decision rule:** if `active = false` already → cron 48 is already disabled; component 1 of the migration is a no-op (idempotent); proceed. If recent runs show `status != 'succeeded'` for > 50% of last 10 — capture for D-01 packet (informational; cron is already failing, the disable is more rescue than cutover).

### 1.4 Identify all callers of `public.get_next_scheduled_for`

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
- Expected callers: cron 48 (only). If other callers surface, capture the list for the D-01 packet AND escalate to §1.0 (PK confirmation) for explicit acknowledgement.
- If a non-cron-48 caller is a deployed EF that runs in production → HALT (§8.2.g). The function rename will break that caller. Function deprecation must be deferred until the caller is retired or migrated.
- If a non-cron-48 caller is a stored function/view that is itself dead code (not called by any active path) → capture for D-01 packet; not a halt.

**Surface the EXACT signature of `public.get_next_scheduled_for`:**

```sql
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_next_scheduled_for';
```

**Decision rule:** if 0 rows → function already absent; component 3 of the migration is a no-op. If 1 row → capture the `args` value for the rename SQL (must be byte-exact in the `ALTER FUNCTION` statement). If > 1 rows → multiple overloaded signatures; HALT (§8.2.h) and escalate to PK for explicit decision on which to rename.

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
- If `m8_cleanup_count = 0` → cleanup component is a no-op (still proceed if other components required; see §8.1 for nuanced no-op handling).
- If `m8_cleanup_count` outside [0, 200] → HALT (§8.2.a). 200 is a deliberately high upper bound; legacy-origin futures should be a small finite set bounded by drainage. If higher, something is wrong (cron 48 still actively producing? source path not closed?).
- If `m8_cleanup_count` inside [0, 200] → proceed to §1.6.

**No prior count to inherit:** unlike cc-0003 v2 (9, derived from cc-0003 v1 HALT §1.4) and cc-0004 (43, from reconciliation §2.7), no prior brief has counted the M8 cleanup criterion. Today's count is unknown to chat. The wide [0, 200] range reflects this.

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
  AND pd.created_by = 'seed_and_enqueue'  -- M8 created_by filter
  AND q.scheduled_for > NOW();             -- M8 future filter
```

**Decision rule:**
- `overlap_with_cc_0003_v2_criterion = 0` expected post cc-0003 v2 completion (cc-0003 v2's matching rows are now `status='dead'`, excluded by M8's `status IN ('queued','failed')` filter). **HALT** (§8.2.i) if non-zero — indicates cc-0003 v2 did not run or did not capture the expected rows.
- `overlap_with_cc_0004_criterion = 0` BY CONSTRUCTION (M8 requires `pd.slot_id IS NULL`; cc-0004 requires `IS NOT NULL`). HALT if non-zero — schema or criterion anomaly.

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

**Purpose:** target snapshot for V5 paranoia + rollback reconstruction. Persist the queue_id list to chat context (or scratch file `/tmp/cc-0005-targets-{date}.csv`). Every row's `pd.slot_id` MUST be NULL and `pd.created_by` MUST be `'seed_and_enqueue'` by criterion.

### 1.7 Capture pre-state aggregates for V3/V4 verification

```sql
SELECT status, COUNT(*) AS row_count
FROM m.post_publish_queue
GROUP BY status
ORDER BY status;
```

**Purpose:** baseline for V3 (queued+failed should decrease by exactly N) and V4 (dead should increase by exactly N) post-apply.

### 1.8 Capture pre-existing `dead_reason` baseline

```sql
SELECT COUNT(*) AS pre_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'm8_cutover_legacy_path_deprecated';
```

**Purpose:** baseline for V1. Captures any rows that already carry the target `dead_reason` value before this migration runs. The apply session MUST persist this number in chat context and use it in V1's pass condition.

**Why this is required:** any prior session, manual operator UPDATE, or test migration could have set this value independently. Function-definition string searches (§4 P3.2) only verify that no production CODE writes this value — they say nothing about whether existing TABLE ROWS already carry it. Treat the table state as ground truth; never assume `pre_dead_reason_count = 0`.

**Expected:** likely 0 (this is the first migration to use `m8_cutover_legacy_path_deprecated`). Document any non-zero value in the result file §6.

### 1.9 Sequencing gate: verify cc-0003 v2 + cc-0004 completion

**Read both result files (read-only via Invegent GitHub MCP):**
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` — confirm §1 status indicates cc-0003 v2 completion (or clean NO-OP). cc-0003 v1 HALT alone does NOT satisfy the gate (cc-0004 §8.2.c precedent).
- `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` — confirm §1 status indicates cc-0004 completion (or clean NO-OP).

**Decision rule:**
- Both `Complete` or `NO-OP` → proceed.
- Either `Partial` / `Blocked` / missing → HALT (§8.2.c, sequencing gate fail). cc-0005 stays issued; await resolution.

**Cross-check on the database:** confirm that the cc-0003 v2 + cc-0004 dead_reason populations are present and stable:

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

**Decision rule:** both dead_reasons should have row_count > 0 (or = 0 if their respective NO-OP paths fired). Capture for D-01 packet. No HALT condition; informational — the result file checks above are authoritative.

---

## 2. Selection criterion (cleanup component, locked)

```sql
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW()
```

With JOIN: `FROM m.post_publish_queue q JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id`.

**Rationale:** captures legacy-origin (no slot) drafts created by the legacy enqueue path (`seed_and_enqueue`) that are currently scheduled for a future publish. These rows would be processed by the publisher otherwise; cutting over from cron 48 means retiring them deliberately rather than letting the publisher attempt them against a deprecated path.

**Excluded by criterion:**
- Slot-driven rows (`pd.slot_id IS NOT NULL`): not legacy-origin. cc-0004 scope.
- Legacy-origin rows with `pd.created_by != 'seed_and_enqueue'`: legacy origin but NOT from the enqueue path being deprecated. Out of M8 scope; surface as a separate finding if any exist.
- Legacy-origin rows with `q.scheduled_for <= NOW()`: in the past. cc-0003 v2 covers Bug 3 fingerprint subset of past legacy rows; the rest (past legacy rows that are not Bug 3 fingerprint) remain in queue and would be subject to a separate cleanup brief if needed (cc-0006 hypothetical).
- Dead or published rows: not in active queue.

**Disjointness vs cc-0003 v2 and cc-0004:**
- vs cc-0003 v2: structural disjointness on `q.scheduled_for` time window. cc-0003 v2 dead-letters past rows; M8 cleanup retires future rows. After cc-0003 v2 runs, its dead_reason is set; M8's `status IN ('queued','failed')` excludes dead rows.
- vs cc-0004: structural disjointness on `pd.slot_id` (M8 = `IS NULL`; cc-0004 = `IS NOT NULL`). Mutually exclusive WHERE clauses.

**Why `pd.created_by = 'seed_and_enqueue'` not just `pd.slot_id IS NULL`:** the broader criterion would also retire legacy-origin rows created by paths other than the enqueue cron (e.g. manual operator inserts, promotional posts created via a different path). The `created_by` filter narrows to the SPECIFIC path being deprecated.

**Pre-flight verifies:**
- Column `pd.created_by` exists (§1.1)
- Value `'seed_and_enqueue'` is the canonical legacy-enqueue stamp (§1.5 cross-check by examining the value distribution)

---

## 3. Proposed SQL (locked, with apply-time amendment notes)

Applied via Supabase MCP `apply_migration` with:
- **Migration name:** `m8_atomic_cutover_v1`
- **Project ID:** `mbkmaxqhsohbtwsqolns`

```sql
-- M8 atomic cutover
-- See: docs/briefs/cc-0005-m8-atomic-cutover.md (this brief)
-- See: docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.8
-- See: docs/briefs/2026-05-05-queue-integrity-incident.md §6 (cutover plan) + §8 Migration 8
--
-- Three coordinated components in a single transaction:
--   1. Disable cron 48 (legacy enqueue path)
--   2. Cleanup legacy-origin future queue rows
--   3. Deprecate public.get_next_scheduled_for via rename + comment
--
-- All 3 atomic: either all succeed or all roll back. M7 closure folds into
-- the 4-way sync close commits, NOT into this migration.

-- =========================================================================
-- COMPONENT 1: Disable cron 48 (idempotent if already inactive)
-- =========================================================================

DO $$
DECLARE
  v_cron_active boolean;
BEGIN
  SELECT active INTO v_cron_active FROM cron.job WHERE jobid = 48;

  IF v_cron_active IS NULL THEN
    RAISE EXCEPTION 'M8 cutover HALT: cron jobid 48 not found. Re-investigate cron state.';
  END IF;

  IF v_cron_active = true THEN
    PERFORM cron.alter_job(48, active := false);
    RAISE NOTICE 'M8 cutover component 1: cron 48 disabled at %', NOW();
  ELSE
    RAISE NOTICE 'M8 cutover component 1: cron 48 already inactive; no-op.';
  END IF;
END $$;

-- =========================================================================
-- COMPONENT 2: Cleanup legacy-origin future queue rows
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
  RAISE NOTICE 'M8 cutover component 2: % rows match cleanup criterion. Proceeding with UPDATE.', v_count;
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
-- COMPONENT 3: Deprecate public.get_next_scheduled_for
-- =========================================================================
--
-- Apply-time amendment rule: the argument signature `<ARGS>` MUST be
-- replaced with the actual signature surfaced at §1.4 before D-01 fire.
-- Candidate signatures based on prior briefs:
--   - get_next_scheduled_for(timestamptz, text)
--   - get_next_scheduled_for(uuid, text, timestamptz)
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
    RAISE NOTICE 'M8 cutover component 3: function public.get_next_scheduled_for already absent; no-op.';
  ELSIF v_func_count > 1 THEN
    RAISE EXCEPTION 'M8 cutover HALT: % overloaded signatures of public.get_next_scheduled_for. Brief expected exactly 1. Halt for re-investigation.', v_func_count;
  ELSE
    RAISE NOTICE 'M8 cutover component 3: renaming public.get_next_scheduled_for -> get_next_scheduled_for__deprecated_m8.';
  END IF;
END $$;

ALTER FUNCTION public.get_next_scheduled_for(<ARGS>)
  RENAME TO get_next_scheduled_for__deprecated_m8;

COMMENT ON FUNCTION public.get_next_scheduled_for__deprecated_m8(<ARGS>) IS
  '@deprecated M8 cutover 2026-05-XX. Original name: public.get_next_scheduled_for. '
  'Replaced by slot-aware enqueue path. Function body retained for audit; do not call. '
  'See docs/briefs/cc-0005-m8-atomic-cutover.md for cutover context.';
```

**Notes on the SQL:**

1. **Atomicity:** `apply_migration` runs the entire migration in a single transaction. If ANY of the 3 components raises (or the UPDATE fails, or the ALTER FUNCTION fails), the whole transaction rolls back. No partial state.
2. **Idempotency:** all 3 components are individually idempotent (cron already inactive → no-op; cleanup already 0 rows → no-op; function already renamed → no-op via the count guard). Safe to re-attempt the whole migration.
3. **Apply-time amendment for `<ARGS>`:** the function signature MUST be filled in based on §1.4's `pg_get_function_identity_arguments` result before D-01 fire. Document the amendment in the D-01 packet (§5.2 `sql_to_apply` field).
4. **`updated_at = NOW()` for the cleanup UPDATE:** included unconditionally, matching cc-0003 v2 / cc-0004 patterns. §1.1 verifies the column exists; if absent (highly unlikely), apply session removes it from SET clause before D-01 fire.
5. **`WHERE queue_id IN (...)` subquery form** for the cleanup UPDATE — same shape as cc-0003 v2 / cc-0004. Self-validates against the same criterion the DO block checked.
6. **`dead_reason='m8_cutover_legacy_path_deprecated'`** — distinguishes from cc-0003 v2 + cc-0004 dead_reasons. Reflects intentional retirement, not anomaly. PK can override via patch before apply.
7. **`COMMENT ON FUNCTION ... IS '@deprecated ...'`** — Postgres doesn't have native deprecation; the COMMENT serves as the deprecation marker. The `<ARGS>` in the COMMENT must match the post-rename signature.
8. **No `DROP FUNCTION`:** rename + comment retains the function body for audit. Drop is more destructive and harder to reverse. PK can request a follow-up cc-0006 to DROP if desired.

---

## 4. P1–P5 pre-flight checklist (per Lesson #61)

Apply session walks each step, captures evidence, refuses to proceed past any FAIL.

### P0 — Pre-condition gate (NEW vs cc-0003/cc-0004)

- [ ] **P0.1** §1.0 PK confirmation gate — establish all 4 confirmation items. HALT (§8.2.e) if any fails.

### P1 — Pre-state capture

- [ ] **P1.1** Run §1.1 information_schema check; confirm `m.post_draft.created_by` column present. HALT (§8.2.f) if absent.
- [ ] **P1.2** Run §1.2 pg_trigger check (same as cc-0003 v2 / cc-0004; expected 3 triggers, all PASS).
- [ ] **P1.3** Run §1.3 cron 48 state check; capture full command text and last 10 run details.
- [ ] **P1.4** Run §1.4 callers + signature check; confirm exactly 1 signature for `public.get_next_scheduled_for`; capture `pg_get_function_identity_arguments` value for SQL amendment.
- [ ] **P1.5** Run §1.5 cleanup count check + cross-check vs cc-0003 v2 / cc-0004 criteria. HALT (§8.2.a) if count > 200; HALT (§8.2.i) if cc-0003 v2 overlap > 0.
- [ ] **P1.6** Run §1.6 cleanup snapshot; persist queue_id list.
- [ ] **P1.7** Run §1.7 pre-state aggregates baseline.
- [ ] **P1.8** Run §1.8 pre_dead_reason_count baseline; persist value for V1 pass condition.
- [ ] **P1.9** Run §1.9 sequencing gate: read cc-0003 v2 + cc-0004 result files via Invegent GitHub MCP; cross-check dead_reason populations on the database.

**Pass criterion:** P0.1 + all 9 P1 checks PASS.

### P2 — Side-effect surface

- [ ] **P2.1** `m.publisher_lock_queue_v2` — publisher's row-locking function. Reads `WHERE status='queued'`. Post-apply: cleanup count fewer rows eligible. **Side-effect:** affected (client_id, platform) partitions have less queue depth for future-scheduled rows. **Magnitude:** depends on cleanup count; capture for D-01.
- [ ] **P2.2** `m.cleanup_queue_on_publish_v1` trigger — fires on `m.post_publish` INSERT. Not affected by cleanup UPDATE. Not affected by cron 48 disable directly; affected indirectly because no new INSERTs from cron 48 means fewer trigger fires (but those would have been on `m.post_publish` INSERT anyway, not on cron 48 INSERT to queue).
- [ ] **P2.3** `enqueue-publish-queue-every-5m` cron jobid 48 — **THE TARGET of component 1.** Post-apply: inactive. Verify in V7. Side-effect: no new queue rows from this cron. Slot-driven enqueue takes over via the path confirmed at P0.1.
- [ ] **P2.4** Dashboard / portal queries — if any UI surface reads cron status: cron 48 will show `active=false`. If any UI surface reads `m.post_publish_queue`: counts of "queued" decrease by cleanup count; counts of "dead" increase by cleanup count. Cosmetic.
- [ ] **P2.5** `m.vw_pipeline_state` — not yet built. Per §10.2 precedence rule 1, post-apply rows correctly classify as `dead`. No impact on view design.
- [ ] **P2.6** Health-check Cowork sweep — the 02:00 AEST `docs/audit/health/{date}.md` may surface cron 48 as inactive AND lower future-queued count. Cosmetic; expected.
- [ ] **P2.7** `m.fill_pending_slots` — v4 draft-generation function. Per cc-0004 P2.7, may re-create drafts for retired slots. **Critical for cc-0005:** if fill_pending_slots re-creates drafts post-cleanup, those drafts need to be enqueued by the post-cutover path (P0.1) since cron 48 is now disabled. Capture for D-01.
- [ ] **P2.8** Callers of `public.get_next_scheduled_for` (per §1.4) — the rename breaks any caller resolving by name. Confirmed at P0.1 that cron 48 is the only live caller; cron 48 is disabled in component 1 BEFORE component 3 attempts the rename, so cron 48 cannot fire and call the renamed function. **Atomicity matters here:** within the transaction, components run in order 1→2→3. Even if cron 48 is scheduled to fire mid-transaction, the transaction holds locks and cron 48 sees the disable on commit.

**Pass criterion:** P2.1–P2.8 reviewed; no unaccounted-for side effect.

### P3 — Transitive dependency map

- [ ] **P3.1** Search for any function/view/trigger referencing `m.post_publish_queue.dead_reason` (same as cc-0003 v2 / cc-0004 P3.1).
- [ ] **P3.2** Code-collision check: search for the literal string `'m8_cutover_legacy_path_deprecated'`:
  ```sql
  SELECT n.nspname AS schema_name, p.proname AS function_name
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND pg_get_functiondef(p.oid) ILIKE '%m8_cutover_legacy_path_deprecated%';
  ```
  Same scope/non-scope distinction as cc-0003 v2 / cc-0004 P3.2: code-collision check, NOT a guarantee about row state.
- [ ] **P3.3** Verify `m.post_draft` rows associated with the cleanup queue rows have valid `approval_status`. (Same shape as cc-0004 P3.3, with M8 criterion.)
- [ ] **P3.4** Confirm no Cowork brief / scheduled task references `m.post_publish_queue` rows or cron 48 by ID.
- [ ] **P3.5** Forward-look on the v4 enqueue path (post-cutover): verify per P0.1 that the alternate enqueue path can handle the load that cron 48 was carrying. Capture latency / throughput expectations for D-01.
- [ ] **P3.6** Search for any function/view that calls `public.get_next_scheduled_for` by name AND is currently active in production (cron-scheduled, EF-deployed, or trigger-fired). If found AND not equal to cron 48 → HALT (§8.2.g).

**Pass criterion:** P3.1–P3.6 reviewed; transitive readers safe.

### P4 — Reversibility

- [ ] **P4.1** Rollback SQL drafted (§8.3) for all 3 components: re-enable cron 48, restore queue_id list to pre_status, rename function back.
- [ ] **P4.2** Acknowledge irreversible side-effects: NONE. cron 48 disable doesn't cause data loss (no events would be published in the rollback window since the migration is single-transaction). The cleanup UPDATE has no irreversible downstream consequences. The function rename is reversible.
- [ ] **P4.3** Time-window for rollback: indefinite for cleanup component; bounded for cron 48 (re-enabling resumes 5-min insertion cycle); bounded for function rename (must rename back before any new caller assumes deprecated state).
- [ ] **P4.4** Confirm rollback would not collide with newer rows: rollback uses captured queue_id list (§1.6), cron jobid (48), and function name (canonical); none of these change post-apply.
- [ ] **P4.5** Rollback creates an inconsistent state if only PARTIALLY applied: if only component 1 + 2 rolled back but component 3 not rolled back, cron 48 is active but `get_next_scheduled_for` is renamed — cron 48 calls fail. **Mitigation:** rollback MUST reverse all 3 components atomically in one rollback migration. The rollback SQL is structured as a single transaction matching the apply structure.

**Pass criterion:** P4.1–P4.5 PASS.

### P5 — Post-state verification preconditions

- [ ] **P5.1** V1: count of rows with `dead_reason='m8_cutover_legacy_path_deprecated'` post-apply equals `pre_dead_reason_count + N` (§1.8 + §1.5 cleanup count). **Do not assume `pre_dead_reason_count = 0`.**
- [ ] **P5.2** V2: count of rows matching the M8 cleanup criterion in `status IN ('queued','failed')` becomes 0.
- [ ] **P5.3** V3: total queued+failed count decreases by exactly N.
- [ ] **P5.4** V4: total dead count increases by exactly N.
- [ ] **P5.5** V5 paranoia: only the captured rows changed.
- [ ] **P5.6** V6: per-status aggregates coherent.
- [ ] **P5.7** V7 (NEW vs cc-0003/cc-0004): cron 48 status is `active=false`.
- [ ] **P5.8** V8 (NEW vs cc-0003/cc-0004): function rename complete — `public.get_next_scheduled_for` does NOT exist; `public.get_next_scheduled_for__deprecated_m8` DOES exist; deprecation comment present.

**Pass criterion:** all 8 verification queries written and ready (§7).

---

## 5. D-01 packet content (NOT YET FIRED)

### 5.1 `proposal` (prose)

```
Apply M8 atomic cutover: 3 coordinated components in a single transaction.

Migration name: m8_atomic_cutover_v1
Project: mbkmaxqhsohbtwsqolns
Method: Supabase MCP apply_migration (single atomic transaction)

COMPONENT 1 — Disable cron 48 (enqueue-publish-queue-every-5m):
  PERFORM cron.alter_job(48, active := false);

COMPONENT 2 — Cleanup legacy-origin future queue rows:
  Scope: rows matching `q.status IN ('queued','failed') AND pd.slot_id IS NULL
         AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW()`
  Expected count at apply time: <N> (read-only verified <DATETIME>; halts if outside [0,200])
  UPDATE: SET status='dead', dead_reason='m8_cutover_legacy_path_deprecated', updated_at=NOW()

COMPONENT 3 — Deprecate public.get_next_scheduled_for:
  ALTER FUNCTION public.get_next_scheduled_for(<ARGS>) RENAME TO get_next_scheduled_for__deprecated_m8
  + COMMENT ON FUNCTION ... IS '@deprecated M8 cutover ...'

No other tables touched. No other DDL. No other cron edits. No EF deploys.
M7 closure folds into 4-way sync close commits, NOT into this migration.

SEQUENCING:
  - cc-0003 v2 must complete first.
  - cc-0004 must complete first.
  - PK confirmation gate §1.0 must pass: post-cutover enqueue path verified;
    no live callers of get_next_scheduled_for outside cron 48; both prior
    briefs complete.

WHY: M3-M5 closed the source paths and backfilled corrupted data. cc-0003 v2 +
cc-0004 dead-lettered the residual anomalous rows. M8 retires the legacy enqueue
path itself: cron 48 disabled, future legacy-origin rows retired, deprecated
fallback function renamed. Post-M8, slot-driven v4 enqueue is the canonical
path; legacy enqueue is fully deprecated.

ROLLBACK: single rollback migration reverses all 3 components atomically:
re-enable cron 48, restore queue_id list to pre_status, rename function back.

VERIFICATION: 8 post-apply queries (V1-V8). V1 uses pre_dead_reason_count
baseline from §1.8.
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply M8 atomic cutover: cron 48 disable + legacy-origin future cleanup + public.get_next_scheduled_for deprecation",
  "production_action_if_approved": "Single Supabase MCP apply_migration call. Three components in one transaction: (1) cron.alter_job(48, active:=false), (2) UPDATE m.post_publish_queue cleanup rows to dead/m8_cutover_legacy_path_deprecated, (3) ALTER FUNCTION public.get_next_scheduled_for RENAME + COMMENT.",
  "consequence_if_delayed": "Moderate operational benefit if delayed because legacy-origin futures continue to be processed by the publisher against a deprecated path, and cron 48 keeps inserting more such rows. The pipeline is functionally correct in the M3-M5 + cc-0003 v2 + cc-0004 state, but the architectural cutover to v4-only enqueue is incomplete. Each day of delay extends the legacy/v4 dual-stack period.",
  "cost_of_waiting": "Low-to-moderate. Legacy enqueue rows continue to be created at the cron 48 cadence (every 5 min, but only for legacy-origin drafts — slot-driven drafts also flow through cron 48 post-M4 with correct scheduling). Pipeline-integrity benefit (single canonical enqueue path) is the residual reason to apply rather than wait. If the post-cutover enqueue path is uncertain, waiting is the right call — the §1.0 PK confirmation gate is non-negotiable.",
  "current_evidence": [
    "Pre-flight §1.0 PK confirmation gate: <PK confirmed all 4 items at <DATETIME>>",
    "Pre-flight §1.3 cron 48 state: active=<true|false>; command=<captured>; last 10 runs <summary>",
    "Pre-flight §1.4 callers of get_next_scheduled_for: cron 48 only (or list any others)",
    "Pre-flight §1.4 function signature: <args>",
    "Pre-flight §1.5 cleanup count: <N> rows match criterion at <DATETIME>",
    "Pre-flight §1.5 cross-check: 0 overlap with cc-0003 v2 criterion (post cc-0003 v2 completion); 0 overlap with cc-0004 criterion (by construction)",
    "Pre-flight §1.8 pre_dead_reason_count: <P> (baseline used in V1)",
    "Pre-flight §1.9 sequencing gate: cc-0003 v2 result <Complete | NO-OP>; cc-0004 result <Complete | NO-OP>",
    "Pre-flight §1.9 cross-check: cc-0003 v2 dead_reason population <X>; cc-0004 dead_reason population <Y>",
    "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.8 cutover scope confirmation",
    "docs/briefs/2026-05-05-queue-integrity-incident.md v3 §6 cutover plan"
  ],
  "known_weak_evidence": [
    "No prior brief has counted the M8 cleanup criterion. The expected range [0, 200] is unanchored — today's count is unknown to chat at draft time.",
    "Three coordinated components in one transaction is a larger blast radius than cc-0003/cc-0004's single-component shape. Mitigation: atomicity + comprehensive rollback.",
    "Cron edit in production is a new permission for the brief-runner-v0 trial. cc-0003/cc-0004 explicitly forbade cron edits. cc-0005 explicitly allows cron 48 edits only. The HALT path on §1.0 enforces that PK has explicitly signed off on the cron change.",
    "DDL (ALTER FUNCTION RENAME) is a new permission for the brief-runner-v0 trial. Reversible via rename-back, but operationally messy if any caller resolves by name post-rename and pre-rollback.",
    "Post-cutover enqueue path is uncertain at draft time. §1.0 PK confirmation gate is the safeguard — the brief HALTs without it. If the path is m.fill_pending_slots extended to insert queue rows, the migration's effect is straightforward; if the path is something else, side-effect surface (§4 P2.7) needs re-examination.",
    "Rollback path uses captured queue_id list (cleanup component) and known constants (cron jobid 48, function canonical name). Depends on apply session correctly persisting the snapshot in P1.6.",
    "V1 pass condition relies on pre_dead_reason_count captured at §1.8. Standard cc-0003 v2 / cc-0004 caveat: drift between baseline and apply is unlikely (no live writers verified at P3.2)."
  ],
  "default_action": "proceed if D-01 returns clean agree AND §1.0 PK confirmation gate passed; halt and escalate to PK if any escalation, pushback, risk-elevation, or §1.0 fails",
  "references": {
    "cc-0005 brief": "docs/briefs/cc-0005-m8-atomic-cutover.md",
    "cc-0003 v2 brief (pattern source)": "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 brief (pattern source)": "docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "cc-0003 v1 HALT result (HALT-then-correction precedent)": "docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "reconciliation brief": "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md",
    "queue integrity v3": "docs/briefs/2026-05-05-queue-integrity-incident.md",
    "M5 session record": "docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md",
    "§10.2 view contract": "docs/dashboard-review-2026-05/10_product_objects_and_data_model.md"
  },
  "sql_to_apply": "<full SQL from cc-0005 §3 verbatim, with <ARGS> replaced by P1.4 signature and any updated_at adjustment per P1.1>"
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

After §1.0 PK confirmation, sequencing gates pass, D-01 returns clean agree, AND PK approval:

1. **Sequencing gate re-confirmation** — read cc-0003 v2 + cc-0004 result files; confirm both `Complete`/`NO-OP`. HALT if not.
2. **Final read-only re-verification** — re-run §1.3 + §1.4 + §1.5 + §1.6 + §1.8 within ~60s of apply. Confirm cleanup count is in the same range as the D-01 packet stated. If divergence > 10 rows, halt and refresh D-01 packet. If function signature changed, halt.
3. **Apply SQL amendment** — replace `<ARGS>` placeholder in §3 SQL with the actual signature from §1.4. Replace `<DATETIME>` in COMMENT text with the apply session's actual UTC timestamp.
4. **`apply_migration` call** — single call:
   ```
   apply_migration(
     project_id: 'mbkmaxqhsohbtwsqolns',
     name: 'm8_atomic_cutover_v1',
     query: <amended SQL from §3>
   )
   ```
5. **Capture the result** — record success vs failure, exact return value, all 5 RAISE NOTICE messages (component 1 disable, component 2 count, component 3 rename).
6. **Run all 8 verification queries (§7)** — if any fails, immediately move to §8.3 rollback.
7. **If all 8 PASS:** session continues to close-the-loop UPDATE on `m.chatgpt_review` and 4-way sync. M7 closure documentation included in 4-way sync.

---

## 7. Verification queries (post-apply)

Run all 8 in sequence. Each must PASS to declare success.

### V1 — Exact dead_reason population delta (cleanup component)

```sql
SELECT COUNT(*) AS post_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'm8_cutover_legacy_path_deprecated';
```

**Pass:** `post_dead_reason_count = pre_dead_reason_count + N` where `pre_dead_reason_count` is captured in §1.8 and N is the cleanup count from §1.5. **Do not assume `pre_dead_reason_count = 0`.**

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

**Pass:** `v2_count = 0`. The cleanup-criterion-matching cohort is fully dead-lettered.

### V3 — Queued+failed depth decreased by exactly N

Same as cc-0003 v2 / cc-0004 V3.

### V4 — Dead count increased by exactly N

Same as cc-0003 v2 / cc-0004 V4.

### V5 — Paranoia: only the captured rows changed

Same as cc-0003 v2 / cc-0004 V5, with `dead_reason='m8_cutover_legacy_path_deprecated'`.

### V6 — Coherence cross-check

Same as cc-0003 v2 / cc-0004 V6.

### V7 — Cron 48 status (NEW)

```sql
SELECT jobid, jobname, active
FROM cron.job
WHERE jobid = 48;
```

**Pass:** `active = false` AND `jobname` unchanged from §1.3 capture.

### V8 — Function rename + comment (NEW)

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

**Pass:** exactly 1 row returned, with `function_name = 'get_next_scheduled_for__deprecated_m8'`. The `args` value matches §1.4 capture. The `description` contains the substring `'@deprecated M8 cutover'`. No row exists with `function_name = 'get_next_scheduled_for'` (the rename completed).

---

## 8. Rollback / no-op / halt logic

### 8.1 NO-OP path (run before D-01 fire)

Nuanced: cc-0005 has 3 components. "NO-OP" applies independently to each:

- Cleanup component NO-OP if §1.5 returns 0: cleanup is a no-op, but components 1 + 3 still proceed if their pre-conditions are satisfied. The migration as a whole is NOT a no-op.
- Cron 48 NO-OP if §1.3 shows `active = false` already: component 1 is a no-op, but components 2 + 3 still proceed.
- Function NO-OP if §1.4 shows 0 signatures: component 3 is a no-op, but components 1 + 2 still proceed.

All 3 components no-op simultaneously is genuine NO-OP → NO `apply_migration` call. NO D-01 fire (nothing to review). Document outcome in result file: "M8 atomic cutover no-op: cron 48 already inactive, cleanup count = 0, function already absent. Cutover already complete."

### 8.2 HALT paths

**8.2.a Cleanup count > 200:** §1.5 returns count outside [0, 200]:
1. NO `apply_migration` call.
2. NO D-01 fire.
3. Document and escalate to PK.

**8.2.b (RETIRED):** previously a generic disjointness HALT path — retired in design phase since M8 disjointness vs cc-0003 v2 / cc-0004 is structural (different status filters / different slot_id discriminator).

**8.2.c Sequencing gate fail:** cc-0003 v2 OR cc-0004 result file missing OR shows incomplete:
1. NO `apply_migration` call. Wait for resolution.

**8.2.d (RETIRED):** previously §1.5 partition anomaly (cc-0003 v2 pattern) — retired since M8's §1.5 cross-check uses different invariants.

**8.2.e §1.0 PK confirmation gate fail:** PK cannot confirm one or more of the 4 items in §1.0:
1. NO `apply_migration` call.
2. NO D-01 fire.
3. Document the unconfirmed item(s).
4. cc-0005 stays issued. A separate brief is needed (most likely to investigate and document the post-cutover enqueue path before cc-0005 can apply).

**8.2.f `m.post_draft.created_by` column absent:** §1.1 returns no `created_by` column:
1. NO `apply_migration` call.
2. Re-investigate criterion. Possible alternatives: column renamed, never existed, or in a different schema. Escalate to PK.

**8.2.g Live caller of `public.get_next_scheduled_for` outside cron 48:** §1.4 / P3.6 surfaces an active production caller other than cron 48:
1. NO `apply_migration` call.
2. The function rename would break the caller. Function deprecation deferred until caller is retired or migrated. Escalate to PK with the caller list.

**8.2.h Multiple overloaded signatures of `public.get_next_scheduled_for`:** §1.4 returns > 1 signature:
1. NO `apply_migration` call.
2. Brief expects exactly 1 signature for the rename target. Escalate to PK to decide which to rename or whether to rename all (separate cc-0005 v2 patch).

**8.2.i cc-0003 v2 overlap > 0:** §1.5 cross-check returns non-zero overlap with cc-0003 v2 criterion:
1. NO `apply_migration` call.
2. cc-0003 v2 may not have run, or its cohort drained differently than expected. Re-investigate.

### 8.3 ROLLBACK path (verification fails after apply)

If any of V1–V8 FAIL:

1. Immediately halt session continuation; do NOT proceed to close-the-loop or 4-way sync.
2. Apply rollback migration `m8_atomic_cutover_v1_rollback`. Single transaction reversing all 3 components:

```sql
-- Rollback for m8_atomic_cutover_v1
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

-- Reverse component 1: re-enable cron 48
SELECT cron.alter_job(48, active := true);
```

3. Re-run V1–V8 to confirm rollback restored pre-apply state. V1 post-rollback equals original `pre_dead_reason_count`. V2 post-rollback equals original §1.5 count. V7 post-rollback shows `active=true`. V8 post-rollback shows `get_next_scheduled_for` (no `__deprecated_m8` suffix).
4. Document: "M8 atomic cutover applied + rolled back. Pre-state restored. Failure mode: <verification ID + diagnosis>."
5. PK escalation; cc-0005 v2 with corrective measures.

### 8.4 Why not template the rollback fully

Same as cc-0003 v2 / cc-0004 §8.4: queue_id → pre_status mapping is known only at apply time. The brief specifies the mechanism; the apply session writes the literal SQL. The cron jobid (48) and function name (canonical) ARE templatable since they're constants — those are pre-filled in §8.3 above.

---

## 9. Stop condition

The cc-0005 apply session is COMPLETE when:

1. §1.0 PK confirmation gate passes.
2. §1.9 sequencing gates pass: cc-0003 v2 + cc-0004 results both `Complete` or clean NO-OP.
3. §1 pre-flight all 9 P1 checks PASS (including §1.8 pre_dead_reason_count baseline + §1.9 sequencing).
4. §4 P0 + P1–P5 all PASS.
5. §5 D-01 fire returns clean agree + PK approval.
6. §6 apply procedure completes; `apply_migration` returns success.
7. §7 verification V1–V8 all PASS (V1 uses pre_dead_reason_count + N; V7 cron 48 inactive; V8 function renamed with deprecation comment).
8. Close-the-loop UPDATE on `m.chatgpt_review` (or carry as backlog).
9. Result file `docs/briefs/results/cc-0005-m8-atomic-cutover.md` created and committed.
10. **M7 closure documented in the 4-way sync** (per reconciliation §6 Q2; doc-only; not in the migration). Specifically: action_list closes M7 alongside M8; sync_state pointer index notes M7 closure; memory `recent_updates` mentions M7 closure as part of the M8 cycle.
11. 4-way sync close: session file (`docs/runtime/sessions/{YYYY-MM-DD}-cc-0005-m8-cutover-applied.md`) + sync_state pointer index entry + action_list closure of M8 + M7 + memory `recent_updates`.

If any of §8.1, §8.2.a, §8.2.c, §8.2.e, §8.2.f, §8.2.g, §8.2.h, §8.2.i, or §8.3 paths trigger: report outcome and stop.

---

## Success criteria (for this brief draft, NOT for the apply itself)

This cc-0005 brief is correctly drafted when:

1. The brief file exists at `docs/briefs/cc-0005-m8-atomic-cutover.md`.
2. The apply procedure can be executed by chat (or any future executor) using only this brief + read-only DB access + Supabase MCP, without re-reading the queue integrity v3 brief or the reconciliation brief.
3. §1.0 PK confirmation gate is explicit, hard, and listed BEFORE all other pre-flight queries.
4. SQL is locked to the version in §3, with the `<ARGS>` placeholder and apply-time amendment rule documented.
5. Verification queries (V1–V8) are runnable as-is post-amendment.
6. Rollback mechanism for all 3 components is concrete.
7. Sequencing gates (cc-0003 v2 + cc-0004) are explicit and re-confirmed at apply procedure step 1.
8. M7 closure folding into the 4-way sync is documented in §9.
9. Forbidden actions explicitly prohibit cron edits other than cron 48 and DDL other than the function rename + comment.
10. No production state changed by drafting this brief.

---

## Notes

This is the fourth cc-NNNN brief in the brief-runner-v0 trial; third apply-class brief; first multi-component (3-way) atomic migration; first to require pre-condition gate at §1.0; first with cron edit + DDL permissions.

### Brief-runner-v0 watch items specific to cc-0005

1. **Pre-condition gate (§1.0)** — NEW pattern. The hard PK confirmation gate is a process-level check, not a SQL-level check. cc-0005 demonstrates that briefs with novel risk surfaces (cron edits + DDL + multi-component) need an explicit PROCESS gate before pre-flight queries even run. If this pattern works for cc-0005, it's a candidate for promotion to a brief-runner-v0 standing rule for any brief that mixes data + cron + DDL.

2. **Atomic 3-step migration** — different shape from cc-0003 v2 / cc-0004 which were single-component. The DO blocks for components 1 and 3 use idempotent guards (count checks before action). The UPDATE for component 2 uses the cc-0004 subquery pattern. All 3 in one transaction means if the function rename fails (e.g. caller surfaces post-P3.6), the cleanup UPDATE rolls back too. Atomicity is the safety net.

3. **Cron edit permission** — first cc-NNNN brief with this. Forbidden actions explicitly limit to cron 48 only. The `cron.alter_job` call is idempotent against current state (component 1 DO block guards on `active`).

4. **DDL permission (function rename + comment)** — first cc-NNNN brief with this. Forbidden actions explicitly limit to `ALTER FUNCTION ... RENAME` + `COMMENT ON FUNCTION` on `public.get_next_scheduled_for`. No DROP. No table DDL.

5. **No prior count to inherit** — unlike cc-0003 v2 (9 from cc-0003 v1 HALT) and cc-0004 (43 from reconciliation brief), cc-0005 has no pre-known cleanup count. The wide [0, 200] range is unanchored. Brief-runner-v0 lesson: when drafting an apply brief without a prior count baseline, document the unanchored nature in the D-01 packet's `known_weak_evidence`.

6. **8 verification queries** — expanded from cc-0003 v2 / cc-0004's 6, with V7 (cron) + V8 (function) added. Post-apply verification covers all 3 components.

7. **Rollback complexity** — reversing 3 components is more complex than reversing 1. The rollback is structured to mirror the apply (just in reverse order). §8.4 documents why the queue_id mapping isn't templated; §8.3 documents what IS templatable (cron jobid, function name).

8. **M7 closure** — doc-only fold into the 4-way sync. cc-0005 §9 step 10 explicitly captures this; brief-runner-v0 lesson: when a brief subsumes another's closure, document the subsumption in the stop condition.

9. **§1.5 cross-check** — unique to cc-0005: explicitly cross-checks cc-0003 v2 + cc-0004 criteria as part of pre-flight. This is a structural disjointness verification at the data layer that pairs with the structural disjointness in the criteria themselves. Promotes confidence that cc-0005 is not stepping on prior briefs' rows.

10. **Apply-time SQL amendment for `<ARGS>`** — the function signature isn't known at brief draft time. §3 documents the amendment rule; §6 step 3 walks the apply session through it; §5.2 includes the amended SQL in the D-01 packet. Brief-runner-v0 lesson: when a brief's SQL depends on a database state value that pre-flight surfaces, document the amendment rule explicitly.

### Open dependencies for the apply session

Before cc-0005 can apply, the following must be resolved (some are external to this brief):

- **cc-0003 v2 apply** must complete (sequencing gate).
- **cc-0004 apply** must complete (sequencing gate).
- **Post-cutover enqueue path** must be confirmed by PK (§1.0 gate item 1).
- **`get_next_scheduled_for` callers** must be enumerated and confirmed safe (§1.0 gate item 2).

If any of these are blocked or unresolved, cc-0005 stays issued. PK schedules apply when all resolve.

---

*Brief authored 2026-05-09 Sydney by chat per brief-runner-v0 trial. Inputs: cc-0003 v2 + cc-0004 brief shapes (incl. patches); reconciliation brief §2.8 + §6 Q2 (M7 closure) + §6 Q3 (M8 cleanup criterion); queue integrity v3 brief §6 cutover plan + §8 Migration 8; M5 session record §Carry-forward; §10.2 view contract precedence rule 1. Output: full apply brief (3-component cutover SQL + P0 + P1–P5 + D-01 packet + 8 verification queries + 3-component rollback + halt paths + stop condition incl. M7 closure). No production state changed by drafting. cc-0005 apply is gated by §1.0 PK confirmation + cc-0003 v2 + cc-0004 completion. Awaiting PK direction to schedule the apply session.*
