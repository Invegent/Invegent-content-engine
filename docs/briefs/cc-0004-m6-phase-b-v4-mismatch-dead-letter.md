# Brief cc-0004 — M6 Phase B apply (v4 mismatch dead-letter)

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Executor:** chat (apply via Supabase MCP `apply_migration`) OR Claude Code per brief-runner-v0  
**Status:** issued (draft; may be patched after cc-0003 execution results land — see §Notes)  
**Result file:** `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` (created on completion)

---

## Task

Dead-letter the remaining `m.post_publish_queue` rows that are slot-driven (v4 origin, `pd.slot_id IS NOT NULL`) but whose queue `scheduled_for` does not match the slot's `scheduled_publish_at`. These are pre-M4 legacy artifacts where the enqueue cron filled `q.scheduled_for` from `get_next_scheduled_for(...)` instead of from the slot, despite the draft being slot-driven. M4 (applied 2026-05-05 v2.50) closed this source path forward; this migration cleans up the residual cohort.

Apply via Supabase MCP `apply_migration` as migration `m6_phase_b_v4_mismatch_dead_letter_v1`. Single atomic transaction. UPDATEs `m.post_publish_queue.status` from `queued`/`failed` to `dead` and populates `m.post_publish_queue.dead_reason` with `anomalous_pre_m4_v4_mismatch` for matching rows.

**Expected scope at draft time:** 43 rows (read-only verified 2026-05-09). Apply session must re-verify count from a fresh read-only SELECT and halt if outside the [20, 65] range.

**Sequencing constraint:** cc-0004 apply must NOT proceed until cc-0003 completes successfully OR resolves to a clean NO-OP. If cc-0003 fails / halts / rolls back, cc-0004 is blocked until cc-0003 is resolved. cc-0004 brief authoring (this draft) is parallel-safe; the apply itself is sequenced.

---

## Source context

- `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 §2 (Defect 5 revised — enqueue cron ignored slot intent) + §8 Migration 4 (the fix that closed the source path) — canonical defect description.
- `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` — M4 applied; backfill of 147 v4 drafts; carry-forward statement of the 47 v4 mismatch rows.
- `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` §Schema state delta + §Carry-forward — M5 applied; explicit "47 v4-origin queue mismatch rows still carried-forward (M6 Phase B scope; M4 forward-only)".
- `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §2.7 + §6 Q1 — today's reconciliation finding (43 rows; column-unblocked; §10.2 view auto-reclassification; same shape as Phase A but slot-driven).
- `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md` (incl. 2026-05-09 patches) — pattern source for this brief; §1.7 baseline + §4 P3.2 scope distinction + softened D-01 wording all carry forward verbatim.
- `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` §10.2 precedence rule 1 — view auto-reclassifies dead rows correctly post-apply.
- `docs/00_action_list.md` v2.54 — carry-forward classification of M6 Phase B as P3 (sequenced after M6 Phase A).

**`dead_reason` canonical value:** the queue integrity v3 brief §7 specified reason codes for Phase A only (Bug 3 fingerprint + clean-time unknowns). It did NOT specify a reason code for the v4 mismatch class (because in v3, "Phase B" meant M8-time legacy-origin cleanup, not v4 mismatches — see reconciliation brief §2.9 on the naming reuse). The reconciliation brief §2.7 proposed `anomalous_pre_m4_v4_mismatch` (or similar). cc-0004 adopts `anomalous_pre_m4_v4_mismatch` as the canonical value. PK can override via patch before apply.

## Scope

**In scope:**
- Pre-flight verification (read-only SELECTs against information_schema, pg_trigger, the target table + JOINs to `m.post_draft` and `m.slot`)
- D-01 fire (`ask_chatgpt_review`) with packet specified in §5
- Single Supabase MCP `apply_migration` call with the exact SQL in §3
- 6 post-apply verification queries from §7
- Rollback within session if any verification fails (per §8)
- Close-the-loop UPDATE to `m.chatgpt_review` (per standing protocol; or carry as backlog)
- 4-way sync at session close (session file + sync_state pointer + action_list bump + memory)

**Out of scope:**
- M6 Phase A (11 Bug 3 fingerprint rows) — separate apply per cc-0003. **cc-0004 apply blocks until cc-0003 resolves.**
- M7 closure (documentation-only; folds into M8 4-way sync per reconciliation §6 Q2)
- M8 atomic cutover (cron 48 disable + cleanup) — separate cc-0005 apply brief
- M-09-03 view DDL — Phase 0 work
- Any change to cron 48 or cron 75 (M3/M4/M5 already addressed)
- Any DDL beyond what is explicitly written in §3 (no ALTER TABLE, no column adds, no index changes)
- Any change to `f.canonical_content_body`, `m.ai_job`, `m.slot`, `m.post_draft` — only `m.post_publish_queue` is touched (the JOIN to `m.post_draft` and `m.slot` is read-only for criterion derivation)
- Any change to `c.client_publish_profile`, `c.client_publish_schedule`, taxonomy, or any `t.*`, `c.*`, `f.*`, `a.*`, `k.*` schema
- Touching `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER hold)
- Modifying `m.ef_drift_log`
- Cron edits, EF deploys, dashboard/portal/web work

## Allowed actions

- Read source files referenced in §Source context.
- Read-only `SELECT` against the database for pre-flight P1–P5 + post-apply verification, including JOINs across `m.post_publish_queue`, `m.post_draft`, `m.slot`, `pg_proc`, `pg_views`, `pg_trigger`, `information_schema.columns`.
- One `ask_chatgpt_review` D-01 fire per the packet in §5.
- One `apply_migration` call with the exact SQL in §3 (after PK explicit approval based on D-01 result, AND after cc-0003 resolves).
- Up to 3 retries on the post-apply verification queries (network/timeout reasons only — not for re-trying after an actual verification failure).
- One rollback migration per §8 if any verification fails.
- One close-the-loop UPDATE to `m.chatgpt_review` after success.
- One commit creating `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md`.
- 4-way sync close commits (session file + sync_state + action_list + memory edit) at session end.

## Forbidden actions

- No second `apply_migration` call beyond the one in §3 (and a rollback if verification fails).
- No modifications to the SQL in §3 except to add `updated_at = NOW()` IFF P1 confirms `updated_at` column exists AND no auto-update trigger fires (§4 P1 covers the check).
- No changes to `m.post_draft` rows associated with the dead-lettered queue rows. The drafts remain in their current `approval_status` regardless of queue dead-letter. Per §10.2 precedence rule 1, the view's `state` becomes `dead` because the queue row is dead, NOT because the draft state changed.
- No changes to `m.slot` rows referenced by the dead-lettered queue rows. The slots remain valid; only the queue row's intent-to-publish-at-this-time is being retired.
- No changes to any other table.
- No D-01 fire beyond the one in §5.
- No deletes. Dead-letter is UPDATE only.
- No `apply_migration` if the read-only pre-flight count returns 0 (no-op condition per §8) or outside [20, 65] (halt condition per §8).
- No `apply_migration` until cc-0003 completes successfully OR resolves to a clean NO-OP. **Sequencing gate.**
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`. Escalation to PK per standing protocol if D-01 returns escalate=true or pushback.
- No assumption that 43 is the exact count. Always re-verify.
- No assumption that `pre_dead_reason_count` is 0. Always read it from §1.7 at apply time and use the captured value in V1 pass.
- No assumption that Phase A and Phase B scopes are disjoint without empirical check. §1.5 verifies disjointness.
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it (PHASES roadmap update + memory edit + action_list bump are the standard close).
- No Phase 0 scheduling.

---

## 1. Pre-flight verification (read-only, runs at apply session start)

The apply session begins with these read-only SELECTs. Their results inform the D-01 packet (§5) and the P1–P5 checklist (§4).

### 1.1 Confirm table + column structure (across joined tables)

```sql
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE (table_schema, table_name) IN (
  ('m', 'post_publish_queue'),
  ('m', 'post_draft'),
  ('m', 'slot')
)
AND column_name IN ('queue_id', 'status', 'dead_reason', 'scheduled_for', 'created_at', 'updated_at',
                    'post_draft_id', 'client_id', 'platform',
                    'slot_id', 'approval_status',
                    'scheduled_publish_at')
ORDER BY table_schema, table_name, column_name;
```

**Expected:** at minimum `m.post_publish_queue.{queue_id, status, dead_reason, scheduled_for, post_draft_id}` + `m.post_draft.{post_draft_id, slot_id}` + `m.slot.{slot_id, scheduled_publish_at}` confirmed present. `m.post_publish_queue.updated_at` presence is informative-only — if absent, the SQL in §3 omits it.

### 1.2 Confirm trigger surface on `m.post_publish_queue`

```sql
SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS triggerdef
FROM pg_trigger
WHERE tgrelid = 'm.post_publish_queue'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

**Decision rule:** if any trigger fires on UPDATE of `status` AND has side-effects beyond column maintenance (e.g. inserts to other tables, calls EFs, pg_notify), HALT and escalate to PK before D-01. The expected surface is empty or column-maintenance-only (e.g. `updated_at`).

### 1.3 Re-verify Phase B scope (the 43)

```sql
SELECT COUNT(*) AS phase_b_target_count,
       MIN(q.created_at) AS oldest_created_at,
       MAX(q.created_at) AS newest_created_at,
       COUNT(DISTINCT (q.client_id, q.platform)) AS partition_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN m.slot s ON s.slot_id = pd.slot_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NOT NULL
  AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at;
```

**Decision rule:**
- If `phase_b_target_count = 0` → NO-OP path (§8 no-op handling). No D-01 fire. No apply. Document as "naturally drained".
- If `phase_b_target_count` outside [20, 65] → HALT. Re-investigate criterion drift (per reconciliation §6 Q1).
- If `phase_b_target_count` inside [20, 65] → proceed to §1.4.

**Why [20, 65]:** today's count is 43 (read 2026-05-09). Drain rate from M5 session (47 → 43) is ~1/day, much slower than Phase A (108 → 11 = ~24/day average) because v4 mismatch rows have slot times that may be days into the future and drain via cap-limited publishing rather than the 5-min wall-clock anomaly that drains immediately. Range allows for ~3-4 weeks of natural drain (lower bound) or unexpected criterion-broadening (upper bound).

### 1.4 Capture target snapshot

```sql
SELECT q.queue_id,
       q.client_id,
       q.platform,
       q.scheduled_for AS queue_scheduled_for,
       s.scheduled_publish_at AS slot_scheduled_publish_at,
       (q.scheduled_for - s.scheduled_publish_at) AS schedule_delta,
       q.created_at,
       q.status AS pre_status,
       q.post_draft_id,
       pd.approval_status AS draft_status,
       pd.slot_id
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN m.slot s ON s.slot_id = pd.slot_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NOT NULL
  AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
ORDER BY q.created_at, q.queue_id;
```

**Purpose:** hold the target snapshot in chat context (or copy to a temp/scratch file) so post-apply verification (V5) can compare. The list MUST equal the count from §1.3. The `schedule_delta` column is informative — captures how far off each row's `scheduled_for` is from its slot's intended publish time.

### 1.5 Disjointness check vs Phase A criterion (sanity inversion of cc-0003 §1.5)

```sql
SELECT COUNT(*) AS phase_a_overlap_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN m.slot s ON s.slot_id = pd.slot_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NOT NULL
  AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60;
```

**Decision rule:** expected = 0. Phase A requires `pd.slot_id IS NULL` (verified by cc-0003 §1.5); Phase B requires `pd.slot_id IS NOT NULL`. They are disjoint by the slot_id discriminator alone. This check looks for any row that ALSO matches Bug 3's 5-min fingerprint within Phase B's slot-driven population — a pathological edge case where a slot-driven draft somehow had `q.scheduled_for` set via the Bug 3 fallback path (theoretically impossible post-M4 since M4 backfilled `pd.scheduled_for` from slot times; pre-M4 + pre-M3 could in theory produce this). If `phase_a_overlap_count > 0`, HALT and escalate — either cc-0003 should have caught these (and cc-0004 must defer until they're resolved) or the criterion class has unexpected interaction.

**Note on order-independence:** if cc-0003 has already run and dead-lettered its 11 rows, those rows now have `status='dead'` and would NOT match this check (status filter excludes dead). So if cc-0003 has completed, this check measures only Phase B. If cc-0003 has not yet run, this check measures cross-criterion overlap. Either case: `phase_a_overlap_count = 0` is the expected outcome.

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
WHERE dead_reason = 'anomalous_pre_m4_v4_mismatch';
```

**Purpose:** baseline for V1 (§7). Captures any rows that already carry the target `dead_reason` value before this migration runs. The apply session MUST persist this number in chat context and use it in V1's pass condition.

**Why this is required:** any prior session, manual operator UPDATE, or test migration could have set `dead_reason='anomalous_pre_m4_v4_mismatch'` on rows in `m.post_publish_queue` independently. Function-definition string searches (§4 P3.2) only verify that no production CODE writes this value — they say nothing about whether existing TABLE ROWS already carry it. Treat the table state as ground truth; never assume `pre_dead_reason_count = 0`.

**Expected (informative, not a halt criterion):** likely 0 (this is the first migration to use this dead_reason value at scale per §4 P3.2 expectation). If `pre_dead_reason_count` is non-trivial (say > 5) and unexpected, capture for the D-01 packet but do NOT halt — the migration's V1 pass condition compensates. Document the surprise in the result file §6.

---

## 2. Selection criterion (final, locked)

```sql
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NOT NULL
  AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
```

With JOINs:
```sql
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN m.slot s ON s.slot_id = pd.slot_id
```

**Rationale:** v4 mismatch fingerprint per reconciliation brief §2.7. This identifies queue rows whose draft is slot-driven (`pd.slot_id IS NOT NULL`) but whose `q.scheduled_for` does not match the slot's intended publish time. Per the queue integrity v3 brief §2 Defect 5, pre-M4 the enqueue cron used `COALESCE(pd.scheduled_for, get_next_scheduled_for(...))` without consulting `slot.scheduled_publish_at`, causing this mismatch. M4 (applied 2026-05-05) added slot lookup to the COALESCE chain AND backfilled `pd.scheduled_for` from slot times for 147 v4 drafts. Despite the backfill, queue rows already created with the old `scheduled_for` value persist — those are this migration's targets.

**Excluded by criterion:**
- Legacy-origin rows (`pd.slot_id IS NULL`): not slot-driven; not Phase B scope. Some are Phase A scope (cc-0003); the rest are M8 cleanup scope (cc-0005).
- Slot-driven rows where `q.scheduled_for = s.scheduled_publish_at`: aligned correctly; not anomalous.
- Dead or published rows: not in active queue.

**Why `IS DISTINCT FROM` not `!=`:** `IS DISTINCT FROM` treats two NULLs as equal and a NULL-vs-non-NULL as distinct. This handles the edge case where `q.scheduled_for IS NULL` (would mismatch any non-NULL slot time, correctly captured) or `s.scheduled_publish_at IS NULL` (slot without intent — shouldn't happen but is handled). Using `!=` would silently drop NULL-bearing rows from the criterion, an accidental scope reduction.

**Why `status IN ('queued', 'failed')` not just `'queued'`:** rows that hit the publisher and failed retain the anomalous `scheduled_for` value. Failed rows from this cohort are still anomalous and should also be dead-lettered. Confirmed safe via §1.5 disjointness check.

**Why not include `created_at` upper bound (e.g. "only pre-M4 rows"):** by definition, post-M4 (5 May v2.50) the enqueue cron uses the slot lookup, so post-M4 v4 drafts should have `q.scheduled_for = s.scheduled_publish_at`. Any row currently mismatching was created with the old logic OR points to a slot whose `scheduled_publish_at` was modified post-creation. Either way, the row is anomalous in its current state and dead-letterable; the timing of creation is implicit in the criterion match, not an additional filter.

---

## 3. Proposed SQL (final, locked)

Applied via Supabase MCP `apply_migration` with:
- **Migration name:** `m6_phase_b_v4_mismatch_dead_letter_v1`
- **Project ID:** `mbkmaxqhsohbtwsqolns`

```sql
-- M6 Phase B — v4 mismatch dead-letter
-- See: docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.7
-- See: docs/briefs/2026-05-05-queue-integrity-incident.md §2 Defect 5 + §8 Migration 4
-- Targets queue rows that are slot-driven (pd.slot_id IS NOT NULL) but whose q.scheduled_for
-- does not match the slot's scheduled_publish_at. Pre-M4 (applied 2026-05-05 v2.50), the enqueue
-- cron used `COALESCE(pd.scheduled_for, get_next_scheduled_for(...))` without consulting the slot,
-- producing rows whose intended publish time silently drifted from slot intent.
-- M4 closed the source path forward + backfilled pd.scheduled_for. This migration cleans up the
-- residual queue rows that were created before M4 landed.

DO $$
DECLARE
  v_overlap_count integer;
  v_count integer;
  v_min_expected integer := 20;
  v_max_expected integer := 65;
BEGIN
  -- Disjointness sanity (Phase A vs Phase B); see cc-0004 §1.5
  SELECT COUNT(*) INTO v_overlap_count
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  JOIN m.slot s ON s.slot_id = pd.slot_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NOT NULL
    AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
    AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60;

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'M6 Phase B DISJOINTNESS FAIL: % rows match BOTH Phase B and Phase A (Bug 3 fingerprint) criterion. Halt for re-investigation.',
      v_overlap_count;
  END IF;

  -- Phase B count check
  SELECT COUNT(*) INTO v_count
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  JOIN m.slot s ON s.slot_id = pd.slot_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NOT NULL
    AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'M6 Phase B NO-OP: 0 rows match criterion. Migration retiring without apply.';
  END IF;

  IF v_count < v_min_expected OR v_count > v_max_expected THEN
    RAISE EXCEPTION 'M6 Phase B SCOPE ANOMALY: % rows match criterion (expected [%-%]). Halt for re-investigation.',
      v_count, v_min_expected, v_max_expected;
  END IF;

  RAISE NOTICE 'M6 Phase B: % rows match v4 mismatch criterion. Proceeding with UPDATE.', v_count;
END $$;

UPDATE m.post_publish_queue
SET status = 'dead',
    dead_reason = 'anomalous_pre_m4_v4_mismatch'
WHERE queue_id IN (
  SELECT q.queue_id
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  JOIN m.slot s ON s.slot_id = pd.slot_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NOT NULL
    AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
);
```

**Notes on the SQL:**

1. **Atomicity:** `apply_migration` runs the migration in a single transaction. If the DO block raises, the UPDATE rolls back automatically. No partial state.
2. **Idempotency:** if accidentally re-applied after success, the second run finds 0 rows in `(queued, failed)` status matching the criterion (the previous run moved them all to `dead`), the DO block raises NO-OP, and the UPDATE never executes. Safe to re-attempt.
3. **No `updated_at` set explicitly:** §4 P1 will determine whether `updated_at` exists and whether a trigger maintains it. The SQL above does NOT set `updated_at`. **Apply-session amendment rule:** if P1 confirms `updated_at` column exists AND no auto-trigger maintains it on UPDATE, AMEND the SQL to add `, updated_at = NOW()` to the SET clause before D-01 fire. Document the amendment in the D-01 packet (§5).
4. **`WHERE queue_id IN (...)` subquery form preferred:** unlike cc-0003's single-table criterion, cc-0004's multi-table criterion can't be expressed as a simple `WHERE` on the UPDATE target. The IN-subquery form: (a) self-validates against the same criterion the DO block checked, (b) remains correct if a row drains in the millisecond between count check and UPDATE (subquery re-evaluates), (c) the criterion is the audit trail. Alternative forms (`UPDATE ... FROM`) are valid in Postgres but the IN-subquery is more readable and matches the pre-flight diagnostic verbatim.
5. **`dead_reason` value `anomalous_pre_m4_v4_mismatch`** matches the reconciliation brief §2.7 proposal. PK can override via patch; current source-doc canonical is the reconciliation brief.
6. **Disjointness check inside the DO block** is doubly redundant with §1.5 (which runs at session start). The redundancy is intentional: §1.5 catches the issue pre-D-01; the DO block catches any drift between §1.5 read and apply (within the same transaction window). Belt-and-braces; the DO block's overlap check is cheap.

---

## 4. P1–P5 pre-flight checklist (per Lesson #61)

Apply session walks each step, captures evidence, and refuses to proceed past any FAIL.

### P1 — Pre-state capture

**Goal:** snapshot of target rows + system state before UPDATE.

- [ ] **P1.1** Run §1.1 information_schema check; confirm columns across `m.post_publish_queue`, `m.post_draft`, `m.slot` present. Note `m.post_publish_queue.updated_at` presence → SQL amendment decision per §3 note 3.
- [ ] **P1.2** Run §1.2 pg_trigger check; confirm zero non-internal triggers on `m.post_publish_queue` OR all non-internal triggers are column-maintenance-only (no INSERTs, no pg_notify, no EF calls). HALT if any trigger has external side-effects.
- [ ] **P1.3** Run §1.3 count check; confirm `phase_b_target_count` in [20, 65]. If 0 → NO-OP path (§8). If outside [20, 65] → HALT.
- [ ] **P1.4** Run §1.4 target snapshot; persist queue_id list + slot scheduling delta to chat context (or scratch file `/tmp/cc-0004-targets-{date}.csv`).
- [ ] **P1.5** Run §1.5 disjointness check (Phase A overlap); confirm `phase_a_overlap_count = 0`. HALT if not zero.
- [ ] **P1.6** Run §1.6 pre-state aggregates; capture `(status, count)` baseline.
- [ ] **P1.7** Run §1.7 pre_dead_reason_count baseline; persist value for V1 pass condition. No HALT criterion; informative-only.

**Pass criterion:** all 7 checks PASS. Any FAIL halts the session.

**Sequencing pre-condition:** before P1.1, the apply session MUST verify that cc-0003 has resolved successfully OR cleanly NO-OP'd. Read `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` and confirm §1 result status is `Complete` (or equivalent). If cc-0003 result file does not exist OR shows `Partial` / `Blocked`, HALT cc-0004 and escalate.

### P2 — Side-effect surface

**Goal:** map all downstream readers/writers that touch the affected rows.

- [ ] **P2.1** `m.publisher_lock_queue_v2(p_platform, p_limit)` — publisher's row-locking function. Reads `WHERE status='queued'`. Post-apply: 43 fewer rows eligible. **Side-effect:** the next publisher cycle for affected (client_id, platform) partitions has slightly less queue depth. **Magnitude:** larger than cc-0003 (43 vs 11) but still trivial; cap-limited publishing means the rows were spread across multiple cycles anyway. Per §1.4 partition_count, distribution across (client, platform) partitions determines per-partition impact.
- [ ] **P2.2** `m.cleanup_queue_on_publish_v1` trigger — fires on `m.post_publish` INSERT, NOT on `m.post_publish_queue` UPDATE. **Not affected by this migration.**
- [ ] **P2.3** `enqueue-publish-queue-every-5m` cron jobid 48 — INSERTs into `m.post_publish_queue` with conflict guard. **Not affected.** Does not read existing dead rows. Post-M4 the cron writes `q.scheduled_for = COALESCE(pd.scheduled_for, s.scheduled_publish_at, ...)` so new v4 inserts are aligned; this migration cleans pre-M4 residue only.
- [ ] **P2.4** Dashboard / portal queries — if any UI surface reads `m.post_publish_queue` directly: counts of "queued" decrease by N; counts of "dead" increase by N. Cosmetic only; no broken queries.
- [ ] **P2.5** `m.vw_pipeline_state` — not yet built (Phase 0 / M-09-03). Future view's first read post-apply correctly classifies these rows as `dead` per §10.2 precedence rule 1. No impact on view design.
- [ ] **P2.6** Health-check Cowork sweep — the daily 02:00 AEST `docs/audit/health/{date}.md` may surface different counts post-apply. Cosmetic; expected.
- [ ] **P2.7** `m.fill_pending_slots` — v4 draft-generation function. Reads `m.slot` to fill drafts; does NOT read `m.post_publish_queue`. The 43 dead-lettered queue rows correspond to 43 slot rows whose draft was attempted-to-publish but is now retired. The slots themselves remain valid — if `m.fill_pending_slots` re-attempts a fill for those slots, it will create a new draft + queue row with correct `scheduled_for` (post-M4 logic). **Decision rule:** confirm this re-attempt path is acceptable. Most likely YES — the slot's intent is still valid; only the historical queue row was misaligned.

**Pass criterion:** P2.1–P2.7 all reviewed; no unaccounted-for side effect identified. **Note re P2.7:** this is the new check vs cc-0003, reflecting Phase B's interaction with the slot-driven generation path.

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
  **Decision rule:** for each result, read its definition and confirm the reference is read-only (SELECT, no UPDATE/INSERT/DELETE on dead_reason). HALT if any function WRITES to dead_reason in a way that conflicts.

- [ ] **P3.2** Code-collision check: search for any function that writes the literal string `'anomalous_pre_m4_v4_mismatch'`:
  ```sql
  SELECT n.nspname AS schema_name, p.proname AS function_name
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND pg_get_functiondef(p.oid) ILIKE '%anomalous_pre_m4_v4_mismatch%';
  ```
  **Scope of this check:** function-definition string search. Verifies that no production CODE writes this dead_reason value (i.e. no concurrent writer can collide with this migration's UPDATE).  
  **What this check does NOT verify:** whether existing rows in `m.post_publish_queue` already carry this dead_reason value. That is a TABLE-STATE question answered by §1.7's `pre_dead_reason_count` query, not by this code-collision check.  
  **Expected:** zero hits on this code search. **Acting on the result:** if non-zero, read the function body and confirm the writer is dormant / removed / safe; HALT if a live writer could collide.

- [ ] **P3.3** Verify `m.post_draft` rows associated with the target queue rows are NOT in a state that breaks downstream:
  - Pre-apply: drafts of the 43 (or however many) target queue rows have `approval_status` in (`approved`, `scheduled`, `published`, `needs_review`).
  - Post-apply: drafts unchanged. Per §10.2 precedence rule 1, the view's `state` is `dead` because the queue is dead, not because the draft state changed.
  - **Verify draft state distribution:**
    ```sql
    SELECT pd.approval_status, COUNT(*) AS row_count
    FROM m.post_publish_queue q
    JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
    JOIN m.slot s ON s.slot_id = pd.slot_id
    WHERE q.status IN ('queued', 'failed')
      AND pd.slot_id IS NOT NULL
      AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
    GROUP BY pd.approval_status
    ORDER BY pd.approval_status;
    ```
  - **Decision rule:** capture for D-01 packet. No HALT condition; informational.

- [ ] **P3.4** Verify `m.slot` rows referenced by the target queue rows are intact:
  - The criterion uses INNER JOIN on `m.slot`, so rows with deleted/orphaned slots are already excluded. But verify the slot rows exist with reasonable `scheduled_publish_at` values:
    ```sql
    SELECT s.scheduled_publish_at IS NULL AS slot_time_null_flag,
           COUNT(*) AS row_count
    FROM m.post_publish_queue q
    JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
    JOIN m.slot s ON s.slot_id = pd.slot_id
    WHERE q.status IN ('queued', 'failed')
      AND pd.slot_id IS NOT NULL
      AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
    GROUP BY s.scheduled_publish_at IS NULL;
    ```
  - **Decision rule:** if any rows have `s.scheduled_publish_at IS NULL`, HALT and escalate — these are slots without intent, suggesting upstream data quality issues outside Phase B scope.

- [ ] **P3.5** Confirm no Cowork brief / scheduled task references `m.post_publish_queue` rows by ID:
  - Cowork tasks listed in `docs/briefs/morning-inbox-sweep-v1.md` (DRAFT, not scheduled), `nightly-health-check-v1.md`, weekly reconciliation. None hold queue_id references.
  - **Pass:** no action needed.

**Pass criterion:** P3.1–P3.5 all reviewed; transitive readers either read-only or absent; no slot-data-quality issues.

### P4 — Reversibility

**Goal:** confirm rollback path is concrete and reversible.

- [ ] **P4.1** Rollback SQL drafted (§8). Single migration `m6_phase_b_v4_mismatch_dead_letter_v1_rollback`. Reverses status from `dead` to `queued` (or original `pre_status` per P1.4) and clears dead_reason for rows matching the captured queue_id list (NOT the criterion — the criterion-based WHERE post-rollback would match 0 rows, so we use the queue_id list captured in P1.4).
- [ ] **P4.2** Acknowledge irreversible side-effects: NONE. The UPDATE has no irreversible downstream consequences (no notifications fired, no emails sent, no external API calls, no row deletions).
- [ ] **P4.3** Time-window for rollback: indefinite. There is no auto-process that would re-process dead rows (publisher only locks `status='queued'`).
- [ ] **P4.4** Confirm rollback would not collide with any newer rows: a fresh row entering `dead` status with the same `dead_reason` after this apply but before a hypothetical rollback would be in scope of the rollback. **Mitigation:** the rollback SQL uses the captured queue_id list, not the criterion + dead_reason filter, so it cannot affect rows captured outside the apply session.
- [ ] **P4.5** Rollback creates an audit-anomalous state: the rolled-back rows would have `q.scheduled_for != s.scheduled_publish_at` again. They would re-match Phase B criterion. This is acceptable — rollback restores the pre-apply state exactly, including the v4 mismatch. The decision to dead-letter these rows again would be a fresh cc-0004v2 cycle.

**Pass criterion:** P4.1–P4.5 all PASS.

### P5 — Post-state verification preconditions

**Goal:** define the post-apply assertions before apply, not after.

- [ ] **P5.1** V1: count of rows with `dead_reason='anomalous_pre_m4_v4_mismatch'` post-apply equals `pre_dead_reason_count + N` (where `pre_dead_reason_count` is captured in §1.7 and N is the apply scope from §1.3). **Do not assume `pre_dead_reason_count = 0`.**
- [ ] **P5.2** V2: count of rows matching the v4 mismatch criterion in `status IN ('queued','failed')` becomes 0.
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
Apply M6 Phase B: dead-letter remaining v4 mismatch queue rows in m.post_publish_queue.

Migration name: m6_phase_b_v4_mismatch_dead_letter_v1
Project: mbkmaxqhsohbtwsqolns
Method: Supabase MCP apply_migration (single atomic transaction)
Scope: rows matching `q.status IN ('queued','failed') AND pd.slot_id IS NOT NULL
        AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at`
        (JOINing m.post_publish_queue q -> m.post_draft pd -> m.slot s)
Expected count at apply time: ~43 rows (read-only verified <DATETIME>; halts if outside [20,65]).
UPDATE: SET status='dead', dead_reason='anomalous_pre_m4_v4_mismatch'
No other tables touched. No DDL. No cron edits. No EF deploys. JOINs to m.post_draft and m.slot
are read-only for criterion derivation.

SEQUENCING: cc-0003 (M6 Phase A) must complete first. cc-0003 result file must exist with status
'Complete' before this apply runs.

WHY: M4 (applied 2026-05-05 v2.50) closed the source path (enqueue cron now respects slot intent)
and backfilled 147 v4 drafts' pd.scheduled_for from slot times. Despite the backfill, queue rows
created pre-M4 retain their original anomalous q.scheduled_for. This migration cleans up the
residual cohort. Today's snapshot shows 43 rows (down from 47 on 5 May; slow drain ~1/day because
slot times can be days into the future).

ROLLBACK: single rollback migration available; UPDATE the captured queue_id list back to
status='queued' (or original pre_status) with dead_reason=NULL. No irreversible side effects.

VERIFICATION: 6 post-apply queries (V1-V6) per cc-0004 §7. V1 uses the pre_dead_reason_count
baseline from pre-flight §1.7 (does not assume 0).
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply M6 Phase B: dead-letter ~43 v4 mismatch rows in m.post_publish_queue",
  "production_action_if_approved": "Single Supabase MCP apply_migration call. UPDATE status from queued/failed to dead with dead_reason='anomalous_pre_m4_v4_mismatch' for rows matching the slot-driven mismatch criterion (q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at while pd.slot_id IS NOT NULL).",
  "consequence_if_delayed": "Low operational risk if delayed because the cohort is naturally draining (47 → 43 over 4 days, ~1/day), but it remains pipeline-integrity cleanup and prevents stale queue noise in future m.vw_pipeline_state. The publisher does publish these rows on their (anomalous) scheduled_for times — i.e. they will publish at times that don't match their slot intent. For most rows this is a small drift (minutes to hours); for some pre-M4 backfill misses it could be larger. Health-check Cowork keeps surfacing them as schedule-mismatched, and Phase 0's m.vw_pipeline_state would classify them with their anomalous scheduled_publish_at on its first day until the migration runs.",
  "cost_of_waiting": "Low-to-moderate. Each day of delay drains ~1 row naturally; full drain would take ~6 weeks at current rate. Pipeline-integrity benefit (clean baseline for m.vw_pipeline_state, removes ambiguity in slot-intent vs queue-intent) is the residual reason to apply rather than wait for full drain. Note: cc-0004's drain rate is much slower than cc-0003's (~1/day vs ~24/day), so the wait-for-natural-drain strategy is less attractive here than for Phase A.",
  "current_evidence": [
    "Pre-flight §1.3 count check: <N> rows match criterion at <DATETIME>",
    "Pre-flight §1.5 disjointness check: 0 Phase A overlap rows",
    "Pre-flight §1.2 trigger check: <result>",
    "Pre-flight §1.7 pre_dead_reason_count: <P> (baseline used in V1; not assumed to be 0)",
    "Pre-flight §4 P3.4 slot data quality: <slot_time_null_flag>=false confirmed",
    "M5 session record cited 47 rows on 5 May; today's count <N> is consistent with slow-drain hypothesis",
    "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.7 confirms column-unblocked + view-compatible + same shape as Phase A",
    "docs/briefs/2026-05-05-queue-integrity-incident.md v3 §2 Defect 5 mechanism (revised)",
    "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md (incl. patches) — pattern source",
    "cc-0003 result file status: <Complete | NO-OP | Partial | Blocked> (sequencing pre-condition)"
  ],
  "known_weak_evidence": [
    "The M5 session's 47 figure may have used a different criterion than today's strict IS DISTINCT FROM. The 4-row delta is plausibly natural drain (~1/day; today's 43 / 6-week projection consistent), but a criterion-difference contribution can't be ruled out.",
    "No precedent for this specific UPDATE pattern (multi-table JOIN criterion via subquery) on this table at scale. cc-0003 was single-table; cc-0004 is the first multi-table criterion bulk UPDATE in the M-series.",
    "Rollback path uses captured queue_id list rather than criterion-based WHERE; depends on apply session correctly persisting the snapshot in P1.4.",
    "V1 pass condition relies on pre_dead_reason_count captured at §1.7; if pre_dead_reason_count drifts between §1.7 read and apply (unlikely; only writers of this dead_reason would cause drift, and §4 P3.2 verifies no live code writers), V1 could mis-pass. Acceptable risk because the drift window is seconds and writer-absence is verified.",
    "Phase B drain rate (~1/day) means the cohort is much more persistent than Phase A. If the apply is delayed beyond ~1-2 weeks, the natural drain may not change the apply-time count materially — unlike Phase A where drain was rapid.",
    "P2.7 re-fill consideration: dead-lettering these queue rows leaves their slots in a state where m.fill_pending_slots may re-create drafts for them. New drafts would have correct (post-M4) scheduling. This is desirable, but means the publisher cycle for affected (client, platform) partitions may briefly have MORE queue activity post-apply, not less, as slots get re-filled. Document for D-01 reviewer awareness."
  ],
  "default_action": "proceed if D-01 returns clean agree; halt and escalate to PK if any escalation, pushback, or risk-elevation",
  "references": {
    "cc-0004 brief": "docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "cc-0003 brief (pattern source)": "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "reconciliation brief": "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md",
    "queue integrity v3": "docs/briefs/2026-05-05-queue-integrity-incident.md",
    "M4 session record": "docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md",
    "M5 session record": "docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md",
    "§10.2 view contract": "docs/dashboard-review-2026-05/10_product_objects_and_data_model.md"
  },
  "sql_to_apply": "<full SQL from cc-0004 §3 verbatim, with optional updated_at amendment per P1.1 outcome>"
}
```

### 5.3 Decision rule on D-01 verdict

- **Verdict `agree` + `proceed` + risk ≤ medium + 0 pushback:** apply.
- **Verdict `agree` with non-trivial pushback:** treat as escalation; PK approval required before apply.
- **Verdict anything else (escalate, partial, refuse, disagree):** halt; escalate to PK; do NOT apply on chat judgement alone.
- **Lesson #62 v2.50 refinement:** if D-01 pushback is verbatim-identical to a prior fire in the same workstream with no new specific objection, follow the v2.50 testable-vs-non-testable distinction; default to override only with PK explicit approval.

---

## 6. Apply procedure

After D-01 returns clean agree + PK approval AND cc-0003 has resolved:

1. **Sequencing gate** — verify cc-0003 result file at `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` exists and §1 status is `Complete` (or equivalent). If not, HALT.
2. **Final read-only re-verification** — re-run §1.3 + §1.4 + §1.5 + §1.7 within ~60s of apply. Confirm count is in the same range as the D-01 packet stated. If divergence > 5 rows from packet count for §1.3, halt and refresh D-01 packet. If `pre_dead_reason_count` from §1.7 changed since the earlier capture, use the fresh value in V1. If §1.5 disjointness fails, halt.
3. **`apply_migration` call** — single call:
   ```
   apply_migration(
     project_id: 'mbkmaxqhsohbtwsqolns',
     name: 'm6_phase_b_v4_mismatch_dead_letter_v1',
     query: <SQL from §3 verbatim, possibly with updated_at amendment per P1.1>
   )
   ```
4. **Capture the result** — record success vs failure, exact return value, any RAISE NOTICE messages.
5. **Run all 6 verification queries (§7)** — if any fails, immediately move to §8 rollback.
6. **If all 6 PASS:** session continues to close-the-loop UPDATE on `m.chatgpt_review` (or carry as backlog) and 4-way sync.

---

## 7. Verification queries (post-apply)

Run all 6 in sequence. Each must PASS to declare success.

### V1 — Exact dead_reason population delta

```sql
SELECT COUNT(*) AS post_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'anomalous_pre_m4_v4_mismatch';
```

**Pass:** `post_dead_reason_count = pre_dead_reason_count + N` where `pre_dead_reason_count` is captured in pre-flight §1.7 and N is the apply scope from §1.3.

**Do NOT assume `pre_dead_reason_count = 0`.** Prior rows may carry this dead_reason for any reason (manual operator UPDATEs, previous test migrations, prior partial runs of this migration if any). §4 P3.2's function-definition string search is a code-collision check (verifies no live CODE writer), NOT a guarantee about row state.

If V1 fails because the post-count differs from `pre_dead_reason_count + N` by an unexpected amount, the rollback path (§8.3) uses the captured queue_id list (§1.4), which is unaffected by `pre_dead_reason_count` drift.

### V2 — No remaining matching queued/failed rows

```sql
SELECT COUNT(*) AS v2_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN m.slot s ON s.slot_id = pd.slot_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NOT NULL
  AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at;
```

**Pass:** `v2_count = 0`. The criterion-matching cohort is fully dead-lettered.

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
  AND q.dead_reason = 'anomalous_pre_m4_v4_mismatch'
ORDER BY q.queue_id;
```

**Pass:** the returned queue_id list contains AT LEAST the captured target list from §1.4 (every captured queue_id is present with status='dead' and the target dead_reason). Any additional queue_ids in the result correspond to the `pre_dead_reason_count` baseline from §1.7 — specifically, the result list size should equal `pre_dead_reason_count + N`, and the (result minus pre_existing_set) should equal the captured target set exactly.

**Apply session implementation note:** to make V5 fully deterministic, capture the pre-existing set in pre-flight §1.7 (extend that query to return `queue_id` list, not just count, if memory budget allows). Then V5 set-difference is straightforward.

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

If §1.3 returns `phase_b_target_count = 0`:

1. NO `apply_migration` call.
2. NO D-01 fire (nothing to review).
3. Document outcome in the cc-0004 result file: "M6 Phase B no-op: criterion drained naturally between 9 May (43 rows) and apply session (0 rows). Migration retired without apply."
4. Action list bump: close M6 Phase B as `no_op_drained_naturally`. M8 cleanup remains open as cc-0005.
5. No memory edit beyond the standard close.

### 8.2 HALT paths (criterion outside expected range OR disjointness fail OR sequencing gate fail)

**8.2.a Scope outside [20, 65]:** §1.3 returns `phase_b_target_count` outside [20, 65]:

1. NO `apply_migration` call.
2. NO D-01 fire (criterion may have drifted).
3. Document: "M6 Phase B halted at apply: count <N> outside [20,65]. Re-investigation required."
4. Escalate to PK with the actual count + criterion options:
   - (a) lower the floor (if count < 20; e.g. [5, 65]) and re-fire pre-flight
   - (b) raise the ceiling (if count > 65; broader criterion may be in play, OR a regression in M4's source-path closure produced new mismatches)
   - (c) re-investigate criterion
5. cc-0004 stays issued; PK directs cc-0004v2 or new investigation brief.

**8.2.b Disjointness fail:** §1.5 returns `phase_a_overlap_count > 0`:

1. NO `apply_migration` call.
2. NO D-01 fire.
3. Document: "M6 Phase B halted: <N> rows match BOTH Phase B and Phase A criterion. Disjointness invariant violated."
4. Escalate to PK with the overlapping queue_ids. Possible causes: (a) cc-0003 has not yet run and these rows would be claimed by cc-0003 first — simply wait for cc-0003 and re-fire pre-flight; (b) cc-0003 ran but did not capture these specific rows (criterion mismatch) — deeper investigation required.
5. cc-0004 stays issued; PK directs path.

**8.2.c Sequencing gate fail:** cc-0003 result file does not exist OR shows `Partial` / `Blocked`:

1. NO `apply_migration` call.
2. NO D-01 fire.
3. Document: "M6 Phase B halted at apply: cc-0003 sequencing gate not met. cc-0003 result status: <X>."
4. Wait for cc-0003 resolution. cc-0004 stays issued.

### 8.3 ROLLBACK path (verification fails after apply)

If any of V1–V6 FAIL:

1. Immediately halt session continuation; do NOT proceed to close-the-loop or 4-way sync.
2. Apply rollback migration `m6_phase_b_v4_mismatch_dead_letter_v1_rollback`:
   ```sql
   -- Rollback for m6_phase_b_v4_mismatch_dead_letter_v1
   -- Uses captured queue_id list (NOT criterion-based) to avoid touching unrelated rows.
   -- Specifically does NOT touch rows that carried dead_reason='anomalous_pre_m4_v4_mismatch'
   -- pre-apply (those rows are part of the pre_dead_reason_count baseline from §1.7).

   UPDATE m.post_publish_queue
   SET status = <pre_status>,  -- per P1.4 captured snapshot, mapped queue_id → pre_status
       dead_reason = NULL
   WHERE queue_id IN (<captured queue_id list from P1.4>);
   ```
   The actual rollback SQL is constructed at apply time from P1.4's snapshot (cannot be templated in advance because queue_ids are not known).
3. Re-run V1–V6 to confirm rollback restored pre-apply state. V1 post-rollback should equal the original `pre_dead_reason_count` from §1.7. V2 post-rollback should equal the original `phase_b_target_count` from §1.3 (the v4 mismatch criterion will match the rolled-back rows again).
4. Document: "M6 Phase B applied + rolled back. Pre-state restored. Failure mode: <verification ID + diagnosis>."
5. PK escalation; cc-0004v2 with corrective measures.

### 8.4 Why not template the rollback in this brief

The rollback SQL needs the captured queue_id → pre_status mapping from §1.4. That snapshot is known only at apply time. Templating now would either (a) hardcode the 43 we see today (wrong if count differs at apply), or (b) re-derive at apply (which is what §8.3 specifies). The brief specifies the mechanism; the apply session writes the literal SQL.

---

## 9. Stop condition

The cc-0004 apply session is COMPLETE when:

1. cc-0003 sequencing gate met (cc-0003 result status `Complete` or clean NO-OP).
2. §1 pre-flight all 7 checks PASS (incl. §1.5 disjointness + §1.7 pre_dead_reason_count baseline).
3. §4 P1–P5 all PASS.
4. §5 D-01 fire returns clean agree + PK approval.
5. §6 apply procedure completes; `apply_migration` returns success.
6. §7 verification V1–V6 all PASS (V1 uses pre_dead_reason_count + N).
7. Close-the-loop UPDATE on `m.chatgpt_review` (or carry as backlog).
8. Result file `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` created and committed.
9. 4-way sync close: session file (`docs/runtime/sessions/{YYYY-MM-DD}-cc-0004-m6-phase-b-applied.md`) + sync_state pointer index entry + action_list closure of M6 Phase B + memory `recent_updates` entry.

If any of §8.1, §8.2.a, §8.2.b, §8.2.c, or §8.3 paths trigger: report the outcome and stop. Do NOT cross to M8 cutover (cc-0005) in the same session unless PK explicitly directs.

The cc-0004 brief itself (this file) is COMPLETE when committed and verified. The apply session is a separate execution that uses this brief.

---

## Success criteria (for this brief draft, NOT for the apply itself)

This cc-0004 brief is correctly drafted when:

1. The brief file exists at `docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md`.
2. The apply procedure can be executed by chat (or any future executor) using only this brief + read-only DB access + Supabase MCP, without re-reading the queue integrity v3 brief or the reconciliation brief or cc-0003.
3. Forbidden actions are explicit and enumerated, including the cc-0003 sequencing gate.
4. SQL is locked to the version in §3; no other SQL is implied.
5. Verification queries are runnable as-is.
6. Rollback mechanism is concrete.
7. Disjointness check vs Phase A is explicit (§1.5).
8. Multi-table criterion handled via subquery form (§3).
9. No production state changed by drafting this brief.

---

## Notes

This is the third cc-NNNN brief in the brief-runner-v0 trial; second apply-class brief (after cc-0003).

### Open: cc-0003 friction patches may propagate to cc-0004

PK directive at issuance: "cc-0004 may need a small patch after cc-0003 execution if CC surfaces brief-runner friction." Particular things CC may surface that would call for a cc-0004 patch:

1. **Apply-class brief length** — if cc-0003 felt over-specified or under-specified for CC's working style, cc-0004 inherits the same shape and would benefit from the same patch.
2. **D-01 packet `<DATETIME>` placeholder convention** — if CC found the placeholder unclear, cc-0004's same placeholders need the same treatment.
3. **`updated_at` amendment branching** — if cc-0003's P1.1 found `updated_at` always present (or always absent), cc-0004 can pre-decide rather than carry the conditional branching.
4. **Rollback templating** — if PK decides to template rollback in the brief rather than defer to apply session, cc-0004's §8.3 + §8.4 need rewriting.
5. **Pre-existing-state baseline pattern** — if the §1.7 baseline pattern was unclear or burdensome, cc-0004's §1.7 (and §1.5 disjointness check, and §3 DO block overlap check) need re-shaping. Likely candidate for promotion to a brief-runner-v0 standing rule.
6. **Multi-table criterion handling** — cc-0004 introduces JOIN-based criterion via subquery form. cc-0003 didn't have this. CC may surface friction with the subquery form, especially in the rollback (which uses queue_id list — not criterion — so JOINs only apply to the apply path, not rollback). Patch could either (a) align rollback with subquery form too (currently uses queue_id list, which is correct), or (b) document the asymmetry more explicitly.
7. **Disjointness check (§1.5)** — NEW vs cc-0003. If CC finds the disjointness check redundant with the sequencing gate (cc-0003 must complete first, so its rows are already dead and outside Phase B criterion), the check could be downgraded to informative-only or removed.

None of these would require a full rewrite. All are tightening passes if needed.

### Patch-application protocol (if needed)

If CC surfaces friction at cc-0003 result file §6, chat will:
1. Read cc-0003 result file content.
2. Identify which friction items map to cc-0004 sections.
3. Author a single patch commit per the cc-0003 patch precedent (header status update + Patch History section + targeted edits).
4. Verify patch landed correctly.
5. Report patch SHA to PK.

No D-01 fire required for the patch (doc-only). PK greenlight required before the patch is applied to the brief.

### Other brief-runner-v0 watch items

Same as cc-0003 §Notes 1–5. Particular for cc-0004:
- **Drain rate observability** — cc-0004's drain rate is so slow (~1/day) that the natural NO-OP outcome is unlikely within any reasonable apply timeline. cc-0003's NO-OP path is more likely to fire than cc-0004's.
- **Slot interaction (P2.7)** — cc-0004's P2.7 is a new check vs cc-0003. If `m.fill_pending_slots` re-fills the dead-lettered slots' drafts post-apply, the publisher cycle may briefly have INCREASED queue activity, not decreased. This is desirable (the new drafts have correct scheduling) but worth highlighting in the result file.

---

*Brief authored 2026-05-09 Sydney. Inputs: cc-0003 brief shape (incl. patches); reconciliation brief §2.7 + §6 Q1; queue integrity v3 brief §2 Defect 5 + §8 Migration 4; M4 + M5 session records §Carry-forward; §10.2 view contract precedence rule 1. Output: full apply brief (selection criterion + multi-table SQL via subquery + P1–P5 + D-01 packet + verification + rollback + halt paths + sequencing gate + stop condition). No production state changed by drafting. cc-0004 apply blocks until cc-0003 resolves. Awaiting cc-0003 result + PK direction to schedule the cc-0004 apply session.*
