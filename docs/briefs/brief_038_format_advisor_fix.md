# Claude Code Brief 038 — Format Advisor Preferred Format Bias + PP Video Re-queue

**Date:** 14 April 2026
**Phase:** 3 — Pipeline fixes
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 2–3 hours

---

## Context

Two pipeline issues identified from live data audit:

**Issue 1 — NDIS Yarns only generating text format:**
The format advisor in ai-worker correctly reads `c.client_publish_profile.preferred_format_facebook`
but does NOT pass it to the format advisor prompt as a bias. NDIS policy content is narrative
and analytical — the advisor legitimately picks 'text' because NDIS articles rarely have
"one genuinely striking stat" (image_quote threshold) or "3+ structured points" (carousel).
Property Pulse content (market data, RBA rates, property prices) naturally hits those thresholds.

The fix: pass `preferred_format_facebook` into the format advisor system prompt as a client
preference, and soften the image_quote threshold for NDIS content.

**Issue 2 — Property Pulse 3 approved video drafts with no queue items:**
Three drafts were approved but `draft_approve_and_enqueue()` did not create queue items.
Simple fix: call the function directly for each draft ID.

Draft IDs to re-queue:
- `8a0f3177-22dd-42db-bebb-9ea9a6a569b1` (video_short_kinetic, 5 Apr)
- `ca3ce531-29d9-4aab-a0e8-644c80a64991` (video_short_kinetic, 3 Apr)
- `9a8f5391-b855-49d2-a4da-3ccecdff93ee` (video_short_stat, 2 Apr)

---

## Task 1 — Re-queue PP video drafts (do this first, it's 3 minutes)

Run this SQL directly via Supabase MCP:

```sql
-- Re-queue the 3 approved PP video drafts
SELECT public.draft_approve_and_enqueue('8a0f3177-22dd-42db-bebb-9ea9a6a569b1'::uuid);
SELECT public.draft_approve_and_enqueue('ca3ce531-29d9-4aab-a0e8-644c80a64991'::uuid);
SELECT public.draft_approve_and_enqueue('9a8f5391-b855-49d2-a4da-3ccecdff93ee'::uuid);
```

Verify queue items created:
```sql
SELECT
  ppq.queue_id,
  pd.draft_title,
  pd.recommended_format,
  ppq.status,
  ppq.scheduled_for AT TIME ZONE 'Australia/Sydney' AS scheduled_aest
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
WHERE ppq.post_draft_id IN (
  '8a0f3177-22dd-42db-bebb-9ea9a6a569b1',
  'ca3ce531-29d9-4aab-a0e8-644c80a64991',
  '9a8f5391-b855-49d2-a4da-3ccecdff93ee'
);
```

Expected: 3 rows, all status='queued', scheduled_for is a future time.

---

## Task 2 — Update ai-worker format advisor to include preferred format bias

**File:** `supabase/functions/ai-worker/index.ts`

### 2a — Update `fetchFormatContext` to also return preferred format

Add to the function signature and return type:

```typescript
async function fetchFormatContext(supabase, clientId, platform): Promise<{
  formats: FormatInfo[];
  perfSummary: string;
  preferredFormat: string | null;  // ADD THIS
}>
```

At the end of `fetchFormatContext`, before the return, add:

```typescript
// Fetch preferred format from publish profile
let preferredFormat: string | null = null;
try {
  const { data: publishProfile } = await supabase.rpc('exec_sql', {
    query: `SELECT preferred_format_facebook FROM c.client_publish_profile
            WHERE client_id = '${clientId}' AND platform = '${platform}'
            AND status = 'active' LIMIT 1`
  });
  preferredFormat = (publishProfile as any[])?.[0]?.preferred_format_facebook ?? null;
} catch { }

return { formats, perfSummary, preferredFormat };
```

### 2b — Update `callFormatAdvisor` to accept and use preferredFormat

Add `preferredFormat: string | null` to the opts parameter.

In the system prompt construction, after the DECISION RULES block, add:

```typescript
const preferredFormatInstruction = preferredFormat
  ? `
CLIENT FORMAT PREFERENCE:
This client prefers ${preferredFormat} format. When the content quality is borderline
(e.g., has one reasonably interesting insight but not a definitive standout stat),
bias toward ${preferredFormat} over text. Only fall back to text if the content is
genuinely conversational/reactive with no visual potential whatsoever.`
  : '';
```

Append `preferredFormatInstruction` to the system prompt string.

### 2c — Also soften image_quote threshold in DECISION RULES

Change the existing decision rule for image_quote from:
```
- image_quote requires one genuinely striking stat or insight that stands alone
```

To:
```
- image_quote requires one interesting stat, insight, or key message that works as a visual headline — it doesn't need to be a hard number, a clear declarative statement about a sector development works
```

### 2d — Update callsite to pass preferredFormat through

Where `fetchFormatContext` is called:
```typescript
const { formats, perfSummary, preferredFormat } = await fetchFormatContext(supabase, job.client_id, platform);
```

Where `callFormatAdvisor` is called:
```typescript
const advised = await callFormatAdvisor({
  anthropicKey, seedTitle, seedBody, clientName, vertical,
  formats, perfSummary,
  preferredFormat  // ADD THIS
});
```

### 2e — Bump version to v2.8.0

```typescript
const VERSION = "ai-worker-v2.8.0";
// v2.8.0 — Format advisor preferred format bias
//   fetchFormatContext reads preferred_format_facebook from publish profile
//   callFormatAdvisor receives preferredFormat and biases toward it when content is borderline
//   Softened image_quote threshold: declarative insights qualify, not just hard stats
//   Fixes NDIS Yarns generating only 'text' format despite image formats being enabled
```

---

## Task 3 — Deploy ai-worker

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/ai-worker/
git commit -m "feat: ai-worker v2.8.0 — format advisor preferred format bias, softened image_quote threshold"
git push origin main
npx supabase functions deploy ai-worker --project-ref mbkmaxqhsohbtwsqolns
```

---

## Task 4 — Verify format advisor picks image formats for NDIS Yarns

Wait for the next ai-worker run (every 5 minutes via cron), then check:

```sql
-- Check recent NDIS Yarns drafts and their formats
SELECT
  pd.draft_title,
  pd.recommended_format,
  pd.recommended_reason,
  pd.created_at AT TIME ZONE 'Australia/Sydney' AS created_aest
FROM m.post_draft pd
WHERE pd.client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
  AND pd.created_at > NOW() - INTERVAL '2 hours'
ORDER BY pd.created_at DESC
LIMIT 5;
```

Expected: some drafts with recommended_format = 'image_quote' or 'carousel', not all 'text'.
If all still 'text', the NDIS content genuinely doesn't support visual formats — acceptable.
The bias just removes the hard threshold requirement.

---

## Task 5 — Write result file

Write `docs/briefs/brief_038_result.md` in Invegent-content-engine:
- PP re-queue: 3 queue items created, scheduled times
- ai-worker v2.8.0 deployed
- Format test results: what format did the next NDIS Yarns draft get?
- Any errors encountered

---

## Error handling

- If `draft_approve_and_enqueue` returns an error for any of the 3 PP drafts:
  check if approval_status is still 'approved' (it should be) — if so the issue
  is the enqueue insert. Check `get_next_scheduled_for` function exists.
- If the ai-worker code structure has changed from what's described here:
  read the current file first, find the equivalent locations, apply the logic
  with the same intent. Do not guess — read first.
- The `preferredFormat` addition is non-breaking: if null, no bias is added.
  PP has `preferred_format_facebook = 'image_quote'` too, but PP content
  already generates images naturally so the bias will have minimal effect there.
