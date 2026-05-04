# Brief: F-PUB-009 fix — slot intent honoured at fill time (forward-only, structural)

**Status**: ready-for-night-job (pre-flight + draft) | apply gated on D-01 review and PK approval next chat session
**Priority**: P1 (promoted from P3 by 2026-05-03 pipeline-investigation-night)
**Finding ID**: F-PUB-009
**Related**: B-CAP-AVALANCHE (P2 — symptom this fix prevents recurring), F-AAP-001 (the avalanche source), F-PUB-010 (the hard cap that compounds the symptom), F-RECOVER-LOOP-001 (separate fix, not blocked by this one)
**Created**: 2026-05-04 morning Sydney
**Author**: chat
**Honours**: D-01 (MCP review on sql_destructive), D-170 (chat applies migrations only), D-186 (closure-first), Lesson #51, Lesson #62 type-(c)

---

## Why this brief was promoted

3 May 2026 pipeline-investigation-night surfaced that the legacy `get_next_scheduled_for` function overrides slot intent at queue-row creation time. Slots saying "publish 4 May 00:00" produce queue rows saying "publish 21 May" because the COALESCE in jobid 48 falls through to the spread-forward function whenever `post_draft.scheduled_for IS NULL`.

The symptom (cap-vs-throughput mismatch on 4 streams, ~30 approved drafts cap-blocked) was triaged by cap lift. The root cause is F-PUB-009. Without this fix, raised caps refill within a week and the same backpressure recurs.

## Problem

Jobid 48 (queue-fill cron) builds queue rows with this scheduled_for logic (per investigation):

```sql
scheduled_for = COALESCE(
  pd.scheduled_for,
  get_next_scheduled_for(j.client_id, j.platform, NOW())
)
```

For slot-driven v4 drafts (the dominant production path now), `pd.scheduled_for IS NULL` because slot fill writes the draft without a scheduled_for. The COALESCE falls through to `get_next_scheduled_for`, which is the legacy spread function: it picks "next available slot in the publish-rate stream" by walking forward from `now()`. Result: scheduled_for diverges arbitrarily from `slot.scheduled_publish_at`.

Operational impacts:
- Queue ordering desyncs from slot intent — content scheduled by the slot system publishes whenever the legacy spread function picks.
- Queue rows pile up days/weeks ahead (legacy_spread_mismatch_count in the matrix view detects this — already wired).
- Cap is exhausted quickly because the spread keeps stretching the queue forward.

Pre-flight 2026-05-04 morning will confirm current `legacy_spread_mismatch_count` per stream from `audit.v_brand_platform_audit_matrix`.

## Fix shape (Option α — forward-only, recommended)

At slot fill time, copy `slot.scheduled_publish_at` into `post_draft.scheduled_for`. Then jobid 48's COALESCE uses slot intent naturally — no jobid 48 change required.

Old drafts already in queue are not retroactively rewritten. New drafts created after the fix will queue with correct timing. Existing spread-stretched queue rows drain normally per their current scheduled_for (publisher respects them as scheduled).

Two alternatives considered and rejected:

- **Option β (change jobid 48 COALESCE to look up slot intent inline)**: More invasive, harder to verify, requires jobid 48 SQL rewrite. Doesn't fix any case Option α misses.
- **Option γ (Option α + retroactive rewrite of existing queue rows)**: Out of scope. Mass-rewriting scheduled_for on 100+ queued rows is high-risk and unnecessary — they'll drain at current cadence and new rows will queue correctly. If specific over-cap streams need acceleration, that's a separate cap-lift / requeue decision.

## Cowork execution scope

**IN SCOPE for night job**:
- All pre-flight steps PF1–PF6 (read-only)
- Drafting the migration file with confirmed identifiers from PF1+PF2
- Pre-flight report at `docs/audit/runs/2026-05-04-fpub009-preflight.md`

**OUT OF SCOPE for night job**:
- Applying the migration (chat-only per D-170)
- Firing MCP review (chat-only per D-01)
- Any modifications to existing queue rows (separate triage if needed)
- Any changes to jobid 48 SQL

If PF reveals an unexpected fill mechanism (e.g. fills happen via multiple paths, or the slot fill function doesn't exist where expected), STOP and write findings. Do not improvise.

## Pre-flight (read-only, night-job-runnable)

**PF1**. Locate the slot fill function. Search:
- `pg_get_functiondef(oid)` for `m.fill_pending_slots` or any function name matching `%fill%slot%` or `%slot%fill%` in `m`, `public`
- `supabase/migrations/` for the most recent CREATE OR REPLACE matching same

Report: function name(s), schema(s), full current definition, source migration filename, return signature, parameter list (especially the `p_shadow` parameter referenced in 3 May investigation).

**Note (2026-05-04 morning):** PF1 already partially completed during the deep investigation phase. `m.fill_pending_slots(p_max_slots integer DEFAULT 5, p_shadow boolean DEFAULT true)` confirmed. Inside the function, the slot-fill UPDATE is at the bottom of the loop body:

```sql
UPDATE m.slot
SET status = 'fill_in_progress',
    filled_draft_id = v_skeleton_draft_id,
    canonical_ids = v_canonical_ids,
    evergreen_id = v_evergreen_id,
    is_evergreen = v_is_evergreen,
    format_chosen = v_chosen_format,
    slot_confidence = v_slot_confidence,
    filled_at = NOW(),
    updated_at = NOW()
WHERE slot_id = v_slot.slot_id;
```

The skeleton post_draft INSERT/UPSERT happens earlier in the same conditional branch. Pattern 1 (function-internal patch) is therefore feasible — add the post_draft.scheduled_for update inline.

**PF2**. Confirm `m.post_draft` and `m.slot` schemas at the relevant columns:
- `m.post_draft.scheduled_for` exists, type, nullable, default, current fill rate (% of recent rows where it IS NULL)
- `m.slot.scheduled_publish_at` exists, type, nullable
- `m.slot.filled_draft_id` is the linkage from slot to draft

Already confirmed during investigation: `m.post_draft.scheduled_for` is `timestamp with time zone, nullable`. `m.slot.scheduled_publish_at` is `timestamp with time zone, NOT NULL`. `m.slot.filled_draft_id` is `uuid, nullable`.

**PF3**. Confirm jobid 48's queue-fill SQL. Already confirmed during investigation:

```sql
INSERT INTO m.post_publish_queue (...)
SELECT ..., COALESCE(pd.scheduled_for, public.get_next_scheduled_for(j.client_id, j.platform, NOW())), ...
```

**PF4**. Measure current legacy_spread_mismatch:

```sql
SELECT client_slug, platform, legacy_spread_mismatch_count
FROM audit.v_brand_platform_audit_matrix
WHERE legacy_spread_mismatch_count > 0
ORDER BY legacy_spread_mismatch_count DESC;
```

From investigation snapshot: PP FB 13, PP YT 10, NDIS-Yarns YT 6, Invegent IG 6, CFW IG 5, NDIS-Yarns LI 4, Invegent LI 1, CFW LI 1, CFW FB 1. Total = 47 across 9 streams.

**PF5**. Apply during quiet window. Cron jobid 75 (`fill-pending-slots-every-10m`) runs at minute 0/10/20/30/40/50. Apply between ticks.

**PF6** (surprise pre-flight per Lesson #51). Are there any slot-driven drafts where `m.post_draft.scheduled_for IS NOT NULL` already?

```sql
SELECT count(*) AS already_set, count(*) FILTER (WHERE d.scheduled_for IS NULL) AS null_set
FROM m.post_draft d
JOIN m.slot s ON s.filled_draft_id = d.post_draft_id
WHERE d.created_at >= now() - interval '14 days';
```

If `already_set > 0`, investigate which path wrote it before authoring the migration.

## Proposed fix (DRAFT, do not apply)

Migration filename: `YYYYMMDDHHMMSS_fpub009_slot_intent_at_fill.sql`

**Pattern 1 (function-internal patch — preferred):**

Modify `m.fill_pending_slots` to add the post_draft.scheduled_for sync immediately after the slot UPDATE that sets `filled_draft_id`. Insert this UPDATE block:

```sql
-- F-PUB-009: forward-only sync of slot intent to draft.scheduled_for
UPDATE m.post_draft pd
   SET scheduled_for = v_slot.scheduled_publish_at,
       updated_at    = NOW()
 WHERE pd.post_draft_id = v_skeleton_draft_id
   AND pd.scheduled_for IS NULL;  -- forward-only, never overwrite
```

Place it inside the `IF v_decision IN ('filled','evergreen') THEN` branch, after the `UPDATE m.slot` and before the signal_pool / evergreen_library reuse counter updates.

**Pattern 2 (trigger fallback if Pattern 1 misses paths):**

```sql
CREATE OR REPLACE FUNCTION m.tg_slot_fill_propagate_scheduled_for_v1()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.filled_draft_id IS NOT NULL
     AND (OLD.filled_draft_id IS NULL OR OLD.filled_draft_id <> NEW.filled_draft_id)
     AND NEW.scheduled_publish_at IS NOT NULL
  THEN
    UPDATE m.post_draft
       SET scheduled_for = NEW.scheduled_publish_at,
           updated_at    = NOW()
     WHERE post_draft_id = NEW.filled_draft_id
       AND scheduled_for IS NULL;  -- forward-only
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_slot_fill_propagate_scheduled_for
AFTER UPDATE OF filled_draft_id ON m.slot
FOR EACH ROW
EXECUTE FUNCTION m.tg_slot_fill_propagate_scheduled_for_v1();
```

**Recommendation: Pattern 1.** Single function, single touch-point, no trigger overhead. Pattern 2 is fallback if PF reveals additional fill paths.

**Forward-only safeguard in both patterns**: the `AND scheduled_for IS NULL` predicate ensures existing draft scheduled_for values are never overwritten. This is non-negotiable — it's what makes the fix backward-compatible and reversible.

## Apply path (CHAT next session, at-home keyboard preferred)

A1. Pre-flight reports PF1–PF6 reviewed by PK
A2. Pattern selected (1 or 2) based on PF1 result — Pattern 1 is the working assumption
A3. Final SQL committed with confirmed identifiers
A4. MCP review fired (action_type = `sql_destructive`)
A5. PK approves outcome of review
A6. Chat applies via `apply_migration`
A7. Verification (V1–V5)

## Verification (post-apply, chat)

**V1**. Source byte-identity preserved (Lesson #36).

**V2**. Existing `m.post_draft.scheduled_for` values unchanged — sample 20 rows pre-apply and post-apply, confirm equal.

**V3**. New slot fill behaviour: trigger or modified function call, fill 1 slot manually with a test draft (or wait for next cron tick), verify `m.post_draft.scheduled_for = m.slot.scheduled_publish_at`.

**V4**. legacy_spread_mismatch_count baseline from PF4 — confirm not *increasing* on streams that are filling new slots. (Should eventually decrease as old queue rows drain and new ones queue with correct timing, but immediate drop not expected.)

**V5**. Sample 5 newly-created queue rows from jobid 48's next 2-3 ticks — confirm `m.post_publish_queue.scheduled_for` matches the slot's `scheduled_publish_at` for slot-driven drafts.

## Rollback path

Pattern 1 (function patch): `CREATE OR REPLACE FUNCTION ...` with the prior version body. Migration filename `YYYYMMDDHHMMSS_fpub009_rollback.sql`.

Pattern 2 (trigger): `DROP TRIGGER tg_slot_fill_propagate_scheduled_for ON m.slot;` plus optional `DROP FUNCTION`.

Both rollbacks are non-destructive — they don't unwrite any scheduled_for values that were correctly set during the fix's operating window. Worst case, after rollback, new fills revert to NULL scheduled_for and jobid 48 falls back to legacy spread.

## Honest limitations

- **PF1 already largely done during investigation phase.** Confidence on Pattern 1 is high. Pattern 2 retained as fallback only if Pattern 1 misses an edge case.
- **Forward-only is a deliberate scope choice.** Existing spread-stretched queue rows (~50-100 across red streams) will drain at current cadence. If PK wants acceleration, separate decision per the investigation's Fix 1 (cap lift) recommendation.
- **The audit matrix `legacy_spread_mismatch_count` will not immediately drop** post-apply. The metric is a stock measure (existing rows), not a flow measure (new rows). Plan a 7-day follow-up check to confirm flow has been corrected.
- **D-01 escalation likely** for a structural pipeline change. Plan for state-capture exception path per Lesson #62 type-(c) if escalation produces no new measurable evidence beyond reviewer consistency-bias caution.
- **Closure-effectiveness validation requires 7 days of slot production.** This fix's success isn't visible at apply time — it's visible across the next ~50 newly-filled slots over the next week. Add a session-start check at S23 (proposed) to monitor.

## References

- Pipeline investigation source: `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md`
- F-PUB-010 (cap mechanism, related): `docs/runtime/sessions/2026-05-03-fpub005-apply.md`
- F-AAP-007 v2 (sibling matrix-label fix): `docs/briefs/2026-05-04-or-later-faap007-fix.md`
- MCP review protocol v2.17: `docs/runtime/mcp_review_protocol.md`
- Slot-driven v4 architecture: `docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md`
