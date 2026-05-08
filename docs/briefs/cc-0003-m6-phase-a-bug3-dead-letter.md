# Brief cc-0003 — M6 Phase A apply (Bug 3 fingerprint dead-letter, slot_id IS NULL only)

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Executor:** chat or Claude Code (apply via Supabase MCP `apply_migration`)  
**Status:** issued v2 (patched 2026-05-09 v1 + v2; see Patch History)  
**Result file (v1 HALT, preserved):** `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` (already committed; v1 outcome was HALT at §1.5 disjointness invariant fail)  
**Result file (v2 outcome, on completion):** chat will append a v2 outcome section to the same result file at session close, OR create a new file at `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter-v2.md` per PK preference

---

## Task

Dead-letter the remaining `m.post_publish_queue` rows that match the Bug 3 wall-clock-fallback fingerprint AND are legacy-origin (`pd.slot_id IS NULL`). Slot-driven rows that incidentally match the Bug 3 fingerprint are EXCLUDED from cc-0003 v2 scope and fall to cc-0004 (Phase B) scope per the 2026-05-09 v2 patch.

Apply via Supabase MCP `apply_migration` as migration `m6_phase_a_bug3_fingerprint_dead_letter_v2`. Single atomic transaction. UPDATEs `m.post_publish_queue.status` from `queued`/`failed` to `dead` and populates `m.post_publish_queue.dead_reason` with `anomalous_scheduled_for_bug3_fallback` for matching rows.

**Expected scope at v2 patch time:** 9 rows (per CC's HALTed v1 §1.4 snapshot: 11 candidates total − 2 slot-driven rows excluded). Apply session must re-verify count from a fresh read-only SELECT and halt if outside the [3, 20] range.

---

## Source context

- `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 §2 (Bug 3 framing) + §7 (Phase A reason codes) + §8 Migration 6 — canonical defect description.
- `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` §Schema state delta + §Carry-forward — confirms M5 applied; sets M6 Phase A as next-recommended; cited 108 rows at that time.
- `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §2.6 + §6 Q1 — reconciliation finding (11 candidates; column-unblocked; §10.2 view auto-reclassification).
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` v1 HALT outcome — records the 2026-05-09 HALT, pre-flight evidence, and root-cause diagnosis. **Read this before re-execution.**
- `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` §10.2 precedence rule 1 — view auto-reclassifies dead rows correctly post-apply.
- `docs/00_action_list.md` v2.54 — carry-forward classification of M6 Phase A as P1.
- 2026-05-09 read-only diagnostic on queue_ids `929ee2f9…` and `30fa6594…` (chat session, post-v1-HALT) — confirms both rows are v4 mismatch (Phase B / cc-0004) scope, NOT Phase A scope.

## Scope

**In scope:**
- Pre-flight verification (read-only SELECTs against information_schema, pg_trigger, the target table + JOIN to `m.post_draft` for `pd.slot_id`)
- D-01 fire (`ask_chatgpt_review`) with packet specified in §5
- Single Supabase MCP `apply_migration` call with the exact SQL in §3
- 6 post-apply verification queries from §7
- Rollback within session if any verification fails (per §8)
- Close-the-loop UPDATE to `m.chatgpt_review` (per standing protocol; or carry as backlog)
- 4-way sync at session close (session file + sync_state pointer + action_list bump + memory)

**Out of scope:**
- The 2 slot-driven CFW IG rows (`929ee2f9…`, `30fa6594…`) that match the 5-min fingerprint — these fall to cc-0004 (Phase B) scope per v2 patch reasoning. cc-0003 v2 explicitly excludes them via `pd.slot_id IS NULL`.
- M6 Phase B (43 v4 mismatch rows incl. the 2 above) — separate cc-0004 apply brief.
- M7 closure (documentation-only; folds into M8 4-way sync per reconciliation §6 Q2).
- M8 atomic cutover (cron 48 disable + cleanup) — separate cc-0005 apply brief.
- M-09-03 view DDL — Phase 0 work.
- Any change to cron 48 or cron 75 (M3/M4/M5 already addressed).
- Any DDL beyond what is explicitly written in §3.
- Any change to `f.canonical_content_body`, `m.ai_job`, `m.post_draft`, `m.slot` — only `m.post_publish_queue` is touched (the JOIN to `m.post_draft` is read-only for criterion derivation).
- Any change to `c.client_publish_profile`, `c.client_publish_schedule`, taxonomy, or any `t.*`, `c.*`, `f.*`, `a.*`, `k.*` schema.
- Touching `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER hold).
- Modifying `m.ef_drift_log`.
- Cron edits, EF deploys, dashboard/portal/web work.

## Allowed actions

- Read source files referenced in §Source context.
- Read-only `SELECT` against the database for pre-flight P1–P5 + post-apply verification, including JOINs across `m.post_publish_queue`, `m.post_draft`, `pg_proc`, `pg_views`, `pg_trigger`, `information_schema.columns`.
- One `ask_chatgpt_review` D-01 fire per the packet in §5.
- One `apply_migration` call with the exact SQL in §3 (after PK explicit approval based on D-01 result).
- Up to 3 retries on the post-apply verification queries (network/timeout reasons only — not for re-trying after an actual verification failure).
- One rollback migration per §8 if any verification fails.
- One close-the-loop UPDATE to `m.chatgpt_review` after success.
- One commit appending a v2 outcome section to the result file (or creating `…-v2.md`).
- 4-way sync close commits (session file + sync_state + action_list + memory edit) at session end.

## Forbidden actions

- No second `apply_migration` call beyond the one in §3 (and a rollback if verification fails).
- No modifications to the SQL in §3 except to add `updated_at = NOW()` (P1.1 of v1 HALT confirmed `updated_at` IS present; v2 §3 amendment is mandatory unless an auto-update trigger is identified).
- No changes to `m.post_draft` rows associated with the dead-lettered queue rows. Drafts remain in their current `approval_status`. Per §10.2 precedence rule 1, the view's `state` becomes `dead` because the queue row is dead, NOT because the draft state changed.
- No changes to any other table.
- No D-01 fire beyond the one in §5.
- No deletes. Dead-letter is UPDATE only.
- No `apply_migration` if the read-only pre-flight count returns 0 (no-op condition per §8) or outside [3, 20] (halt condition per §8).
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`. Escalation to PK per standing protocol if D-01 returns escalate=true or pushback.
- No assumption that 9 is the exact count. Always re-verify.
- No assumption that `pre_dead_reason_count` is 0. Always read it from §1.7 at apply time and use the captured value in V1 pass.
- No assumption that the 2 known slot-driven incidental rows (`929ee2f9…`, `30fa6594…`) are unchanged at apply time. Re-verify §1.5 partition.
- No claim that `pd.slot_id IS NULL` and `pd.slot_id IS NOT NULL` populations cannot co-fingerprint Bug 3. Empirically they can; v2 §1.5 acknowledges this.
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it (PHASES roadmap update + memory edit + action_list bump are the standard close).
- No Phase 0 scheduling.

---

## 1. Pre-flight verification (read-only, runs at apply session start)

The apply session begins with these read-only SELECTs. Their results inform the D-01 packet (§5) and the P1–P5 checklist (§4).

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
  'slot_id', 'approval_status'
)
ORDER BY table_schema, table_name, column_name;
```

**Expected (from v1 HALT §2 §1.1 + v2 expansion to `m.post_draft`):** `m.post_publish_queue.{queue_id, status, dead_reason, scheduled_for, created_at, updated_at, post_draft_id}` + `m.post_draft.{post_draft_id, slot_id, approval_status}` confirmed present. `m.post_publish_queue.updated_at` IS present (v1 HALT confirmed) → v2 §3 SQL includes `updated_at = NOW()` in SET.

### 1.2 Confirm trigger surface on `m.post_publish_queue`

```sql
SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS triggerdef
FROM pg_trigger
WHERE tgrelid = 'm.post_publish_queue'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

**Decision rule:** if any trigger fires on UPDATE of `status` AND has side-effects beyond column maintenance (e.g. inserts to other tables, calls EFs, pg_notify), HALT and escalate to PK before D-01. The expected surface is empty or column-maintenance-only (e.g. `updated_at`).

**v1 HALT result:** 3 non-internal triggers surveyed; all PASS (none externalise; `tr_publish_queue_reset_on_success_v1` no-ops on `status='dead'` UPDATE; `tr_publish_queue_backoff_368_v1` not fired by status change; `trg_gate_queue_on_asset_status` BEFORE INSERT only). v2 expects same outcome unless trigger surface drifted between v1 HALT and v2 apply.

### 1.3 Re-verify Phase A scope (the 9, narrowed by `pd.slot_id IS NULL`)

```sql
SELECT COUNT(*) AS phase_a_target_count,
       MIN(q.created_at) AS oldest_created_at,
       MAX(q.created_at) AS newest_created_at,
       COUNT(DISTINCT (q.client_id, q.platform)) AS partition_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60;
```

**Decision rule:**
- If `phase_a_target_count = 0` → NO-OP path (§8.1 no-op handling). No D-01 fire. No apply.
- If `phase_a_target_count` outside [3, 20] → HALT (§8.2.a). Re-investigate criterion drift.
- If `phase_a_target_count` inside [3, 20] → proceed to §1.4.

**Why [3, 20]:** v1 HALT §1.3 found 11 candidates total (5-min fingerprint cohort). v2 narrows by `pd.slot_id IS NULL`, excluding 2 slot-driven rows. v2 expected count = 9. Range [3, 20] allows for ~6 additional days of natural drain (lower bound: ~24/day rate from M5 session 108→11 trajectory) and unexpected criterion-broadening (upper bound).

### 1.4 Capture target snapshot

```sql
SELECT q.queue_id,
       q.client_id,
       q.platform,
       q.scheduled_for,
       q.created_at,
       q.status AS pre_status,
       q.post_draft_id,
       pd.approval_status AS draft_status,
       pd.slot_id
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
ORDER BY q.created_at, q.queue_id;
```

**Purpose:** hold the target snapshot in chat context (or copy to a temp/scratch file) so post-apply verification can compare. The list MUST equal the count from §1.3. Every row's `pd.slot_id` MUST be NULL by the criterion.

### 1.5 Phase A vs Phase B partition check (v2 INVERTED from v1)

```sql
SELECT
  COUNT(*) FILTER (WHERE pd.slot_id IS NULL)     AS phase_a_count,
  COUNT(*) FILTER (WHERE pd.slot_id IS NOT NULL) AS slot_driven_incidental_count,
  COUNT(*)                                        AS total_fingerprint_cohort
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60;
```

**Decision rule (v2):**
- `phase_a_count` MUST equal `phase_a_target_count` from §1.3 (consistency check on the criterion).
- `slot_driven_incidental_count` should be `~2` per the 2026-05-09 v2 patch evidence (CFW IG rows `929ee2f9…` and `30fa6594…`). Tolerance: 0–7 (allows for natural drain or new occurrences within reasonable bounds).
- HALT if `slot_driven_incidental_count > 7` — indicates the source path that produced these rows is NOT closed, which would invalidate M3+M4 closure claims.
- HALT if `phase_a_count + slot_driven_incidental_count != total_fingerprint_cohort` — partition arithmetic anomaly.
- Otherwise PROCEED. The 2 (or thereabouts) slot-driven incidental rows are correctly cc-0004 scope.

**Why this changed from v1:** v1 §1.5 asserted `slot_driven_count = 0` based on the rationale "M4 backfilled `pd.scheduled_for` from slot times, bypassing the `get_next_scheduled_for` fallback path entirely." The 2026-05-09 v1 HALT empirically refuted this: M4 was forward-only on `pd.scheduled_for`, NOT retroactive on `q.scheduled_for`. Slot-bound drafts CAN have queue rows with the Bug 3 fingerprint when the queue row was inserted pre-M3 with the fallback path active. v2 §1.5 acknowledges the partition empirically and uses it to validate the criterion narrowing rather than to halt.

### 1.6 Capture pre-state aggregates for V3/V4 verification

```sql
SELECT status, COUNT(*) AS row_count
FROM m.post_publish_queue
GROUP BY status
ORDER BY status;
```

**Purpose:** baseline for V3 (queued+failed should decrease by exactly N) and V4 (dead should increase by exactly N) post-apply.

### 1.7 Capture pre-existing `dead_reason` baseline

```sql
SELECT COUNT(*) AS pre_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'anomalous_scheduled_for_bug3_fallback';
```

**Purpose:** baseline for V1 (§7). Captures any rows that already carry the target `dead_reason` value before this migration runs. The apply session MUST persist this number in chat context and use it in V1's pass condition.

**Why this is required:** any prior session, manual operator UPDATE, or test migration could have set `dead_reason='anomalous_scheduled_for_bug3_fallback'` on rows in `m.post_publish_queue` independently. Function-definition string searches (§4 P3.2) only verify that no production CODE writes this value — they say nothing about whether existing TABLE ROWS already carry it. Treat the table state as ground truth; never assume `pre_dead_reason_count = 0`.

**Expected (informative, not a halt criterion):** likely 0 or very small. v1 HALT did not run §1.7 (halted at §1.5). v2 first execution will establish the baseline. Document in the v2 result file §6.

---

## 2. Selection criterion (v2, locked)

```sql
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
```

With JOIN: `FROM m.post_publish_queue q JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id`.

**Rationale:** strict 5-min fingerprint per reconciliation brief §6 Q1 default recommendation, narrowed to legacy-origin only via `pd.slot_id IS NULL` per 2026-05-09 v2 patch evidence. The 60-second tolerance covers wall-clock drift / cron fire-time scatter while excluding rows that happen to be 5 minutes apart for any other reason. The `pd.slot_id IS NULL` filter excludes the 2 slot-driven rows that incidentally fingerprint Bug 3 — those rows are v4 mismatch and fall to cc-0004 (Phase B) scope, where they are correctly captured by the Phase B criterion.

**Excluded by criterion:**
- Slot-driven rows (`pd.slot_id IS NOT NULL`) regardless of fingerprint match — cc-0004 scope.
- Any row where `scheduled_for` matches a configured slot time (i.e. NOT a 5-min-from-creation fingerprint) — cc-0005 (M8 cleanup) scope or post-M3 correctly-aligned rows.
- Dead or published rows — not in active queue.

**Why not broader (reconciliation Q1 (b) or (c)):** broader criteria dead-letter rows on a hypothesis-of-anomaly rather than evidence-of-anomaly. The 5-min fingerprint is causally traceable to Bug 3's specific code path; the slot_id discriminator is causally traceable to legacy vs v4 origin.

**Why `status IN ('queued', 'failed')` not just `'queued'`:** rows that hit the publisher and failed retain the anomalous `scheduled_for` value. Failed rows from this cohort are still anomalous and should also be dead-lettered.

**Disjointness vs cc-0004:** v2's `pd.slot_id IS NULL` filter makes cc-0003 v2 disjoint from cc-0004 by construction (cc-0004 requires `pd.slot_id IS NOT NULL`). Disjointness is now guaranteed by the slot_id discriminator alone, regardless of any incidental fingerprint match.

---

## 3. Proposed SQL (v2, locked)

Applied via Supabase MCP `apply_migration` with:
- **Migration name:** `m6_phase_a_bug3_fingerprint_dead_letter_v2`
- **Project ID:** `mbkmaxqhsohbtwsqolns`

```sql
-- M6 Phase A v2 — Bug 3 fingerprint dead-letter, legacy-origin only
-- See: docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md §2 + Patch History (v2 entry)
-- See: docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md (v1 HALT outcome + diagnostic)
-- See: docs/briefs/2026-05-05-queue-integrity-incident.md §2 Bug 3 + §7 Phase A reason codes
--
-- v2 narrows v1's criterion to pd.slot_id IS NULL (legacy-origin only). Slot-driven rows that
-- incidentally match the Bug 3 fingerprint are excluded; they fall to cc-0004 (Phase B) scope.
-- The v2 narrowing was triggered by the 2026-05-09 v1 HALT at §1.5 (slot_driven_count=2).

DO $$
DECLARE
  v_count integer;
  v_min_expected integer := 3;
  v_max_expected integer := 20;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NULL
    AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'M6 Phase A v2 NO-OP: 0 rows match criterion. Migration retiring without apply.';
  END IF;

  IF v_count < v_min_expected OR v_count > v_max_expected THEN
    RAISE EXCEPTION 'M6 Phase A v2 SCOPE ANOMALY: % rows match criterion (expected [%-%]). Halt for re-investigation.',
      v_count, v_min_expected, v_max_expected;
  END IF;

  RAISE NOTICE 'M6 Phase A v2: % rows match Bug 3 fingerprint (legacy-origin only; slot-driven incidentals excluded -> cc-0004 scope). Proceeding with UPDATE.', v_count;
END $$;

UPDATE m.post_publish_queue
SET status = 'dead',
    dead_reason = 'anomalous_scheduled_for_bug3_fallback',
    updated_at = NOW()
WHERE queue_id IN (
  SELECT q.queue_id
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NULL
    AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
);
```

**Notes on the SQL:**

1. **Atomicity:** `apply_migration` runs the migration in a single transaction. If the DO block raises, the UPDATE rolls back automatically. No partial state.
2. **Idempotency:** if accidentally re-applied after success, the second run finds 0 rows in `(queued, failed)` status matching the criterion, the DO block raises NO-OP, and the UPDATE never executes. Safe to re-attempt.
3. **`updated_at = NOW()` is included unconditionally in v2** because v1 HALT §1.1 confirmed the column exists. P1.1 will re-verify; if `updated_at` is removed between v1 HALT and v2 apply (highly unlikely), apply session removes it from SET clause before D-01 fire. If P1.1 surfaces an auto-update trigger, document but proceed (the explicit SET is a no-op against the trigger).
4. **`WHERE queue_id IN (...)` subquery form** — multi-table criterion via JOIN can't be expressed as a simple WHERE on the UPDATE target. Subquery form: (a) self-validates against the same criterion the DO block checked, (b) remains correct if a row drains in the millisecond between count check and UPDATE, (c) the criterion is the audit trail. Same shape as cc-0004 §3.
5. **`dead_reason` value `anomalous_scheduled_for_bug3_fallback`** unchanged from v1 — the dead_reason characterises WHY the row is anomalous (Bug 3 fallback path), not WHICH brief version applied. The 2 excluded slot-driven rows will receive `anomalous_pre_m4_v4_mismatch` from cc-0004.
6. **Migration name v2 vs v1** — v1 was never applied (HALT precedes apply). v2 name encodes the criterion correction explicitly for audit clarity. `m6_phase_a_bug3_fingerprint_dead_letter_v1` is retired without prejudice.

---

## 4. P1–P5 pre-flight checklist (per Lesson #61)

Apply session walks each step, captures evidence, and refuses to proceed past any FAIL.

### P1 — Pre-state capture

**Goal:** snapshot of target rows + system state before UPDATE.

- [ ] **P1.1** Run §1.1 information_schema check; confirm columns across `m.post_publish_queue` + `m.post_draft` present. v1 HALT already confirmed `m.post_publish_queue.updated_at` — v2 §3 includes `updated_at = NOW()` unconditionally. P1.1 re-verifies in case of drift.
- [ ] **P1.2** Run §1.2 pg_trigger check; confirm zero non-internal triggers on `m.post_publish_queue` with external side-effects. v1 HALT already surveyed 3 triggers; all PASS. v2 re-verifies.
- [ ] **P1.3** Run §1.3 count check; confirm `phase_a_target_count` in [3, 20]. If 0 → NO-OP path (§8.1). If outside [3, 20] → HALT (§8.2.a).
- [ ] **P1.4** Run §1.4 target snapshot; persist queue_id list to chat context (or scratch file `/tmp/cc-0003v2-targets-{date}.csv`).
- [ ] **P1.5** Run §1.5 partition check; confirm `phase_a_count = phase_a_target_count` AND `slot_driven_incidental_count` in [0, 7] AND partition arithmetic holds. HALT (§8.2.d) if any condition fails.
- [ ] **P1.6** Run §1.6 pre-state aggregates; capture `(status, count)` baseline.
- [ ] **P1.7** Run §1.7 pre_dead_reason_count baseline; persist value for V1 pass condition. No HALT criterion; informative-only.

**Pass criterion:** all 7 checks PASS. Any FAIL halts the session.

### P2 — Side-effect surface

**Goal:** map all downstream readers/writers that touch the affected rows.

- [ ] **P2.1** `m.publisher_lock_queue_v2(p_platform, p_limit)` — publisher's row-locking function. Reads `WHERE status='queued'`. Post-apply: 9 fewer rows eligible. **Side-effect:** the next publisher cycle for affected (client_id, platform) partitions has slightly less queue depth. **Magnitude:** trivial; cap-limited publishing means the row was already not going to publish in the next several cycles anyway.
- [ ] **P2.2** `m.cleanup_queue_on_publish_v1` trigger — fires on `m.post_publish` INSERT, NOT on `m.post_publish_queue` UPDATE. **Not affected by this migration.**
- [ ] **P2.3** `enqueue-publish-queue-every-5m` cron jobid 48 — INSERTs into `m.post_publish_queue` with conflict guard. **Not affected.** Does not read existing dead rows.
- [ ] **P2.4** Dashboard / portal queries — if any UI surface reads `m.post_publish_queue` directly: counts of "queued" decrease by N; counts of "dead" increase by N. Cosmetic only; no broken queries.
- [ ] **P2.5** `m.vw_pipeline_state` — not yet built (Phase 0 / M-09-03). Future view's first read post-apply correctly classifies these rows as `dead` per §10.2 precedence rule 1. No impact on view design.
- [ ] **P2.6** Health-check Cowork sweep — the daily 02:00 AEST `docs/audit/health/{date}.md` may surface different counts post-apply. Cosmetic; expected.

**Pass criterion:** P2.1–P2.6 all reviewed; no unaccounted-for side effect identified.

### P3 — Transitive dependency map

**Goal:** trace transitive readers across schema boundaries (per Lesson #61 strengthened by M5 V6 miss).

- [ ] **P3.1** Search for any function/view/trigger referencing `m.post_publish_queue.dead_reason`:
  ```sql
  SELECT n.nspname AS schema_name, p.proname AS function_name, 'function' AS object_type
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND pg_get_functiondef(p.oid) ILIKE '%dead_reason%'
    AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')
  UNION ALL
  SELECT schemaname, viewname, 'view'
  FROM pg_views
  WHERE definition ILIKE '%dead_reason%'
    AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't');
  ```
  **Decision rule:** for each result, read its definition and confirm the reference is read-only. HALT if any function WRITES to dead_reason in a way that conflicts.

- [ ] **P3.2** Code-collision check: search for any function that writes the literal string `'anomalous_scheduled_for_bug3_fallback'`:
  ```sql
  SELECT n.nspname AS schema_name, p.proname AS function_name
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND pg_get_functiondef(p.oid) ILIKE '%anomalous_scheduled_for_bug3_fallback%';
  ```
  **Scope of this check:** function-definition string search. Verifies that no production CODE writes this dead_reason value (i.e. no concurrent writer can collide with this migration's UPDATE).  
  **What this check does NOT verify:** whether existing rows in `m.post_publish_queue` already carry this dead_reason value. That is a TABLE-STATE question answered by §1.7's `pre_dead_reason_count` query, not by this code-collision check.  
  **Expected:** zero hits on this code search. **Acting on the result:** if non-zero, read the function body and confirm the writer is dormant / removed / safe; HALT if a live writer could collide.

- [ ] **P3.3** Verify `m.post_draft` rows associated with the target queue rows are NOT in a state that breaks downstream:
  - Pre-apply: drafts of the 9 (or however many) target queue rows have `approval_status` in (`approved`, `scheduled`, `published`, `needs_review`).
  - Post-apply: drafts unchanged. Per §10.2 precedence rule 1, the view's `state` is `dead` because the queue is dead, not because the draft state changed.
  - **Verify draft state distribution:** 
    ```sql
    SELECT pd.approval_status, COUNT(*) AS row_count
    FROM m.post_publish_queue q
    JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
    WHERE q.status IN ('queued', 'failed')
      AND pd.slot_id IS NULL
      AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
    GROUP BY pd.approval_status
    ORDER BY pd.approval_status;
    ```
  - **Decision rule:** capture for D-01 packet. No HALT condition; informational.

- [ ] **P3.4** Confirm no Cowork brief / scheduled task references `m.post_publish_queue` rows by ID:
  - Cowork tasks listed in `docs/briefs/morning-inbox-sweep-v1.md` (DRAFT, not scheduled), `nightly-health-check-v1.md`, weekly reconciliation. None hold queue_id references.
  - **Pass:** no action needed.

- [ ] **P3.5** Forward-look: verify the slot-driven incidental rows are visible to cc-0004 (Phase B):
  ```sql
  SELECT q.queue_id, pd.slot_id,
         (q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at) AS will_match_phase_b
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  LEFT JOIN m.slot s ON s.slot_id = pd.slot_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NOT NULL
    AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
  ORDER BY q.queue_id;
  ```
  **Expected:** the rows captured here (~2; the slot-driven incidentals) all have `will_match_phase_b = TRUE`, confirming they will be claimed by cc-0004's criterion. **Decision rule:** capture for D-01 packet; no HALT (this is a forward-look, not a pre-condition for cc-0003 v2 apply). If `will_match_phase_b = FALSE` for any row, document as a deeper anomaly to investigate before cc-0004 apply.

**Pass criterion:** P3.1–P3.5 all reviewed; transitive readers either read-only or absent; cc-0004 forward-look documented.

### P4 — Reversibility

**Goal:** confirm rollback path is concrete and reversible.

- [ ] **P4.1** Rollback SQL drafted (§8.3). Single migration `m6_phase_a_bug3_fingerprint_dead_letter_v2_rollback`. Reverses status from `dead` to original `pre_status` and clears dead_reason for rows matching the captured queue_id list (NOT the criterion).
- [ ] **P4.2** Acknowledge irreversible side-effects: NONE. The UPDATE has no irreversible downstream consequences.
- [ ] **P4.3** Time-window for rollback: indefinite. There is no auto-process that would re-process dead rows.
- [ ] **P4.4** Confirm rollback would not collide with any newer rows: rollback uses captured queue_id list, not criterion + dead_reason filter, so it cannot affect rows captured outside the apply session.

**Pass criterion:** P4.1–P4.4 all PASS.

### P5 — Post-state verification preconditions

**Goal:** define the post-apply assertions before apply, not after.

- [ ] **P5.1** V1: count of rows with `dead_reason='anomalous_scheduled_for_bug3_fallback'` post-apply equals `pre_dead_reason_count + N` (where `pre_dead_reason_count` is captured in §1.7 and N is the apply scope from §1.3). **Do not assume `pre_dead_reason_count = 0`.**
- [ ] **P5.2** V2: count of rows matching the v2 criterion (5-min fingerprint AND `pd.slot_id IS NULL`) in `status IN ('queued','failed')` becomes 0.
- [ ] **P5.3** V3: total queued+failed row count decreases by exactly N.
- [ ] **P5.4** V4: total dead row count increases by exactly N.
- [ ] **P5.5** V5 (paranoia): no rows OUTSIDE the captured queue_id list have changed status to dead during this transaction.
- [ ] **P5.6** V6: post-state aggregates by status are coherent with pre-state aggregates from §1.6.

**Pass criterion:** all 6 verification queries written and ready to fire post-apply (§7).

---

## 5. D-01 packet content (NOT YET FIRED)

When the apply session reaches D-01 fire, use exactly this packet structure. Action type: `sql_destructive`.

### 5.1 `proposal` (prose)

```
Apply M6 Phase A v2: dead-letter remaining Bug 3 fingerprint queue rows in m.post_publish_queue,
legacy-origin only (pd.slot_id IS NULL). Slot-driven rows that incidentally match the fingerprint
are EXCLUDED and fall to cc-0004 (Phase B) scope.

Migration name: m6_phase_a_bug3_fingerprint_dead_letter_v2
Project: mbkmaxqhsohbtwsqolns
Method: Supabase MCP apply_migration (single atomic transaction)
Scope: rows matching `q.status IN ('queued','failed') AND pd.slot_id IS NULL
        AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60`
        (JOINing m.post_publish_queue q -> m.post_draft pd)
Expected count at apply time: ~9 rows (read-only verified <DATETIME>; halts if outside [3,20]).
UPDATE: SET status='dead', dead_reason='anomalous_scheduled_for_bug3_fallback', updated_at=NOW()
No other tables touched. No DDL. No cron edits. No EF deploys.

WHY v2: v1 HALTed at §1.5 disjointness invariant fail (slot_driven_count=2 against expected=0).
Post-HALT diagnostic confirmed both slot-bound rows are v4 mismatch (Phase B / cc-0004) scope
that incidentally match Bug 3's 5-min fingerprint. v2 narrows criterion to pd.slot_id IS NULL
to restore disjointness. The 2 excluded rows fall to cc-0004 by design.

WHY apply at all: M3 (applied 2026-05-05 v2.50) closed the Bug 3 source path. This migration
cleans up the residual queue rows that were created by Bug 3 before M3 landed. Today's snapshot
(per v1 HALT 2026-05-09) shows 11 candidates total, 9 legacy-origin (this migration's scope).

ROLLBACK: single rollback migration available; UPDATE the captured queue_id list back to
status='queued' (or original pre_status) with dead_reason=NULL. No irreversible side effects.

VERIFICATION: 6 post-apply queries (V1-V6). V1 uses the pre_dead_reason_count baseline from
pre-flight §1.7 (does not assume 0).
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply M6 Phase A v2: dead-letter ~9 legacy-origin Bug 3 fingerprint rows in m.post_publish_queue",
  "production_action_if_approved": "Single Supabase MCP apply_migration call. UPDATE status from queued/failed to dead with dead_reason='anomalous_scheduled_for_bug3_fallback' and updated_at=NOW() for rows matching the v2 criterion (5-min fingerprint AND pd.slot_id IS NULL).",
  "consequence_if_delayed": "Low operational risk if delayed because the cohort is naturally draining (108 → 11 candidates over 4 days; 9 of those are this migration's scope), but it remains pipeline-integrity cleanup and prevents stale queue noise in future m.vw_pipeline_state. The publisher does not publish these rows anomalously; it publishes them in queue order. Health-check Cowork keeps surfacing them as 'overdue queued' until cleared, and Phase 0's m.vw_pipeline_state would classify them as 'queued' on its first day until the migration runs.",
  "cost_of_waiting": "Low. Each day of delay drains 5-25 rows naturally. The migration may become a no-op within ~7-14 days at current drain rate. Pipeline-integrity benefit (clean baseline for m.vw_pipeline_state) is the residual reason to apply rather than wait for full drain.",
  "current_evidence": [
    "Pre-flight §1.3 count check: <N> rows match v2 criterion at <DATETIME>",
    "Pre-flight §1.5 partition check: phase_a_count=<N>, slot_driven_incidental=<M>, total=<N+M>",
    "Pre-flight §1.2 trigger check: <result>; v1 HALT survey: 3 non-internal triggers, all PASS",
    "Pre-flight §1.7 pre_dead_reason_count: <P> (baseline used in V1; not assumed to be 0)",
    "v1 HALT result file: docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md (HALT at §1.5; root-cause diagnostic confirms 2 slot-driven rows are cc-0004 scope)",
    "2026-05-09 read-only diagnostic on queue_ids 929ee2f9... and 30fa6594...: both confirm queue_distinct_from_slot=TRUE, draft_matches_slot=TRUE, queue_distinct_from_draft=TRUE",
    "M5 session record cited 108 rows on 5 May; today's count <N> is consistent with FIFO drain hypothesis",
    "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.6 confirms column-unblocked + view-compatible",
    "docs/briefs/2026-05-05-queue-integrity-incident.md v3 §2 Bug 3 mechanism + §7 reason code 'anomalous_scheduled_for_bug3_fallback' verbatim match"
  ],
  "known_weak_evidence": [
    "v1 HALT history: the v1 §1.5 invariant assumption was wrong. v2 corrects it but a similar invariant assumption could exist undetected elsewhere in the brief. Mitigation: P1.5 v2 partition check verifies the corrected invariant empirically rather than assuming it.",
    "The M5 session's 108 figure may have used a broader criterion than today's strict 5-min fingerprint AND legacy-origin combination. The 99-row delta (108→9) is plausibly mostly natural drain, but a criterion-difference contribution can't be ruled out.",
    "No precedent for this specific UPDATE on this table at scale. M6 Phase A v2 is the first bulk UPDATE on m.post_publish_queue with multi-table criterion.",
    "Rollback path uses captured queue_id list rather than criterion-based WHERE; depends on apply session correctly persisting the snapshot in P1.4.",
    "V1 pass condition relies on pre_dead_reason_count captured at §1.7; if pre_dead_reason_count drifts between §1.7 read and apply (unlikely; §4 P3.2 verifies no live code writers), V1 could mis-pass. Acceptable risk because the drift window is seconds and writer-absence is verified."
  ],
  "default_action": "proceed if D-01 returns clean agree; halt and escalate to PK if any escalation, pushback, or risk-elevation",
  "references": {
    "cc-0003 v2 brief": "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0003 v1 HALT result": "docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 brief (Phase B sister)": "docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "reconciliation brief": "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md",
    "queue integrity v3": "docs/briefs/2026-05-05-queue-integrity-incident.md",
    "M5 session record": "docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md",
    "§10.2 view contract": "docs/dashboard-review-2026-05/10_product_objects_and_data_model.md"
  },
  "sql_to_apply": "<full SQL from cc-0003 v2 §3 verbatim>"
}
```

### 5.3 Decision rule on D-01 verdict

- **Verdict `agree` + `proceed` + risk ≤ medium + 0 pushback:** apply.
- **Verdict `agree` with non-trivial pushback:** treat as escalation; PK approval required before apply.
- **Verdict anything else (escalate, partial, refuse, disagree):** halt; escalate to PK; do NOT apply on chat judgement alone.
- **Lesson #62 v2.50 refinement:** if D-01 pushback is verbatim-identical to a prior fire in the same workstream with no new specific objection, follow the v2.50 testable-vs-non-testable distinction; default to override only with PK explicit approval.

---

## 6. Apply procedure

After D-01 returns clean agree + PK approval:

1. **Final read-only re-verification** — re-run §1.3 + §1.4 + §1.5 + §1.7 within ~60s of apply. Confirm count is in the same range as the D-01 packet stated. If divergence > 3 rows from packet count for §1.3, halt and refresh D-01 packet. If `pre_dead_reason_count` from §1.7 changed, use the fresh value in V1. If §1.5 partition arithmetic fails, halt.
2. **`apply_migration` call** — single call:
   ```
   apply_migration(
     project_id: 'mbkmaxqhsohbtwsqolns',
     name: 'm6_phase_a_bug3_fingerprint_dead_letter_v2',
     query: <SQL from §3 verbatim>
   )
   ```
3. **Capture the result** — record success vs failure, exact return value, any RAISE NOTICE messages.
4. **Run all 6 verification queries (§7)** — if any fails, immediately move to §8.3 rollback.
5. **If all 6 PASS:** session continues to close-the-loop UPDATE on `m.chatgpt_review` (or carry as backlog) and 4-way sync.

---

## 7. Verification queries (post-apply)

Run all 6 in sequence. Each must PASS to declare success.

### V1 — Exact dead_reason population delta

```sql
SELECT COUNT(*) AS post_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'anomalous_scheduled_for_bug3_fallback';
```

**Pass:** `post_dead_reason_count = pre_dead_reason_count + N` where `pre_dead_reason_count` is captured in pre-flight §1.7 and N is the apply scope from §1.3.

**Do NOT assume `pre_dead_reason_count = 0`.** Prior rows may carry this dead_reason for any reason. §4 P3.2's function-definition string search is a code-collision check (verifies no live CODE writer), NOT a guarantee about row state.

### V2 — No remaining matching queued/failed rows

```sql
SELECT COUNT(*) AS v2_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60;
```

**Pass:** `v2_count = 0`. The v2 criterion-matching cohort is fully dead-lettered. Note: the slot-driven incidental cohort (`pd.slot_id IS NOT NULL` + 5-min fingerprint) is NOT cleared by this migration; it falls to cc-0004.

### V3 — Queued+failed depth decreased by exactly N

```sql
SELECT COUNT(*) AS v3_count
FROM m.post_publish_queue
WHERE status IN ('queued', 'failed');
```

**Pass:** `v3_count = (pre-apply queued+failed count from §1.6) - N`.

### V4 — Dead count increased by exactly N

```sql
SELECT COUNT(*) AS v4_count
FROM m.post_publish_queue
WHERE status = 'dead';
```

**Pass:** `v4_count = (pre-apply dead count from §1.6) + N`.

### V5 — Paranoia: only the captured rows changed

```sql
SELECT q.queue_id, q.status, q.dead_reason
FROM m.post_publish_queue q
WHERE q.status = 'dead'
  AND q.dead_reason = 'anomalous_scheduled_for_bug3_fallback'
ORDER BY q.queue_id;
```

**Pass:** the returned queue_id list contains AT LEAST the captured target list from §1.4. The result list size should equal `pre_dead_reason_count + N`, and (result minus pre_existing_set) should equal the captured target set exactly.

### V6 — Coherence cross-check

```sql
SELECT status, COUNT(*) AS row_count
FROM m.post_publish_queue
GROUP BY status
ORDER BY status;
```

**Pass:** the per-status totals match (§1.6 baseline) + (delta of -N from queued/failed, +N to dead). Every other status is unchanged.

---

## 8. Rollback / no-op / halt logic

### 8.1 NO-OP path (run before D-01 fire)

If §1.3 returns `phase_a_target_count = 0`:

1. NO `apply_migration` call.
2. NO D-01 fire (nothing to review).
3. Document outcome: "M6 Phase A v2 no-op: legacy-origin Bug 3 cohort drained naturally between v1 HALT (9 May, 9 candidates) and v2 apply session (0). Migration retired without apply."
4. Action list bump: close M6 Phase A as `no_op_drained_naturally`. M6 Phase B remains open as cc-0004.
5. cc-0004 §1.5 patch flag remains open (separate cycle).

### 8.2 HALT paths

**8.2.a Scope outside [3, 20]:** §1.3 returns `phase_a_target_count` outside [3, 20]:

1. NO `apply_migration` call.
2. NO D-01 fire.
3. Document: "M6 Phase A v2 halted at apply: count <N> outside [3,20]. Re-investigation required."
4. Escalate to PK with the actual count + criterion options.

**8.2.b Trigger surface anomaly:** §1.2 surfaces a non-internal trigger with external side-effects on UPDATE:

1. NO `apply_migration` call.
2. NO D-01 fire.
3. Escalate to PK with trigger definition.

**8.2.c P3.1 transitive writer collision:** §4 P3.1 finds a function/view that WRITES to dead_reason:

1. NO `apply_migration` call.
2. Escalate to PK with the function/view definition.

**8.2.d §1.5 partition anomaly (v2 NEW):** §1.5 returns `phase_a_count + slot_driven_incidental_count != total_fingerprint_cohort` OR `slot_driven_incidental_count > 7`:

1. NO `apply_migration` call.
2. NO D-01 fire (criterion stability assumption violated).
3. Document with v1 HALT context: "M6 Phase A v2 halted: §1.5 partition anomaly (phase_a=<X>, slot_driven=<Y>, total=<Z>). v2 invariant correction may itself need re-investigation."
4. Escalate to PK with the partition values + diagnostic SQL.
5. cc-0003 v3 (or new investigation brief) may be required.

### 8.3 ROLLBACK path (verification fails after apply)

If any of V1–V6 FAIL:

1. Immediately halt session continuation; do NOT proceed to close-the-loop or 4-way sync.
2. Apply rollback migration `m6_phase_a_bug3_fingerprint_dead_letter_v2_rollback`:
   ```sql
   -- Rollback for m6_phase_a_bug3_fingerprint_dead_letter_v2
   -- Uses captured queue_id list (NOT criterion-based) to avoid touching unrelated rows.
   -- Specifically does NOT touch rows that carried dead_reason='anomalous_scheduled_for_bug3_fallback'
   -- pre-apply (those rows are part of the pre_dead_reason_count baseline from §1.7).

   UPDATE m.post_publish_queue
   SET status = <pre_status>,  -- per P1.4 captured snapshot, mapped queue_id → pre_status
       dead_reason = NULL,
       updated_at = NOW()
   WHERE queue_id IN (<captured queue_id list from P1.4>);
   ```
3. Re-run V1–V6 to confirm rollback restored pre-apply state. V1 post-rollback should equal the original `pre_dead_reason_count` from §1.7.
4. Document: "M6 Phase A v2 applied + rolled back. Pre-state restored. Failure mode: <verification ID + diagnosis>."
5. PK escalation; cc-0003 v3 with corrective measures.

### 8.4 Why not template the rollback SQL fully

The rollback SQL needs the captured queue_id → pre_status mapping from §1.4. That snapshot is known only at apply time. Templating now would either (a) hardcode the 9 we expect today (wrong if count differs at apply), or (b) re-derive at apply (which is what §8.3 specifies). The brief specifies the mechanism; the apply session writes the literal SQL.

---

## 9. Stop condition

The cc-0003 v2 apply session is COMPLETE when:

1. §1 pre-flight all 7 checks PASS (incl. §1.5 partition check + §1.7 pre_dead_reason_count baseline).
2. §4 P1–P5 all PASS.
3. §5 D-01 fire returns clean agree + PK approval.
4. §6 apply procedure completes; `apply_migration` returns success.
5. §7 verification V1–V6 all PASS (V1 uses pre_dead_reason_count + N).
6. Close-the-loop UPDATE on `m.chatgpt_review` (or carry as backlog).
7. Result file v2 outcome appended to `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` (or new `…-v2.md` per PK preference).
8. 4-way sync close: session file (`docs/runtime/sessions/{YYYY-MM-DD}-cc-0003-m6-phase-a-applied-v2.md`) + sync_state pointer index entry + action_list closure of M6 Phase A + memory `recent_updates` entry.

If any of §8.1, §8.2.a, §8.2.b, §8.2.c, §8.2.d, or §8.3 paths trigger: report the outcome and stop. Do NOT cross to M6 Phase B (cc-0004) in the same session unless PK explicitly directs.

---

## Success criteria (for this brief, NOT for the apply itself)

This cc-0003 v2 brief is correctly drafted when:

1. The brief file exists at `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md` and supersedes v1 patched content.
2. The apply procedure can be executed by chat (or any future executor) using only this brief + read-only DB access + Supabase MCP, without re-reading the queue integrity v3 brief or the reconciliation brief.
3. Forbidden actions are explicit and enumerated.
4. SQL is locked to the version in §3; no other SQL is implied.
5. Verification queries are runnable as-is.
6. Rollback mechanism is concrete.
7. v1 HALT history is preserved in `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` and referenced from this brief.
8. v2 invariant correction is documented in Patch History with empirical evidence.
9. No production state changed by drafting this brief.

---

## Notes

This is the second cc-NNNN brief in the brief-runner-v0 trial; first apply-class brief; first to undergo a HALT-then-correction cycle.

If brief-runner-v0 friction surfaces during the v2 apply session, capture in result file v2 outcome §6 (Open issues). Particular things to watch for:

1. **Apply-class brief length** — v2 is longer than v1 due to v2 patch documentation. Whether this is necessary or could be tightened is a process question.
2. **D-01 packet templating** — §5.2 has `<DATETIME>` and `<N>` placeholders. Apply session fills these.
3. **`updated_at` amendment** — v2 makes it unconditional (v1 HALT confirmed presence). If v2 apply session finds `updated_at` removed, P1.1 surfaces it; SQL amendment removes the SET.
4. **Rollback templating** — §8.4 explains why rollback isn't templated.
5. **Pre-existing-state baseline pattern** — §1.7 carries forward from v1 patches.
6. **cc-0004 §1.5 propagation patch** — cc-0004's §1.5 disjointness check has the same v1 invariant assumption. Empirically there are 2 rows that match BOTH cc-0004's criterion AND Bug 3's fingerprint. cc-0004 §1.5 needs a corresponding patch (either repurpose as a forward-look or remove). Deferred to a separate cycle, requires PK greenlight per patch-application protocol.
7. **Brief-runner-v0 candidate standing rule:** any disjointness invariant claim in an apply-class brief should be pre-tested empirically with a read-only SELECT before being baked into a HALT rule. v1 §1.5 is the cautionary precedent.

---

## Patch History

### 2026-05-09 v1 patch (chat, doc-only) — retained from prior cycle

Applied two PK-directed corrections + one supporting clarification.

**Patch 1 — V1 baseline correction:**
- Added §1.7 pre-flight query capturing `pre_dead_reason_count`.
- Updated §4 P1 checklist to include P1.7 (now 7 checks; was 6).
- Updated §4 P5.1 to assert `pre_dead_reason_count + N` rather than "increases by exactly N".
- Rewrote §7 V1 query alias to `post_dead_reason_count` and pass condition to `post_dead_reason_count = pre_dead_reason_count + N`.
- Removed prior V1 note citing P3.2 as basis for assuming zero pre-existing rows (category error).
- Tightened V5 pass language.
- Added "No assumption that `pre_dead_reason_count` is 0" to §Forbidden actions.
- Updated §6 apply procedure step 1 to re-read §1.7 alongside §1.3 + §1.4 within ~60s of apply.
- Added pre-flight value to §5.2 `current_evidence` array and `known_weak_evidence` line on §1.7 capture-to-apply drift.
- Updated §8.3 ROLLBACK path note re V1 post-rollback.
- Added §Notes item promoting the pre-existing-state-baseline pattern as a candidate brief-runner-v0 standing rule.

**Patch 2 — §5.2 `consequence_if_delayed` softening:**
- Replaced "Cosmetic only…" with "Low operational risk if delayed because the cohort is naturally draining (108 → 11 over 4 days), but it remains pipeline-integrity cleanup…"
- Updated §5.2 `cost_of_waiting` to align: pipeline-integrity benefit is the residual reason to apply rather than wait for full drain.

**Patch 3 (supporting) — §4 P3.2 scope clarification:**
- Reworded P3.2 as "Code-collision check" with explicit "Scope of this check" + "What this check does NOT verify" notes pointing to §1.7 as authoritative source for table-row state.

**Patch 4 (supporting) — status/header:**
- Updated header `Status:` from `issued` to `issued (patched 2026-05-09; see Patch History)`.
- Added Patch History section.

### 2026-05-09 v2 patch (chat, doc-only) — NEW this cycle

Applied PK-directed correction following v1 HALT at §1.5. No production state changed; no D-01 fire; no apply.

**Trigger:** CC executed v1 pre-flight; HALTed at §1.5 (`slot_driven_count=2`, expected `0`). v1 §1.5 invariant assumption ("M4 backfilled `pd.scheduled_for` from slot times, so slot-driven drafts can't fingerprint Bug 3") was empirically wrong. The 2 anomalous queue_ids (`929ee2f9-7bd0-42ce-b6e0-1ff62b88f823`, `30fa6594-a233-4f1e-a984-7b37fa170fcb`) are CFW IG `needs_review` rows where the slot-bound draft has `pd.scheduled_for = s.scheduled_publish_at` (M4-backfilled correctly) but the queue row's `q.scheduled_for` is `q.created_at + ~5 min` (Bug 3 fingerprint, set pre-M3 via `get_next_scheduled_for` fallback). M4 was forward-only on `pd`; M5 closed the source path on `pd_scheduled_for` derivation; neither rewrote existing queue rows. The 2 rows are correctly cc-0004 (Phase B) scope.

**Diagnostic:** chat fired a read-only SELECT on the 2 queue_ids post-HALT. All three checks confirmed:
- `q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at` = TRUE (Phase B match)
- `pd.scheduled_for = s.scheduled_publish_at` = TRUE (M4 backfilled the draft)
- `q.scheduled_for IS DISTINCT FROM pd.scheduled_for` = TRUE (queue carries pre-M4 fallback value)

For row 1: q_sched 2026-04-27 06:45:30Z (302s after q_created), pd_sched 2026-04-28 00:36:00Z, s_sched 2026-04-28 00:36:00Z. Slot was ~17.9h after queue creation.
For row 2: q_sched 2026-04-30 00:45:39Z (301s after q_created), pd_sched 2026-05-01 00:36:00Z, s_sched 2026-05-01 00:36:00Z. Slot was ~24.0h after queue creation.

**Patch summary (v2):**
- **Header:** status → `issued v2 (patched 2026-05-09 v1 + v2; see Patch History)`. Result file path now points at the v1 HALT artifact at `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md`.
- **Task:** expected count 11 → 9. Halt range [5,25] → [3,20]. Excluded rows note added.
- **Source context:** added v1 HALT result file reference + 2026-05-09 diagnostic reference.
- **Forbidden actions:** count assertions updated; new line forbidding the v1 invariant assumption.
- **§1.1:** expanded to include `m.post_draft.{post_draft_id, slot_id, approval_status}` columns.
- **§1.3:** added `JOIN m.post_draft pd` + `pd.slot_id IS NULL` filter; expected count 11 → 9; range [3,20]; rationale updated.
- **§1.4:** added `JOIN m.post_draft` + `pd.slot_id IS NULL` filter to align snapshot with criterion.
- **§1.5:** REPURPOSED as Phase A vs Phase B partition check. Old assertion `slot_driven_count = 0` replaced with empirical partition arithmetic + tolerance for the slot-driven incidental population (~2). Decision rule rewritten.
- **§2 Selection criterion:** added `AND pd.slot_id IS NULL`; rationale updated to acknowledge the 2 excluded slot-driven rows fall to cc-0004; disjointness vs cc-0004 now guaranteed by slot_id discriminator.
- **§3 Proposed SQL:** migration name v1 → v2; v_min_expected 5 → 3, v_max_expected 25 → 20; criterion narrowed via JOIN + `pd.slot_id IS NULL`; UPDATE refactored to subquery form (cc-0004 pattern); `updated_at = NOW()` made unconditional in SET; RAISE NOTICE message updated.
- **§4 P1.5:** changed from "slot-driven sanity" to "Phase A/B partition check".
- **§4 P3.3:** count 11 → 9; query updated with JOIN.
- **§4 P3.5:** NEW — forward-look at slot-driven incidentals to confirm cc-0004 will claim them.
- **§5.1 / §5.2:** count and range updated; v1 HALT context added; references include cc-0003 v1 HALT result file + cc-0004 brief.
- **§6 step 1:** re-verification now includes §1.5 alongside §1.3, §1.4, §1.7.
- **§7 V2:** query updated with JOIN + `pd.slot_id IS NULL` filter to match v2 criterion.
- **§8.2:** added new sub-path §8.2.d for §1.5 partition anomaly. Range update [5,25] → [3,20] in §8.2.a.
- **§8.3 rollback SQL:** added `updated_at = NOW()` to SET clause to match §3.
- **§9 Stop condition:** result file path note updated; sync filename suffix `-v2`.
- **§Notes:** added items 6 (cc-0004 §1.5 propagation patch) + 7 (brief-runner-v0 candidate standing rule on disjointness invariant claims).
- **§Patch History:** added this v2 entry; v1 entries retained verbatim above.

**Forward propagation flag:** cc-0004 §1.5 disjointness check has the same v1 invariant assumption. Empirically violated by the same 2 rows. cc-0004 §1.5 needs a corresponding patch (repurpose as forward-look, or remove since slot_id discriminator already enforces disjointness). Deferred to a separate cycle. Requires PK greenlight per patch-application protocol (cc-0004 §Notes).

**Brief-runner-v0 lessons captured:**
- **L1:** Disjointness invariants in apply-class briefs MUST be pre-tested empirically before being baked into HALT rules. "Plausible from design intent" is not sufficient evidence.
- **L2:** The HALT → read-only diagnostic → doc-only patch → re-execution loop works. v1 HALT prevented an incorrect 2-row dead-letter that would have polluted the audit trail with a wrong dead_reason. Cost: ~1 cycle of latency. Benefit: correctly-scoped migration.
- **L3:** When a brief's invariant claim is violated, the result file must preserve the v1 outcome as audit trail before the v2 patch supersedes the brief. The v1 HALT result file at `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` is the precedent for this pattern.

No other sections changed materially. Forbidden actions, Allowed actions, §1.2, §1.6, §1.7, §4 P2 (mostly), §4 P4, §5.3, §7 V1, V3, V4, V5, V6, §9 (mostly), Success criteria carry forward.

---

*Brief authored 2026-05-09 Sydney; patched same day v1 + v2 per PK direction. Inputs: cc-0001 + cc-0002 brief shapes; reconciliation brief §2.6 + §6 Q1; queue integrity v3 brief §2 Bug 3 + §7 reason codes; M5 session record §Carry-forward; §10.2 view contract precedence rule 1; cc-0003 v1 HALT result file; 2026-05-09 read-only diagnostic on the 2 anomalous queue_ids. Output: full apply brief v2 (legacy-origin-only criterion + multi-table SQL via subquery + P1–P5 + D-01 packet + verification + rollback + halt paths + stop condition). No production state changed by drafting or patching. Awaiting PK direction to schedule the v2 apply session.*
