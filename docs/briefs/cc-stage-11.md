# CC Brief — Stage 11: ai-worker slot-driven refactor + LD7 caching + LD18 idempotency

**Branch:** `feature/slot-driven-v3-build`  
**Predecessor:** Stage 10 (commits `c22f460`, `7aa6f8f`)  
**Outputs:** 2 migrations + 1 EF refactor (first Phase B EF deploy)  
**Estimated CC time:** 90–150 min  
**Risk:** HIGH — first slot-driven LLM call, first Phase B EF deploy, sequencing-sensitive

---

## Why this stage exists

Stage 10 wired the Phase B crons. The fill cron is now producing `slot_fill_synthesis_v1` ai_jobs with `is_shadow=true`. The current ai-worker (v2.9.0) has no handler for this job type AND was deliberately filtered away from these jobs by the Stage 10 RPC change. Stage 11 ships the full ai-worker refactor that:

1. Adds **slot-driven payload handling** — read `canonical_ids[]` or `evergreen_id` from `input_payload`, fetch from canonical store, synthesise.
2. Adds **LD7 prompt caching** — Anthropic prompt-caching `cache_control` blocks on compliance + brand + platform-voice content. ~70–90% input-token cost reduction expected at steady state.
3. Adds **LD18 DB-enforced idempotency** — partial unique constraint on `m.post_draft(slot_id)` to make "one draft per slot" a DB invariant rather than implicit.
4. **Removes the Stage 10 shadow filter** from `f.ai_worker_lock_jobs_v1` so the now-slot-aware ai-worker can pick up shadow ai_jobs.
5. Preserves **R6 backward compatibility** — `rewrite_v1` and `synth_bundle_v1` job types must continue working until Phase D decommissions them.

After Stage 11 deploys cleanly, Gate B observation begins (5–7 days).

---

## Pre-flight against the actual codebase (run before authoring)

I've already done the heavy lift. Don't re-derive these — verify them and proceed:

- **ai-worker source:** `supabase/functions/ai-worker/index.ts` — single file, currently v2.9.0. Already has good infrastructure: idempotency guard via `m.ai_usage_log`, fetch timeouts, fallback provider logic, format advisor, compliance loader, visual spec UPSERT.
- **Existing payload shapes** (KEEP working):
  - `rewrite_v1` — `input_payload.digest_item.{title, body_text, body_excerpt}`
  - `synth_bundle_v1` — `input_payload.items[].{title, body_text, body_excerpt}`
- **New payload shape** to handle (`slot_fill_synthesis_v1`):
  ```json
  {
    "slot_id": "<uuid>",
    "is_shadow": true,
    "format": "image_quote",
    "synthesis_mode": "single_item" | "bundle" | "evergreen",
    "canonical_ids": ["<uuid>", ...],
    "evergreen_id": "<uuid>" | null,
    "is_evergreen": false,
    "fitness_score": 70,
    "recency_score": 0.5,
    "slot_confidence": 60,
    "attempt_id": "<uuid>",
    "enqueued_at": "..."
  }
  ```
- **Canonical body source:** `f.canonical_content_body.body_text` (preferred) or `body_excerpt` keyed on `canonical_id`. Fetch via Supabase client.
- **`write_visual_spec` is already UPSERT** (`ON CONFLICT DO UPDATE`). No change needed for visual spec.
- **`m.post_visual_spec` is NOT auto-created by fill_pending_slots.** ai-worker still creates it via `write_visual_spec` RPC, exactly as v2.9.0 does. The sync_state's "UPDATE auto-created post_visual_spec" line was a misread — no auto-create, the RPC's upsert handles re-runs.
- **Slot status valid transitions:** `fill_in_progress` → `filled` (success) | `skipped` (compliance HARD_BLOCK) | stay `fill_in_progress` (hard error, recover_stuck_slots handles).
- **`approval_status` valid values:** `draft, needs_review, approved, rejected, scheduled, published, dead`. Stage 11 writes `needs_review` (success) or `dead` (compliance skip).
- **R6 ai-worker (jobid 5)** is the same EF, runs on its own cron schedule (every 5min). After Stage 11 deploy it processes both R6 and slot-driven jobs through the same code paths.

---

## Three artefacts, strict sequencing per D179

### Artefact 1 — Migration `20260427_048_post_draft_slot_id_unique.sql`

LD18 DB-enforced idempotency. Add partial unique constraint:

```sql
-- Stage 11.048 — LD18 DB-enforced idempotency: one draft per slot
--
-- Prior to this migration, "one draft per slot_id" was an implicit invariant
-- maintained by m.fill_pending_slots inserting exactly one skeleton per slot.
-- This migration makes it a DB-enforced invariant. Any race where two parallel
-- callers attempt to create a second draft for the same slot will now fail at
-- the DB level rather than silently producing duplicates.
--
-- Partial — only enforced when slot_id IS NOT NULL. Legacy R6 drafts without
-- slot_id remain unaffected.

ALTER TABLE m.post_draft
  ADD CONSTRAINT post_draft_slot_id_unique
  UNIQUE NULLS NOT DISTINCT (slot_id);
```

Wait — Postgres `UNIQUE` cannot be partial via ADD CONSTRAINT directly. Use a partial unique index instead, which serves the same constraint role and Postgres accepts:

```sql
-- Stage 11.048 — LD18 DB-enforced idempotency: one draft per slot
--
-- (See notes above.) Partial — only enforced when slot_id IS NOT NULL.
-- Implemented as a UNIQUE INDEX (Postgres does not support partial UNIQUE
-- constraints via ADD CONSTRAINT; partial unique index is the canonical pattern).

CREATE UNIQUE INDEX IF NOT EXISTS uq_post_draft_slot_id
  ON m.post_draft (slot_id)
  WHERE slot_id IS NOT NULL;
```

**IMPORTANT — pre-flight check before writing the migration:** verify no existing post_draft rows would violate this. Stage 10 produced 5 skeleton drafts each with a unique slot_id (one per fill); but verify there are no historical R6 drafts with shared slot_ids:

```sql
-- This is a verification-only query, run BEFORE writing migration 048
SELECT slot_id, COUNT(*) AS dup
FROM m.post_draft
WHERE slot_id IS NOT NULL
GROUP BY slot_id
HAVING COUNT(*) > 1;
```

If this returns any rows, STOP and flag — the constraint can't apply cleanly. If it returns zero rows, write migration 048 as above.

The brief's expectation: zero rows. Proceed if so.

### Artefact 2 — ai-worker EF refactor (`supabase/functions/ai-worker/index.ts`)

Bump `VERSION` to `ai-worker-v2.10.0`. Add a v2.10.0 changelog entry at the top of the file matching the existing comment style.

#### Change 2a — Update AiJobRow type

Add `slot_id` and `is_shadow` to the `AiJobRow` type definition, populate them from the locked-jobs RPC return shape (which already returns `m.ai_job.*` so these columns are present in the row, just not currently destructured):

```ts
type AiJobRow = {
  ai_job_id: string;
  client_id: string;
  post_draft_id: string;
  platform: string;
  job_type: string;
  input_payload: any;
  slot_id: string | null;        // NEW — Stage 11
  is_shadow: boolean;            // NEW — Stage 11
};
```

#### Change 2b — New job-type branch: `slot_fill_synthesis_v1`

Inside the per-job loop (`for (const job of jobs)`), after the existing idempotency check and before the Step 1 (format palette) block, add a translation step that converts `slot_fill_synthesis_v1` payloads into the digest_item-shaped seed the rest of the EF already understands.

**Strategy: Option A translation, NOT a parallel synthesis branch.** Translate slot-driven input into a `digest_item` shape, then let the existing format-advisor → assemblePrompts → callClaude/callOpenAI flow run unchanged. Minimum surface area.

```ts
// STAGE 11 — slot_fill_synthesis_v1 payload translation
// Translate slot-driven payload into a digest_item-shaped seed so the rest of
// the EF (format advisor, prompt assembly, LLM call) can run unchanged.
//
// Two sub-modes:
//   - synthesis_mode='evergreen': render evergreen template (no LLM call)
//   - synthesis_mode='single_item' | 'bundle': fetch canonicals, build seed
let translatedPayload: any = job.input_payload;
let isEvergreenRender = false;
let evergreenContent: { title: string; body: string } | null = null;

if (jobType === 'slot_fill_synthesis_v1') {
  const sp = job.input_payload ?? {};
  const synthesisMode: string = sp.synthesis_mode ?? 'single_item';

  if (synthesisMode === 'evergreen' && sp.evergreen_id) {
    // Evergreen path: skip LLM, fetch template, render with brand-voice substitution
    const { data: evergreen } = await supabase
      .schema('t')
      .from('evergreen_library')
      .select('title, body, format_keys')
      .eq('evergreen_id', sp.evergreen_id)
      .maybeSingle();
    if (!evergreen) throw new Error(`evergreen_not_found:${sp.evergreen_id}`);
    isEvergreenRender = true;
    evergreenContent = {
      title: String(evergreen.title ?? '').trim(),
      body: String(evergreen.body ?? '').trim(),
    };
    // Skip downstream LLM logic for this job — handled below
  } else {
    // single_item or bundle: fetch canonical bodies, synthesise digest_item shape
    const canonicalIds: string[] = Array.isArray(sp.canonical_ids) ? sp.canonical_ids : [];
    if (!canonicalIds.length) throw new Error('slot_fill_no_canonical_ids');

    const { data: bodies, error: bodiesErr } = await supabase
      .schema('f')
      .from('canonical_content_body')
      .select('canonical_id, body_text, body_excerpt')
      .in('canonical_id', canonicalIds);
    if (bodiesErr) throw new Error(`canonical_body_fetch:${bodiesErr.message}`);

    const { data: items, error: itemsErr } = await supabase
      .schema('f')
      .from('canonical_content_item')
      .select('canonical_id, canonical_title, canonical_url, first_seen_at')
      .in('canonical_id', canonicalIds);
    if (itemsErr) throw new Error(`canonical_item_fetch:${itemsErr.message}`);

    const merged = canonicalIds.map((cid) => {
      const body = (bodies ?? []).find((b: any) => b.canonical_id === cid);
      const item = (items ?? []).find((i: any) => i.canonical_id === cid);
      return {
        canonical_id: cid,
        title: item?.canonical_title ?? '',
        url: item?.canonical_url ?? '',
        body_text: body?.body_text ?? '',
        body_excerpt: body?.body_excerpt ?? '',
      };
    });

    if (synthesisMode === 'single_item') {
      const m0 = merged[0];
      translatedPayload = {
        digest_item: {
          title: m0.title,
          body_text: m0.body_text,
          body_excerpt: m0.body_excerpt,
          url: m0.url,
        },
        slot_meta: {
          slot_id: sp.slot_id,
          format: sp.format,
          fitness_score: sp.fitness_score,
        },
      };
      // Override jobType locally for the rest of this iteration so the existing
      // rewrite_v1 seed-extraction path runs. Do NOT mutate job.job_type itself.
    } else {
      // bundle
      translatedPayload = {
        items: merged.map((m) => ({
          title: m.title,
          body_text: m.body_text,
          body_excerpt: m.body_excerpt,
          url: m.url,
        })),
        slot_meta: {
          slot_id: sp.slot_id,
          format: sp.format,
          fitness_score: sp.fitness_score,
        },
      };
    }
  }
}

// Local job-type for downstream extraction. Treat slot_fill single_item as
// rewrite_v1, bundle as synth_bundle_v1.
const effectiveJobType = jobType === 'slot_fill_synthesis_v1'
  ? (translatedPayload.items ? 'synth_bundle_v1' : 'rewrite_v1')
  : jobType;

// Replace the rawPayload reference in the existing seed-extraction code with
// translatedPayload, and replace jobType with effectiveJobType in the existing
// seed-extraction conditionals.
```

After this translation, the existing seed-extraction code (`if (jobType === 'rewrite_v1' && rawPayload.digest_item)` etc.) needs to use `effectiveJobType` and `translatedPayload` instead of `jobType` and `rawPayload`. Search-replace across the per-job loop.

Then handle the evergreen render path. If `isEvergreenRender` is true, skip the format advisor + LLM call entirely and write the evergreen body directly to the post_draft:

```ts
if (isEvergreenRender && evergreenContent) {
  // Evergreen render — no LLM call, no compliance check (templates are pre-vetted)
  await supabase.schema('m').from('post_draft').update({
    draft_title: evergreenContent.title,
    draft_body: evergreenContent.body,
    draft_format: {
      ai: { evergreen_render: true, evergreen_id: job.input_payload.evergreen_id, ai_job_id: jobId, at: nowIso() }
    },
    approval_status: 'needs_review',
    recommended_format: job.input_payload.format ?? 'text',
    image_headline: '',
    compliance_flags: [],
    updated_at: nowIso(),
  }).eq('post_draft_id', job.post_draft_id);

  // Update slot status
  if (job.slot_id) {
    await supabase.schema('m').from('slot').update({
      status: 'filled',
      updated_at: nowIso(),
    }).eq('slot_id', job.slot_id);
  }

  await supabase.schema('m').from('ai_job').update({
    status: 'succeeded',
    output_payload: { evergreen_render: true, evergreen_id: job.input_payload.evergreen_id },
    error: null,
    locked_by: null,
    locked_at: null,
    updated_at: nowIso(),
  }).eq('ai_job_id', jobId);

  results.push({
    ai_job_id: jobId,
    post_draft_id: job.post_draft_id,
    status: 'succeeded',
    evergreen_render: true,
  });
  continue;
}
```

#### Change 2c — Slot status transitions for non-evergreen path

After successful synthesis (where v2.9.0 currently writes `approval_status='needs_review'`) AND for slot-driven jobs (`job.slot_id` is non-null), add a slot status update:

```ts
if (job.slot_id) {
  await supabase.schema('m').from('slot').update({
    status: 'filled',
    updated_at: nowIso(),
  }).eq('slot_id', job.slot_id);
}
```

Same treatment for the compliance-skip branch — set slot status to `'skipped'` with `skip_reason` reflecting the compliance rule:

```ts
if (job.slot_id) {
  await supabase.schema('m').from('slot').update({
    status: 'skipped',
    skip_reason: `compliance_skip:${skipReason}`.slice(0, 200),
    updated_at: nowIso(),
  }).eq('slot_id', job.slot_id);
}
```

For the hard-error branch (the existing catch block), do NOT update slot status. Leave at `fill_in_progress` and let `m.recover_stuck_slots()` (jobid 76) handle it on its 15-min cadence. This is the documented Phase B behaviour.

#### Change 2d — LD7 prompt caching

Refactor `assemblePrompts` and `callClaude` to support Anthropic prompt caching. The system prompt is currently a concatenated string; switch to an array of content blocks with `cache_control: {type: "ephemeral"}` on the cacheable blocks.

Cache structure (in this exact order, since Anthropic caching is prefix-match):

1. **Compliance block** — cacheable (per client+vertical+profession; mostly static)
2. **Brand identity prompt** — cacheable (per client; static)
3. **Platform voice prompt** — cacheable (per client+platform; static)
4. **(End of cached prefix)** — anything below is non-cached
5. **Task instruction + output schema** — non-cached if it varies; cacheable if static per content_type

Refactor `assemblePrompts` to return:
```ts
{
  systemBlocks: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>;
  userPrompt: string;
  // ...other fields unchanged
}
```

Refactor `callClaude` to send `system: systemBlocks` (the array) instead of `system: systemPrompt` (the string). The Anthropic API accepts both shapes; sending the array enables caching.

**Caching details to follow Anthropic's documented behaviour:**
- Each cached block must be at least 1024 tokens for Sonnet/Opus (1024 minimum for caching to engage).
- Up to 4 cache breakpoints per request.
- Cache lives 5 minutes from last hit.
- Add `anthropic-beta: prompt-caching-2024-07-31` header? Verify current state — prompt caching graduated from beta in 2025, may no longer require the beta header. CC: confirm via the latest Anthropic docs at deploy time. If it still needs the header, add it.

After the call returns, parse `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens` from the response and write them to `m.ai_usage_log` (may need new columns — check current schema; if missing, defer to a follow-up; for Stage 11 it's enough to log them in the `meta` JSON if the columns don't exist yet).

**OpenAI fallback path:** OpenAI doesn't support the same caching shape. Leave `callOpenAI` unchanged. The fallback path will pay full input-token cost — acceptable since fallback is rare.

#### Change 2e — Backward compat assertion

`rewrite_v1` and `synth_bundle_v1` paths must remain functional. The translation step only triggers for `job_type === 'slot_fill_synthesis_v1'`; legacy job types fall through to the existing extraction logic unchanged. Verify by running the regression test below before deploy.

### Artefact 3 — Migration `20260427_049_drop_shadow_filter_from_ai_worker_lock_jobs_v1.sql`

Once the EF deploy is proven, drop the Stage 10 shadow filter from `f.ai_worker_lock_jobs_v1`. Restore the function to its pre-Stage-10 body (no `is_shadow` clause).

```sql
-- Stage 11.049 — Drop the Stage 10.046 shadow filter
--
-- Stage 10.046 added an `is_shadow = false` filter as a temporary measure to
-- keep the v2.9.0 ai-worker from picking up shadow ai_jobs it couldn't process.
-- Stage 11 ships the v2.10.0 ai-worker with full slot_fill_synthesis_v1 handling,
-- so the filter is no longer needed. Restore the original function body.

CREATE OR REPLACE FUNCTION f.ai_worker_lock_jobs_v1(
  p_limit integer DEFAULT 1,
  p_worker_id text DEFAULT 'worker'::text,
  p_lock_seconds integer DEFAULT 900
)
RETURNS SETOF m.ai_job
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'f', 'k', 'm'
AS $function$
  with picked as (
    select aj.ai_job_id
    from m.ai_job aj
    where aj.status = 'queued'
      and (aj.locked_at is null or aj.locked_at < now() - make_interval(secs => p_lock_seconds))
    order by aj.priority asc, aj.created_at asc
    limit greatest(p_limit, 0)
    for update skip locked
  )
  update m.ai_job aj
  set
    status = 'running',
    locked_at = now(),
    locked_by = p_worker_id,
    updated_at = now()
  from picked
  where aj.ai_job_id = picked.ai_job_id
  returning aj.*;
$function$;

COMMENT ON FUNCTION f.ai_worker_lock_jobs_v1(integer, text, integer) IS
  'R6 ai-worker job lock. Stage 11.049: shadow filter removed; ai-worker v2.10.0 handles slot_fill_synthesis_v1 natively.';
```

---

## Strict three-step sequencing

**Per D179, this order is non-negotiable:**

1. **CC writes all 3 artefacts**, commits to `feature/slot-driven-v3-build`, pushes. Three commits, one per artefact, in this order:
   - `feat(db): Stage 11 LD18 unique partial index on post_draft.slot_id (migration 048)`
   - `feat(ai-worker): Stage 11 v2.10.0 — slot-driven payload + LD7 caching + LD18 + slot status transitions`
   - `feat(db): Stage 11 drop shadow filter from f.ai_worker_lock_jobs_v1 (migration 049)`

2. **Chat applies migration 048** via Supabase MCP (idempotency invariant first).

3. **PK pulls + deploys ai-worker** via PowerShell:
   ```
   cd C:\Users\parve\Invegent-content-engine
   git fetch origin && git checkout feature/slot-driven-v3-build && git pull
   supabase functions deploy ai-worker --no-verify-jwt
   ```
   PK confirms deploy success in chat.

4. **Chat applies migration 049** via Supabase MCP (drop the filter).

5. **Chat runs verification** (V1–V8 below). First slot-driven shadow draft expected within 5–15 minutes.

**If any step fails:** STOP. Don't proceed. Chat will produce a fix-up brief.

---

## Verification (chat will run after migration 049 applies)

**V1 — Migration 048 applied.** `\d m.post_draft` shows `uq_post_draft_slot_id` partial unique index. No orphan rows violating the constraint.

**V2 — ai-worker v2.10.0 deployed.** `GET /functions/v1/ai-worker` returns `{"version":"ai-worker-v2.10.0"}`.

**V3 — Migration 049 applied.** `pg_get_functiondef('f.ai_worker_lock_jobs_v1(...)')` no longer contains `is_shadow`.

**V4 — Shadow ai_jobs picked up.** Within ~10min of migration 049, the 5+ shadow ai_jobs from Stage 10 transition `queued → running → succeeded`. Verify via `SELECT status, COUNT(*) FROM m.ai_job WHERE is_shadow=true GROUP BY status;`.

**V5 — Real shadow drafts produced.** `m.post_draft WHERE is_shadow=true AND draft_body != ''` returns rows. `draft_title` and `draft_body` are non-trivial (not empty, not error strings).

**V6 — Slot transitions.** `m.slot WHERE status='filled' AND filled_at > NOW() - interval '15 minutes'` returns rows matching the successful synthesis count.

**V7 — LD7 caching active.** `m.ai_usage_log` rows for slot-driven jobs show non-zero `cache_creation_input_tokens` on first call per client+platform, then `cache_read_input_tokens` > 0 on subsequent calls within 5 minutes. (If columns don't exist, this metric lives in the `meta` JSON of `m.post_draft.draft_format.ai`.)

**V8 — R6 backward compat.** Legacy R6 paths still work — no R6 ai_jobs in `failed` state with errors related to the v2.10.0 changes. (R6 seed crons are paused so this is mostly a regression check on legacy queued items.)

---

## Rollback plan

**If V4 shows shadow ai_jobs failing en masse:**
1. Re-apply Stage 10.046 shadow filter immediately (paste the migration body from Stage 10).
2. Revert ai-worker: `git checkout main && supabase functions deploy ai-worker --no-verify-jwt`.
3. Migration 048 (LD18 unique constraint) is safe to leave in place — it's a constraint, not destructive.
4. Investigate failure mode, write fix-up brief.

**If V5 shows shadow drafts with garbage content:**
1. Pause fill cron: `UPDATE cron.job SET active=false WHERE jobname='fill-pending-slots-every-10m';`
2. Investigate prompt assembly / canonical body fetch logic.
3. Revert ai-worker deploy if needed.
4. Migrations 048 + 049 stay applied — they're not the problem.

**If V8 shows R6 regressions:**
1. Same as above — pause fill cron, revert EF.
2. R6 ai-worker behaviour is the priority; slot-driven can wait.

---

## What's NOT in scope

- Removing the format advisor — keep, it works for both R6 and slot-driven.
- Removing OpenAI fallback — keep.
- Adding new compliance rules — out of scope; existing compliance loader runs unchanged.
- Auto-approver work — that's separate (Phase 1.2 still pending).
- Dashboard surfacing of Phase B metrics — separate stage (post Gate B).
- Removing the v2.9.0 idempotency guard — KEEP. The new LD18 partial unique index is complementary, not a replacement. The guard catches the post-LLM-completion-interruption race; the unique index catches the pre-LLM duplicate-draft race. Both stay.
- Moving compliance/brand caching to a precomputed cached blob — premature optimisation; Anthropic's ephemeral cache is fine for current scale.

---

## Brief metadata

- **Stage:** 11
- **Phase:** B
- **Predecessor:** Stage 10 (`c22f460` + `7aa6f8f`)
- **Successor:** Gate B observation (5–7 days), then Phase C cutover.
- **Decisions referenced:** D161 (live state authoritative), D179 (Stage 10/11 ordering), D157 (ID003 idempotency, KEEP).
- **Pre-flight gaps caught:** sync_state's "UPDATE auto-created m.post_visual_spec" was a misread — `write_visual_spec` RPC is already UPSERT, no auto-create exists. Captured here so the brief doesn't perpetuate the misread.

---

## One thing to flag if found during execution

If during the EF refactor CC discovers that the existing `assemblePrompts` function generates the system prompt in an order that doesn't match the cache-block order I've specified (compliance → brand → platform_voice), follow what's actually in the code, not what's in this brief. The brief assumes the v2.9.0 order from my read. If the code disagrees, the code wins — adjust the cache_control placement to match the actual order. Document the discrepancy in the commit message.

If LD7 caching delivers less than 50% input-token reduction on the second-call-onwards in a batch, that's a signal something's misconfigured (probably block ordering or token-count thresholds). Flag in V7 results, don't paper over it.
