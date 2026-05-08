# Brief cc-0003 — M6 Phase A apply (Bug 3 fingerprint dead-letter)

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Executor:** chat (apply via Supabase MCP `apply_migration`)  
**Status:** issued  
**Result file:** `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` (created on completion)

---

## Task

Dead-letter the remaining `m.post_publish_queue` rows that match the Bug 3 wall-clock-fallback fingerprint identified in the queue integrity v3 brief and reconciled in `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §2.6.

Apply via Supabase MCP `apply_migration` as migration `m6_phase_a_bug3_fingerprint_dead_letter_v1`. Single atomic transaction. UPDATEs `m.post_publish_queue.status` from `queued`/`failed` to `dead` and populates `m.post_publish_queue.dead_reason` with `anomalous_scheduled_for_bug3_fallback` for matching rows.

**Expected scope at draft time:** 11 rows (read-only verified 2026-05-09). Apply session must re-verify count from a fresh read-only SELECT and halt if outside the [5, 25] range.

---

## Source context

- `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 §2 (Bug 3 framing) + §7 (Phase A reason codes) + §8 Migration 6 — canonical defect description.
- `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` §Schema state delta + §Carry-forward — confirms M5 applied; sets M6 Phase A as next-recommended; cited 108 rows at that time.
- `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §2.6 + §6 Q1 — today's reconciliation finding (11 rows; column-unblocked; §10.2 view auto-reclassification).
- `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` §10.2 precedence rule 1 — view auto-reclassifies dead rows correctly post-apply.
- `docs/00_action_list.md` v2.54 — carry-forward classification of M6 Phase A as P1.

## Scope

**In scope:**
- Pre-flight verification (read-only SELECTs against information_schema, cron.job_run_details if relevant, and the target table)
- D-01 fire (`ask_chatgpt_review`) with packet specified in §5
- Single Supabase MCP `apply_migration` call with the exact SQL in §3
- 6 post-apply verification queries from §7
- Rollback within session if any verification fails (per §8)
- Close-the-loop UPDATE to `m.chatgpt_review` (per standing protocol; or carry as backlog)
- 4-way sync at session close (session file + sync_state pointer + action_list bump + memory)

**Out of scope:**
- M6 Phase B (43 v4 mismatch rows) — separate cc-0004 apply brief
- M7 closure (documentation-only; folds into M8 4-way sync per reconciliation §6 Q2)
- M8 atomic cutover (cron 48 disable + cleanup) — separate cc-0005 apply brief
- M-09-03 view DDL — Phase 0 work
- Any change to cron 48 or cron 75 (M3/M4/M5 already addressed)
- Any DDL beyond what is explicitly written in §3 (no ALTER TABLE, no column adds, no index changes)
- Any change to `f.canonical_content_body`, `m.ai_job`, `m.post_draft` — only `m.post_publish_queue` is touched
- Any change to `c.client_publish_profile`, `c.client_publish_schedule`, taxonomy, or any `t.*`, `c.*`, `f.*`, `a.*`, `k.*` schema
- Touching `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER hold)
- Modifying `m.ef_drift_log`
- Cron edits, EF deploys, dashboard/portal/web work

## Allowed actions

- Read source files referenced in §Source context.
- Read-only `SELECT` against the database for pre-flight P1–P5 + post-apply verification.
- One `ask_chatgpt_review` D-01 fire per the packet in §5.
- One `apply_migration` call with the exact SQL in §3 (after PK explicit approval based on D-01 result).
- Up to 3 retries on the post-apply verification queries (network/timeout reasons only — not for re-trying after an actual verification failure).
- One rollback migration per §8 if any verification fails.
- One close-the-loop UPDATE to `m.chatgpt_review` after success.
- One commit creating `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md`.
- 4-way sync close commits (session file + sync_state + action_list + memory edit) at session end.

## Forbidden actions

- No second `apply_migration` call beyond the one in §3 (and a rollback if verification fails).
- No modifications to the SQL in §3 except to add `updated_at = NOW()` IFF P1 confirms `updated_at` column exists AND no auto-update trigger fires (§4 P1 covers the check).
- No changes to `m.post_draft` rows associated with the dead-lettered queue rows. The drafts remain in their current `approval_status` regardless of queue dead-letter. Per §10.2 precedence rule 1, the view's `state` becomes `dead` because the queue row is dead, NOT because the draft state changed.
- No changes to any other table.
- No D-01 fire beyond the one in §5.
- No deletes. Dead-letter is UPDATE only.
- No `apply_migration` if the read-only pre-flight count returns 0 (no-op condition per §8) or outside [5, 25] (halt condition per §8).
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`. Escalation to PK per standing protocol if D-01 returns escalate=true or pushback.
- No assumption that 11 is the exact count. Always re-verify.
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it (PHASES roadmap update + memory edit + action_list bump are the standard close).
- No Phase 0 scheduling.

---

## 1. Pre-flight verification (read-only, runs at apply session start)

The apply session begins with these read-only SELECTs. Their results inform the D-01 packet (§5) and the P1–P5 checklist (§4).

### 1.1 Confirm table + column structure

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'm'
  AND table_name = 'post_publish_queue'
  AND column_name IN ('queue_id', 'status', 'dead_reason', 'scheduled_for', 'created_at', 'updated_at', 'post_draft_id', 'client_id', 'platform')
ORDER BY column_name;
```

**Expected (from `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §1 read):** at minimum `status` (text, nullable) + `dead_reason` (text, nullable) confirmed present. `updated_at` presence is informative-only — if absent, the SQL in §3 omits it.

### 1.2 Confirm trigger surface on `m.post_publish_queue`

```sql
SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS triggerdef
FROM pg_trigger
WHERE tgrelid = 'm.post_publish_queue'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

**Decision rule:** if any trigger fires on UPDATE of `status` AND has side-effects beyond column maintenance (e.g. inserts to other tables, calls EFs, pg_notify), HALT and escalate to PK before D-01. The expected surface is empty or column-maintenance-only (e.g. `updated_at`).

### 1.3 Re-verify Phase A scope (the 11)

```sql
SELECT COUNT(*) AS phase_a_target_count,
       MIN(created_at) AS oldest_created_at,
       MAX(created_at) AS newest_created_at,
       COUNT(DISTINCT (client_id, platform)) AS partition_count
FROM m.post_publish_queue
WHERE status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (scheduled_for - created_at)) - 300) < 60;
```

**Decision rule:**
- If `phase_a_target_count = 0` → NO-OP path (§8 no-op handling). No D-01 fire. No apply. Document as "naturally drained".
- If `phase_a_target_count` outside [5, 25] → HALT. Re-investigate criterion drift; brief PK on whether to broaden criterion (per reconciliation §6 Q1).
- If `phase_a_target_count` inside [5, 25] → proceed to §1.4.

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
LEFT JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
ORDER BY q.created_at, q.queue_id;
```

**Purpose:** hold the target snapshot in chat context (or copy to a temp/scratch file) so post-apply verification can compare. The list MUST equal the count from §1.3.

### 1.5 Confirm no slot-driven targets (sanity check)

```sql
SELECT COUNT(*) AS slot_driven_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
  AND pd.slot_id IS NOT NULL;
```

**Decision rule:** expected = 0. The Bug 3 fingerprint should never appear on slot-driven drafts (M4 wrote `pd.scheduled_for` from `slot.scheduled_publish_at` for those, bypassing the `get_next_scheduled_for` fallback path entirely). If `slot_driven_count > 0`, HALT and escalate — the criterion may be capturing rows we don't intend.

### 1.6 Capture pre-state aggregates for V3/V4 verification

```sql
SELECT status, COUNT(*) AS row_count
FROM m.post_publish_queue
GROUP BY status
ORDER BY status;
```

**Purpose:** baseline for V3 (queued+failed should decrease by exactly N) and V4 (dead should increase by exactly N) post-apply.

---

## 2. Selection criterion (final, locked)

```sql
WHERE status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (scheduled_for - created_at)) - 300) < 60
```

**Rationale:** strict 5-min fingerprint per reconciliation brief §6 Q1 default recommendation. The 60-second tolerance covers wall-clock drift / cron fire-time scatter while excluding rows that happen to be 5 minutes apart for any other reason. This is the criterion that empirically matches the Bug 3 mechanism described in the queue integrity v3 brief §2 (Bug 3: `RETURN p_from_utc + INTERVAL '5 minutes'`).

**Excluded by criterion:** any row where `scheduled_for` matches a configured slot time (i.e. NOT a 5-min-from-creation fingerprint). Those rows are M6 Phase B scope (cc-0004) or M8 cleanup scope (cc-0005).

**Why not broader (reconciliation Q1 (b) or (c)):** broader criteria dead-letter rows on a hypothesis-of-anomaly rather than evidence-of-anomaly. The 5-min fingerprint is causally traceable to Bug 3's specific code path.

**Why `status IN ('queued', 'failed')` not just `'queued'`:** rows that hit the publisher and failed retain the anomalous `scheduled_for` value. Failed rows from this cohort are still anomalous and should also be dead-lettered. Confirmed safe via §1.5 sanity check.

---

## 3. Proposed SQL (final, locked)

Applied via Supabase MCP `apply_migration` with:
- **Migration name:** `m6_phase_a_bug3_fingerprint_dead_letter_v1`
- **Project ID:** `mbkmaxqhsohbtwsqolns`

```sql
-- M6 Phase A — Bug 3 fingerprint dead-letter
-- See: docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.6
-- See: docs/briefs/2026-05-05-queue-integrity-incident.md §2 Bug 3 + §7 Phase A reason codes
-- Targets queue rows where scheduled_for ≈ created_at + 5 min (Bug 3 wall-clock fallback fingerprint).
-- Pre-M3 (applied 2026-05-05 v2.50), public.get_next_scheduled_for() returned p_from_utc + INTERVAL '5 minutes'
-- on no-slot-found. These rows have anomalous schedules that don't correspond to any configured slot.
-- M3 closed the source path. This migration cleans up the residual cohort.

DO $$
DECLARE
  v_count integer;
  v_min_expected integer := 5;
  v_max_expected integer := 25;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM m.post_publish_queue
  WHERE status IN ('queued', 'failed')
    AND ABS(EXTRACT(EPOCH FROM (scheduled_for - created_at)) - 300) < 60;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'M6 Phase A NO-OP: 0 rows match criterion. Migration retiring without apply.';
  END IF;

  IF v_count < v_min_expected OR v_count > v_max_expected THEN
    RAISE EXCEPTION 'M6 Phase A SCOPE ANOMALY: % rows match criterion (expected [%-%]). Halt for re-investigation.',
      v_count, v_min_expected, v_max_expected;
  END IF;

  RAISE NOTICE 'M6 Phase A: % rows match Bug 3 fingerprint criterion. Proceeding with UPDATE.', v_count;
END $$;

UPDATE m.post_publish_queue
SET status = 'dead',
    dead_reason = 'anomalous_scheduled_for_bug3_fallback'
WHERE status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (scheduled_for - created_at)) - 300) < 60;
```

**Notes on the SQL:**

1. **Atomicity:** `apply_migration` runs the migration in a single transaction. If the DO block raises, the UPDATE rolls back automatically. No partial state.
2. **Idempotency:** if accidentally re-applied after success, the second run finds 0 rows in (`queued`,`failed`) status matching the criterion (the previous run moved them all to `dead`), the DO block raises NO-OP, and the UPDATE never executes. Safe to re-attempt.
3. **No `updated_at` set explicitly:** §4 P1 will determine whether `updated_at` exists and whether a trigger maintains it. The SQL above does NOT set `updated_at`. **Apply-session amendment rule:** if P1 confirms `updated_at` column exists AND no auto-trigger maintains it on UPDATE, AMEND the SQL to add `, updated_at = NOW()` to the SET clause before D-01 fire. Document the amendment in the D-01 packet (§5).
4. **No `WHERE queue_id IN (...)` materialised list:** the criterion-based WHERE is preferred over a materialised list because (a) it self-validates against the same criterion the DO block checked, (b) it remains correct if a row drains in the millisecond between count check and UPDATE, (c) the criterion is the audit trail, not the queue_id list.
5. **`dead_reason` value `anomalous_scheduled_for_bug3_fallback`** matches the queue integrity v3 brief §7 verbatim.

---

## 4. P1–P5 pre-flight checklist (per Lesson #61)

Apply session walks each step, captures evidence, and refuses to proceed past any FAIL.

### P1 — Pre-state capture

**Goal:** snapshot of target rows + system state before UPDATE.

- [ ] **P1.1** Run §1.1 information_schema check; confirm `status` + `dead_reason` columns present. Note `updated_at` presence → SQL amendment decision per §3 note 3.
- [ ] **P1.2** Run §1.2 pg_trigger check; confirm zero non-internal triggers on `m.post_publish_queue` OR all non-internal triggers are column-maintenance-only (no INSERTs, no pg_notify, no EF calls). HALT if any trigger has external side-effects.
- [ ] **P1.3** Run §1.3 count check; confirm `phase_a_target_count` in [5, 25]. If 0 → NO-OP path (§8). If outside [5, 25] → HALT.
- [ ] **P1.4** Run §1.4 target snapshot; persist queue_id list to chat context (or scratch file `/tmp/cc-0003-targets-{date}.csv`).
- [ ] **P1.5** Run §1.5 slot-driven sanity check; confirm `slot_driven_count = 0`. HALT if not zero.
- [ ] **P1.6** Run §1.6 pre-state aggregates; capture `(status, count)` baseline.

**Pass criterion:** all 6 checks PASS. Any FAIL halts the session.

### P2 — Side-effect surface

**Goal:** map all downstream readers/writers that touch the affected rows.

- [ ] **P2.1** `m.publisher_lock_queue_v2(p_platform, p_limit)` — publisher's row-locking function. Reads `WHERE status='queued'`. Post-apply: 11 fewer rows eligible. **Side-effect:** the next publisher cycle for affected (client_id, platform) partitions has slightly less queue depth. **Magnitude:** trivial; cap-limited publishing means the row was already not going to publish in the next several cycles anyway.
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
  **Decision rule:** for each result, read its definition and confirm the reference is read-only (SELECT, no UPDATE/INSERT/DELETE on dead_reason). HALT if any function WRITES to dead_reason in a way that conflicts.

- [ ] **P3.2** Search for any reference to the literal string `'anomalous_scheduled_for_bug3_fallback'` (collision check):
  ```sql
  SELECT n.nspname AS schema_name, p.proname AS function_name
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND pg_get_functiondef(p.oid) ILIKE '%anomalous_scheduled_for_bug3_fallback%';
  ```
  **Expected:** zero hits. This is the first migration to use this dead_reason value at scale.

- [ ] **P3.3** Verify `m.post_draft` rows associated with the target queue rows are NOT in a state that breaks downstream:
  - Pre-apply: drafts of the 11 (or however many) target queue rows have `approval_status` in (`approved`, `scheduled`, `published`, `needs_review`).
  - Post-apply: drafts unchanged. Per §10.2 precedence rule 1, the view's `state` is `dead` because the queue is dead, not because the draft state changed.
  - **Verify draft state distribution:** 
    ```sql
    SELECT pd.approval_status, COUNT(*) AS row_count
    FROM m.post_publish_queue q
    LEFT JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
    WHERE q.status IN ('queued', 'failed')
      AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
    GROUP BY pd.approval_status
    ORDER BY pd.approval_status;
    ```
  - **Decision rule:** capture for D-01 packet. No HALT condition; informational.

- [ ] **P3.4** Confirm no Cowork brief / scheduled task references `m.post_publish_queue` rows by ID:
  - Cowork tasks are listed in `docs/briefs/morning-inbox-sweep-v1.md` (DRAFT, not scheduled), `nightly-health-check-v1.md`, weekly reconciliation. None hold queue_id references.
  - **Pass:** no action needed.

**Pass criterion:** P3.1–P3.4 all reviewed; transitive readers either read-only or absent.

### P4 — Reversibility

**Goal:** confirm rollback path is concrete and reversible.

- [ ] **P4.1** Rollback SQL drafted (§8). Single migration `m6_phase_a_bug3_fingerprint_dead_letter_v1_rollback`. Reverses status from `dead` to `queued` and clears dead_reason for rows matching the captured queue_id list (NOT the criterion — the criterion-based WHERE post-rollback would match 0 rows, so we use the queue_id list captured in P1.4).
- [ ] **P4.2** Acknowledge irreversible side-effects: NONE. The UPDATE has no irreversible downstream consequences (no notifications fired, no emails sent, no external API calls, no row deletions).
- [ ] **P4.3** Time-window for rollback: indefinite. There is no auto-process that would re-process dead rows (publisher only locks `status='queued'`).
- [ ] **P4.4** Confirm rollback would not collide with any newer rows: a fresh row entering `dead` status with the same `dead_reason` after this apply but before a hypothetical rollback would be in scope of the rollback. **Mitigation:** the rollback SQL uses the captured queue_id list, not the criterion + dead_reason filter, so it cannot affect rows captured outside the apply session.

**Pass criterion:** P4.1–P4.4 all PASS.

### P5 — Post-state verification preconditions

**Goal:** define the post-apply assertions before apply, not after.

- [ ] **P5.1** V1: count of rows with `dead_reason='anomalous_scheduled_for_bug3_fallback'` increases by exactly N (the captured pre-apply count).
- [ ] **P5.2** V2: count of rows matching the Bug 3 fingerprint criterion in `status IN ('queued','failed')` becomes 0.
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
Apply M6 Phase A: dead-letter remaining Bug 3 fingerprint queue rows in m.post_publish_queue.

Migration name: m6_phase_a_bug3_fingerprint_dead_letter_v1
Project: mbkmaxqhsohbtwsqolns
Method: Supabase MCP apply_migration (single atomic transaction)
Scope: rows matching `status IN ('queued','failed') AND ABS(EXTRACT(EPOCH FROM (scheduled_for - created_at)) - 300) < 60`
Expected count at apply time: ~11 rows (read-only verified <DATETIME>; halts if outside [5,25]).
UPDATE: SET status='dead', dead_reason='anomalous_scheduled_for_bug3_fallback'
No other tables touched. No DDL. No cron edits. No EF deploys.

WHY: M3 (applied 2026-05-05 v2.50) closed the Bug 3 source path (public.get_next_scheduled_for fallback). 
This migration cleans up the residual queue rows that were created by Bug 3 before M3 landed. Today's 
snapshot shows 11 rows (down from 108 on 5 May; FIFO drained 97 over 4 days).

ROLLBACK: single rollback migration available; UPDATE the captured queue_id list back to status='queued' 
with dead_reason=NULL. No irreversible side effects.

VERIFICATION: 6 post-apply queries (V1-V6) per cc-0003 §7.
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply M6 Phase A: dead-letter ~11 Bug 3 fingerprint rows in m.post_publish_queue",
  "production_action_if_approved": "Single Supabase MCP apply_migration call. UPDATE status from queued/failed to dead with dead_reason='anomalous_scheduled_for_bug3_fallback' for rows matching the strict 5-min fingerprint criterion.",
  "consequence_if_delayed": "Cosmetic only. The 11 rows continue to drain via FIFO publishing (per evidence: 108→11 over 4 days). The publisher does NOT publish them anomalously — it publishes them in queue order. The cosmetic effect is that health-check Cowork keeps surfacing them as 'overdue queued', and the future m.vw_pipeline_state view's first day shows noise.",
  "cost_of_waiting": "Low. Each day of delay drains 5-25 rows naturally. The migration may become a no-op within ~7-14 days at current drain rate.",
  "current_evidence": [
    "Pre-flight §1.3 count check: <N> rows match criterion at <DATETIME>",
    "Pre-flight §1.5 sanity check: 0 slot-driven rows in scope",
    "Pre-flight §1.2 trigger check: <result>",
    "M5 session record cited 108 rows on 5 May; today's count <N> is consistent with FIFO drain hypothesis",
    "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.6 confirms column-unblocked + view-compatible",
    "docs/briefs/2026-05-05-queue-integrity-incident.md v3 §2 Bug 3 mechanism",
    "docs/briefs/2026-05-05-queue-integrity-incident.md v3 §7 reason code 'anomalous_scheduled_for_bug3_fallback' verbatim match"
  ],
  "known_weak_evidence": [
    "The M5 session's 108 figure may have used a broader criterion than today's strict 5-min fingerprint. The 97-row delta is plausibly natural drain (108 / 4 days = ~27/day; today's 11 / next-7-days projection ~consistent), but a criterion-difference contribution can't be ruled out without re-running the M5-era query.",
    "No precedent for this specific UPDATE on this table in this scale (M5 was DDL+function refactor; M1–M4 were function/trigger bodies, not bulk row updates on m.post_publish_queue). M6 Phase A is the first bulk UPDATE on this table at scale.",
    "Rollback path uses captured queue_id list rather than criterion-based WHERE; depends on apply session correctly persisting the snapshot in P1.4."
  ],
  "default_action": "proceed if D-01 returns clean agree; halt and escalate to PK if any escalation, pushback, or risk-elevation",
  "references": {
    "cc-0003 brief": "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "reconciliation brief": "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md",
    "queue integrity v3": "docs/briefs/2026-05-05-queue-integrity-incident.md",
    "M5 session record": "docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md",
    "§10.2 view contract": "docs/dashboard-review-2026-05/10_product_objects_and_data_model.md"
  },
  "sql_to_apply": "<full SQL from cc-0003 §3 verbatim, with optional updated_at amendment per P1.1 outcome>"
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

1. **Final read-only re-verification** — re-run §1.3 + §1.4 within ~60s of apply. Confirm count is in the same range as the D-01 packet stated. If divergence > 3 rows from packet count, halt and refresh D-01 packet.
2. **`apply_migration` call** — single call:
   ```
   apply_migration(
     project_id: 'mbkmaxqhsohbtwsqolns',
     name: 'm6_phase_a_bug3_fingerprint_dead_letter_v1',
     query: <SQL from §3 verbatim, possibly with updated_at amendment per P1.1>
   )
   ```
3. **Capture the result** — record success vs failure, exact return value, any RAISE NOTICE messages.
4. **Run all 6 verification queries (§7)** — if any fails, immediately move to §8 rollback.
5. **If all 6 PASS:** session continues to close-the-loop UPDATE on `m.chatgpt_review` (or carry as backlog) and 4-way sync.

---

## 7. Verification queries (post-apply)

Run all 6 in sequence. Each must PASS to declare success.

### V1 — Exact dead_reason population count

```sql
SELECT COUNT(*) AS v1_count
FROM m.post_publish_queue
WHERE dead_reason = 'anomalous_scheduled_for_bug3_fallback';
```

**Pass:** `v1_count = N` where N is the pre-apply target count from §1.3. (Note: this assumes no prior rows had this exact dead_reason; §4 P3.2 verified zero prior usage.)

### V2 — No remaining matching queued/failed rows

```sql
SELECT COUNT(*) AS v2_count
FROM m.post_publish_queue
WHERE status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (scheduled_for - created_at)) - 300) < 60;
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
  AND q.dead_reason = 'anomalous_scheduled_for_bug3_fallback'
ORDER BY q.queue_id;
```

**Pass:** the returned queue_id list equals the captured target list from §1.4 exactly. No additional rows; no missing rows.

### V6 — Coherence cross-check

```sql
SELECT status, COUNT(*) AS row_count
FROM m.post_publish_queue
GROUP BY status
ORDER BY status;
```

**Pass:** the per-status totals match (§1.6 baseline) + (delta of -N from queued/failed, +N to dead). Every other status is unchanged.

---

## 8. Rollback / no-op logic

### 8.1 NO-OP path (run before D-01 fire)

If §1.3 returns `phase_a_target_count = 0`:

1. NO `apply_migration` call.
2. NO D-01 fire (nothing to review).
3. Document outcome in the cc-0003 result file (§8 outcome): "M6 Phase A no-op: criterion drained naturally between 9 May (11 rows) and apply session (0 rows). Migration retired without apply."
4. Action list bump: close M6 Phase A as `no_op_drained_naturally`. M6 Phase B remains open as cc-0004.
5. No memory edit beyond the standard close.

### 8.2 HALT path (criterion outside expected range)

If §1.3 returns `phase_a_target_count` outside [5, 25]:

1. NO `apply_migration` call.
2. NO D-01 fire (criterion may have drifted; re-investigation needed).
3. Document: "M6 Phase A halted at apply: count <N> outside [5,25]. Re-investigation required per reconciliation §6 Q1."
4. Escalate to PK with the actual count + criterion options:
   - (a) lower the floor (if count < 5; e.g. [1, 25]) and re-fire pre-flight
   - (b) raise the ceiling (if count > 25; broader criterion may be in play)
   - (c) re-investigate criterion (was M5 session's 108 a different criterion?)
5. cc-0003 stays issued; PK directs cc-0003v2 or new investigation brief.

### 8.3 ROLLBACK path (verification fails after apply)

If any of V1–V6 FAIL:

1. Immediately halt session continuation; do NOT proceed to close-the-loop or 4-way sync.
2. Apply rollback migration `m6_phase_a_bug3_fingerprint_dead_letter_v1_rollback`:
   ```sql
   -- Rollback for m6_phase_a_bug3_fingerprint_dead_letter_v1
   -- Uses captured queue_id list (NOT criterion-based) to avoid touching unrelated rows.
   
   UPDATE m.post_publish_queue
   SET status = <pre_status>,  -- per P1.4 captured snapshot, mapped queue_id → pre_status
       dead_reason = NULL
   WHERE queue_id IN (<captured queue_id list from P1.4>);
   ```
   The actual rollback SQL is constructed at apply time from P1.4's snapshot (cannot be templated in advance because queue_ids are not known).
3. Re-run V1–V6 to confirm rollback restored pre-apply state.
4. Document: "M6 Phase A applied + rolled back. Pre-state restored. Failure mode: <verification ID + diagnosis>."
5. PK escalation; cc-0003v2 with corrective measures.

### 8.4 Why not template the rollback in this brief

The rollback SQL needs the captured queue_id → pre_status mapping from §1.4. That snapshot is known only at apply time. Templating now would either (a) hardcode the 11 we see today (wrong if count differs at apply), or (b) re-derive at apply (which is what §8.3 specifies). The brief specifies the mechanism; the apply session writes the literal SQL.

---

## 9. Stop condition

The cc-0003 apply session is COMPLETE when:

1. §1 pre-flight all 6 checks PASS.
2. §4 P1–P5 all PASS.
3. §5 D-01 fire returns clean agree + PK approval.
4. §6 apply procedure completes; `apply_migration` returns success.
5. §7 verification V1–V6 all PASS.
6. Close-the-loop UPDATE on `m.chatgpt_review` (or carry as backlog).
7. Result file `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` created and committed.
8. 4-way sync close: session file (`docs/runtime/sessions/{YYYY-MM-DD}-cc-0003-m6-phase-a-applied.md`) + sync_state v2.55+ pointer index entry + action_list v2.55+ closure of M6 Phase A + memory `recent_updates` entry.

If any of §8.1, §8.2, or §8.3 paths trigger: report the outcome and stop. Do NOT cross to M6 Phase B (cc-0004) in the same session unless PK explicitly directs.

The cc-0003 brief itself (this file) is COMPLETE when committed and verified. The apply session is a separate execution that uses this brief.

---

## Success criteria (for this brief draft, NOT for the apply itself)

This cc-0003 brief is correctly drafted when:

1. The brief file exists at `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md`.
2. The apply procedure can be executed by chat (or any future executor) using only this brief + read-only DB access + Supabase MCP, without re-reading the queue integrity v3 brief or the reconciliation brief.
3. Forbidden actions are explicit and enumerated.
4. SQL is locked to the version in §3; no other SQL is implied.
5. Verification queries are runnable as-is.
6. Rollback mechanism is concrete.
7. No production state changed by drafting this brief.

---

## Notes

This is the second cc-NNNN brief in the brief-runner-v0 trial; first apply-class brief. cc-0001 was decision-only (Phase 0 defaults). cc-0002 (`p1-sd-triage-sync.md`) closed v2.50.

If brief-runner-v0 friction surfaces during the apply session, capture in result file §6 (Open issues) per cc-0001 §6 pattern. Particular things to watch for in this first apply-class cycle:

1. **Apply-class brief length** — this brief is much longer than cc-0001 (decision-only). Whether the length is necessary or could be tightened is a process question for cc-0004 (M6 Phase B, similar shape).
2. **D-01 packet templating** — §5.2 has a `<DATETIME>` placeholder for the pre-flight verification timestamp. Apply session fills this. Whether the brief should include a fill-template or leave fully prose is a question.
3. **`updated_at` amendment** — the conditional SQL amendment (§3 note 3) adds branching. If P1.1 always finds `updated_at` present without auto-trigger, the amendment is mandatory; if rarely, the conditional is overhead. Empirical answer at apply time.
4. **Rollback templating** — §8.4 explains why rollback isn't templated in this brief. Whether this is acceptable or a brief-runner-v0 gap is a question for PK after cc-0003 result file §6.

---

*Brief authored 2026-05-09 Sydney. Inputs: cc-0001 + cc-0002 brief shapes; reconciliation brief §2.6 + §6 Q1; queue integrity v3 brief §2 Bug 3 + §7 reason codes; M5 session record §Carry-forward; §10.2 view contract precedence rule 1. Output: full apply brief (selection criterion + SQL + P1–P5 + D-01 packet + verification + rollback + stop condition). No production state changed by drafting. Awaiting PK direction to schedule the apply session.*
