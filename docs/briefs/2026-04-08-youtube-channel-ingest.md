# Brief: YouTube Channel Subscription Ingest
**Date:** 8 April 2026  
**Status:** Ready for Claude Code  
**Estimated complexity:** Medium — modifies one Edge Function, adds one table, adds one dashboard component  
**Claude Code prompt:** "Read docs/briefs/2026-04-08-youtube-channel-ingest.md and execute all tasks autonomously"

---

## Context

ICE already has:
- `f.feed_source` — master list of all ingest sources with `source_type_code`, `status`, `config` (jsonb)
- `ingest` Edge Function — handles `source_type_code = 'rss_native'` and `'rss_app'` via RSS parsing
- `video-analyser` Edge Function (v1.1.0) — accepts YouTube URL → returns title/channel/transcript/Claude analysis → saves to `f.video_analysis`
- `f.video_analysis` table — stores YouTube video analysis results keyed by `youtube_video_id`
- Content Studio → Analyse tab — already shows `f.video_analysis` history

The goal is to add `source_type_code = 'youtube_channel'` so PK can subscribe to YouTube channels and have new videos automatically analysed weekly, appearing in the Content Studio Analyse tab as an inspiration library.

YouTube channels expose a public RSS feed — no API key required:
```
https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}
```
This feed returns the latest videos. The existing `parseRss()` function already parses it correctly.

---

## Task 1: Ingest-worker — add `youtube_channel` source type handler

**File:** `supabase/functions/ingest/index.ts`

**What to do:**

Add a new function `runYouTubeChannelSource()` alongside the existing `runOneSource()`. The `run-all` endpoint should call this for sources with `source_type_code = 'youtube_channel'`.

**Config shape for youtube_channel sources in `f.feed_source.config`:**
```json
{
  "channel_id": "UCxxxxxxxxxxxxxxxxxxxxxx",
  "channel_name": "Display name for logging",
  "max_videos_per_run": 3
}
```

**Logic for `runYouTubeChannelSource(supabase, source_id, flags)`:**

1. Load `f.feed_source` row by `source_id` — confirm `source_type_code = 'youtube_channel'`
2. Read `config.channel_id` — error if missing
3. Build RSS URL: `https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}`
4. Fetch and parse with existing `parseRss()` — max `config.max_videos_per_run ?? 3` items
5. For each item in parsed RSS:
   - Extract YouTube video ID from the `link` field (e.g. `https://www.youtube.com/watch?v={VIDEO_ID}`)
   - Check `f.video_analysis` (via exec_sql RPC) whether `youtube_video_id = {VIDEO_ID}` already exists
   - If already analysed: skip
   - If new: call `video-analyser` Edge Function via `supabase.functions.invoke('video-analyser', { body: { youtube_url: item.link, client_id: null } })`
   - Log result (success/fail) — do NOT throw on individual video failure, continue to next
6. Limit to `max_videos_per_run` NEW analyses per run (avoid timeout)
7. Return summary: `{ source_id, channel_id, videos_checked, videos_new, videos_analysed, videos_failed }`

**Modifying `run-all` endpoint:**

In the `run-all` handler, the current query filters `.eq('output_kind', 'content_item')`. Change this to also fetch `source_type_code = 'youtube_channel'` sources (they use `output_kind = 'youtube_inspiration'`). Route them to `runYouTubeChannelSource()`, all others to `runOneSource()`.

**Important:** The `video-analyser` function takes 15-30 seconds per video. With `max_videos_per_run = 3`, one channel takes ~60-90 seconds. The Edge Function timeout on Pro plan supports this. Do NOT process more than 3 new videos per run per channel.

**Video ID extraction helper:**
```typescript
function extractYouTubeVideoId(url: string): string | null {
  const m = url.match(/youtube\.com\/watch\?(?:[^&]*&)*v=([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
```

**Check if video already analysed (use exec_sql since f schema not PostgREST-exposed):**
```typescript
const { data } = await supabase.rpc('exec_sql', {
  query: `SELECT video_analysis_id FROM f.video_analysis WHERE youtube_video_id = '${videoId}' LIMIT 1`
});
const alreadyAnalysed = Array.isArray(data) && data.length > 0;
```

---

## Task 2: Add pg_cron job for weekly YouTube channel ingest

**Use `apply_migration` (DDL):**

```sql
-- Weekly YouTube channel ingest — Sundays at 06:00 UTC
SELECT cron.schedule(
  'youtube-channel-ingest-weekly',
  '0 6 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/ingest/ingest/run-all?trigger=schedule&write=true&normalize=true&canonicalize=true',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ingest-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ingest_api_key')
    ),
    body := '{}'
  ) AS request_id;
  $$
);
```

Note: This runs `run-all` which will now include youtube_channel sources. The existing ingest already runs via a separate cron for RSS sources — check existing cron jobs before adding to avoid duplicate scheduling. If a weekly cron for `run-all` already exists, do not add a duplicate. Instead, confirm the existing cron will pick up the new source type.

**How to check existing cron jobs:**
```sql
SELECT jobid, schedule, command, active FROM cron.job ORDER BY jobid;
```

---

## Task 3: Add 2 seed channel subscriptions to `f.feed_source`

After the ingest-worker code is deployed, seed two test channel subscriptions.

**Use `apply_migration`:**

```sql
-- Property Pulse inspiration channels
INSERT INTO f.feed_source (
  source_name, source_type_code, output_kind, status, refresh_cadence,
  collection_region_key, default_content_region_key, config
) VALUES
(
  'Australian Property Mastery - PK Gupta',
  'youtube_channel',
  'youtube_inspiration',
  'active',
  'weekly',
  'au', 'au',
  '{"channel_id": "UCgpRs29idEHwGEXkIikpzXg", "channel_name": "Australian Property Mastery with PK Gupta", "max_videos_per_run": 3}'
),
(
  'Rask Australia - Property & Finance',
  'youtube_channel',
  'youtube_inspiration',
  'active',
  'weekly',
  'au', 'au',
  '{"channel_id": "UCBtkIHFJGFVzB-kHEUGzELA", "channel_name": "Rask Australia", "max_videos_per_run": 3}'
);
```

Note: These channel IDs should be verified before inserting. If Claude Code cannot verify them, insert with status = 'paused' and note in the return summary that IDs need verification.

---

## Task 4: Dashboard — Channel Subscriptions UI in Analyse tab

**File:** `app/(dashboard)/content-studio/components/Analyse/VideoAnalyser.tsx`  
(already exists — add a "Channel Subscriptions" section below the URL input and history)

**Server action additions** (`app/(dashboard)/actions/video-analyser.ts`):

Add two new server actions:

```typescript
export async function getChannelSubscriptions(): Promise<ChannelSubscription[]>
// Queries f.feed_source WHERE source_type_code = 'youtube_channel' via exec_sql
// Returns: source_id, source_name, config.channel_id, config.channel_name, status, created_at

export async function addChannelSubscription(channelUrl: string, clientId?: string): Promise<{ ok: boolean; error?: string }>
// 1. Extract channel ID from URL (youtube.com/channel/{ID} or youtube.com/@handle)
// 2. For @handle URLs: use oEmbed or note that channel_id lookup requires API key
// 3. INSERT into f.feed_source with source_type_code = 'youtube_channel', output_kind = 'youtube_inspiration'
// 4. Use SECURITY DEFINER function or exec_sql with service role for the insert
// Note: f schema DML must go through a SECURITY DEFINER function. 
//       Create public.insert_feed_source_youtube_channel(...) SECURITY DEFINER function.
```

**Create the SECURITY DEFINER function via apply_migration:**

```sql
CREATE OR REPLACE FUNCTION public.insert_feed_source_youtube_channel(
  p_source_name text,
  p_channel_id text,
  p_channel_name text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO f.feed_source (
    source_name, source_type_code, output_kind, status, refresh_cadence,
    collection_region_key, default_content_region_key, config
  ) VALUES (
    p_source_name, 'youtube_channel', 'youtube_inspiration', 'active', 'weekly',
    'au', 'au',
    jsonb_build_object('channel_id', p_channel_id, 'channel_name', p_channel_name, 'max_videos_per_run', 3)
  ) RETURNING source_id INTO v_id;
  RETURN v_id;
END;
$$;
```

**UI component additions to VideoAnalyser.tsx:**

Add a `ChannelSubscriptions` section below `PastAnalyses`. It shows:
- A text input: "Add YouTube channel" (accepts channel URL or channel ID)
- "Add" button → calls `addChannelSubscription()`
- List of subscribed channels with:
  - Channel name
  - Status badge (active/paused)
  - "Run now" button → triggers the ingest manually for that source via a server action
  - "Pause/Resume" toggle

Keep it simple — channel name + status + run now. No pagination needed (will have < 10 channels).

**Channel URL parsing (in the server action):**
```typescript
function extractChannelId(input: string): string | null {
  // Direct channel ID
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(input)) return input;
  // youtube.com/channel/UC...
  const m = input.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  if (m) return m[1];
  // @handle URLs cannot be resolved without YouTube Data API — return null
  return null;
}
```

If channel ID cannot be extracted (e.g. @handle), return `{ ok: false, error: 'Please use a direct channel URL (youtube.com/channel/UC...) or channel ID. @handles require the YouTube Data API key.' }`.

---

## Task 5: "Run Now" server action for a single channel

Add to `app/(dashboard)/actions/video-analyser.ts`:

```typescript
export async function runChannelIngestNow(sourceId: string): Promise<{ ok: boolean; result?: any; error?: string }>
// Calls the ingest Edge Function: POST /ingest/ingest/run?source_id={sourceId}&write=true&normalize=true
// Uses INGEST_API_KEY from environment
// Returns the result summary
```

This lets PK manually trigger a channel ingest from the dashboard without waiting for the weekly cron.

---

## Files to modify/create

| File | Action |
|---|---|
| `supabase/functions/ingest/index.ts` | Add `runYouTubeChannelSource()`, modify `run-all` handler |
| DB migration: `youtube_channel_ingest_setup` | SECURITY DEFINER function + cron job + seed channels |
| `app/(dashboard)/actions/video-analyser.ts` | Add `getChannelSubscriptions`, `addChannelSubscription`, `runChannelIngestNow` |
| `app/(dashboard)/content-studio/components/Analyse/VideoAnalyser.tsx` | Add ChannelSubscriptions component section |

---

## What NOT to do

- Do not change `runOneSource()` or the existing RSS ingest logic in any way
- Do not add YouTube channel ingest to the existing RSS pg_cron job — keep them separate
- Do not attempt to resolve @handle to channel_id (requires YouTube Data API — defer)
- Do not build a full inspiration library UI — that is a separate task
- Do not add `client_id` linking in this build — all channel subscriptions are system-level for now
- Do not change the existing `run-all` filter for RSS sources — only ADD the youtube_channel handling

---

## Success criteria

1. `f.feed_source` has rows with `source_type_code = 'youtube_channel'`
2. Calling `POST /ingest/ingest/run?source_id={youtube_channel_source_id}&write=true` returns videos_checked > 0
3. New video analyses appear in `f.video_analysis` after the run
4. Content Studio → Analyse tab shows "Channel Subscriptions" section with subscribed channels
5. "Run now" button in dashboard triggers the ingest and shows result
6. Existing RSS ingest is completely unaffected

---

## Session context (do not act on)

- Supabase project: `mbkmaxqhsohbtwsqolns`
- GitHub org: `Invegent`
- Repos: `Invegent-content-engine` (Edge Functions + docs), `invegent-dashboard`
- Local working dir: `C:\Users\parve\Invegent-content-engine`
- MCPs available: Supabase MCP, GitHub MCP
- Vercel auto-deploys on push to main in `invegent-dashboard`
- Supabase deploys Edge Functions via MCP deploy_edge_function tool
