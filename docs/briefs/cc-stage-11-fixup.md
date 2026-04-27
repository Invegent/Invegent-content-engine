# CC Brief — Stage 11 fix-up: ai-worker v2.10.1 column-name correction

**Branch:** `feature/slot-driven-v3-build`  
**Predecessor:** Stage 11 (commits `2d4c02b`, `ae9689c`, `f865a69`)  
**Outputs:** 1 EF patch (single function, ~6 lines)  
**Estimated CC time:** 10–15 min

---

## Why this fix-up exists

Stage 11 deployed cleanly through migrations 048, EF v2.10.0, and 049. First ai-worker tick at 02:20 picked up 5 shadow ai_jobs and **all 5 failed** with the same error:

```
canonical_body_fetch:column canonical_content_body.body_text does not exist
```

The Stage 11 brief specified column names `body_text` and `body_excerpt` for `f.canonical_content_body`. Those names don't exist. The actual column names are `extracted_text` and `extracted_excerpt`.

**This is a brief-author error, not CC's.** CC followed the brief verbatim. The fix-up restores the slot-driven path with correct column references.

---

## Current state — what's already been done

To stop the failure cascade while we fix this, chat has already done these emergency steps:

1. **Fill cron paused** — `cron.alter_job(75, active := false)`. No new shadow ai_jobs being created.
2. **Shadow filter re-added** to `f.ai_worker_lock_jobs_v1` via migration `stage_11_emergency_readd_shadow_filter`. Comment: "EMERGENCY restore (Stage 11 fix-up)". The 15 still-queued shadow ai_jobs won't be picked up.
3. **5 failed ai_jobs** are sitting in `m.ai_job` with `status='failed'`, error message above. Their slots are still in `fill_in_progress` state.

**Migrations 048 and 049 stay in place. v2.10.0 ai-worker stays deployed.** The fix-up is purely a column-name correction in the slot-driven translation step.

---

## Actual schema for `f.canonical_content_body`

Verified via `information_schema.columns` query at fix-up author time:

| Column | Type | Notes |
|---|---|---|
| `canonical_id` | uuid | PK link |
| `fetch_status` | text | success / give_up_paywall / give_up_blocked / etc. |
| `fetch_method` | text | jina / direct / etc. |
| `extracted_text` | text | **THE FULL BODY** (use this — not `body_text`) |
| `extracted_excerpt` | text | **THE EXCERPT** (use this — not `body_excerpt`) |
| `word_count` | integer | |
| `error_message` | text | |
| `expires_at` | timestamptz | |
| (and more — fetch_attempts, resolution_status, dead_reason, content_class, classified_at, classifier_version) | | |

`f.canonical_content_item` columns are correct as the brief stated — `canonical_title`, `canonical_url`, `first_seen_at` all exist. Only the body table was wrong.

---

## Scope — exactly one change

In `supabase/functions/ai-worker/index.ts`, find the slot-driven payload translation block (the section CC added in Stage 11, around the new `if (jobType === 'slot_fill_synthesis_v1')` branch). The body-fetch query currently looks like:

```ts
const { data: bodies, error: bodiesErr } = await supabase
  .schema('f')
  .from('canonical_content_body')
  .select('canonical_id, body_text, body_excerpt')
  .in('canonical_id', canonicalIds);
if (bodiesErr) throw new Error(`canonical_body_fetch:${bodiesErr.message}`);
```

Change to:

```ts
const { data: bodies, error: bodiesErr } = await supabase
  .schema('f')
  .from('canonical_content_body')
  .select('canonical_id, extracted_text, extracted_excerpt, fetch_status')
  .in('canonical_id', canonicalIds);
if (bodiesErr) throw new Error(`canonical_body_fetch:${bodiesErr.message}`);
```

And in the merging block immediately after, change:

```ts
return {
  canonical_id: cid,
  title: item?.canonical_title ?? '',
  url: item?.canonical_url ?? '',
  body_text: body?.body_text ?? '',
  body_excerpt: body?.body_excerpt ?? '',
};
```

To:

```ts
return {
  canonical_id: cid,
  title: item?.canonical_title ?? '',
  url: item?.canonical_url ?? '',
  // f.canonical_content_body uses extracted_text/extracted_excerpt (not body_text/body_excerpt).
  // The translated payload still uses body_text/body_excerpt downstream — those names are
  // the digest_item shape the rest of the EF expects, NOT the f.canonical_content_body schema.
  body_text: body?.extracted_text ?? '',
  body_excerpt: body?.extracted_excerpt ?? '',
};
```

**Important:** the OUTPUT shape stays as `body_text`/`body_excerpt` because that's what the existing `rewrite_v1` / `synth_bundle_v1` seed-extraction code downstream expects. The change is only in the SOURCE column names in the SELECT and the assignment from the source.

### Defensive check — fail-fast if all canonicals have empty bodies

While we're touching this code, add a fail-fast check after the merge:

```ts
const hasAnyBody = merged.some((m) => (m.body_text && m.body_text.length > 0) || (m.body_excerpt && m.body_excerpt.length > 0));
if (!hasAnyBody) {
  throw new Error(`slot_fill_no_body_content: ${canonicalIds.length} canonicals all have empty extracted_text/extracted_excerpt`);
}
```

This catches the "canonical in pool but body never extracted successfully" case as a clear error instead of producing an empty-seed LLM call. A signal pool entry should only exist for canonicals with successful bodies, but enforcing this at the consumer is cheap defence-in-depth.

### Version bump

`VERSION` constant: `ai-worker-v2.10.0` → `ai-worker-v2.10.1`. Add a v2.10.1 changelog block at the top:

```ts
// v2.10.1 — Fix-up: column-name correction for f.canonical_content_body
//   Brief 11 specified body_text/body_excerpt; actual columns are
//   extracted_text/extracted_excerpt. All 5 first-tick shadow jobs failed
//   with `canonical_body_fetch:column ... does not exist`.
//   Single fix in slot_fill_synthesis_v1 translation step. Plus fail-fast
//   check if all canonicals have empty bodies.
//   No other behaviour change. LD7 caching / LD18 / slot transitions all
//   unchanged from v2.10.0.
```

That's it. Single commit, single file, ~6 lines of substantive change.

---

## Strict sequencing

1. **CC writes the patch**, commits to `feature/slot-driven-v3-build`, pushes. One commit:
   - `fix(ai-worker): v2.10.1 — column-name fix for f.canonical_content_body (Stage 11 fix-up)`
2. **PK pulls + redeploys** via PowerShell at `C:\Users\parve\Invegent-content-engine`:
   ```
   git fetch origin && git checkout feature/slot-driven-v3-build && git pull
   supabase functions deploy ai-worker --no-verify-jwt
   ```
   Verify v2.10.1 on the version endpoint before reporting back.
3. **Chat re-applies migration 049** (drop shadow filter again) via Supabase MCP. The emergency re-add is identical content to migration 046; dropping the filter again restores the post-049 state.
4. **Chat resets the 5 failed shadow ai_jobs** to `status='queued'` so they retry on the next ai-worker tick. Their slots are still `fill_in_progress` so they'll be picked up cleanly.
5. **Chat re-enables fill cron** (jobid 75 active=true).
6. **Chat runs V4–V8** verification.

If anything fails at step 2 or 3, the fallback state is "shadow filter in place + fill paused" — same as right now. Cost of failure is bounded.

---

## What the fix-up does NOT touch

- Migration 048 — stays applied.
- Migration 049 — stays applied; the emergency re-add is logically equivalent to migration 046, and chat will roll forward by re-applying 049 after deploy.
- LD7 caching — unchanged.
- LD18 unique index — unchanged.
- R6 backward compat — unchanged.
- All v2.9.0 logic preserved in v2.10.0 — unchanged.

---

## Lessons captured for next time

This is the third Lesson #32 instance in two days (Stages 7, 8, 9 caught three pre-flight gaps; Stage 11 brief authored two days later still made the same mistake). Memory entry update warranted: pre-flight verification must include column names + types for EVERY table the new code SELECTs from, INSERTs into, or UPDATEs — not just the tables the new feature centres on. The body-fetch query was a peripheral mention in the Stage 11 brief, not the centre of the design, and that's exactly the shape of code that gets under-verified.

**Commitment for Stage 12 onwards:** every brief that adds DB queries to an EF includes a "Pre-flight column verification" section listing every (schema, table, columns) tuple the new code touches, with the verification SQL inline. CC executes it before authoring. If anything mismatches, CC stops and asks chat for clarification rather than guessing.

---

## Brief metadata

- **Stage:** 11.1 (fix-up)
- **Phase:** B
- **Decisions referenced:** D161 (live state authoritative), D179 (Stage 10/11 ordering)
- **Lesson:** #32 third instance (Stages 7-9 caught three; Stage 11 brief regressed; explicit pre-flight column checks for ALL touched tables required from now on)
