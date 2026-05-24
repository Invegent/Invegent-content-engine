# Brief cc-0019 — publish-eligibility gate before AI draft generation

**Created:** 2026-05-24 Sydney  
**Author:** chat  
**Executor:** Claude Code (migration-file authoring + ai-worker EF build); chat (migration apply via Supabase MCP); PK (manual EF deploy)  
**Status:** draft  
**Result file:** `docs/briefs/results/cc-0019-publish-eligibility-gate.md` (created on completion)

---

## Task

Introduce a single canonical predicate `m.is_publish_eligible(client_id, platform)` and consult it at the **draft-generation layer** so the system stops spending AI tokens synthesising drafts for client/platform pairs that have no live publish path. Two enforcement points: (1) a skip-gate at the top of `m.fill_pending_slots` so no skeleton `post_draft` and no `m.ai_job` are created for ineligible pairs; (2) a defence-in-depth preflight in the **ai-worker** Edge Function so any already-queued `ai_job` for a now-ineligible pair is abandoned **before** the model call. Publishing behaviour is unchanged — this only prevents wasteful generation.

## Source context

Read-only audit (this session, 2026-05-24) established the waste mechanism and sized it. Key facts the executor needs:

- **`m.fill_pending_slots`** (jobid 75, `*/10`) — current body is the implementation target. On a `filled`/`evergreen` decision it INSERTs a skeleton `m.post_draft` (`approval_status='draft'`) **and** a `queued` `m.ai_job` (`job_type='slot_fill_synthesis_v1'`, priority 100), then sets the slot to `fill_in_progress`. It gates only on: `t.dedup_policy`, `c.client_content_scope` verticals, `m.signal_pool` fitness, `t.format_*_policy`, `m.check_pool_health`, `m.check_evergreen_threshold`. **No publish-eligibility check anywhere.** Fetch the exact current body before editing: `select pg_get_functiondef('m.fill_pending_slots'::regproc);`
- **ai-worker EF** (jobids 5/7, `*/5`) — picks up `queued` `m.ai_job` rows and calls the model (Claude/OpenAI). **This is where tokens are actually burned.** Confirm EF path under `supabase/functions/` and the exact job-pickup / client+platform resolution point before editing.
- **`c.client_publish_profile`** — holds `publish_enabled` (confirmed column) keyed by `(client_id, platform)`. The eligibility predicate also intends to honour active-state and pause-state; **confirm exact column names against live schema** before authoring the function (candidates: a status/active flag, a `paused_until` timestamp used by the 2207051 containment auto-pause). Do not invent column names — bind to what exists.
- **Measured waste (last 7d):** 10 `ai_job`s on `publish_enabled=false` pairs — NDIS-Yarns IG 5 + Property Pulse IG 5, all `succeeded` (tokens spent) — ≈12% of ~81 ai_jobs; recurring every fill cycle. Slot table confirms fresh `filled` IG slots dated 2026-05-25+ for NY/PP post-void.
- Related prior work: `docs/briefs/2026-04-20-cost-guardrails.md`; `docs/briefs/2026-05-04-or-later-fai-worker-parser-skip-bug.md` (ai-worker internals); `docs/process/ICE-PROC-001-patch-severity.md`; `docs/runtime/mcp_review_protocol.md` (D-01 protocol).

## Scope

**In scope:**
- New function `m.is_publish_eligible(p_client_id uuid, p_platform text) RETURNS boolean` (SECURITY DEFINER, STABLE).
- A skip-gate inserted at the top of the `FOR v_slot` loop in `m.fill_pending_slots`, **before** any candidate-pool query and **before** the skeleton-draft / ai_job INSERTs.
- An eligibility preflight in the ai-worker EF, after job lock + client/platform resolution and **before** the model call.

**Out of scope:**
- Any change to the publisher EFs, `publisher_lock_queue_v1`, throttle (`max_per_day`/`min_gap`), enqueuer jobid 48, auto-approver jobid 58, `materialise_slots`, `promote_slots_to_pending`.
- Re-enabling NY/PP IG, lifting 2207051, touching cron schedules.
- Any cron-state dimension in the predicate (see Notes — handled operationally in v1; cron-aware predicate is a documented future enhancement).
- Capacity-aware forecasting and ai_job cost-accounting (separate future briefs).
- Backfill/cleanup of existing drafts or ai_jobs.

## Allowed actions

- Author the migration **file** (`supabase/migrations/`) recreating `m.fill_pending_slots` (exact current body + the gate block) and creating `m.is_publish_eligible`; commit + push.
- Author the ai-worker EF code change; commit + push to its deploy branch.
- Run **read-only** verification SQL (`pg_get_functiondef`, column introspection, `m.is_publish_eligible` SELECT probes once the function exists in a review context).

## Forbidden actions

- Do **not** apply the migration, deploy any EF, invoke any worker/publisher, or mutate any row until the D-01 chain + explicit PK approval phrase are in place (see D-01 requirements).
- Do **not** change any cron job.
- Do **not** write `friction.case`/`friction.event`.
- Do **not** close Q-005 or start cc-0015.
- Honour all active hold-state items in `docs/00_sync_state.md`.

## Design detail

### 1. `m.is_publish_eligible(p_client_id, p_platform)`

Boolean predicate = **single source of truth** for "is this (client, platform) a live publish target right now". Intended semantics (bind to real columns):

```
RETURNS true IFF a c.client_publish_profile row exists for (p_client_id, p_platform) where:
    publish_enabled = true
AND <profile active/status flag> indicates active
AND (<paused_until column> IS NULL OR <paused_until column> <= now())
AND the owning client is itself active (confirm via c.client status column)
```

- `LANGUAGE sql` or `plpgsql`, `STABLE`, `SECURITY DEFINER`, `SET search_path` pinned. `c.*` is not PostREST-exposed; SECURITY DEFINER in a callable schema is consistent with existing access patterns.
- Returns `false` (not NULL) when no profile row exists — absence of a publish profile = not a publish target.

### 2. Gate inside `m.fill_pending_slots`

Insert at the very top of the `FOR v_slot IN ... LOOP`, immediately after `v_processed_count := v_processed_count + 1;` and the per-iteration variable resets, **before** `v_chosen_format := ...`:

```plpgsql
IF NOT m.is_publish_eligible(v_slot.client_id, v_slot.platform) THEN
  -- Cost gate: no live publish path → do not spend AI tokens. Preserve visibility.
  INSERT INTO m.slot_fill_attempt (
    attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
    decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
    chosen_format, threshold_relaxed, pool_health_at_attempt,
    evergreen_ratio_at_attempt, error_message, created_at
  ) VALUES (
    gen_random_uuid(), v_slot.slot_id, NOW(), 0, '{}'::jsonb,
    'skipped', 'publish_path_disabled', NULL, NULL,
    COALESCE(v_slot.format_preference[1],'image_quote'), false, NULL,
    NULL, NULL, NOW()
  );

  UPDATE m.slot
  SET status = 'skipped', skip_reason = 'publish_path_disabled', updated_at = NOW()
  WHERE slot_id = v_slot.slot_id;

  v_results := v_results || jsonb_build_array(jsonb_build_object(
    'slot_id', v_slot.slot_id, 'client_id', v_slot.client_id,
    'platform', v_slot.platform, 'decision', 'skipped',
    'skip_reason', 'publish_path_disabled'));

  CONTINUE;  -- no skeleton draft, no ai_job, no token spend
END IF;
```

- **Visibility preserved:** the slot is still counted in `v_processed_count`, a `slot_fill_attempt` row records *why* it was skipped, and it appears in the function's `results` array. The demand signal (the slot itself) is untouched.
- **Slot status decision:** v1 uses terminal `status='skipped'` with `skip_reason='publish_path_disabled'`. Re-enabling a platform resumes generation naturally because `materialise_slots` continuously creates fresh future slots; previously-skipped past slots stay skipped (correct — their window passed while disabled). A non-terminal `blocked` status that auto-re-promotes on re-eligibility is a deliberate **out-of-scope** enhancement (would require touching `promote_slots_to_pending`).

### 3. ai-worker EF preflight

After the worker has locked a `queued` `ai_job` and resolved its `client_id` + `platform`, **before** constructing the prompt / calling the model:

```
eligible = rpc('is_publish_eligible', { p_client_id, p_platform })   // or direct profile read
if (!eligible) {
    mark ai_job terminal WITHOUT a model call:
        status      = <existing terminal abandon status>   // confirm: 'dead' (+ dead_reason) is present; use 'skipped' only if the worker already supports it
        dead_reason = 'publish_path_disabled_preflight'
        locked_at/locked_by released, attempts not incremented toward retry
    return  // zero token spend
}
```

- Catches jobs queued just before a pause, and any race between fill and a state change. Confirm the worker's existing terminal-status vocabulary (`dead`/`succeeded` observed live; `queued` used by fill) and reuse it rather than introducing a new enum value.

### 4. Eligibility transition handling

The two enforcement points (Unit A fill-gate + Unit B ai-worker preflight) plus the **unchanged** publish-layer gate together cover the eligibility-transition edge cases. No additional fail-safe is required in v1 — each transition is absorbed by an existing layer:

**a. Eligible → ineligible after slot fill but before ai-worker pickup.** A slot was filled (skeleton draft + queued `ai_job` created) while eligible, then the client/platform is disabled before the ai-worker processes the job. **Handled by Unit B:** the ai-worker preflight re-checks `is_publish_eligible` at pickup, finds it false, and abandons the job (terminal, `dead_reason='publish_path_disabled_preflight'`) **before any model call** — zero token spend.

**b. Race — Unit A sees eligible, then the pair is disabled before the `ai_job` insert or before execution.** The gate's eligibility read and the subsequent `ai_job` INSERT are not atomic with the disable event. **Handled by Unit B:** the ai-worker preflight is the defence-in-depth layer — whatever slips past the fill-gate is re-checked at pickup and abandoned before token spend. The two layers are intentionally redundant for exactly this race.

**c. Job already completed before disable.** The `ai_job` ran and the draft was synthesised while eligible; the pair is disabled afterwards. Token spend has **already occurred** and is not recoverable — but the **existing publish-layer gate** (`publish_enabled`/`paused_until`/active, enforced at the publisher + `publisher_lock_queue_v1`) prevents the finished draft from posting once eligibility is removed. No wrong publish, no new waste.

**d. Ineligible → eligible later (re-enable).** Future `materialise_slots`/fill cycles create and fill fresh slots normally once eligibility returns. Past slots marked `status='skipped'` / `skip_reason='publish_path_disabled'` remain skipped and are **not** auto-promoted in v1 (their publish window has passed). Resumption is driven by continuous forward materialisation of new slots, not by reviving skipped ones.

**Net:** ineligible work is suppressed at the earliest point (Unit A) with a pickup-time backstop (Unit B); already-spent work cannot mis-publish (existing publish gate); re-enablement resumes via normal forward slotting. The only residual is a single in-flight job already past the model call at the moment of disable (case c) — inherent, bounded to one job, and non-publishing.

## Migration / deploy needs

- **Unit A — DB migration (apply via Supabase MCP `apply_migration`).** One migration: `CREATE FUNCTION m.is_publish_eligible` + `CREATE OR REPLACE FUNCTION m.fill_pending_slots` (exact current body + gate block). CC authors the file reproducing the current body verbatim plus only the gate insertion; verify via local diff that **nothing else** in the body changed. Well under the ICE-PROC-001 80KB stage-split threshold. `apply_migration` is the only sanctioned DDL path on `m.*`.
- **Unit B — ai-worker EF deploy.** CC builds the preflight change; **PK deploys manually** from `C:\Users\parve\Invegent-content-engine` (Windows MCP PowerShell times out on `supabase functions deploy`).
- Order: deploy Unit A first (stops the source), then Unit B (mops up in-flight). Either order is safe, but A-then-B minimises the window.
- **Rollback:** code-only, no data to revert. Unit A rollback = `CREATE OR REPLACE` back to the prior `fill_pending_slots` body (keep a copy) and optionally `DROP FUNCTION m.is_publish_eligible`. Unit B rollback = redeploy prior ai-worker.

## Validation plan

1. **Pre-snapshot (read-only):** `ai_job` creation count by (client, platform, publish_enabled) over last 24–48h; current NY/PP IG slot fill behaviour.
2. **Predicate unit check:** `SELECT m.is_publish_eligible(...)` for known pairs — CFW IG, Invegent FB/LinkedIn → expect `true`; NY IG, PP IG → expect `false`; a non-existent profile pair → expect `false`.
3. **Post Unit A:** at the next jobid-75 tick (or a controlled `SELECT m.fill_pending_slots(n)` in review), assert NY/PP IG slots produce `slot_fill_attempt` rows with `decision='skipped'`, `skip_reason='publish_path_disabled'`, and **zero new `ai_job`** for those pairs; assert enabled pairs still fill and still create ai_jobs (no regression).
4. **Post Unit B:** observe (or stage) a `queued` ai_job for a disabled pair → assert worker marks it terminal with `dead_reason='publish_path_disabled_preflight'` and makes **no** model call; enabled pairs still synthesise normally.
5. **Regression:** confirm publish path unchanged — enabled clients (CFW/Invegent IG, all FB/LinkedIn/YT) continue to publish; queue/throttle untouched.
6. **24–48h watch:** ai_job creation for disabled pairs == 0; total ai_job volume drops by ~the measured wasteful fraction; no drop in published output for enabled pairs.

## D-01 requirements

Per `docs/runtime/mcp_review_protocol.md` + ICE-PROC-001:

- **D-01 #1 — `plan_review`:** this brief / coordinated 2-unit design. (Can be fired at issue time.)
- **D-01 #2 — `sql_destructive`:** the Unit A migration (DDL recreating `fill_pending_slots` + new function), fired at execution time. Run the P1–P5 pre-flight checklist (Lesson #61) first; event-trigger pre-flight survey (L33–L35) applies since this is DDL touching `m.*` functions.
- **D-01 #3 — `ef_deploy`:** the Unit B ai-worker deploy, fired at execution time.
- Explicit PK approval phrase required before **each** production mutation (migration apply; EF deploy). Hard-stop discipline on every step.

## Success criteria

- `m.is_publish_eligible` exists and returns correct booleans for the probe set above.
- After deploy, no new `ai_job` rows are created for `publish_enabled=false` pairs (verified across ≥2 fill cycles), while enabled pairs are unaffected.
- ai-worker abandons ineligible queued jobs before any model call.
- Publishing output for enabled clients is unchanged (regression check passes).
- `slot_fill_attempt` continues to record skipped slots (visibility preserved).

## Stop condition

Author the migration file + EF change, commit/push, and report per result template. Do **not** apply/deploy — execution is gated on the D-01 chain + PK approval and will be driven in a separate, supervised step.

---

## Notes

- **Cron dimension (deliberate v1 omission).** During the ~month IG `cron 53` pause, fill kept generating IG drafts for *enabled* clients too — because the predicate as scoped does not know the publisher cron is off. v1 handles this **operationally**: to pause a platform, set `publish_enabled=false` (which now also stops generation); disabling the cron alone is a publish-layer-only pause and will not stop token spend. A cron-aware predicate (platform→publisher-cron mapping via a config table) is the recommended **follow-up** enhancement if PK wants cron-disabling alone to gate generation.
- This brief implements the "draft-generation pause" layer identified in the audit's four-level pause model (ingest / slot / **draft-generation** / publish), and establishes `is_publish_eligible` as the shared predicate to be reused later at the publish layer for single-source-of-truth consolidation.
