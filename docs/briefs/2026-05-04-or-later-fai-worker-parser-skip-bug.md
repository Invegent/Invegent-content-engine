# Brief: F-AI-WORKER-PARSER-SKIP-BUG fix — parser ordering swallows compliance skip responses

**Status**: ready-for-apply | full diagnosis complete; fix is ~6 lines per provider
**Priority**: P1 — single root cause for F-AAP-DRAFTS-STUCK + F-RECOVER-LOOP-001 + CFW silence
**Finding ID**: F-AI-WORKER-PARSER-SKIP-BUG
**Related**: subsumes F-AAP-DRAFTS-STUCK; demotes F-RECOVER-LOOP-001 from P1 to P3 defence-in-depth
**Created**: 2026-05-04 morning Sydney
**Author**: chat
**Honours**: D-01, D-170 (chat does not deploy EFs — CC ships), D-186, Lesson #51

---

## Problem

`callClaude` and `callOpenAI` in ai-worker (currently v2.11.0) check for `title` and `body` in the parsed model response BEFORE checking for the `skip` flag. The system prompt and `buildFormatOutputSchema()` both correctly instruct the model to return one of two valid shapes:

- Normal: `{ "title": ..., "body": ..., "image_headline": ..., "meta": ... }`
- Compliance skip: `{ "skip": true, "reason": "compliance_block: [rule name]" }`

The main loop has a fully-built handler for `result.skip === true` (marks draft `dead`, slot `skipped`, ai_job `succeeded`). But the parser throws `anthropic_missing_title_or_body` (or `openai_missing_title_or_body`) before the skip flag is read.

## Operational impact (proven)

CFW LinkedIn `image_quote` slot_fill_synthesis_v1 success rate: **3/9 = 33%**. All 6 failures show `error = openai_missing_title_or_body` (which is actually the fallback OpenAI path's same parser bug — primary Claude failed first with `anthropic_missing_title_or_body`).

Every other (client, platform) on `image_quote` runs at 89-100% success. The CFW LinkedIn delta (~67% loss) maps cleanly to compliance skips being misread as failures, because CFW's system prompt aggressively filters non-OT/NDIS content and LinkedIn's broader pool fails that filter more often than FB.

Cascade effects:
- 6 CFW LI failed slots in `exceeded_recovery_attempts`
- F-RECOVER-LOOP-001 thrashing
- 6 CFW LI shadow drafts stuck in `draft` status
- 94h CFW LI publish silence
- Double LLM billing per skip (Claude + OpenAI fallback both hit and both fail)

## Fix

In `callClaude` (in `supabase/functions/ai-worker/index.ts`):

```typescript
// Replace this line:
if (!parsed.value?.title || !parsed.value?.body) throw new Error('anthropic_missing_title_or_body');

// With:
if (parsed.value?.skip !== true && (!parsed.value?.title || !parsed.value?.body)) {
  throw new Error('anthropic_missing_title_or_body');
}
```

And update the return object so title/body are null-safe on skip responses:

```typescript
return {
  title: parsed.value?.skip === true ? '' : String(parsed.value.title).trim(),
  body:  parsed.value?.skip === true ? '' : String(parsed.value.body).trim(),
  imageHeadline: String(parsed.value.image_headline ?? '').trim(),
  meta: parsed.value.meta ?? {},
  skip: parsed.value.skip === true,
  skipReason: parsed.value.reason ?? '',
  inputTokens: Number(usage.input_tokens ?? 0),
  outputTokens: Number(usage.output_tokens ?? 0),
  cacheCreationInputTokens: Number(usage.cache_creation_input_tokens ?? 0),
  cacheReadInputTokens: Number(usage.cache_read_input_tokens ?? 0),
};
```

Identical change in `callOpenAI` (with the `openai_missing_title_or_body` error name and `usage.prompt_tokens` / `usage.completion_tokens` field names per the OpenAI response shape — match the existing structure).

**Bundled with this fix**: capture raw model response on parse failure for future diagnosability — in the outer catch block of the main per-job loop (around line ~ where `await supabase.schema('m').from('ai_job').update({ status: 'failed', error: msg, ... })` lives), add `output_payload: { error_response_raw: cleaned.slice(0, 4000) }` to that ai_job UPDATE. Caveat: `cleaned` is local to the inner `callClaude` / `callOpenAI` scope. CC may need to plumb the raw response up through the throw chain — recommend wrapping the throw into a custom Error subclass that carries `cleaned` as a property, then read it in the outer catch. Alternative: write to the ai_job from inside callClaude/callOpenAI before throwing. Either is acceptable. Closes B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING in the same deploy.

## Apply path (CC at home, chat oversight)

A1. CC pulls the current ai-worker EF source (Supabase MCP get_edge_function — already done in chat session, source is at v2.11.0)
A2. CC applies the parser patch + raw-response logging
A3. Bumps version to v2.11.1, updates the version comment header per project convention. Header should be:

```typescript
const VERSION = "ai-worker-v2.11.1";
// v2.11.1 — F-AI-WORKER-PARSER-SKIP-BUG fix + raw response capture on failure
//   ROOT CAUSE: callClaude and callOpenAI parsers checked for {title, body}
//   BEFORE checking the skip flag, throwing anthropic_missing_title_or_body
//   when the model correctly returned a compliance-skip response
//   ({skip: true, reason: "compliance_block: ..."}). Affected CFW × LinkedIn
//   × image_quote with 33% success rate; cascade caused F-AAP-DRAFTS-STUCK
//   + F-RECOVER-LOOP-001. Fix: check skip before title/body in both parsers.
//   Plus: capture raw model response on parse failure into ai_job.output_payload
//   for future diagnosis (closes B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING).
//   Diagnosed via Supabase MCP source-read + format-success-rate analysis,
//   not via worker logs (which were silent on the bug). See:
//   docs/briefs/2026-05-04-or-later-fai-worker-parser-skip-bug.md
//   docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md
```

A4. Chat fires D-01 ask_chatgpt_review (action_type: ef_deploy)
A5. PK approves outcome
A6. CC deploys via Supabase MCP `deploy_edge_function` with `verify_jwt: false` (preserves existing v2.11.0 setting — confirm via get_edge_function response)
A7. Verification (V1–V5)

## Verification (post-deploy)

V1. Version endpoint reports v2.11.1.

V2. Watch `m.ai_job` for next 30 min. Expectation: CFW LI ai_jobs that previously failed will now show `status='succeeded'` with `output_payload->>skipped = true` and `output_payload->>reason` populated. Corresponding `m.post_draft.approval_status = 'dead'` with `compliance_flags` populated. Corresponding `m.slot.status = 'skipped'`.

V3. Re-run the 33% success-rate query (Q13 from session investigation):

```sql
SELECT
  cl.client_slug, aj.platform,
  aj.input_payload->>'format' AS format,
  aj.status, count(*) AS cnt
FROM m.ai_job aj
JOIN c.client cl ON cl.client_id = aj.client_id
WHERE aj.created_at >= '2026-05-04 12:00:00+00'  -- adjust to deploy time
  AND aj.job_type = 'slot_fill_synthesis_v1'
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4;
```

CFW LI image_quote success rate should rise IF the upstream content pool contains genuinely OT/NDIS-relevant canonicals. If success stays at ~33%, the bug is fixed but CFW has a content-supply problem (separate finding).

V4. Token cost: per-CFW-LI-job cost should halve (no more wasted fallback OpenAI calls on what should have been clean Claude skips).

V5. F-RECOVER-LOOP-001 trigger rate should drop to ~zero on CFW LI (slots no longer reach `fill_in_progress` for compliance skips — they go straight to `skipped`).

## Side effects

- **No retroactive fix for the 6 already-failed CFW LI slots.** Their drafts and jobs are already in failed state. The fix prevents new occurrences, doesn't repair old ones. Acceptable per Phase 1.7 "dead is audit trail" principle.
- **CFW LI cadence may stay below 5/week** until the canonical pool's OT/NDIS-relevance composition improves. The OT/NDIS filter is doing its job — it's the upstream content supply that's narrow. Separate decision: broaden CFW LI pool, relax the filter, or accept the lower cadence.
- **F-RECOVER-LOOP-001 brief**: demote from P1 to P3. The `m.recover_stuck_slots` patch (refuse refilling with already-published drafts) is still good defence-in-depth, but the urgency is gone once this fix ships. Keep brief, lower priority.
- **F-AAP-DRAFTS-STUCK**: subsumed by this fix. Mark as duplicate/resolved-by-F-AI-WORKER-PARSER-SKIP-BUG.
- **F-PUB-009**: independent of this fix. Still needs apply for the cap-blocked streams (NDIS-Yarns FB/LI, PP LI/YT).

## Honest limitations

- **Hypothesis not 100% confirmed via raw response inspection.** We're 90-95% confident based on code structure + system prompt content + pattern of failures + dual-provider failure consistency. The remaining 5-10% is "maybe both LLMs are returning genuinely malformed JSON for CFW LI." The fix handles both cases — if the issue is genuinely malformed responses, the parser still throws after the skip check, so no regression. The bundled raw-response logging will give us 100% confidence within one cycle post-deploy.
- **F-AAP-001 backfill avalanche aftermath** (the 81 NDIS-Yarns LI rejections from 4-25) is unrelated and won't be affected.
- **D-01 escalation likely** — first-time deploy of a parser logic change. Plan for state-capture exception path per Lesson #62 type-(c) if the review escalates without new evidence.

## References

- Pipeline investigation: `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md`
- Session deep-dive: `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md`
- ai-worker v2.11.0 source — read in-session via Supabase MCP `get_edge_function`
- MCP review protocol v2.17: `docs/runtime/mcp_review_protocol.md`
