# Stage 12 — Phase B reactivation: grants + UPSERT + error hygiene

**Branch:** `feature/slot-driven-v3-build`  
**Author:** chat-side (PK approved scope: grants timing B + architecture B-B)  
**Status:** ready for CC  
**Estimated CC time:** 60–90 min

---

## Why this stage exists

Stage 11 deployed cleanly and produced 20 real shadow drafts ($0.28 cost), but uncovered three issues that block Phase B reactivation:

1. **Silent UPDATE failure on `m.slot`.** ai-worker's slot status transition `pending_fill → filled` silently no-ops. Root cause: `m.slot` has zero grants for `service_role`, PostgREST returns a permission error in the response body, but CC's v2.10.x code didn't destructure `{ error }` so the failure was invisible. Result: 19 of 20 successful drafts left their slots in `pending_fill` instead of `filled`.

2. **Recovery + fill + LD18 architectural conflict.** When `m.recover_stuck_slots()` resets a slot to `pending_fill`, it clears `slot.filled_draft_id` but does NOT delete the orphan `m.post_draft` row. The next `m.fill_pending_slots()` tick tries to INSERT a new skeleton draft for the same `slot_id` and fails the LD18 unique constraint `uq_post_draft_slot_id`. Fill cron has been failing every 10 min since 02:20 UTC.

3. **Lesson #33 (NEW).** Every Supabase JS write must destructure `{ error }`. Without this, PostgREST permission errors, constraint violations, and other server-side failures pass silently through the client and the calling code believes the write succeeded.

This brief addresses all three. After Stage 12 deploys, Phase B reactivates and Gate B 5–7 day shadow observation begins.

---

## Stage 11 lessons codified

### Lesson #32 (THIRD instance) — pre-flight schema verification

Pre-flight queries must hit **every directly-touched table** for column names, types, NOT NULL, CHECK constraints, partial indexes. Stage 11 brief assumed `body_text`/`body_excerpt` on `f.canonical_content_body` (actual: `extracted_text`/`extracted_excerpt`). Stage 12 pre-flight findings are embedded inline below — DO NOT skip them.

### Lesson #33 (NEW) — `{ error }` destructuring required on every Supabase JS write

Pattern:

```typescript
// WRONG — silent failure pattern
await supabase.schema('m').from('slot').update({...}).eq(...);

// RIGHT — explicit error surface
const { error } = await supabase.schema('m').from('slot').update({...}).eq(...);
if (error) throw new Error(`slot_update_failed:${error.message}`);
```

The `throw` is critical. The per-job `catch` block in `app.post('*')` writes the thrown error to `m.ai_job.error` and sets status to `'failed'`. Without the throw, errors are silently absorbed.

This applies to:
- `await supabase.schema(...).from(...).insert(...)` 
- `await supabase.schema(...).from(...).update(...).eq(...)`
- `await supabase.schema(...).from(...).upsert(...)`
- `await supabase.schema(...).from(...).delete().eq(...)`
- `await supabase.rpc(...)` — already destructured in some places, make consistent
- `await supabase.from(...).insert(...)` (no schema prefix — public schema writes)

NOT required for `.select(...)` chains — empty result is a legitimate outcome there. But `.maybeSingle()` callers should still check `error` if the absence vs error distinction matters.

### Lesson #34 (NEW) — recovery systems must own dependent state

`m.recover_stuck_slots()` resets `m.slot` columns but leaves the orphaned `m.post_draft` row in place. The downstream `m.fill_pending_slots()` then assumed the slot was a clean first-fill candidate and tried INSERT, which LD18 caught.

Stage 12 fixes this by making `fill_pending_slots()` idempotent via UPSERT — fill becomes "INSERT or refresh-to-skeleton" rather than "INSERT only." Future recovery-style functions: think about every dependent row that points back at the primary entity.

---

## Pre-flight findings (chat already verified — embed in CC's mental model before coding)

### `m.post_draft` column inventory (UPSERT DO UPDATE target)

| Column | Type | NOT NULL | Default | UPSERT-UPDATE behaviour |
|---|---|---|---|---|
| post_draft_id | uuid | YES | gen_random_uuid() | **DO NOT touch** (PK) |
| digest_item_id | uuid | NO | NULL | DO NOT touch (legacy R6 link) |
| client_id | uuid | NO | NULL | DO NOT touch (matches slot's client_id) |
| platform | text | YES | NULL | DO NOT touch |
| slot_id | uuid | NO | NULL | DO NOT touch (conflict key) |
| is_shadow | boolean | YES | false | SET = EXCLUDED.is_shadow (caller decides) |
| approval_status | text | YES | 'draft' | SET = 'draft' |
| draft_title | text | NO | NULL | SET = NULL |
| **draft_body** | **text** | **YES** | NULL | **SET = '' (NOT NULL — must be empty string)** |
| draft_format | jsonb | NO | NULL | SET = NULL |
| recommended_format | text | NO | NULL | SET = NULL |
| recommended_reason | text | NO | NULL | SET = NULL |
| image_headline | text | NO | NULL | SET = NULL |
| image_url | text | NO | NULL | SET = NULL |
| **image_status** | text | **YES** | 'pending' | SET = 'pending' (NOT NULL) |
| video_url | text | NO | NULL | SET = NULL |
| video_status | text | NO | NULL | SET = NULL |
| auto_approval_scores | jsonb | NO | NULL | SET = NULL |
| compliance_flags | jsonb | NO | '[]'::jsonb | SET = '[]'::jsonb |
| dead_reason | text | NO | NULL | SET = NULL |
| approved_by | text | NO | NULL | SET = NULL |
| approved_at | timestamptz | NO | NULL | SET = NULL |
| scheduled_for | timestamptz | NO | NULL | SET = NULL |
| notification_sent_at | timestamptz | NO | NULL | SET = NULL |
| version | integer | YES | 1 | SET = m.post_draft.version + 1 (preserve history) |
| created_by | text | YES | CURRENT_USER | DO NOT touch (preserve original creator) |
| created_at | timestamptz | YES | now() | DO NOT touch (preserve original creation) |
| updated_at | timestamptz | YES | now() | SET = NOW() |

### LD18 unique index (governs ON CONFLICT spec)

```sql
CREATE UNIQUE INDEX uq_post_draft_slot_id 
  ON m.post_draft USING btree (slot_id) 
  WHERE (slot_id IS NOT NULL);
```

Partial unique index. The ON CONFLICT spec MUST match the partial WHERE clause exactly:

```sql
ON CONFLICT (slot_id) WHERE (slot_id IS NOT NULL) DO UPDATE SET ...
```

Postgres rejects ON CONFLICT specs that don't exactly match a partial unique index's predicate.

### Triggers on `m.post_draft` — all safe under UPSERT-UPDATE

| Trigger | Event | Behaviour under UPSERT-UPDATE | Risk |
|---|---|---|---|
| trg_handle_draft_rejection | AFTER UPDATE OF approval_status | Only acts if `NEW.approval_status='rejected'`. We set `'draft'`. No-op. | None |
| trg_post_draft_updated_at | BEFORE UPDATE | Sets `updated_at = NOW()`. We're already setting it; trigger override is fine. | None |
| trg_release_queue_on_asset_ready | AFTER UPDATE OF image_status, video_status | Only fires when status LEAVES `'pending'`. We're setting back TO `'pending'`. No-op. | None |
| trg_prevent_published_draft_delete | BEFORE DELETE | We're not deleting. Irrelevant. | None |

### `m.slot` grants gap (the silent UPDATE root cause)

```sql
-- Current state (no service_role grants):
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_schema='m' AND table_name='slot' AND grantee='service_role';
-- Returns 0 rows.

-- Compare m.post_draft (works fine):
-- service_role | SELECT
-- service_role | UPDATE
```

Stage 12 fix: minimum scope. Grant `SELECT, UPDATE` on `m.slot` to `service_role`. Does NOT touch other m.* tables — those are either already granted (post_draft, ai_job, ai_usage_log, post_publish_queue, post_publish) or only written by SQL functions running as postgres (signal_pool, slot_fill_attempt, slot_alerts, cron_health_check). Future EFs that need writes to additional m.* tables add their grants in their own migrations.

### `m.fill_pending_slots()` block to modify

The block at line ~210 of the function definition (the success path inside the FOR LOOP):

```sql
-- CURRENT (lines ~210-217 of function body):
INSERT INTO m.post_draft (
  post_draft_id, client_id, platform, slot_id, is_shadow,
  approval_status, draft_title, draft_body, version, created_by, created_at, updated_at
) VALUES (
  gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id, p_shadow,
  'draft', NULL, '', 1, 'fill_function', NOW(), NOW()
) RETURNING post_draft_id INTO v_skeleton_draft_id;
```

This block is the ONLY change to `fill_pending_slots`. Everything else in the function stays identical. The full function body must be re-emitted via `CREATE OR REPLACE FUNCTION` because Postgres has no in-place edit for function bodies.

---

## Required changes

### 1. Migration 050 — service_role grants on `m.slot`

```sql
-- Stage 12.050 — Grant service_role write access to m.slot
-- Root cause: m.slot was created without service_role grants. ai-worker's
-- slot status UPDATE was silently failing through PostgREST.
-- Scope: minimum needed for current EFs (only ai-worker writes to m.slot).
-- Future EFs that need more grants add them in their own migrations.

GRANT SELECT, UPDATE ON m.slot TO service_role;

-- No INSERT/DELETE — those happen via SQL functions running as postgres.
-- No grants on signal_pool/slot_alerts/slot_fill_attempt/cron_health_check —
-- those are written exclusively by SQL functions, not EFs via Supabase JS.

COMMENT ON TABLE m.slot IS 
  'Forward slot calendar for slot-driven Phase B. Stage 12.050: service_role granted SELECT, UPDATE for ai-worker EF.';
```

### 2. Migration 051 — `fill_pending_slots` UPSERT

Full function re-emission. The ONLY substantive change is the post_draft INSERT block — everything else is byte-identical to the current definition. CC must copy the current function definition (chat captured it during pre-flight; CC can also re-fetch via `pg_get_functiondef('m.fill_pending_slots(integer, boolean)'::regprocedure)` if needed) and replace ONLY the INSERT block.

The replacement block:

```sql
-- REPLACE the bare INSERT at line ~210-217 with this UPSERT:
INSERT INTO m.post_draft (
  post_draft_id, client_id, platform, slot_id, is_shadow,
  approval_status, draft_title, draft_body, version, created_by, created_at, updated_at
) VALUES (
  gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id, p_shadow,
  'draft', NULL, '', 1, 'fill_function', NOW(), NOW()
)
ON CONFLICT (slot_id) WHERE (slot_id IS NOT NULL) DO UPDATE SET
  is_shadow            = EXCLUDED.is_shadow,
  approval_status      = 'draft',
  draft_title          = NULL,
  draft_body           = '',
  draft_format         = NULL,
  recommended_format   = NULL,
  recommended_reason   = NULL,
  image_headline       = NULL,
  image_url            = NULL,
  image_status         = 'pending',
  video_url            = NULL,
  video_status         = NULL,
  auto_approval_scores = NULL,
  compliance_flags     = '[]'::jsonb,
  dead_reason          = NULL,
  approved_by          = NULL,
  approved_at          = NULL,
  scheduled_for        = NULL,
  notification_sent_at = NULL,
  version              = m.post_draft.version + 1,
  updated_at           = NOW()
RETURNING post_draft_id INTO v_skeleton_draft_id;
```

Migration metadata:

```sql
-- Stage 12.051 — fill_pending_slots UPSERT (recover+fill+LD18 architectural fix)
-- Recovery cron resets slots to pending_fill but leaves orphan m.post_draft rows.
-- Bare INSERT then conflicts with LD18 unique index uq_post_draft_slot_id.
-- UPSERT path: refresh existing draft row to skeleton state (semantically a
-- clean re-fill). Audit trail preserved (post_draft_id stable, version++).
-- Triggers verified safe (handle_draft_rejection no-ops on 'draft', 
-- release_queue_on_asset_ready no-ops on image_status='pending'→'pending').

CREATE OR REPLACE FUNCTION m.fill_pending_slots(...)
[full function body with the one-block replacement above]
```

CC must keep the `RETURNING post_draft_id INTO v_skeleton_draft_id` clause — the downstream code uses `v_skeleton_draft_id` for the ai_job INSERT and slot UPDATE. With UPSERT, this returns the existing row's post_draft_id on conflict (which is what we want — we're re-using the row).

### 3. ai-worker v2.11.0 — `{ error }` destructuring

**Version bump:** `ai-worker-v2.10.1` → `ai-worker-v2.11.0`

**Changelog block to prepend** (above the existing v2.10.1 block):

```typescript
// v2.11.0 — Lesson #33: explicit error destructuring on every Supabase JS write
//   Stage 11 silent-UPDATE bug surfaced because writes used the unchecked pattern
//     await supabase.schema('m').from('slot').update({...}).eq(...);
//   PostgREST permission errors and constraint violations passed silently through
//   the JS client because { error } was never destructured. Result: 19 of 20
//   shadow ai_jobs succeeded LLM-side but their slots stayed in pending_fill
//   because the UPDATE was no-oped by missing service_role grants.
//   Fix: every .insert() / .update() / .upsert() / .delete() / .rpc() now
//   destructures { error } and throws on non-null. The per-job catch block
//   surfaces the error into m.ai_job.error and marks status='failed'.
//   No behaviour change on the success path. Catches future grant gaps,
//   constraint violations, and any other PostgREST-level errors.
//   Paired with Stage 12.050 (m.slot grants for service_role).
```

**Writes requiring `{ error }` destructuring** (CC must update each):

These are the writes I identified by scanning the v2.10.1 source. CC should grep the file to confirm completeness — any `await supabase...` write call that doesn't already destructure `{ error }` needs updating. Pattern:

```typescript
// Before:
await supabase.schema('m').from('slot').update({status: 'filled', updated_at: nowIso()}).eq('slot_id', job.slot_id);

// After:
const { error: slotErr } = await supabase.schema('m').from('slot')
  .update({status: 'filled', updated_at: nowIso()})
  .eq('slot_id', job.slot_id);
if (slotErr) throw new Error(`slot_update_filled_failed:${slotErr.message}`);
```

Specific writes in `ai-worker/index.ts` (line numbers approximate, will shift):

| Block | Write | Error name suggestion |
|---|---|---|
| Evergreen render path | post_draft UPDATE | `evergreen_post_draft_update_failed` |
| Evergreen render path | slot UPDATE → filled | `evergreen_slot_update_failed` |
| Evergreen render path | ai_job UPDATE → succeeded | `evergreen_ai_job_update_failed` |
| Idempotency skip path | ai_job UPDATE → succeeded | `idempotency_ai_job_update_failed` |
| Compliance skip path | post_draft UPDATE → dead | `compliance_post_draft_update_failed` |
| Compliance skip path | slot UPDATE → skipped | `compliance_slot_update_failed` |
| Compliance skip path | ai_job UPDATE → succeeded | `compliance_ai_job_update_failed` |
| Success path | post_draft UPDATE → needs_review | `success_post_draft_update_failed` |
| Success path | slot UPDATE → filled | `success_slot_update_failed` |
| Success path | ai_job UPDATE → succeeded | `success_ai_job_update_failed` |
| Failure path (per-job catch) | ai_job UPDATE → failed | `failure_ai_job_update_failed` (warn-and-continue, do NOT throw — we're already in the catch block) |

Special case for the failure path catch: if the ai_job UPDATE itself errors, we can't propagate further (already in catch). Log to console.error and push a results entry. Don't throw — sweep-stale-running will re-queue the orphaned running job after 20 min.

`writeUsageLog`, `writeVisualSpec`, and `set_draft_video_script` already have try/catch wrappers — these are best-effort writes (cost logging, visual spec metadata, video script). CC adds `{ error }` destructuring inside those for visibility, but the existing catch-and-log pattern is preserved (these writes are intentionally non-fatal).

`writeUsageLog` insert specifically:

```typescript
// Before:
await supabase.schema('m').from('ai_usage_log').insert({ ... });

// After:
const { error: usageErr } = await supabase.schema('m').from('ai_usage_log').insert({ ... });
if (usageErr) console.error('[ai_usage_log] write failed:', usageErr.message);
// (no throw — ai_usage_log is best-effort, don't fail the job for a logging gap)
```

---

## What this brief does NOT do (intentional out-of-scope)

- **No cleanup of the 20 stuck shadow drafts.** They sit in needs_review with real LLM-generated content. When fill cron reactivates and picks up their slots, UPSERT will reset them to skeleton state (the version field will go from 1 → 2 as audit trail of the re-fill). Their existing ai_job rows stay `succeeded` as historical records. This is the correct outcome.

- **No audit of OTHER m.* table grants.** Lesson #33 (`{ error }` destructuring) defends against future grant gaps generically. If a future EF hits a missing grant, the EF throws a clear PostgREST error message into ai_job.error rather than silently failing. We'll catch and add grants then. A blanket grant sweep would be tempting but risks granting more than needed — keep grants minimal and reactive.

- **No Phase B reactivation.** That's the chat-side step after CC pushes — see "Reactivation sequence" below. CC's job ends at three commits + one CC report.

- **No Gate B observation start.** Gate B starts after V8 passes. V8 is part of chat-side reactivation, not CC's scope.

---

## Branch + commit plan

Three commits on `feature/slot-driven-v3-build`:

1. `feat(db): Stage 12.050 — service_role grants on m.slot`  
   File: `supabase/migrations/<timestamp>_stage_12_050_grant_slot_to_service_role.sql`

2. `feat(db): Stage 12.051 — fill_pending_slots UPSERT`  
   File: `supabase/migrations/<timestamp>_stage_12_051_fill_pending_slots_upsert.sql`

3. `feat(ai-worker): Stage 12 v2.11.0 — error destructuring (Lesson #33)`  
   File: `supabase/functions/ai-worker/index.ts`

Push to `feature/slot-driven-v3-build`. Do NOT deploy the EF — chat applies migrations + PK deploys EF in the reactivation sequence.

---

## Reactivation sequence (chat-side, AFTER CC pushes)

This section is for chat reference, not CC execution. CC's job ends at the three commits.

1. Chat: apply migration 050 via Supabase MCP `apply_migration`
2. Chat: verify `service_role` has UPDATE on `m.slot` (V1)
3. Chat: apply migration 051
4. Chat: verify `fill_pending_slots` definition contains `ON CONFLICT (slot_id)` (V2)
5. PK: pull, `supabase functions deploy ai-worker --no-verify-jwt`, verify v2.11.0 on version endpoint (V3)
6. Chat: apply migration 052 (drop shadow filter — same SQL pattern as the original Stage 11.049)
7. Chat: verify shadow filter dropped from `f.ai_worker_lock_jobs_v1` (V4)
8. Chat: reactivate Phase B crons via `cron.alter_job(N, active := true)` for jobids 75, 76, 77, 78, 79
9. Chat: verify all 5 active (V5)
10. Chat: wait for first fill tick (`*/10`), verify NO duplicate-key error in `cron.job_run_details` (V6)
11. Chat: wait for first ai-worker tick after fill, verify shadow ai_job moves through `queued → running → succeeded` (V7)
12. Chat: pick the slot tied to that ai_job, verify it transitioned `pending_fill → fill_in_progress → filled` with `slot.filled_at` set and `slot.filled_draft_id` populated (V8)
13. Gate B 5–7 day shadow observation begins. Gate B exit criteria are documented separately in `docs/00_sync_state.md` and `docs/15_pre_post_sales_criteria.md`.

If V6 fails (duplicate-key error returns), pause crons and investigate — UPSERT didn't take effect. If V7 fails (ai_job stays queued or fails), pause crons and check `f.ai_worker_lock_jobs_v1` filter state. If V8 fails (slot doesn't transition to filled), the grant migration didn't take effect — check `information_schema.table_privileges` for `m.slot`.

---

## CC report format

When all three commits are pushed, report back in this format:

```
● Stage 12 CC report
  - Pre-flight: branch feature/slot-driven-v3-build, started at <SHA>
  - Migration 050 created: <path>, content matches brief
  - Migration 051 created: <path>, content matches brief — INSERT block replaced with UPSERT, function body otherwise byte-identical
  - ai-worker updated: VERSION = ai-worker-v2.11.0, v2.11.0 changelog block prepended
  - { error } destructuring applied to N writes (list each with line number)
  - writeUsageLog updated to destructure { error } with console.error (no throw)
  - Per-job catch's ai_job UPDATE: warn-and-continue applied (no throw)
  - Commit SHAs: 050=<sha>, 051=<sha>, ai-worker=<sha>
  - Branch pushed: yes (<old SHA>..<new SHA>)
  - Anything unexpected: <details or 'none'>
  Awaiting chat-side: migrations apply + PK deploy + reactivation sequence
```

---

## Closing note

PK chose B (grants in Stage 12) and B-B (UPSERT in fill). Both are the architecturally correct calls — UPSERT acknowledges the recovery loop that already exists in the system, rather than working around it. After Stage 12, the slot-driven pipeline is idempotent end-to-end.

Three lessons captured this Stage 11→12 cycle: #32 (pre-flight every column), #33 (destructure every error), #34 (recovery owns dependent state). These belong in the standing build patterns, not just this brief.
