# T17 — YouTube Publisher Approval Gate (v1.6.0)

**Status**: Authored, awaiting ChatGPT review
**Pattern**: SQL fetch-time filter (mirror WordPress; for direct-read publishers)
**Risk**: LOWEST of the three patches — single-line addition to existing SELECT chain
**Deploy order**: 1 of 4 (deploy FIRST — blocks T06 OAuth reconnect)

## Diff summary

Add `.eq('approval_status', 'approved')` to the existing draft SELECT in `Deno.serve`. Add `approval_status` to the SELECT columns list. Bump VERSION to `youtube-publisher-v1.6.0`. Add comment block explaining why approval was restored.

## Why fetch-time pattern (not per-row)

YT publisher is a **direct-read publisher** — reads `m.post_draft` directly with no queue. Fetch-time filter is cleaner than per-row because the draft is never even loaded if not approved. Mirrors WordPress publisher (which also gates at fetch-time).

Per-row defence-in-depth could be added later if S12 ever flags a violation, but is not needed tonight.

## Full proposed source (`supabase/functions/youtube-publisher/index.ts`)

```typescript
// youtube-publisher v1.6.0
// v1.6.0 (T17, 1 May 2026): RESTORE APPROVAL GATE.
//   Adds .eq('approval_status', 'approved') to draft SELECT.
//   Mirrors WordPress publisher's fetch-time filter pattern.
//   Previous v1.5.0 read m.post_draft with no approval check — would have
//   uploaded any draft with video_status='generated' on next OAuth reconnect.
//   T15 audit (1 May) confirmed gate was missing. F-PUB-005-class fix.
// v1.5.0 (prior): fixed post_publish INSERT column names (response_payload not
//   publish_meta; attempt_no added).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'youtube-publisher-v1.6.0';
const YOUTUBE_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-youtube-publisher-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ... (refreshAccessToken, uploadToYouTube, buildVideoMetadata unchanged from v1.5.0) ...

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'youtube-publisher', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided = req.headers.get('x-youtube-publisher-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const supabase = getServiceClient();
  const results: any[] = [];

  // v1.6.0 (T17): added approval_status to SELECT and .eq('approval_status', 'approved') filter.
  // Direct-read publisher — gate at fetch time, mirror WordPress pattern.
  const { data: drafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_title, draft_body, recommended_format, video_url, draft_format, approval_status')
    .eq('video_status', 'generated')
    .eq('approval_status', 'approved')  // T17: F-PUB-005 fix
    .is('draft_format->youtube_video_id', null)
    .not('video_url', 'is', null)
    .in('recommended_format', ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice'])
    .limit(2);

  // ... (rest of body unchanged from v1.5.0 — for-loop processing each draft) ...
});
```

**Note**: For brevity this brief shows only the changed sections. The rest of v1.5.0 source is preserved verbatim. PK can apply this as a single edit to the SELECT chain + version constant + top comment block.

## Pre-deploy verification

Query 1 — count drafts that the OLD v1.5.0 would have selected (proves we're catching real cases):

```sql
-- Before deploy: how many drafts is the old YT publisher eligible to upload?
SELECT pd.approval_status, COUNT(*) AS draft_count
FROM m.post_draft pd
WHERE pd.video_status = 'generated'
  AND (pd.draft_format->>'youtube_video_id') IS NULL
  AND pd.video_url IS NOT NULL
  AND pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice')
GROUP BY pd.approval_status
ORDER BY draft_count DESC;
```

Expected: rows for `'needs_review'`, `'approved'`, possibly `'rejected'` or `'dead'`. If `'needs_review'` count > 0 — those are the drafts the patch will EXCLUDE.

Query 2 — count drafts the NEW v1.6.0 would select (post-deploy expectation):

```sql
-- After deploy: only approved drafts should be eligible
SELECT COUNT(*) AS eligible_count
FROM m.post_draft pd
WHERE pd.video_status = 'generated'
  AND pd.approval_status = 'approved'
  AND (pd.draft_format->>'youtube_video_id') IS NULL
  AND pd.video_url IS NOT NULL
  AND pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice');
```

## Smoke check (post-deploy)

1. Hit `GET /youtube-publisher` — expect `{ok: true, version: 'youtube-publisher-v1.6.0'}`
2. Re-run Query 2 — should match expected count
3. Wait until next YT cron tick (or trigger manually with empty body) — confirm no upload of `needs_review` drafts
4. Standing check S12 query — confirm zero published-state rows where draft was `'needs_review'` (none expected because YT cron hasn't run since 11 Apr)

## Rollback

Redeploy v1.5.0 source (preserved in Supabase EF version history) — single click in dashboard.

## T11 update required (downstream)

T11 YouTube failed-draft replay plan must include `approval_status='approved'` filter in its eligibility SQL. v2.7 action_list already captures this.

## Acceptance criteria (T17 done when)

1. Source updated and ChatGPT-reviewed ✓ (after batch review)
2. Deployed to Supabase as v1.6.0
3. `GET /youtube-publisher` returns version `v1.6.0`
4. Pre/post queries run; documented in audit run state
5. T06 OAuth reconnect cleared to proceed (PK action, separate)
